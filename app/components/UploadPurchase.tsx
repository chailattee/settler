"use client";

import { useRef, useState } from "react";

/** How far back each scan looks. Change as needed. */
const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Exhaustive purchase-related filename keywords (matched as substrings, case-insensitive).
 * Prefer longer / more specific tokens; matching is plain includes() on the full filename.
 */
const PURCHASE_FILENAME_KEYWORDS = [
  // Core commerce
  "receipt",
  "receipts",
  "invoice",
  "invoices",
  "invoicing",
  "purchase",
  "purchases",
  "purchased",
  "order",
  "orders",
  "ordering",
  "checkout",
  "payment",
  "payments",
  "paid",
  "billing",
  "bill",
  "bills",
  "charge",
  "charges",
  "charged",
  "transaction",
  "transactions",
  "txn",
  "sale",
  "sales",
  "sold",
  "buy",
  "buying",
  "bought",
  "spend",
  "spending",
  "expense",
  "expenses",
  "expenditure",
  "merchant",
  "merchants",
  "vendor",
  "vendors",
  "retail",
  "retailer",
  "store",
  "shop",
  "shopping",
  "commerce",
  "ecommerce",
  "e-commerce",
  // Order / fulfillment
  "confirmation",
  "confirmed",
  "packing-slip",
  "packing_slip",
  "packingslip",
  "packing",
  "shipment",
  "shipments",
  "shipping",
  "shipped",
  "delivery",
  "delivered",
  "fulfillment",
  "fulfilment",
  "tracking",
  "return",
  "returns",
  "refund",
  "refunds",
  "refunded",
  "exchange",
  "warranty",
  "rebate",
  "rebates",
  // Financial statements / exports
  "statement",
  "statements",
  "bank-statement",
  "bank_statement",
  "bankstatement",
  "credit-card",
  "credit_card",
  "creditcard",
  "debit",
  "card-statement",
  "card_statement",
  "account-activity",
  "account_activity",
  "accountactivity",
  "activity-export",
  "activity_export",
  "ledger",
  "bookkeeping",
  "accounting",
  "balance",
  "balances",
  "transfer",
  "transfers",
  "wire",
  "ach",
  "paypal",
  "venmo",
  "cashapp",
  "cash-app",
  "zelle",
  "stripe",
  "square",
  "klarna",
  "afterpay",
  "affirm",
  "apple-pay",
  "apple_pay",
  "google-pay",
  "google_pay",
  "wallet",
  // Tax / totals language often in exports
  "subtotal",
  "tax-invoice",
  "tax_invoice",
  "vat",
  "gst",
  "sales-tax",
  "sales_tax",
  // Common retailers / marketplaces (filename exports)
  "amazon",
  "amzn",
  "aws-billing",
  "prime",
  "walmart",
  "target",
  "costco",
  "sam's",
  "samsclub",
  "sams-club",
  "bestbuy",
  "best-buy",
  "best_buy",
  "apple",
  "itunes",
  "app-store",
  "app_store",
  "google-play",
  "google_play",
  "play-order",
  "ebay",
  "etsy",
  "shopify",
  "wayfair",
  "homedepot",
  "home-depot",
  "home_depot",
  "lowes",
  "lowe's",
  "ikea",
  "nike",
  "adidas",
  "nordstrom",
  "macys",
  "macy's",
  "gap",
  "oldnavy",
  "old-navy",
  "zara",
  "hm-",
  "h&m",
  "uniqlo",
  "sephora",
  "ulta",
  "cvs",
  "walgreens",
  "riteaid",
  "rite-aid",
  "kroger",
  "safeway",
  "wholefoods",
  "whole-foods",
  "whole_foods",
  "traderjoe",
  "trader-joe",
  "trader_joe",
  "starbucks",
  "mcdonald",
  "ubereats",
  "uber-eats",
  "uber_eats",
  "doordash",
  "door-dash",
  "door_dash",
  "grubhub",
  "postmates",
  "instacart",
  "uber",
  "lyft",
  "airbnb",
  "booking.com",
  "bookingcom",
  "expedia",
  "hotels.com",
  "tripadvisor",
  "delta",
  "united",
  "american-air",
  "southwest",
  "jetblue",
  "spirit-air",
  "expedia",
  "stubhub",
  "ticketmaster",
  "seatgeek",
  "netflix",
  "spotify",
  "hulu",
  "disney+",
  "disneyplus",
  "hbo",
  "max-",
  "youtube",
  "twitch",
  "steam",
  "playstation",
  "xbox",
  "nintendo",
  "microsoft",
  "office365",
  "adobe",
  "dropbox",
  "github",
  "gitlab",
  "atlassian",
  "slack",
  "zoom",
  "notion",
  "figma",
  "canva",
  "godaddy",
  "namecheap",
  "cloudflare",
  "digitalocean",
  "heroku",
  "vercel",
  "netlify",
  "shop-pay",
  "shoppay",
  "poshmark",
  "mercari",
  "facebook-marketplace",
  "fb-marketplace",
  "craigslist",
  "offerup",
  "depop",
  "stockx",
  "goat",
  "grailed",
  "aliexpress",
  "alibaba",
  "wish",
  "shein",
  "temu",
  "rakuten",
  "newegg",
  "bhphotovideo",
  "bhphoto",
  "adorama",
  "chewy",
  "petco",
  "petsmart",
  "sephora",
  "ulta",
  // Bank / card issuers often in export names
  "chase",
  "bankofamerica",
  "bank-of-america",
  "bofa",
  "wells-fargo",
  "wellsfargo",
  "citi",
  "citibank",
  "capital-one",
  "capitalone",
  "discover",
  "american-express",
  "americanexpress",
  "amex",
  "usbank",
  "us-bank",
  "pnc",
  "td-bank",
  "tdbank",
  "schwab",
  "fidelity",
  "vanguard",
  "robinhood",
  "coinbase",
  "binance",
  "sofi",
  "ally",
  "navy-federal",
  "nfcu",
  // File / export naming patterns
  "order-history",
  "order_history",
  "orderhistory",
  "order-details",
  "order_details",
  "orderdetails",
  "order-summary",
  "order_summary",
  "ordersummary",
  "order-confirm",
  "order_confirm",
  "purchase-history",
  "purchase_history",
  "purchasehistory",
  "purchase-order",
  "purchase_order",
  "purchaseorder",
  "po-",
  "_po_",
  "sales-order",
  "sales_order",
  "salesorder",
  "sales-receipt",
  "sales_receipt",
  "payment-receipt",
  "payment_receipt",
  "payment-confirmation",
  "payment_confirmation",
  "transaction-history",
  "transaction_history",
  "transactionhistory",
  "transaction-export",
  "transaction_export",
  "txn-export",
  "txn_export",
  "txn-history",
  "txn_history",
  "account-statement",
  "account_statement",
  "monthly-statement",
  "monthly_statement",
  "e-statement",
  "estatement",
  "e-receipt",
  "ereceipt",
  "e-invoice",
  "einvoice",
  "tax-document",
  "tax_document",
  "1099",
  "w-9",
  "w9",
  "1098",
  "ofx",
  "qfx",
  "qbo",
  "quicken",
  "quickbooks",
  "mint-export",
  "mint_export",
  "ynab",
  "monarch",
  "personal-capital",
  "empower",
  "csv-export",
  "csv_export",
  "data-export",
  "data_export",
  "download-orders",
  "download_orders",
  "my-orders",
  "my_orders",
  "myorders",
  "my-purchases",
  "my_purchases",
  "mypurchases",
  "your-orders",
  "your_orders",
  "your-receipt",
  "your_receipt",
  "your-invoice",
  "your_invoice",
  "itemized",
  "line-item",
  "line_item",
  "lineitems",
  "sku",
  "skus",
  "upc",
  "barcode",
  "pos-receipt",
  "pos_receipt",
  "cash-receipt",
  "cash_receipt",
  "gift-receipt",
  "gift_receipt",
  "giftcard",
  "gift-card",
  "gift_card",
  "loyalty",
  "rewards",
  "points-redemption",
  "subscription",
  "subscriptions",
  "recurring",
  "membership",
  "renewal",
  "renewals",
  "renewed",
  "billing-history",
  "billing_history",
  "billinghistory",
  "payment-history",
  "payment_history",
  "paymenthistory",
  "invoice-history",
  "invoice_history",
  "remittance",
  "remit",
  "proforma",
  "pro-forma",
  "credit-memo",
  "credit_memo",
  "creditmemo",
  "debit-memo",
  "debit_memo",
  "debitmemo",
  "settlement",
  "settlements",
  "payout",
  "payouts",
  "disbursement",
  "reimbursement",
  "reimbursements",
  "expense-report",
  "expense_report",
  "expensereport",
  "t&e",
  "travel-expense",
  "travel_expense",
  "concur",
  "expensify",
  "ramp",
  "brex",
  "divvy",
  "spendesk",
  "bill.com",
  "billcom",
  "freshbooks",
  "xero",
  "wave-accounting",
  "wave_accounting",
  "receipt-scan",
  "receipt_scan",
  "scanned-receipt",
  "scanned_receipt",
  "photo-receipt",
  "photo_receipt",
  "img-receipt",
  "img_receipt",
];

