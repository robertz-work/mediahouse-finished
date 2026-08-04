import { dataPath, readJson, withLock, writeJson } from "./fileLock";

export interface Settings {
  requireOrderApproval: boolean;
  holdTimeoutMinutes: number;
  contactEmail: string;
  voivodeships: string[];
  companyName?: string;
  companyAddress?: string;
  companyNip?: string;
  companyBankAccount?: string;
  companyBankName?: string;
}

const FILE = dataPath("settings.json");

export async function load(): Promise<Settings> {
  return readJson<Settings>(FILE);
}

export async function save(patch: Partial<Settings>): Promise<Settings> {
  return withLock(FILE, async () => {
    const current = await readJson<Settings>(FILE);
    const updated = { ...current, ...patch };
    await writeJson(FILE, updated);
    return updated;
  });
}
