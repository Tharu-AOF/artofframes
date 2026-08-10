// ============================================================
// KB — shared knowledge-base types and retrieval scoring.
// The chunks themselves live in the `kb_chunks` table (public
// read); this module holds the pure ranking logic both the chat
// retrieval and (conceptually) the builder rely on.
// ============================================================

export interface KnowledgeChunk {
  page: string;
  section: string;
  title: string;
  content: string;
  sourceUrl: string;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** Light stopwords — enough to keep question words from matching everything. */
const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "do",
  "does",
  "for",
  "to",
  "of",
  "and",
  "or",
  "in",
  "on",
  "with",
  "me",
  "my",
  "i",
  "you",
  "your",
  "how",
  "what",
  "want",
  "need",
  "can",
  "please",
  "about",
  "this",
  "that",
  "එක",
  "එකක්",
  "වගේ",
  "ද",
  "නැද්ද",
]);

export interface ScoredChunk extends KnowledgeChunk {
  score: number;
}

/**
 * Rank chunks by how much of the question's vocabulary they cover.
 * Title and section headings weigh more than body text.
 */
export function scoreChunks(
  question: string,
  chunks: KnowledgeChunk[],
  limit = 3
): ScoredChunk[] {
  const tokens = tokenize(question).filter((t) => !STOPWORDS.has(t));
  if (!chunks.length) return [];

  const scored = chunks.map((c) => {
    let score = 0;
    const title = tokenize(c.title);
    const section = tokenize(c.section);
    const body = tokenize(c.content);
    for (const t of tokens) {
      if (title.includes(t)) score += 3;
      if (section.includes(t)) score += 2;
      if (body.includes(t)) score += 1;
    }
    return { ...c, score };
  });

  // No overlapping tokens at all → nothing relevant; don't return noise.
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Compact passage block handed to OpenRouter — facts only. */
export function chunksToContext(chunks: ScoredChunk[]): string {
  if (!chunks.length) return "";
  return (
    "WEBSITE KNOWLEDGE (from the site's pages — answer from these when relevant):\n" +
    chunks
      .map(
        (c, i) =>
          `${i + 1}. [${c.section}] ${c.title}: ${c.content.slice(0, 400)}`
      )
      .join("\n")
  );
}
