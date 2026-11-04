import assert from "node:assert/strict";
import { test } from "node:test";
import { writeFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { SurvivorAgent } from "./survivor-agent";
import { talents } from "../src/data/lore";
const results: (ReturnType<SurvivorAgent["summary"]> & { talent: string })[] =
  [];
const seeds = [1, 7, 42, 99, 3147, 2026, 65535, 8675309, 123456789, 4294967295];
for (const route of ["A", "B", "C", "D"] as const)
  for (const seed of seeds)
    test(`zero GM ${route} seed ${seed} all six talents`, () => {
      for (const talent of talents) {
        const agent = new SurvivorAgent(seed, route, talent.id);
        try {
          results.push({ ...agent.campaign(), talent: talent.id });
        } catch (error) {
          throw Error(
            `talent=${talent.id} route=${route} seed=${seed}\n${error instanceof Error ? error.stack : error}\n${agent.trace.slice(-20).join("\n")}`,
          );
        }
      }
    });
test("write reproducible simulation evidence", () => {
  assert.equal(
    results.length,
    240,
    "All 240 campaigns must pass before publishing evidence",
  );
  const sourceHash = createHash("sha256");
  for (const path of readdirSync("src", { recursive: true })
    .map(String)
    .filter((p) => /\.(ts|tsx|css)$/.test(p))
    .sort())
    sourceHash.update(path).update(readFileSync(join("src", path)));
  mkdirSync("tests/results", { recursive: true });
  writeFileSync(
    "tests/results/no-gm-report.json",
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceSHA256: sourceHash.digest("hex"),
        expectedCampaigns: 240,
        passRate: results.length / 240,
        autoRescues: results.reduce((n, r) => n + r.rescues, 0),
        seeds,
        talents: talents.map((t) => t.id),
        runs: results.length,
        gmActions: results.reduce((n, r) => n + r.gm, 0),
        results,
      },
      null,
      2,
    ),
  );
});
