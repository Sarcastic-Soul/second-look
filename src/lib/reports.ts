import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import type { Analysis } from "./pipeline";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Report {
  id: string;
  createdAt: Date;
  source: "email" | "web";
  analysis: Analysis;
}

/** A finished check by id, or null. Ids are random UUIDs, so a report link is only known to whoever got it. */
export async function getReport(id: string): Promise<Report | null> {
  if (!UUID.test(id)) return null;
  const [row] = await db().select().from(schema.checks).where(eq(schema.checks.id, id));
  if (!row || row.status !== "done" || !row.analysis) return null;
  return { id: row.id, createdAt: row.createdAt, source: row.source, analysis: row.analysis as Analysis };
}
