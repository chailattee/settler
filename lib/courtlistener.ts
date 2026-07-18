import { env } from "@/lib/env";

/** CourtListener (Free Law Project) client — finds class-action lawsuits filed
 *  against a brand.
 *
 *  We use the v4 RECAP docket search (`type=r`) scoped to the case name, so a
 *  search for "Fitbit" returns dockets actually captioned e.g.
 *  "Leonhardt v. Fitbit, LLC" rather than every document that merely mentions
 *  the word. A docket with `dateTerminated === null` is still open ("active"),
 *  which is our trigger to advance the workflow.
 *
 *  Docs: https://www.courtlistener.com/help/api/rest/search/ */

const SEARCH = "https://www.courtlistener.com/api/rest/v4/search/";

export interface ClassActionCase {
  /** CourtListener docket id (stable identifier for caching / linking). */
  docketId: number;
  caseName: string;
  court: string;
  courtId: string;
  docketNumber: string;
  dateFiled: string | null;
  /** null => the case is still open (active). */
  dateTerminated: string | null;
  active: boolean;
  /** Full https URL to the docket on CourtListener. */
  url: string;
  cause: string;
  suitNature: string;
}

interface RawResult {
  docket_id: number;
  caseName: string;
  court: string;
  court_id: string;
  docketNumber: string;
  dateFiled: string | null;
  dateTerminated: string | null;
  docket_absolute_url: string;
  cause?: string;
  suitNature?: string;
}

function normalize(r: RawResult): ClassActionCase {
  return {
    docketId: r.docket_id,
    caseName: r.caseName,
    court: r.court,
    courtId: r.court_id,
    docketNumber: r.docketNumber,
    dateFiled: r.dateFiled,
    dateTerminated: r.dateTerminated,
    active: r.dateTerminated == null,
    url: r.docket_absolute_url?.startsWith("http")
      ? r.docket_absolute_url
      : `https://www.courtlistener.com${r.docket_absolute_url}`,
    cause: r.cause ?? "",
    suitNature: r.suitNature ?? "",
  };
}

export interface SearchOpts {
  /** Only return cases with no termination date. Default true. */
  activeOnly?: boolean;
  /** Cap results after filtering. Default 10. */
  limit?: number;
}

/** Search dockets whose case name contains `brand`. */
export async function searchClassActions(
  brand: string,
  opts: SearchOpts = {},
): Promise<ClassActionCase[]> {
  const { activeOnly = true, limit = 10 } = opts;
  const clean = brand.trim();
  if (!clean) return [];

  // Quote the brand and scope to the case name for precision.
  const q = `caseName:("${clean.replace(/"/g, "")}")`;
  const params = new URLSearchParams({
    q,
    type: "r",
    order_by: "dateFiled desc",
  });

  const token = env.courtListenerToken();
  const res = await fetch(`${SEARCH}?${params}`, {
    headers: token ? { Authorization: `Token ${token}` } : {},
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CourtListener ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { results?: RawResult[] };
  let cases = (data.results ?? []).map(normalize);
  if (activeOnly) cases = cases.filter((c) => c.active);
  return cases.slice(0, limit);
}
