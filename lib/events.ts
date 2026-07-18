import type { PurchaseRecord } from "@/lib/types";

/** Streaming agent events.
 *
 *  The Gmail -> class-action workflow emits these over Server-Sent Events so the
 *  UI can render a live activity feed of what the agent is doing. Each event is
 *  one `data:` line of JSON.
 *
 *  UI consumes with fetch + ReadableStream (see API_INTEGRATION.md), splitting
 *  on "\n\n" and JSON-parsing the payload after "data: ". */

export type AgentEvent =
  | { type: "status"; step: string; message: string }
  | { type: "gmail_scanning"; scanned: number; total: number }
  | { type: "purchase_found"; purchase: PurchaseRecord & { brand: string } }
  | { type: "brand_lookup"; brand: string; message: string }
  | {
      type: "match";
      brand: string;
      /** Which discovery source surfaced this: a CourtListener docket or web. */
      source: "courtlistener" | "web";
      title: string;
      url: string;
      /** Official claim-filing site, if known (mainly web-sourced). */
      claimUrl: string | null;
      active: boolean;
      confidence: number;
      summary: string;
      whyQualified: string[];
      uncertainties: string[];
    }
  | { type: "done"; purchases: number; matches: number }
  | { type: "error"; message: string };

export type Emit = (event: AgentEvent) => void;

/** Build a streaming SSE Response, driving `run` with an `emit` fn. The stream
 *  closes when `run` resolves; errors are emitted then the stream closes. */
export function sseResponse(run: (emit: Emit) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit: Emit = (event) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        await run(emit);
      } catch (err) {
        emit({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable proxy buffering so events flush immediately.
      "X-Accel-Buffering": "no",
    },
  });
}
