import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient, OPENAI_MODEL } from "@/lib/openai";
import { ExtractFileResultSchema, type PaymentAttributes } from "@/lib/schemas";

export const runtime = "nodejs";

const TEXT_EXTENSIONS = new Set([
  "txt",
  "csv",
  "tsv",
  "json",
  "html",
  "htm",
  "xml",
  "ofx",
  "qfx",
  "md",
  "log",
  "rtf",
  "yml",
  "yaml",
]);

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
]);

const MAX_TEXT_CHARS = 60_000;
const MAX_FILES = 12;

type PurchaseRecord = PaymentAttributes & { sourceFile: string };

function getExtension(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? (parts.pop()?.toLowerCase() ?? "") : "";
}

function isTextFile(file: File) {
  if (
    file.type.startsWith("text/") ||
    file.type === "application/json" ||
    file.type === "application/xml" ||
    file.type === "application/xhtml+xml"
  ) {
    return true;
  }
  return TEXT_EXTENSIONS.has(getExtension(file.name));
}

function isImageFile(file: File) {
  if (file.type.startsWith("image/")) return true;
  return IMAGE_EXTENSIONS.has(getExtension(file.name));
}

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" || getExtension(file.name) === "pdf"
  );
}

function systemPrompt() {
  return `You extract explicit purchase records from evidence files (receipts, invoices, order confirmations, bank/merchant exports).

Rules:
- Only include a purchase if there is clear evidence of a completed transaction (paid amount, order confirmation, receipt line items, etc.).
- Do NOT invent purchases from marketing copy, wishlists, carts, ads, or filenames that merely contain shopping words.
- If there are no explicit purchases, set hasExplicitPurchases=false, purchases=[], and explain in skipReason.
- For each purchase, fill Payment Attributes. Use null when a field is not present in the file.
- Payment Attributes: brand, product, purchaseItem, transactionDate, location, receiptId, typeOfPurchase.
- transactionDate should be ISO when possible (YYYY-MM-DD); otherwise the date string as written.
- typeOfPurchase examples: in-store, online, subscription, refund, marketplace.`;
}

async function extractFromFile(file: File): Promise<{
  sourceFile: string;
  result: {
    hasExplicitPurchases: boolean;
    purchases: PaymentAttributes[];
    skipReason: string | null;
  };
}> {
  const client = getOpenAIClient();
  const sourceFile = file.name;
  const content: Array<
    | { type: "input_text"; text: string }
    | { type: "input_image"; image_url: string; detail: "auto" }
    | { type: "input_file"; filename: string; file_data: string }
  > = [
    {
      type: "input_text",
      text: `Source filename: ${sourceFile}\nExtract Payment Attributes for every explicit purchase in this file.`,
    },
  ];

  if (isTextFile(file)) {
    let text = await file.text();
    if (text.length > MAX_TEXT_CHARS) {
      text = `${text.slice(0, MAX_TEXT_CHARS)}\n\n[truncated]`;
    }
    content.push({
      type: "input_text",
      text: `File contents:\n\`\`\`\n${text}\n\`\`\``,
    });
  } else if (isImageFile(file)) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = file.type || `image/${getExtension(file.name) || "jpeg"}`;
    content.push({
      type: "input_image",
      detail: "auto",
      image_url: `data:${mime};base64,${bytes.toString("base64")}`,
    });
  } else if (isPdfFile(file)) {
    const bytes = Buffer.from(await file.arrayBuffer());
    content.push({
      type: "input_file",
      filename: sourceFile,
      file_data: `data:application/pdf;base64,${bytes.toString("base64")}`,
    });
  } else {
    // Best-effort: try as text; if binary garbage, model should return no purchases
    let text = await file.text();
    if (text.length > MAX_TEXT_CHARS) {
      text = `${text.slice(0, MAX_TEXT_CHARS)}\n\n[truncated]`;
    }
    content.push({
      type: "input_text",
      text: `File contents (best-effort text decode):\n\`\`\`\n${text}\n\`\`\``,
    });
  }

  const response = await client.responses.parse({
    model: OPENAI_MODEL,
    input: [
      { role: "system", content: systemPrompt() },
      { role: "user", content },
    ],
    text: {
      format: zodTextFormat(ExtractFileResultSchema, "extract_purchases"),
    },
  });

  const parsed = response.output_parsed;
  if (!parsed) {
    return {
      sourceFile,
      result: {
        hasExplicitPurchases: false,
        purchases: [],
        skipReason: "Model returned no structured output.",
      },
    };
  }

  return { sourceFile, result: parsed };
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form
      .getAll("files")
      .filter((v): v is File => typeof v !== "string" && v instanceof File);

    if (!files.length) {
      return Response.json({ error: "No files uploaded." }, { status: 400 });
    }

    const limited = files.slice(0, MAX_FILES);
    const perFile = [];
    const purchases: PurchaseRecord[] = [];

    for (const file of limited) {
      try {
        const { sourceFile, result } = await extractFromFile(file);
        perFile.push({
          sourceFile,
          hasExplicitPurchases: result.hasExplicitPurchases,
          skipReason: result.skipReason,
          purchaseCount: result.purchases.length,
        });
        for (const p of result.purchases) {
          purchases.push({ ...p, sourceFile });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to extract purchases.";
        console.error("[extract-purchases]", file.name, err);
        perFile.push({
          sourceFile: file.name,
          hasExplicitPurchases: false,
          skipReason: message,
          purchaseCount: 0,
        });
      }
    }

    return Response.json({
      purchases,
      perFile,
      truncated: files.length > MAX_FILES,
      maxFiles: MAX_FILES,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to extract purchases.";
    console.error("[extract-purchases]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}
