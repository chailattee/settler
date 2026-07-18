import { env } from "@/lib/env";

/** Thin OpenRouter chat client (REST, no SDK). Two entry points:
 *   - chat():   free-form text completion.
 *   - chatJSON(): structured output validated against a JSON Schema.
 *
 *  OpenRouter is OpenAI-compatible, so this is the /chat/completions shape. */

const BASE = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOpts {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/** Global concurrency gate for LLM calls. Extraction and lawsuit analysis now
 *  run in parallel and overlap, which could otherwise fire dozens of requests
 *  at once and trip OpenRouter rate limits. This caps total in-flight calls
 *  across the whole workflow so we stay fast but bounded. */
const MAX_CONCURRENT = 12;
let active = 0;
const waiters: (() => void)[] = [];

async function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
}

function release(): void {
  const next = waiters.shift();
  if (next) next(); // hand the slot straight to the next waiter (active unchanged)
  else active--;
}

async function call(messages: ChatMessage[], opts: ChatOpts, responseFormat?: unknown) {
  await acquire();
  let res: Response;
  try {
    res = await fetch(BASE, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openrouterKey()}`,
        "Content-Type": "application/json",
        // Optional attribution headers OpenRouter recommends.
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Settlers",
      },
      body: JSON.stringify({
        model: opts.model ?? env.openrouterModel(),
        messages,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 2048,
        ...(responseFormat ? { response_format: responseFormat } : {}),
      }),
    });
  } finally {
    release();
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned no content");
  return content;
}

export async function chat(messages: ChatMessage[], opts: ChatOpts = {}): Promise<string> {
  return call(messages, opts);
}

/** Ask the model for JSON matching `schema` and parse it. `schema` is a plain
 *  JSON Schema object. Retries once on parse failure with a corrective nudge. */
export async function chatJSON<T>(
  messages: ChatMessage[],
  schema: { name: string; schema: Record<string, unknown> },
  opts: ChatOpts = {},
): Promise<T> {
  const responseFormat = {
    type: "json_schema",
    json_schema: { name: schema.name, strict: true, schema: schema.schema },
  };

  // Attempt 1: native structured output. Not every model on OpenRouter accepts
  // response_format=json_schema (some Anthropic routes 400 on it), so catch
  // both request errors and parse errors and fall through.
  try {
    const raw = await call(messages, opts, responseFormat);
    return JSON.parse(stripFences(raw)) as T;
  } catch {
    // Attempt 2: prompt-guided JSON — embed the schema and demand raw JSON.
    const guided: ChatMessage[] = [
      ...messages,
      {
        role: "user",
        content:
          "Respond with ONLY a JSON object matching this JSON Schema. No prose, " +
          `no code fences.\n\nSchema:\n${JSON.stringify(schema.schema)}`,
      },
    ];
    const raw = await call(guided, opts);
    return JSON.parse(stripFences(raw)) as T;
  }
}

function stripFences(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}
