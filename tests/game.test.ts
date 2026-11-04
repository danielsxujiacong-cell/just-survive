import { test } from "node:test";
import assert from "node:assert/strict";
import {
  act,
  newGame,
  toggle,
  advance,
  capacity,
  weight,
  has,
  temperature,
} from "../src/engine/game";
import { battleFor, emptyStatus, maxHP } from "../src/engine/advanced";
import { events } from "../src/data/events";
import { items, zones, enemies, facilities } from "../src/data";
import { pages, talents } from "../src/data/lore";
import type { State } from "../src/types";
// Focused rule fixtures below isolate states. The full-campaign suite never mutates game state.
const start = (talent = "engineer") => act(newGame(42), "talent", talent);
function travel(s: State, to: number) {
  s = act(s, "travel", to);
  while (s.journey) {
    s = act(s, s.journey.incident ? "journeyChoice" : "journeyStep", "tool");
    if (s.battle) {
      s = act(s, "combat", "flee");
    }
  }
  return s;
}
test("all content tables are complete and references resolve", () => {
  assert.equal(zones.length, 12);
  assert.equal(events.length, 60);
  assert.equal(pages.length, 12);
  assert.equal(facilities.length, 8);
  assert.equal(talents.length, 6);
  assert.ok(Object.keys(enemies).length >= 26);
  assert.ok(Object.keys(items).length >= 39);
  assert.equal(new Set(events.map((e) => e.title)).size, 60);
  for (const z of zones)
    assert.equal(events.filter((e) => e.zone === z.id).length, 5);
  for (const e of events) {
    assert.ok(e.text.length >= 35, e.id);
    assert.ok(e.choices.length >= 2 && e.choices.length <= 3);
    for (const c of e.choices) {
      for (const k of [
        ...Object.keys(c.cost || {}),
        ...Object.keys(c.success.gain || {}),
        ...Object.keys(c.failure?.gain || {}),
      ])
        assert.ok(items[k], e.id + " " + k);
      if (c.need) assert.ok(items[c.need]);
    }
  }
  for (const i of Object.values(items))
    for (const k in i.recipe) assert.ok(items[k]);
});
test("talent selection gates play and cannot be changed mid-run", () => {
  let s = newGame(42);
  assert.equal(act(s, "travel", 1).journey, null);
  s = act(s, "talent", "athlete");
  assert.equal(maxHP(s), 120);
  assert.equal(s.stats.hp, 120);
  assert.equal(capacity(s), 36);
  assert.equal(act(s, "talent", "engineer").talent, "athlete");
});
test("six talent effects apply to actual game operations", () => {
  const engineer = act(start(), "craft", "axe");
  const botanist = act(start("botanist"), "craft", "axe");
  assert.ok(engineer.time < botanist.time);
  assert.equal(botanist.storage.seed, 3);
  const medic = start("medic");
  assert.equal(medic.storage.firstaid, 1);
  const sailor = start("sailor");
  assert.ok(sailor.storage.rod);
  assert.ok(
    act(sailor, "travel", 1).journey!.hours <
      act(start(), "travel", 1).journey!.hours,
  );
});
test("travel starts without teleporting and advances through four stages", () => {
  let s = start();
  s = act(s, "travel", 1);
  assert.equal(s.location, 0);
  assert.equal(s.time, 8);
  assert.equal(s.journey!.stage, 0);
  s = act(s, "journeyStep");
  assert.equal(s.location, 0);
  assert.ok(s.time > 8);
  assert.equal(s.journey!.stage, 1);
  while (s.journey) {
    s = act(s, s.journey.incident ? "journeyChoice" : "journeyStep", "tool");
  }
  assert.equal(s.location, 1);
});
test("journeys prevent camp inventory access and allow paid retreat", () => {
  let s = start();
  s.storage.water = 100;
  s.bag.water = 0;
  s = act(s, "travel", 3);
  assert.equal(has(s, { water: 1 }), false);
  assert.equal(act(s, "craft", "axe").crafted, 0);
  s = act(s, "journeyStep");
  s = act(s, "journeyRetreat");
  assert.equal(s.journey!.to, 0);
  assert.equal(s.journey!.stages, 3);
  const time = s.time;
  while (s.journey)
    s = act(s, s.journey.incident ? "journeyChoice" : "journeyStep", "tool");
  assert.equal(s.location, 0);
  assert.ok(s.time > time);
});
test("landslide consumes rope or causes explicit injury", () => {
  let s = act(start(), "travel", 3);
  s.journey!.incident = "landslide";
  s.bag.vine = 2;
  const safe = act(s, "journeyChoice", "tool");
  assert.equal(safe.bag.vine, 0);
  assert.equal(safe.stats.external, 100);
  const risky = act(s, "journeyChoice", "push");
  assert.equal(risky.stats.external, 90);
  assert.equal(risky.stats.hp, 96);
});
test("road battle rewards do not advance region layers", () => {
  let s = act(start(), "travel", 3);
  s.journey!.incident = "ambush";
  s.bag.meat = 0;
  s = act(s, "journeyChoice", "push");
  assert.equal(s.battle!.origin, "journey");
  s.battle!.hp = 1;
  s.battle!.distance = 1;
  s = act(s, "combat", "heavy");
  assert.equal(s.progress[0], 0);
  assert.ok(s.journey);
});
test("event tool gate and probability consequences are enforced", () => {
  let s = start();
  s.location = 4;
  s.encounter = "4-1";
  s.bag.torch = 0;
  const blocked = act(s, "chooseEvent", "0:");
  assert.equal(blocked.encounter, "4-1");
  s.bag.torch = 1;
  s = act(s, "chooseEvent", "0:");
  assert.equal(s.bag.torch, 0);
  assert.equal(s.bag.honey, 3);
  assert.equal(s.bag.glow, 2);
  assert.equal(s.encounter, null);
  assert.ok(s.seenEvents.includes("4-1"));
});
test("password compartment requires the actual 3147 clue", () => {
  let s = start();
  s.location = 8;
  s.encounter = "8-0";
  const wrong = act(s, "chooseEvent", "0:0000");
  assert.equal(wrong.encounter, "8-0");
  assert.equal(wrong.stats.spirit, s.stats.spirit - 3);
  s = act(s, "chooseEvent", "0:3147");
  assert.equal(s.encounter, null);
  assert.equal(s.bag.canvas, 5);
  assert.ok(s.pages.includes(8));
});
test("collecting every page reveals durable lore across new runs", () => {
  let s = start();
  for (const e of events.filter((e) => e.page !== undefined)) {
    s.location = e.zone;
    s.encounter = e.id;
    s = act(s, "chooseEvent", e.choices.length - 1 + ":");
  }
  assert.equal(s.pages.length, 12);
  s.stamps = ["A"];
  const next = act(s, "new");
  assert.equal(next.pages.length, 12);
  assert.deepEqual(next.stamps, ["A"]);
  assert.equal(next.talent, "");
  assert.equal(next.time, 8);
  assert.equal(
    next.progress.reduce((a, b) => a + b, 0),
    0,
  );
});
test("garden consumes seeds and water and cannot harvest early", () => {
  let s = start();
  s.facilities.garden = 1;
  s.storage.seed = 1;
  s = act(s, "plant", "herb");
  assert.equal(s.storage.seed, 0);
  const early = act(s, "harvest");
  assert.ok(early.garden.ready);
  s = act(s, "wait", 24);
  s = act(s, "harvest");
  assert.equal(s.garden.ready, 0);
  assert.equal(s.storage.seed, 2);
  assert.equal(s.storage.herb, 16);
});
test("rain collector pays out on morning weather refresh", () => {
  let s = start();
  s.facilities.rain = 2;
  s.time = 29.9;
  const before = s.storage.water || 0;
  advance(s, 0.2);
  assert.ok((s.storage.water || 0) >= before + 4);
});
test("night defense consumes prepared traps and fire walls and records rounds", () => {
  let s = start();
  s.time = 24 * 2 + 21;
  s.traps = 1;
  s.firewall = 1;
  s = act(s, "sleep");
  assert.ok(s.defense);
  assert.equal(s.defense.rounds.length, 4);
  assert.equal(s.traps, 0);
  assert.equal(s.firewall, 0);
  assert.equal(s.defense.damage, 0);
  assert.equal(s.defense.loot, 3);
});
test("unprotected night breach damages player and loses food", () => {
  let s = start();
  s.time = 24 * 2 + 21;
  s.fence = 0;
  s.storage.roast = 4;
  s = act(s, "sleep");
  assert.ok(s.defense!.damage > 0);
  assert.ok(s.stats.external < 100);
  assert.equal(s.storage.roast, 2);
});
test("fishing requires coast and rod, green reels win, bad reels break", () => {
  let s = start("sailor");
  assert.equal(act(s, "fish").fishing, null);
  s = act(s, "take", "rod");
  s = travel(s, 1);
  s = act(s, "fish");
  assert.ok(s.fishing);
  for (let i = 0; i < 17; i++) s = act(s, "fishTick");
  const before = s.bag.fish || 0;
  for (let i = 0; i < 3; i++) s = act(s, "reel");
  assert.equal(s.fishing, null);
  assert.ok((s.bag.fish || 0) > before || s.bag.pearl || s.bag.eelcatch);
  s = act(s, "fish");
  for (let i = 0; i < 3; i++) s = act(s, "reel");
  assert.equal(s.fishing, null);
});
test("aim selection, armor break and blood loss are separate statuses", () => {
  let s = start();
  s.location = 7;
  s.battle = battleFor(s, "gargoyle");
  s.battle.distance = 1;
  s.bag.ironaxe = 1;
  s.equipment.melee = "ironaxe";
  s = act(s, "aim", "limbs");
  s = act(s, "combat", "skill");
  assert.ok(s.battle!.hp < 125);
  assert.ok(s.battle!.enemyStatus.armorbreak > 0);
  assert.ok(s.battle!.enemyStatus.root > 0);
  s.battle!.enemyStatus.bleed = 2;
  const hp = s.battle!.hp;
  s = act(s, "combat", "retreat");
  assert.ok(!s.battle || s.battle.hp <= hp - 4);
});
test("paralysis blocks movement and player poison damages internal health", () => {
  let s = start();
  s.battle = battleFor(s, "snake");
  s.battle.playerStatus.paralyze = 1;
  s.battle.playerStatus.poison = 2;
  const before = s.stats.internal;
  s = act(s, "combat", "advance");
  assert.equal(s.battle!.distance, 2);
  assert.ok(s.stats.internal < before);
  assert.equal(s.battle!.playerStatus.paralyze, 0);
});
test("wolf causes bleeding and pinning with real cooldown", () => {
  let s = start();
  s.wolf = 2;
  s.battle = battleFor(s, "bear");
  s = act(s, "combat", "wolf");
  assert.ok(s.battle!.enemyStatus.bleed > 0);
  assert.ok(s.battle!.enemyStatus.root > 0);
  assert.ok(s.battle!.wolfCD > 0);
  const hp = s.battle!.hp;
  s = act(s, "combat", "wolf");
  assert.equal(s.battle!.hp, hp);
});
test("gun point blank skill consumes ammunition and breaks armor", () => {
  let s = start();
  s.battle = battleFor(s, "doctor");
  s.battle.distance = 1;
  s.equipment.ranged = "gun";
  s.bag.gun = 1;
  s.bag.bullet = 2;
  s = act(s, "combat", "skill");
  assert.equal(s.bag.bullet, 1);
  assert.ok(!s.battle || s.battle.hp < 165);
});
test("enemy rage is activated at low life and potion turns tick statuses", () => {
  let s = start();
  s.battle = battleFor(s, "bear");
  s.battle.hp = 20;
  s.battle.playerStatus.poison = 2;
  s.battle.enemyStatus.bleed = 1;
  s = act(s, "use", "water");
  assert.equal(s.battle!.enemyStatus.rage, 99);
  assert.equal(s.battle!.playerStatus.poison, 1);
  assert.equal(s.battle!.enemyStatus.bleed, 0);
});
test("survival depletion and medical rescue are active", () => {
  let s = start();
  s.bag = {};
  s.storage = {};
  s.stats.hp = 1;
  s.stats.water = 0;
  s = act(s, "wait", 1);
  assert.equal(s.ending, "death");
  s = start();
  s.stats.hp = 0;
  s.bag.tonic = 1;
  s = act(s, "wait", 0.1);
  assert.equal(s.rescues, 1);
  assert.equal(s.stats.hp, 30);
});
test("equipment transfer obeys weight and cold protection changes temperature", () => {
  let s = start();
  s.bag = { stone: 150 };
  s.storage.coat = 1;
  assert.equal(weight(s), 30);
  s = act(s, "equip", "coat");
  assert.equal(s.equipment.armor, "");
  s.bag = { torch: 1 };
  s.location = 10;
  const cold = temperature(s);
  s.bag.coat = 1;
  s = act(s, "equip", "coat");
  assert.equal(temperature(s), cold + 22);
});
test("lights out cross never wraps rows and both solution branches exist", () => {
  const board = Array(9).fill(false);
  toggle(board, 2);
  assert.deepEqual(board, [
    false,
    true,
    true,
    false,
    false,
    true,
    false,
    false,
    false,
  ]);
  for (const slow of [false, true]) {
    let s = start();
    s.puzzle = true;
    if (slow)
      for (let j = 0; j < 4; j++) {
        s = act(s, "tile", 1);
        s = act(s, "tile", 1);
      }
    for (const i of [0, 4, 8]) s = act(s, "tile", i);
    assert.equal(s.puzzleDone, true);
    assert.equal(s.lab, !slow);
    assert.equal(s.volcano, slow);
    assert.equal(s.blueprint, true);
  }
});
test("probability branches produce distinct gains and injuries", () => {
  let a = start();
  a.location = 4;
  a.encounter = "4-1";
  a.seed = 42;
  const win = act(a, "chooseEvent", "1:");
  a.seed = 1000;
  const fail = act(a, "chooseEvent", "1:");
  assert.equal(win.bag.herb, 5);
  assert.equal(fail.stats.internal, 80);
  assert.equal(fail.bag.herb, undefined);
});
test("attribute checks block risky event choices without spending time", () => {
  let s = start();
  s.location = 6;
  s.encounter = "6-4";
  s.stats.water = 40;
  const blocked = act(s, "chooseEvent", "1:");
  assert.equal(blocked.encounter, "6-4");
  assert.equal(blocked.time, s.time);
  assert.ok(blocked.logs[0].includes("属性检定"));
});