function isIgnoredSystemFile(name: string) {
  const base = name.split("/").pop() ?? name;
  const lower = base.toLowerCase();
  return (
    lower === ".ds_store" ||
    lower === "thumbs.db" ||
    lower === "desktop.ini" ||
    lower.startsWith("._")
  );
}

function filenameMatchesPurchaseKeywords(name: string) {
  if (isIgnoredSystemFile(name)) return false;
  const lower = name.toLowerCase();
  return PURCHASE_FILENAME_KEYWORDS.some((keyword) =>
    lower.includes(keyword.toLowerCase()),
  );
}

function getScanCutoffMs(now = Date.now()) {
  return now - LOOKBACK_MS;
}

type MatchedFile = {
  name: string;
  lastModified: number;
  file: File;
};

type PaymentAttributes = {
  brand: string | null;
  product: string | null;
  purchaseItem: string | null;
  transactionDate: string | null;
  location: string | null;
  receiptId: string | null;
  typeOfPurchase: string | null;
};

type PurchaseRecord = PaymentAttributes & { sourceFile: string };

const PAYMENT_COLUMNS: { key: keyof PaymentAttributes; label: string }[] = [
  { key: "brand", label: "Brand" },
  { key: "product", label: "Product" },
  { key: "purchaseItem", label: "Purchase item" },
  { key: "transactionDate", label: "Transaction date" },
  { key: "location", label: "Location" },
  { key: "receiptId", label: "Receipt ID" },
  { key: "typeOfPurchase", label: "Type of purchase" },
];

