// ============================================================
// CHAT TEST: LIVE — drives the real POST /api/chat endpoint.
// Needs the dev server running (default http://localhost:3000,
// override with CHAT_LIVE_URL). Assertions stay loose so model
// variance can't false-fail — the point is the RIGHT products /
// the right shape, not the exact wording.
//   npm run chat:test:live
// ============================================================

import { checkExpectation, liveCases, type Expectation } from "./cases";
import type { ChatTurn } from "@/lib/gemini";

const BASE_URL = process.env.CHAT_LIVE_URL ?? "http://localhost:3000";

interface ChatResponse {
  reply?: string;
  products?: unknown[];
  mode?: string;
  shopLink?: string;
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

function check(
  name: string,
  data: ChatResponse | null,
  expect: Expectation
): void {
  if (!data?.reply) {
    report(name, false, "no reply from /api/chat");
    return;
  }
  const errors = checkExpectation(data.reply, data.products ?? [], expect);
  if (data.mode === undefined) errors.push("response missing mode");
  if (expect.shopLink === true && !data.shopLink) errors.push("expected shopLink");
  if (expect.shopLink === false && data.shopLink) errors.push("unexpected shopLink");
  report(name, errors.length === 0, errors.join("; "));
}

async function main(): Promise<void> {
  console.log(`\n── Live /api/chat cases (${BASE_URL}) ──`);
  for (const c of liveCases) {
    try {
      const turns = c.buildTurns ? await c.buildTurns() : (c.turns ?? []);
      const history: ChatTurn[] = turns.map((t) => ({
        role: t.role === "model" ? "model" : "user",
        content: t.content,
      }));
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: c.message,
          sessionId: `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          history,
        }),
      });
      const data = (await res.json().catch(() => null)) as ChatResponse | null;
      check(c.name, data, c.expect);
    } catch (e) {
      report(c.name, false, `error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(
    `\n${passCount} passed, ${failCount} failed${failures.length ? ":" : "."}`
  );
  for (const f of failures) console.log(`  - ${f}`);
  if (failCount > 0) {
    console.log(
      `\nTip: start the dev server (npm run dev) before running live tests.`
    );
  }
  process.exit(failCount > 0 ? 1 : 0);
}

main();
