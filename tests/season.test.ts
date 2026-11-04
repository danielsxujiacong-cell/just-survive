import { test } from "node:test";
import assert from "node:assert/strict";
import { season, newGame, act, temperature, advance } from "../src/engine/game";
test("autumn first, seven days each, repeating every 28 days", () => {
  for (let d = 1; d <= 84; d++) {
    const s = newGame(42);
    s.time = (d - 1) * 24 + 8;
    const expected = Math.floor((d - 1) / 7) % 4;
    const current = season(s);
    assert.equal(current.name, ["秋季", "冬季", "春季", "夏季"][expected]);
    assert.equal(current.temperature, [12, -5, 20, 32][expected]);
    assert.equal(current.day, ((d - 1) % 7) + 1);
    assert.equal(current.daysUntilNext, 7 - ((d - 1) % 7));
  }
});
test("existing saves retain time, inventory and progress; seasons are derived without migration", () => {
  const s = newGame(42);
  s.time = 28 * 24 + 13;
  s.progress[2] = 4;
  s.bag.wood = 17;
  const before = JSON.stringify(s);
  assert.equal(season(s).name, "秋季");
  assert.equal(JSON.stringify(s), before);
  assert.equal(s.time, 685);
});
test("transition logs once and never applies instant cold damage for the entire action", () => {
  const s = newGame(42);
  s.time = 7 * 24 - 0.1;
  s.location = 1;
  const hp = s.stats.hp;
  advance(s, 0.2);
  assert.equal(season(s).name, "冬季");
  assert.ok(s.stats.hp >= hp - 0.21);
  assert.equal(s.logs.filter((l) => l.includes("季节更替")).length, 1);
  advance(s, 0.2);
  assert.equal(s.logs.filter((l) => l.includes("季节更替")).length, 1);
});
test("winter clothing and fire warmth still work; summer heat increases water consumption", () => {
  let s = act(act(newGame(42), "talent", "engineer"), "continuePrologue");
  s.time = 7 * 24 + 8;
  s.location = 1;
  assert.equal(temperature(s), 3);
  const before = s.stats.hp;
  advance(s, 1);
  assert.ok(s.stats.hp < before);
  s.equipment.armor = "coat";
  assert.equal(temperature(s), 25);
  s.time = 21 * 24 + 8;
  s.equipment.armor = "";
  const water = s.stats.water;
  advance(s, 1);
  assert.equal(water - s.stats.water, 3);
});
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import App from "../src/App";
test("every season boundary logs the correct season exactly once", () => {
  for (const [d, name] of [
    [8, "冬季"],
    [15, "春季"],
    [22, "夏季"],
    [29, "秋季"],
  ] as const) {
    const s = newGame(42);
    s.time = (d - 1) * 24 - 0.1;
    advance(s, 0.2);
    assert.equal(season(s).name, name);
    assert.equal(season(s).day, 1);
    assert.equal(s.logs.filter((l) => l.includes("季节更替")).length, 1);
    assert.ok(s.logs.some((l) => l.includes(`进入${name}`)));
  }
});
test("saved day is displayed by the UI and winter presets use the same calendar", () => {
  const s = act(act(newGame(42), "talent", "engineer"), "continuePrologue");
  s.time = 7 * 24 + 8;
  s.storage.coat = 1;
  const saved = JSON.stringify(s);
  const html = renderToStaticMarkup(
    createElement(App, { initialState: s, storageKey: "season-rule-test" }),
  );
  assert.ok(html.includes("冬季 · 第1/7天"));
  assert.ok(html.includes("距春季还有7天"));
  assert.equal(JSON.stringify(s), saved);
  assert.equal(act(s, "prepare", 1).equipment.armor, "coat");
  s.time = 21 * 24 + 8;
  s.storage.leather = 1;
  assert.equal(act(s, "prepare", 1).equipment.armor, "leather");
});
