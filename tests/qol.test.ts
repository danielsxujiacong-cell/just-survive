import { test } from "node:test";
import assert from "node:assert/strict";
import { act, newGame, weight, capacity, day } from "../src/engine/game";
import { keyboardAction } from "../src/engine/keyboard";
import { routeTargets, survivalHints } from "../src/engine/qol";
import { memorialSVG, sceneSVG } from "../src/engine/memorial";
import { battleFor } from "../src/engine/advanced";
import type { State } from "../src/types";
const ready = () =>
  act(act(newGame(42), "talent", "engineer"), "continuePrologue");
function totals(s: State) {
  const b = { ...s.storage };
  for (const [k, n] of Object.entries(s.bag)) b[k] = (b[k] || 0) + n;
  return Object.fromEntries(
    Object.entries(b)
      .filter(([, v]) => v > 0)
      .sort(),
  );
}
test("prologue gates survival and can be skipped without advancing time", () => {
  let s = act(newGame(42), "talent", "sailor");
  assert.equal(s.prologue, "playing");
  assert.equal(act(s, "travel", 1).journey, null);
  s = act(s, "continuePrologue");
  assert.equal(s.time, 8);
  assert.ok(act(s, "travel", 1).journey);
});
test("unload preserves equipped gear and core food and medicine, sends materials home", () => {
  let s = ready();
  s.bag = {
    knife: 1,
    torch: 3,
    wood: 50,
    iron: 10,
    herb: 12,
    roast: 8,
    water: 9,
    tonic: 3,
    bandage: 4,
  };
  const before = totals(s);
  s = act(s, "unload");
  assert.equal(s.bag.wood, 0);
  assert.equal(s.bag.herb, 0);
  assert.equal(s.bag.roast, 4);
  assert.equal(s.bag.water, 4);
  assert.equal(s.bag.tonic, 2);
  assert.equal(s.bag.bandage, 2);
  assert.equal(s.bag.knife, 1);
  assert.deepEqual(totals(s), before);
});
test("one-click preparation conserves all items and reserves at least 60% carrying capacity", () => {
  let s = ready();
  Object.assign(s.storage, {
    steelspear: 1,
    ironaxe: 1,
    gun: 1,
    crossbow: 1,
    bolt: 50,
    bullet: 0,
    leather: 1,
    pack: 1,
    water: 20,
    roast: 10,
    salve: 4,
    tonic: 4,
    pick: 1,
    torch: 2,
  });
  s.durability = { steelspear: 90, ironaxe: 100, crossbow: 80 };
  const before = totals(s);
  s = act(s, "prepare", 5);
  assert.equal(s.equipment.melee, "steelspear");
  assert.equal(s.equipment.ranged, "crossbow");
  assert.equal(s.bag.bolt, 10);
  assert.equal(s.bag.roast, 4);
  assert.equal(s.bag.water, 4);
  assert.equal(s.bag.salve, 2);
  assert.equal(s.bag.tonic, 2);
  assert.equal(s.bag.torch, 1);
  assert.ok(weight(s) <= capacity(s) * 0.4 + 1e-8);
  assert.deepEqual(totals(s), before);
  assert.equal(s.loadoutReport!.missing.length, 0);
});
test("preparation reports shortage instead of inventing supplies and picks winter coat", () => {
  let s = ready();
  s.storage.coat = 1;
  s.storage.water = 1;
  s.bag.water = 0;
  const before = totals(s);
  s = act(s, "prepare", 10);
  assert.equal(s.equipment.armor, "coat");
  assert.ok(s.loadoutReport!.missing.includes("纯净水3"));
  assert.deepEqual(totals(s), before);
  assert.ok(weight(s) <= capacity(s) * 0.4);
});
test("batch transfer replaces dozens of clicks and still enforces pack limits", () => {
  let s = ready();
  s = act(s, "transfer", "take:wood:all");
  assert.equal(s.bag.wood, 25);
  s = act(s, "transfer", "put:wood:all");
  assert.equal(s.bag.wood, 0);
  s.storage.stone = 1000;
  s = act(s, "transfer", "take:stone:all");
  assert.ok(weight(s) <= capacity(s) + 1e-8);
  assert.ok(s.storage.stone > 0);
  s = act(s, "transfer", "put:knife:all");
  assert.equal(s.bag.knife, 1);
});
test("safe sweeps require clearance and a wolf when delegated, pay real time and double survival costs", () => {
  let s = ready();
  assert.equal(act(s, "sweep", 1).sweeps, 0);
  s.progress[1] = 5;
  assert.equal(act(s, "sweep", 1).sweeps, 0);
  s.wolf = 1;
  const before = s.time,
    food = s.stats.hunger,
    water = s.stats.water;
  const result = act(s, "sweep", 1);
  assert.equal(result.time, before + 2);
  assert.ok(result.stats.hunger <= food - 4.39);
  assert.ok(result.stats.water <= water - 5.19);
  assert.ok(result.storage.wood > s.storage.wood);
  assert.equal(result.battle, null);
  assert.equal(result.encounter, null);
  assert.equal(result.sweeps, 1);
  assert.deepEqual(result.pearls, s.pearls);
});
test("road and encounter interruptions block shortcuts and remote storage access", () => {
  let s = act(ready(), "travel", 1);
  const inventory = totals(s);
  s = act(s, "prepare", 5);
  assert.deepEqual(totals(s), inventory);
  s = act(s, "unload");
  assert.deepEqual(totals(s), inventory);
});
test("route navigation uses material and quest gaps without leaking hidden lab node", () => {
  const s = ready();
  assert.ok(routeTargets(s, "A").includes(5));
  assert.deepEqual(routeTargets(s, "B"), [5]);
  s.lab = true;
  assert.ok(routeTargets(s, "B").includes(9));
  s.storage.pass = s.storage.disk = s.storage.uniform = 1;
  assert.deepEqual(routeTargets(s, "B"), [1]);
  s.pearls = [1, 2, 3, 4, 6, 7];
  assert.deepEqual(routeTargets(s, "D"), [6]);
});
test("survival compass prioritizes emergencies and current fog opportunity", () => {
  const s = ready();
  s.weather = "浓雾";
  s.stats.water = 10;
  const hints = survivalHints(s);
  assert.ok(hints.length >= 2 && hints.length <= 3);
  assert.equal(hints[0].kind, "生存警报");
  assert.ok(hints.some((h) => h.zone === 6 && h.kind === "天气机缘"));
});
test("battle keyboard mapping is QWER/AD and 1 head 2 torso 3 limbs", () => {
  const s = ready();
  s.battle = battleFor(s, "bear");
  assert.deepEqual(keyboardAction(s, "1"), { type: "aim", payload: "head" });
  assert.deepEqual(keyboardAction(s, "2"), { type: "aim", payload: "torso" });
  assert.deepEqual(keyboardAction(s, "3"), { type: "aim", payload: "limbs" });
  assert.equal(keyboardAction(s, "q")?.payload, "heavy");
  assert.equal(keyboardAction(s, "w")?.payload, "ranged");
  assert.equal(keyboardAction(s, "e")?.payload, "wolf");
  assert.equal(keyboardAction(s, "a")?.payload, "advance");
  assert.equal(keyboardAction(s, "d")?.payload, "retreat");
  s.stats.external = 30;
  assert.equal(keyboardAction(s, "r")?.payload, "bandage");
});
test("puzzle keys, fishing Space, encounter digits and Escape have context-specific effects", () => {
  const s = ready();
  s.puzzle = true;
  assert.equal(keyboardAction(s, "9")?.payload, 8);
  assert.equal(keyboardAction(s, " ", "", 4)?.payload, 4);
  assert.equal(keyboardAction(s, "Escape")?.type, "closePuzzle");
  s.puzzle = false;
  s.encounter = "8-0";
  assert.equal(keyboardAction(s, "1", "3147")?.payload, "0:3147");
  assert.ok(String(keyboardAction(s, "Escape")?.payload).startsWith("2:"));
  s.encounter = null;
  s.fishing = { phase: 0, tension: 0, progress: 0, attempts: 0, last: "" };
  assert.equal(keyboardAction(s, " ")?.type, "reel");
  assert.equal(keyboardAction(s, "Escape")?.type, "cancelFish");
});
test("real combat produces animated impact data and consumes weapon condition", () => {
  let s = ready();
  s.battle = battleFor(s, "bear");
  s.battle.distance = 1;
  s = act(s, "aim", "limbs");
  s = act(s, "combat", "heavy");
  assert.ok(s.combatFx);
  assert.equal(s.combatFx.kind, "melee");
  assert.ok(s.combatFx.damage > 0);
  assert.equal(s.combatFx.weak, true);
  assert.equal(s.durability.knife, 99.5);
});
test("milestones record actual day of companion and puzzle progress", () => {
  let s = ready();
  s.wolfFound = true;
  s.wolfMeat = 5;
  s.wolfBandage = 1;
  s = act(s, "wolf");
  assert.ok(s.milestones.some((m) => m.key === "wolf" && m.day === day(s)));
  s.puzzle = true;
  for (const i of [0, 4, 8]) s = act(s, "tile", i);
  assert.ok(
    s.milestones.some((m) => m.key === "puzzle" && m.text.includes("3步")),
  );
});
test("GM marker is sticky in a playthrough and resets only for a new run", () => {
  let s = ready();
  s = act(s, "gmHeal");
  assert.equal(s.gmUsed, 1);
  s = act(s, "wait", 1);
  assert.equal(s.gmUsed, 1);
  s = act(s, "new");
  assert.equal(s.gmUsed, 0);
  assert.equal(s.prologue, "pending");
});
test("four ending artworks are distinct and generated cards contain real stats and escaped timeline", () => {
  const arts = ["A", "B", "C", "D"].map(sceneSVG);
  assert.equal(new Set(arts).size, 4);
  const s = ready();
  s.ending = "A";
  s.bossKills = 7;
  s.milestones = [
    { key: "wolf", day: 4, text: "白狼 <同行>" },
    { key: "puzzle", day: 8, text: "解开明暗盘" },
  ];
  const card = memorialSVG(s);
  assert.ok(card.includes("守关战7场"));
  assert.ok(card.includes("第4天"));
  assert.ok(card.includes("&lt;同行&gt;"));
  assert.ok(card.includes('width="1000" height="1250"'));
});
test("late-game compass always keeps two useful suggestions and recognizes ready escape", () => {
  const s = ready();
  s.blueprint = true;
  s.storage.ironwood = s.storage.sail = 1;
  s.storage.wood = 50;
  s.storage.vine = 30;
  s.storage.roast = 20;
  s.storage.water = 20;
  s.wolf = 1;
  s.camel = true;
  s.friendship = 5;
  s.weather = "浓雾";
  const hints = survivalHints(s);
  assert.ok(hints.length >= 2 && hints.length <= 3);
  assert.ok(hints.some((h) => h.kind === "逃生就绪"));
});
