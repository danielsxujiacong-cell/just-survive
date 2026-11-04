import assert from "node:assert/strict";
import {
  act,
  newGame,
  day,
  hour,
  inventory,
  weight,
  capacity,
  has,
} from "../src/engine/game";
import { items, facilityCost } from "../src/data";
import { eventById } from "../src/data/events";
import type { State, Bag } from "../src/types";
export class SurvivorAgent {
  private state: State;
  readonly trace: string[] = [];
  readonly actions: Record<string, number> = {};
  private crafting = false;
  constructor(
    readonly seed: number,
    readonly route: "A" | "B" | "C" | "D",
    talent = "engineer",
  ) {
    this.state = newGame(seed);
    this.do("talent", talent);
  }
  get s(): Readonly<State> {
    return this.state;
  }
  get stock(): Bag {
    return inventory(this.state);
  }
  do(type: string, payload: string | number = "") {
    assert.ok(!type.startsWith("gm"), "GM actions are forbidden");
    this.state = act(this.state, type, payload);
    this.actions[type] = (this.actions[type] || 0) + 1;
    this.trace.push(
      `${this.state.turns} D${day(this.state)} ${hour(this.state).toFixed(1)} ${type}(${payload}) hp=${this.state.stats.hp.toFixed(1)} food=${this.state.stats.hunger.toFixed(1)} water=${this.state.stats.water.toFixed(1)} int=${this.state.stats.internal.toFixed(1)} ext=${this.state.stats.external.toFixed(1)}`,
    );
    assert.equal(this.state.gmUsed, 0);
    assert.ok(
      weight(this.state) <= capacity(this.state) + 0.0001,
      `Overweight ${weight(this.state)}/${capacity(this.state)}`,
    );
    for (const b of [this.state.bag, this.state.storage])
      for (const n of Object.values(b)) assert.ok(n >= 0, "Negative inventory");
    if (this.state.ending === "death")
      throw Error(
        `Died on route ${this.route} seed ${this.seed}\n${this.trace.slice(-18).join("\n")}\n${this.state.logs.slice(0, 8).join("\n")}`,
      );
    assert.ok(
      day(this.state) < 180,
      `Agent exceeded 180 days on ${type}(${payload})\n${this.trace.slice(-12).join("\n")}`,
    );
    assert.ok(this.state.turns < 30000, "Agent action budget exhausted");
  }
  care() {
    if (this.state.encounter || this.state.puzzle) return;
    const use = (ids: string[], condition: () => boolean) => {
      for (let i = 0; i < 5 && condition(); i++) {
        const k = ids.find((k) => (inventory(this.state)[k] || 0) > 0);
        if (!k) break;
        this.do("use", k);
      }
    };
    use(["salve", "bandage"], () => this.state.stats.external < 78);
    use(["herb", "tonic", "antibiotic"], () => this.state.stats.internal < 78);
    use(["water", "coconut", "soup"], () => this.state.stats.water < 68);
    use(
      ["roast", "can", "stew", "honey", "berry", "kelp"],
      () => this.state.stats.hunger < 65,
    );
    if (!this.state.battle)
      use(["tonic", "firstaid", "stew"], () => this.state.stats.hp < 45);
  }
  settle() {
    let n = 0;
    while ((this.state.encounter || this.state.battle) && n++ < 150) {
      if (this.state.encounter) {
        const e = eventById[this.state.encounter];
        let index = e.choices.findIndex(
          (c) =>
            !c.chance &&
            (!c.check || this.state.stats[c.check.stat] >= c.check.min) &&
            (!c.cost || has(this.state, c.cost)) &&
            (!c.need || this.stock[c.need]) &&
            (!c.success.stats ||
              Object.values(c.success.stats).every((v) => v >= 0)),
        );
        if (index < 0) index = e.choices.length - 1;
        this.do("chooseEvent", index + ":" + (e.choices[index].code || ""));
      } else this.fight();
    }
    assert.ok(n < 150, "settle loop");
    if (this.state.defense) this.do("closeDefense");
    this.care();
  }
  fight() {
    let n = 0;
    while (this.state.battle && n++ < 100) {
      const b = this.state.battle;
      this.care();
      if (!this.state.battle) break;
      const range = items[this.state.equipment.melee]?.range || 1;
      if (this.state.wolf && b.wolfCD === 0) this.do("combat", "wolf");
      else if (b.distance > range) this.do("combat", "advance");
      else this.do("combat", b.skillCD === 0 ? "skill" : "heavy");
    }
    assert.ok(n < 100, "battle turn limit");
  }
  travel(dest: number) {
    this.care();
    if (dest === this.state.location) return;
    this.do("travel", dest);
    assert.ok(
      this.state.journey,
      `Travel refused ${dest}: ${this.state.logs[0]}`,
    );
    let n = 0;
    while (this.state.journey && n++ < 100) {
      this.care();
      const j = this.state.journey;
      if (j.incident) {
        const choice =
          j.incident === "landslide" && !has(this.state, { vine: 2 })
            ? "push"
            : "tool";
        this.do("journeyChoice", choice);
        if (this.state.battle) this.fight();
      } else this.do("journeyStep");
    }
    assert.equal(this.state.location, dest);
    this.settle();
  }
  craft(id: string, count = 1) {
    assert.equal(this.state.location, 0);
    const item = items[id];
    assert.ok(item.recipe);
    for (let i = 0; i < count; i++) {
      this.care();
      assert.ok(
        has(this.state, item.recipe!),
        `Cannot craft ${id}: ${JSON.stringify(this.stock)} need ${JSON.stringify(item.recipe)}`,
      );
      const before = this.stock[id] || 0;
      this.do("craft", id);
      assert.ok((this.stock[id] || 0) > before, `Craft blocked ${id}`);
    }
    this.care();
  }
  upgrade(id: string, target: number) {
    while (this.state.facilities[id] < target) {
      const cost = facilityCost(this.state.facilities[id]);
      this.ensureResources(cost);
      this.care();
      this.do("upgrade", id);
    }
  }
  take(id: string, count: number) {
    while ((this.state.bag[id] || 0) < count) {
      const before = this.state.bag[id] || 0;
      this.do("take", id);
      assert.ok((this.state.bag[id] || 0) > before, `Cannot take ${id}`);
    }
  }
  recover() {
    assert.equal(this.state.location, 0);
    this.care();
    if (this.state.fence < 45 && has(this.state, { wood: 4, vine: 2 }))
      this.do("repair");
    if (
      this.state.stats.hp < 80 ||
      this.state.stats.spirit < 65 ||
      hour(this.state) > 20 ||
      hour(this.state) < 5
    ) {
      this.care();
      if (this.state.stats.hunger < 70 && this.stock.roast)
        this.do("use", "roast");
      if (this.state.stats.water < 75 && this.stock.water)
        this.do("use", "water");
      this.do("sleep");
      this.settle();
    }
    this.care();
  }
  home() {
    if (this.state.puzzle) this.solve();
    this.settle();
    this.travel(0);
    this.do("store");
    this.recover();
  }
  provision() {
    assert.equal(this.state.location, 0);
    this.care();
    this.recover();
    if (
      this.state.facilities.garden &&
      this.state.garden.ready &&
      this.state.time >= this.state.garden.ready
    )
      this.do("harvest");
    if (!this.crafting) {
      this.crafting = true;
      let guard = 0;
      while ((this.stock.roast || 0) < 6 && guard++ < 15) {
        if (!has(this.state, { wood: 1, meat: 1 })) break;
        this.craft("roast");
      }
      guard = 0;
      while ((this.stock.water || 0) < 8 && guard++ < 15) {
        if (!has(this.state, { wood: 1, rawWater: 1 })) this.do("gatherWater");
        if (!has(this.state, { wood: 1, rawWater: 1 })) break;
        this.craft("water");
      }
      while (
        (this.stock.bandage || 0) < 3 &&
        has(this.state, { grass: 3, herb: 1 })
      )
        this.craft("bandage");
      while (
        (this.stock.tonic || 0) < 4 &&
        has(this.state, { herb: 3, mint: 1, water: 1 })
      )
        this.craft("tonic");
      this.crafting = false;
    }
    while (
      (this.stock.torch || 0) < 3 &&
      has(this.state, { wood: 2, resin: 1 })
    )
      this.craft("torch");
    if (this.stock.torch) this.take("torch", Math.min(3, this.stock.torch));
    if (this.stock.pick) this.take("pick", 1);
    this.recover();
    for (const [id, n] of Object.entries({
      roast: Math.min(6, this.stock.roast || 0),
      water: Math.min(8, this.stock.water || 0),
      bandage: Math.min(3, this.stock.bandage || 0),
      tonic: Math.min(4, this.stock.tonic || 0),
      herb: Math.min(8, this.stock.herb || 0),
      vine: Math.min(6, this.stock.vine || 0),
    }))
      this.take(id, n);
  }
  explore() {
    this.care();
    this.do("explore");
    this.settle();
  }
  clear(z: number) {
    let guard = 0;
    while (this.state.progress[z] < 5 && guard++ < 12) {
      if (this.state.location === 0) {
        if (z === 5 || z === 10) this.ensureResources({ torch: 3 });
        this.provision();
      }
      this.travel(z);
      this.explore();
      if (this.state.puzzle) {
        this.solve();
        break;
      }
      if (
        this.state.progress[z] < 5 &&
        (this.state.stats.hp < 60 ||
          this.state.stats.spirit < 40 ||
          this.state.stats.internal < 65 ||
          weight(this.state) > capacity(this.state) - 5)
      )
        this.home();
    }
    assert.equal(this.state.progress[z], 5);
  }
  farm(z: number, rounds = 1) {
    if (this.state.location !== 0) this.home();
    this.provision();
    this.travel(z);
    for (let i = 0; i < rounds; i++) {
      this.explore();
      if (this.state.puzzle) this.solve();
      if (
        this.state.stats.hp < 45 ||
        weight(this.state) > capacity(this.state) - 4
      )
        break;
    }
    this.home();
  }
  ensureResources(cost: Bag) {
    assert.equal(this.state.location, 0);
    let attempts = 0;
    while (!has(this.state, cost) && attempts++ < 30) {
      const missing = Object.keys(cost).find(
        (k) => (this.stock[k] || 0) < cost[k],
      )!;
      const source: Record<string, number> = {
        wood: 1,
        stone: 1,
        coconut: 1,
        bamboo: 2,
        grass: 2,
        iron: 3,
        herb: 3,
        vine: 3,
        hardwood: 4,
        resin: 4,
        mint: 4,
        obsidian: 11,
        alloy: 7,
        finefur: 10,
      };
      if (missing === "meat" || missing === "hide") {
        this.provision();
        this.do("sleep");
        this.settle();
      } else if (missing === "roast") {
        if (!this.stock.meat) {
          this.do("sleep");
          this.settle();
        }
        this.ensureResources({ wood: 1 });
        this.craft("roast");
      } else if (missing === "water") {
        this.do("gatherWater");
        this.ensureResources({ wood: 1 });
        this.craft("water");
      } else if (items[missing]?.recipe) {
        this.ensureResources(items[missing].recipe!);
        this.craft(missing);
      } else if (source[missing] !== undefined) {
        this.farm(source[missing], 3);
      } else throw Error("No resource policy for " + missing);
    }
    assert.ok(
      has(this.state, cost),
      "Resource plan failed " + JSON.stringify(cost),
    );
  }
  solve() {
    if (!this.state.puzzle) return;
    if (this.route === "C") {
      for (let i = 0; i < 4; i++) {
        this.do("tile", 1);
        this.do("tile", 1);
      }
    }
    for (const i of [0, 4, 8]) this.do("tile", i);
    assert.equal(this.state.puzzleDone, true);
  }
  prepareCampaign() {
    this.do("upgrade", "trap");
    this.craft("axe");
    this.do("equip", "axe");
    this.craft("vinearmor");
    this.do("equip", "vinearmor");
    this.clear(1);
    this.home();
    this.clear(2);
    this.home();
    this.ensureResources({ bamboo: 4, stone: 2, vine: 2 });
    this.craft("spear");
    this.do("equip", "spear");
    this.ensureResources({ meat: 5, bandage: 2 });
    for (let i = 0; i < 7 && !this.state.wolf; i++) this.do("wolf");
    assert.ok(this.state.wolf);
    this.clear(3);
    this.home();
    this.ensureResources({ grass: 10, water: 1 });
    this.do("camel");
    assert.ok(this.state.camel);
    this.upgrade("work", 2);
    this.ensureResources(items.leather.recipe!);
    this.craft("leather");
    this.do("equip", "leather");
    this.ensureResources(items.pack.recipe!);
    this.craft("pack");
    this.take("pack", 1);
    this.craft("pick");
    this.take("pick", 1);
    this.upgrade("trap", 2);
    this.clear(4);
    this.home();
    this.ensureResources({ roast: 5 });
    for (let i = 0; i < 5; i++) this.do("gift", "roast");
    assert.equal(this.state.friendship, 5);
    for (let i = 0; i < 3; i++) {
      this.ensureResources({ roast: 1 });
      this.do("trade", "roast");
    }
    this.ensureResources({ wood: 6 });
    this.craft("charcoal", 3);
    this.craft("mask");
    this.take("mask", 1);
    this.upgrade("garden", 1);
    if (this.stock.seed) this.do("plant", "herb");
    this.upgrade("rain", 1);
    this.upgrade("bed", 2);
    this.upgrade("medicine", 2);
    this.clear(5);
    this.home();
    this.upgrade("work", 3);
    this.ensureResources(items.ironaxe.recipe!);
    this.craft("ironaxe");
    this.clear(7);
    this.home();
    this.ensureResources(items.steelspear.recipe!);
    this.craft("steelspear");
    this.do("equip", "steelspear");
    this.clear(8);
    this.home();
    this.ensureResources(items.coat.recipe!);
    this.craft("coat");
  }
  campaign() {
    this.prepareCampaign();
    if (this.route === "A") {
      this.ensureResources({ wood: 50, vine: 30, roast: 20, water: 20 });
      this.do("ending", "A");
    }
    if (this.route === "B") {
      this.clear(9);
      this.home();
      return this.finishB();
    }
    if (this.route === "C") {
      this.clear(11);
      this.home();
      this.ensureResources({ obsidian: 10, alloy: 5, hide: 15 });
      this.provision();
      for (const [k, n] of Object.entries({ obsidian: 10, alloy: 5, hide: 15 }))
        this.take(k, n);
      this.travel(11);
      this.do("canoe");
      assert.ok(this.state.canoe);
      this.do("ending", "C");
    }
    if (this.route === "D") {
      this.collectWeatherPearl(1, "晴朗", 1);
      this.collectWeatherPearl(3, "大雨", 2);
      this.clear(6);
      this.home();
      this.collectWeatherPearl(6, "浓雾", 5);
      this.ensureResources({ tonic: 5, wood: 6, resin: 3 });
      this.provision();
      this.do("equip", "coat");
      this.take("tonic", Math.min(8, this.stock.tonic || 0));
      this.clear(10);
      if (!has(this.state, { tonic: 3 })) {
        this.home();
        this.provision();
        this.take("tonic", 4);
        this.travel(10);
      }
      this.do("altar");
      assert.ok(this.state.pearls.includes(7));
      this.home();
      this.do("ending", "D");
    }
    assert.equal(
      this.state.ending,
      this.route,
      `${this.route} conditions missing ${this.state.logs[0]}`,
    );
    return this.summary();
  }
  survey() {
    this.prepareCampaign();
    for (const z of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      if (this.state.location !== 0) this.home();
      if (z === 10) {
        this.ensureResources({ torch: 3, tonic: 6 });
        this.do("equip", "coat");
      } else this.do("equip", "leather");
      if (z > 0) this.clear(z);
      else {
        for (let i = 0; i < 5; i++) {
          this.do("campEvent");
          this.settle();
        }
      }
      let tries = 0;
      while (
        this.state.seenEvents.filter((id) => id.startsWith(z + "-")).length <
          5 &&
        tries++ < 15
      ) {
        if (z === 0) {
          this.do("campEvent");
          this.settle();
        } else {
          if (this.state.location === 0) {
            this.provision();
            this.travel(z);
          }
          this.explore();
          if (this.state.stats.hp < 65) this.home();
        }
      }
      assert.equal(
        this.state.seenEvents.filter((id) => id.startsWith(z + "-")).length,
        5,
      );
    }
    this.home();
    assert.equal(this.state.pages.length, 12);
    assert.equal(this.state.seenEvents.length, 60);
    assert.ok(this.state.seenItems.length >= 39);
    return this.summary();
  }
  finishB() {
    let guard = 0;
    while (guard++ < 20) {
      this.provision();
      if (
        day(this.state) > 15 &&
        day(this.state) % 2 === 0 &&
        hour(this.state) < 18
      ) {
        for (const k of ["pass", "disk", "uniform"]) this.take(k, 1);
        this.travel(1);
        if (day(this.state) % 2 === 0) {
          this.do("ending", "B");
          assert.equal(this.state.ending, "B");
          return this.summary();
        }
        this.home();
      } else {
        this.do("sleep");
        this.settle();
      }
    }
    throw Error("Ship schedule not reached");
  }
  collectWeatherPearl(z: number, weather: string, n: number) {
    let tries = 0;
    while (!this.state.pearls.includes(n) && tries++ < 60) {
      if (this.state.location !== 0) this.home();
      this.provision();
      if (this.state.weather === weather) {
        this.travel(z);
        this.explore();
        this.home();
      } else {
        this.do("sleep");
        this.settle();
      }
    }
    assert.ok(this.state.pearls.includes(n), "Weather pearl unavailable " + n);
  }
  summary() {
    return {
      route: this.route,
      seed: this.seed,
      day: day(this.state),
      actions: this.state.turns,
      gm: this.state.gmUsed,
      rescues: this.state.rescues,
      hp: this.state.stats.hp,
      weight: weight(this.state),
      capacity: capacity(this.state),
      kills: this.state.kills,
      crafts: this.state.crafted,
      pearls: this.state.pearls,
      events: this.state.seenEvents.length,
      pages: this.state.pages.length,
      cleared: this.state.progress
        .map((n, i) => (n === 5 ? i : -1))
        .filter((i) => i > 0),
      actionCounts: this.actions,
    };
  }
}
