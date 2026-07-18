import { promises as fs } from "fs";
import path from "path";
import type { PurchaseRecord, MatchResult, ClaimRun, EligibilityRules } from "./schemas";

// Flat-file JSON store — hackathon-grade, no DB.

const STORE_PATH = path.join(process.cwd(), "data", "store.json");
const SETTLEMENTS_DIR = path.join(process.cwd(), "data", "settlements");

export type Store = {
  purchases: PurchaseRecord[];
  matches: MatchResult[];
  claims: ClaimRun[];
};

const EMPTY: Store = { purchases: [], matches: [], claims: [] };

export const readStore = async (): Promise<Store> => {
  try {
    return JSON.parse(await fs.readFile(STORE_PATH, "utf8"));
  } catch {
    return structuredClone(EMPTY);
  }
};

export const writeStore = async (store: Store) => {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
};

export const updateStore = async (fn: (s: Store) => void): Promise<Store> => {
  const store = await readStore();
  fn(store);
  await writeStore(store);
  return store;
};

export const readSettlements = async (): Promise<EligibilityRules[]> => {
  try {
    const files = await fs.readdir(SETTLEMENTS_DIR);
    return Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (f) =>
          JSON.parse(await fs.readFile(path.join(SETTLEMENTS_DIR, f), "utf8"))
        )
    );
  } catch {
    return [];
  }
};
