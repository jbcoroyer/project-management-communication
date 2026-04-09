import { defaultColumns, defaultCompanies, defaultDomains } from "./types";

export type ReferenceRecord = {
  id: string;
  name: string;
  color?: string | null;
  logoUrl?: string | null;
  avatarUrl?: string | null;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toReferenceRecords(values: string[]): ReferenceRecord[] {
  return values.map((name) => ({
    id: slugify(name) || name,
    name,
  }));
}

export const fallbackReferenceData = {
  admins: [] as ReferenceRecord[],
  companies: toReferenceRecords(defaultCompanies),
  domains: toReferenceRecords(defaultDomains),
  columns: toReferenceRecords(defaultColumns),
};
