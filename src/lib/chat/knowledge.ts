// ============================================================
// CHAT KNOWLEDGE — pulls relevant passages from `kb_chunks`
// (public read RLS) and ranks them with the shared scorer.
// Written content only — never product/pricing data, which lives
// in the products tables and comes from src/lib/chat/products.ts.
// ============================================================

import { createClient } from "@/lib/supabase/server";
import {
  chunksToContext,
  scoreChunks,
  type KnowledgeChunk,
  type ScoredChunk,
} from "@/lib/kb";

interface KbRow {
  page: string;
  section: string;
  title: string;
  content: string;
  source_url: string;
}

export async function searchKnowledge(
  question: string,
  limit = 3
): Promise<ScoredChunk[]> {
  let rows: KbRow[];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("kb_chunks").select("*");
    if (error) return [];
    rows = (data ?? []) as KbRow[];
  } catch {
    return []; // table missing / not configured yet — degrade silently
  }
  if (!rows.length) return [];

  const chunks: KnowledgeChunk[] = rows.map((r) => ({
    page: r.page,
    section: r.section,
    title: r.title,
    content: r.content,
    sourceUrl: r.source_url,
  }));

  return scoreChunks(question, chunks, limit);
}

export { chunksToContext };
