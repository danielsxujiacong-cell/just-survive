import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { SurvivorAgent } from "./survivor-agent";
const comparisons: unknown[] = [];
for (const route of ["A", "B", "C", "D"] as const)
  test(`QoL normal campaign ${route} reduces clicks without GM`, () => {
    const old = new SurvivorAgent(42, route),
      quick = new SurvivorAgent(42, route, "engineer", true);
    const baseline = old.campaign(),
      qol = quick.campaign();
    assert.equal(qol.gm, 0);
    assert.ok(
      qol.actions < baseline.actions * 0.7,
      `${qol.actions}/${baseline.actions}`,
    );
    const result = {
      route,
      seed: 42,
      baselineActions: baseline.actions,
      qolActions: qol.actions,
      reductionPercent: Math.round((1 - qol.actions / baseline.actions) * 100),
      baselineDay: baseline.day,
      qolDay: qol.day,
      gm: 0,
      sweeps: qol.actionCounts.sweep || 0,
    };
    mkdirSync('tests/results/replays',{recursive:true});
    writeFileSync(`tests/results/replays/${route}.json`,JSON.stringify(quick.s));
    if(route==='A')for(const [name,state] of Object.entries(quick.frames))writeFileSync(`tests/results/replays/${name}.json`,JSON.stringify(state));
    comparisons.push(result);
    console.log(JSON.stringify(result));
  });
test("save click-reduction evidence", () => {
  assert.equal(comparisons.length, 4);
  mkdirSync("tests/results", { recursive: true });
  writeFileSync(
    "tests/results/qol-click-reduction.json",
    JSON.stringify(comparisons, null, 2),
  );
});
