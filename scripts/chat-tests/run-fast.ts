// ============================================================
// CHAT TEST: FAST — unit checks + deterministic golden cases.
// No AI calls, no network beyond Supabase for the catalog.
//   npm run chat:test
// The deterministic cases need the shop data (Supabase env, same
// as the app); they're skipped with a warning when it's missing.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { tryDeterministicAnswer } from "@/lib/chat/deterministic";
import { extractState } from "@/lib/chat/state";
import {
  checkExpectation,
  deterministicCases,
  unitChecks,
  type Expectation,
} from "./cases";
import type { ChatTurn } from "@/lib/gemini";

// ─── Env (tsx doesn't load .env.local like Next does) ──────────────────────

function loadEnv(file: string): void {
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // missing file — fine
  }
}
loadEnv(".env.local");
loadEnv(".env");

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Same widening the /api/chat route uses for retrieval queries. */
function recentUserQuestions(history: ChatTurn[], current: string): string {
  const prev = history
    .filter((t) => t.role === "user")
    .slice(-2)
    .map((t) => t.content);
  return [...prev, current].join(" ");
}

let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function report(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    passCount += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failCount += 1;
    failures.push(`${name}: ${detail ?? "failed"}`);
    console.log(`  ✗ ${name} — ${detail ?? "failed"}`);
  }
}

function checkDet(
  name: string,
  reply: string | null,
  cards: unknown[],
  expect: Expectation,
  shopLink?: string
): void {
  if (expect.expectNull) {
    report(name, reply === null);
    return;
  }
  if (reply === null) {
    report(name, false, "deterministic path returned null (falls to AI)");
    return;
  }
  const errors = checkExpectation(reply, cards, expect);
  if (expect.shopLink === true && !shopLink) errors.push("expected shopLink");
  if (expect.shopLink === false && shopLink) errors.push("unexpected shopLink");
  report(name, errors.length === 0, errors.join("; "));
}

// ─── Run ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\n── Unit checks (no database) ──");
  for (const check of unitChecks) {
    const { pass, detail } = check.fn();
    report(check.name, pass, detail);
  }

  const hasDb = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("\n── Deterministic golden cases (catalog) ──");
  if (!hasDb) {
    console.log("  ⚠ NEXT_PUBLIC_SUPABASE_URL not set — skipping deterministic cases.");
  } else {
    for (const c of deterministicCases) {
      try {
        const { turns, message } = await c.run();
        const state = await extractState(turns, message);
        const res = await tryDeterministicAnswer(
          message,
          recentUserQuestions(turns, message),
          state
        );
        checkDet(c.name, res?.reply ?? null, res?.products ?? [], c.expect, res?.shopLink);
      } catch (e) {
        report(c.name, false, `error: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  console.log(
    `\n${passCount} passed, ${failCount} failed${failures.length ? ":" : "."}`
  );
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(failCount > 0 ? 1 : 0);
}

main();