function displayAttr(value: string | null) {
  return value == null || value.trim() === "" ? "none" : value;
}

function matchPurchaseFiles(files: File[], cutoffMs: number): MatchedFile[] {
  return files
    .filter(
      (file) =>
        !isIgnoredSystemFile(file.name) &&
        file.lastModified >= cutoffMs &&
        filenameMatchesPurchaseKeywords(file.name),
    )
    .map((file) => ({
      name: file.name,
      lastModified: file.lastModified,
      file,
    }));
}

export default function UploadPurchase() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanCutoffUsed, setScanCutoffUsed] = useState<number | null>(null);
  const [matchedFiles, setMatchedFiles] = useState<MatchedFile[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [extractStatus, setExtractStatus] = useState<string | null>(null);

  function openFolderPicker() {
    setScanError(null);
    inputRef.current?.click();
  }

  async function extractPurchases(matches: MatchedFile[]) {
    if (!matches.length) {
      setPurchases([]);
      setExtractStatus(null);
      return;
    }

    setExtracting(true);
    setExtractStatus(`Extracting purchases from ${matches.length} file(s)…`);
    setPurchases([]);

    try {
      const form = new FormData();
      for (const match of matches) {
        form.append("files", match.file, match.name);
      }

      const res = await fetch("/api/extract-purchases", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        error?: string;
        purchases?: PurchaseRecord[];
        truncated?: boolean;
        maxFiles?: number;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Extraction failed.");
      }

      setPurchases(data.purchases ?? []);
      setExtractStatus(
        data.truncated
          ? `Done (only first ${data.maxFiles} files were sent to OpenAI).`
          : `Done — ${(data.purchases ?? []).length} purchase(s) found.`,
      );
    } catch (err) {
      console.error("[scan] extract failed", err);
      setScanError(
        err instanceof Error ? err.message : "Failed to extract purchases.",
      );
      setExtractStatus(null);
    } finally {
      setExtracting(false);
    }
  }

  async function onFolderSelected(list: FileList | null) {
    if (!list) return;

    setScanning(true);
    setScanError(null);
    setPurchases([]);
    setExtractStatus(null);

    try {
      const cutoffMs = getScanCutoffMs();
      setScanCutoffUsed(cutoffMs);
      const files = Array.from(list);
      console.log("[scan] files in folder", files.length);

      const keywordMatches = matchPurchaseFiles(files, cutoffMs);
      console.log(
        "[scan] matches",
        keywordMatches.length,
        keywordMatches.map((f) => f.name),
      );
      setMatchedFiles(keywordMatches);
      setHasScanned(true);
      setScanning(false);

      await extractPurchases(keywordMatches);
    } catch (err) {
      console.error("[scan] failed", err);
      setScanError(
        err instanceof Error ? err.message : "Failed to scan folder.",
      );
      setScanning(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4">
      <div className="flex flex-col gap-3">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          {...({ webkitdirectory: "", directory: "" } as object)}
          onChange={(e) => {
            void onFolderSelected(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={openFolderPicker}
          disabled={scanning || extracting}
          className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {scanning
            ? "Scanning…"
            : extracting
              ? "Extracting purchases…"
              : "Scan for purchase history files"}
        </button>
        <p className="text-xs text-neutral-500">
          Choose your Downloads folder when prompted. Scans files from the last{" "}
          {LOOKBACK_MS / (24 * 60 * 60 * 1000)} day(s), then asks OpenAI to
          extract Payment Attributes only for explicit purchases.
        </p>
        {scanError && (
          <p className="text-sm text-red-600" role="alert">
            {scanError}
          </p>
        )}
        {scanCutoffUsed != null && !scanning && hasScanned && (
          <p className="text-xs text-neutral-500">
            Scanned files modified since{" "}
            {new Date(scanCutoffUsed).toLocaleString()}.
          </p>
        )}
        {extractStatus && (
          <p className="text-xs text-neutral-600">{extractStatus}</p>
        )}
      </div>

      {hasScanned && (
        <div className="border-t border-neutral-200 pt-5">
          <h2 className="text-sm font-semibold text-neutral-900">
            Filename matches ({matchedFiles.length})
          </h2>
          {matchedFiles.length === 0 ? (
            <p className="mt-1 text-sm text-neutral-500">
              No purchase-related filenames found in this scan.
            </p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-800">
              {matchedFiles.map((file) => (
                <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(purchases.length > 0 || (!extracting && hasScanned && matchedFiles.length > 0)) && (
        <div className="border-t border-neutral-200 pt-5">
          <h2 className="text-sm font-semibold text-neutral-900">
            Purchases — Payment Attributes ({purchases.length})
          </h2>
          {purchases.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">
              No explicit purchases found in the matched files.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200">
              <table className="min-w-full border-collapse text-left text-xs text-neutral-800">
                <thead className="bg-neutral-100 text-neutral-700">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2 font-semibold">
                      Source file
                    </th>
                    {PAYMENT_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className="whitespace-nowrap px-3 py-2 font-semibold"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((row, i) => (
                    <tr
                      key={`${row.sourceFile}-${i}`}
                      className="border-t border-neutral-200 odd:bg-white even:bg-neutral-50"
                    >
                      <td className="max-w-[12rem] truncate px-3 py-2" title={row.sourceFile}>
                        {row.sourceFile}
                      </td>
                      {PAYMENT_COLUMNS.map((col) => (
                        <td key={col.key} className="whitespace-nowrap px-3 py-2">
                          {displayAttr(row[col.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
