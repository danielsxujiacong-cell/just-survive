import { qol } from "./qol";
import {
  advanced,
  startJourney,
  battleFor,
  queueEvent,
  nightDefense,
  maxHP,
} from "./advanced";
import { combatTurn } from "./combat";
import type { State, Bag, Stats } from "../types";
import { items, zones, enemies, facilityCost, weatherNames } from "../data";
export const day = (s: State) => Math.floor(s.time / 24) + 1;
export const hour = (s: State) => s.time % 24;
export const weight = (s: State) =>
  Object.entries(s.bag).reduce(
    (a, [k, v]) => a + (items[k]?.weight || 0.2) * v,
    0,
  );
export const capacity = (s: State) =>
  ((s.bag.pack || 0) > 0 ? 50 : 30) * (s.talent === "athlete" ? 1.2 : 1) +
  (s.camel ? 40 : 0);
export const inventory = (s: State) =>
  s.location === 0 && !s.journey ? merge(s.bag, s.storage) : s.bag;
function merge(a: Bag, b: Bag) {
  const c = { ...a };
  for (const k in b) c[k] = (c[k] || 0) + b[k];
  return c;
}
export function has(s: State, cost: Bag) {
  const b = inventory(s);
  return Object.entries(cost).every(([k, v]) => (b[k] || 0) >= v);
}
export function pay(s: State, cost: Bag) {
  if (!has(s, cost)) return false;
  for (const [k, v] of Object.entries(cost)) {
    const n = Math.min(s.bag[k] || 0, v);
    s.bag[k] = (s.bag[k] || 0) - n;
    if (s.location === 0 && !s.journey)
      s.storage[k] = (s.storage[k] || 0) - (v - n);
  }
  return true;
}
export function log(s: State, t: string) {
  s.logs.unshift(
    `第${day(s)}天 ${Math.floor(hour(s)).toString().padStart(2, "0")}:${Math.round(
      (hour(s) % 1) * 60,
    )
      .toString()
      .padStart(2, "0")}  ${t}`,
  );
  s.logs = s.logs.slice(0, 120);
}
export function add(s: State, k: string, n: number) {
  if (n <= 0) return;
  if (!s.seenItems.includes(k)) s.seenItems.push(k);
  if (items[k]?.kind === "武器" || items[k]?.kind === "防具")
    s.durability[k] = 100;
  const b = s.location === 0 && !s.journey ? s.storage : s.bag;
  if (
    (s.location !== 0 || s.journey) &&
    weight(s) + n * (items[k]?.weight || 0.2) > capacity(s)
  ) {
    if (
      [
        "ironwood",
        "sail",
        "pass",
        "disk",
        "uniform",
        "gunplan",
        "sextant",
        "knife",
        "flint",
      ].includes(k)
    ) {
      s.storage[k] = (s.storage[k] || 0) + n;
      log(s, `${items[k].name}是重要物资，已由漂流信标送回营地。`);
    } else log(s, `负重已满，未能带走${items[k].name}。`);
    return;
  }
  b[k] = (b[k] || 0) + n;
}
export function random(s: State) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
export function season(s: Pick<State, "time">) {
  const elapsed = Math.floor(s.time / 24),
    period = Math.floor(elapsed / 7),
    index = period % 4;
  const seasons = [
    { id: "autumn", name: "秋季", temperature: 12 },
    { id: "winter", name: "冬季", temperature: -5 },
    { id: "spring", name: "春季", temperature: 20 },
    { id: "summer", name: "夏季", temperature: 32 },
  ];
  return {
    ...seasons[index],
    index,
    period,
    day: (elapsed % 7) + 1,
    daysUntilNext: 7 - (elapsed % 7),
    next: seasons[(index + 1) % 4].name,
  };
}
export function temperature(s: State) {
  const area = s.journey ? s.journey.to : s.location;
  return (
    season(s).temperature +
    (hour(s) < 6 || hour(s) > 19 ? -8 : 4) +
    (area === 10 ? -25 : area === 11 ? 20 : 0) +
    (s.location === 0 && !s.journey ? s.facilities.fire * 5 : 0) +
    (s.equipment.armor === "coat" ? 22 : 0) +
    (s.bag.torch ? 4 : 0)
  );
}
function checkLife(s: State) {
  for (const k of Object.keys(s.stats) as (keyof Stats)[])
    s.stats[k] = Math.max(
      0,
      Math.min(
        k === "hp"
          ? maxHP(s)
          : k === "spirit" && s.stats.internal < 60
            ? 75
            : 100,
        s.stats[k],
      ),
    );
  if (s.stats.hp <= 0) {
    const k = ["firstaid", "tonic", "adrenaline"].find(
      (k) => (s.bag[k] || 0) + (s.storage[k] || 0) > 0,
    );
    if (k) {
      if (s.bag[k]) s.bag[k]--;
      else s.storage[k]--;
      s.stats.hp = 30;
      s.rescues++;
      log(s, "弥留抢救成功，消耗了" + items[k].name);
    } else {
      s.ending = "death";
      log(s, "风吹过营地。你的日记停在了这一页。");
    }
  }
}
export function advance(s: State, h: number, sleep = false) {
  const golden = sleep && hour(s) >= 20 && hour(s) <= 22;
  for (let left = h; left > 0 && !s.ending; ) {
    const dt = Math.min(0.25, left);
    left -= dt;
    const before = s.time;
    s.time += dt;
    if (season({ time: before }).period !== season(s).period) {
      const next = season(s);
      log(
        s,
        `季节更替：进入${next.name}（基础${next.temperature}℃），本季持续7天。${next.id === "winter" ? "寒潮来临，请准备毛皮大衣、火把与营地火炉。" : next.id === "summer" ? "酷暑来临，请多带净水，留意高温失水。" : "留意昼夜温差，规划下一段旅程。"}`,
      );
    }
    const t = temperature(s);
    s.stats.hunger -= dt * (sleep ? 0.65 : 1.1);
    s.stats.water -= dt * (t > 35 ? 3 : 1.3);
    if (!sleep) {
      s.stats.spirit -= dt * (hour(s) >= 23 || hour(s) < 5 ? 3 : 0.3);
      if (s.location === 5) s.stats.spirit -= dt * 1.5;
      if (s.weather === "大雨" && (s.location !== 0 || s.journey !== null)) {
        s.stats.internal -= dt;
        s.stats.spirit -= dt;
      }
    } else {
      s.stats.hp += dt * (1 + s.facilities.bed);
      s.stats.spirit += dt * (4 + s.facilities.bed + (golden ? 2 : 0));
      if (golden) s.stats.internal += dt * 1.5;
    }
    if (s.stats.hunger <= 0) s.stats.hp -= dt * 5;
    if (s.stats.water <= 0) s.stats.hp -= dt * 7;
    if (s.stats.external < 60)
      s.stats.hp -= dt * 2 * (s.talent === "medic" ? 0.7 : 1);
    if (s.stats.internal < 60) {
      s.stats.hp -= dt * 1.5;
      s.stats.spirit -= dt;
    }
    if (t < 5) {
      s.stats.internal -= dt * 2;
      s.stats.hp -= dt;
    }
    if (s.location === 11 && s.equipment.armor !== "suit" && !s.bag.mask)
      s.stats.internal -= dt * 3;
    if (Math.floor((before - 6) / 24) !== Math.floor((s.time - 6) / 24)) {
      s.weather = weatherNames[Math.floor(random(s) * (s.volcano ? 5 : 4))];
      log(s, "天色渐亮，今日天气：" + s.weather);
      const level = s.facilities.trap;
      if (level) {
        s.storage.water = (s.storage.water || 0) + level * 4;
        s.storage.meat = (s.storage.meat || 0) + level * 2;
        s.storage.hide = (s.storage.hide || 0) + level;
      }
      const rain = s.facilities.rain || 0;
      if (rain)
        s.storage.water =
          (s.storage.water || 0) + rain * (s.weather === "大雨" ? 6 : 2);
      if (s.weather === "大雨")
        s.storage.rawWater = (s.storage.rawWater || 0) + 12;
    }
    if (
      sleep &&
      Math.floor((before - 23) / 24) !== Math.floor((s.time - 23) / 24) &&
      day(s) % 3 === 0
    )
      nightDefense(s);
    checkLife(s);
  }
}
export function toggle(board: boolean[], i: number) {
  for (const j of [
    i,
    i % 3 > 0 ? i - 1 : -1,
    i % 3 < 2 ? i + 1 : -1,
    i - 3,
    i + 3,
  ])
    if (j >= 0 && j < 9) board[j] = !board[j];
}
export function newGame(seed = Date.now() >>> 0): State {
  const board = Array(9).fill(true);
  [0, 4, 8].forEach((i) => toggle(board, i));
  return {
    version: 3,
    time: 8,
    location: 0,
    selected: 1,
    stats: {
      hp: 100,
      hunger: 90,
      water: 90,
      external: 100,
      internal: 100,
      spirit: 90,
    },
    bag: { knife: 1, torch: 1, coconut: 5, roast: 5, water: 6, bandage: 2 },
    storage: {
      wood: 25,
      stone: 20,
      grass: 15,
      herb: 10,
      vine: 12,
      resin: 6,
      rawWater: 12,
      meat: 6,
      mint: 5,
    },
    facilities: {
      fire: 1,
      work: 1,
      medicine: 1,
      bed: 1,
      trap: 0,
      fence: 1,
      garden: 0,
      rain: 0,
    },
    fence: 100,
    progress: Array(12).fill(0),
    equipment: { melee: "knife", ranged: "", armor: "", tool: "" },
    weather: "晴朗",
    logs: ["第1天 08:00 你在浅滩醒来。先制造竹枪，黄昏前回营地。"],
    battle: null,
    puzzle: false,
    board,
    moves: 0,
    puzzleDone: false,
    lab: false,
    volcano: false,
    eruption: 0,
    blueprint: false,
    pearls: [],
    wolfFound: false,
    wolfMeat: 0,
    wolfBandage: 0,
    wolf: 0,
    camelFound: false,
    camel: false,
    kuru: false,
    friendship: 0,
    canoe: false,
    ending: null,
    kills: 0,
    crafted: 0,
    seed,
    rescues: 0,
    talent: "",
    journey: null,
    encounter: null,
    pages: [],
    seenEvents: [],
    seenItems: [
      "knife",
      "torch",
      "coconut",
      "roast",
      "water",
      "bandage",
      "wood",
      "stone",
      "grass",
      "herb",
      "vine",
      "resin",
      "rawWater",
      "meat",
      "mint",
    ],
    seenEnemies: [],
    stamps: [],
    fishing: null,
    defense: null,
    garden: { herb: 0, mint: 0, ready: 0 },
    traps: 0,
    firewall: 0,
    gmUsed: 0,
    turns: 0,
    trackedRoute: "A",
    durability: { knife: 100 },
    loadoutReport: null,
    sweeps: 0,
    prologue: "pending",
    milestones: [],
    bossKills: 0,
    combatFx: null,
  };
}
export function routeChecks(s: State) {
  return {
    A: [
      s.blueprint,
      has(s, { ironwood: 1 }),
      has(s, { sail: 1 }),
      has(s, { wood: 50, vine: 30, roast: 20, water: 20 }),
      s.location === 0,
    ],
    B: [
      s.lab,
      has(s, { pass: 1, disk: 1, uniform: 1 }),
      day(s) > 15 && day(s) % 2 === 0,
      s.location === 1,
    ],
    C: [s.volcano, s.canoe, s.location === 11],
    D: [s.pearls.length === 7, s.location === 0],
  };
}
function event(s: State) {
  const z = s.location;
  if (z === 1) {
    add(s, "knife", 1);
    add(s, "flint", 1);
    if (s.weather === "晴朗") pearl(s, 1);
    else log(s, "一星龙珠需要晴天再来搜寻。");
  }
  if (z === 2 && !s.wolfFound) {
    s.wolfFound = true;
    if (s.talent === "hunter") s.wolfMeat = 2;
  }
  if (z === 3) {
    s.camelFound = true;
    if (s.weather === "大雨") pearl(s, 2);
    else log(s, "二星龙珠藏在雨水漫过的石缝。");
  }
  if (z === 4) s.kuru = true;
  if (z === 5 && !s.puzzleDone) s.puzzle = true;
  if (z === 6) {
    if (s.weather === "浓雾") {
      add(s, "sextant", 1);
      pearl(s, 5);
    } else log(s, "宝匣只在浓雾中出现，可稍后重访。");
  }
  if (z === 7) {
    add(s, "alloy", 5);
    pearl(s, 6);
  }
  if (z === 8) {
    add(s, "sail", 1);
    add(s, "gunplan", 1);
  }
  if (z === 9) {
    for (const k of ["pass", "disk", "uniform"]) add(s, k, 1);
  }
  if (z === 10) log(s, "祭坛需要三份苦味汤药。");
  if (z === 11) log(s, "观测台已找到，可以加固隔热舱。");
}
function pearl(s: State, n: number) {
  if (!s.pearls.includes(n)) {
    s.pearls.push(n);
    log(s, `获得${n}星龙珠！`);
  }
}
function loot(s: State) {
  const z = zones[s.location];
  for (const k of z.resources) {
    if (k === "glow" && hour(s) >= 6 && hour(s) < 20) continue;
    add(
      s,
      k,
      (3 + Math.floor(random(s) * 3) + (s.bag.pick ? 2 : 0)) *
        (s.talent === "botanist" && ["herb", "mint"].includes(k) ? 2 : 1),
    );
  }
  if (random(s) < 0.25) add(s, "seed", 1);
  log(
    s,
    "收集到" +
      z.resources
        .filter((k) => k !== "glow" || hour(s) < 6 || hour(s) >= 20)
        .map((k) => items[k].name)
        .join("、"),
  );
}
function reduceAction(
  input: State,
  type: string,
  payload: string | number = "",
): State {
  const s = structuredClone(input);
  if (type === "new") {
    const fresh = newGame();
    fresh.seenItems = s.seenItems;
    fresh.seenEnemies = s.seenEnemies;
    fresh.seenEvents = s.seenEvents;
    fresh.pages = s.pages;
    fresh.stamps = s.stamps;
    return fresh;
  }
  if (s.ending && type !== "gmHeal") return s;
  const id = String(payload);
  if (type === "trackRoute" && ["A", "B", "C", "D"].includes(id)) {
    s.trackedRoute = id as State["trackedRoute"];
    return s;
  }
  if (!s.talent && type !== "talent") return s;
  if (type === "continuePrologue") {
    s.prologue = "done";
    return s;
  }
  if (s.prologue === "playing") return s;
  if (s.battle && !["combat", "aim", "use", "gmHeal"].includes(type)) return s;
  if (s.puzzle && !["tile", "closePuzzle", "gmPuzzle", "gmHeal"].includes(type))
    return s;
  if (
    s.journey &&
    ![
      "journeyStep",
      "journeyChoice",
      "journeyRetreat",
      "combat",
      "aim",
      "use",
      "gmHeal",
    ].includes(type)
  )
    return s;
  if (s.encounter && !["chooseEvent", "gmHeal"].includes(type)) return s;
  if (s.fishing && !["fishTick", "reel", "cancelFish", "gmHeal"].includes(type))
    return s;
  if (type.startsWith("gm")) s.gmUsed++;
  s.turns++;
  if (qol(s, type, payload) || advanced(s, type, payload)) {
    checkLife(s);
    return s;
  }

  switch (type) {
    case "select":
      s.selected = Number(payload);
      break;
    case "travel":
      startJourney(s, Number(payload));
      break;
    case "explore": {
      if (!s.location) break;
      advance(s, 0.5);
      if (s.ending) break;
      const z = zones[s.location];
      if (s.progress[z.id] >= 5) {
        loot(s);
        event(s);
        queueEvent(s);
        break;
      }
      const boss = s.progress[z.id] === 4;
      const e =
        enemies[
          boss ? z.boss : z.enemies[Math.floor(random(s) * z.enemies.length)]
        ];
      s.battle = battleFor(
        s,
        boss ? z.boss : z.enemies.find((k) => enemies[k] === e)!,
      );
      break;
    }
    case "combat":
      combatTurn(s, id, () => {
        s.progress[s.location] = Math.min(5, s.progress[s.location] + 1);
        loot(s);
        if (s.progress[s.location] === 5) event(s);
        queueEvent(s);
      });
      break;
    case "use": {
      const item = items[id];
      if (!item?.heal || !pay(s, { [id]: 1 })) break;
      for (const [k, v] of Object.entries(item.heal))
        s.stats[k as keyof Stats] +=
          v * (s.talent === "botanist" && item.kind === "药剂" ? 1.25 : 1);
      if (s.battle) {
        if (["antibiotic", "tonic"].includes(id))
          s.battle.playerStatus.poison = 0;
        if (["bandage", "salve", "firstaid"].includes(id))
          s.battle.playerStatus.bleed = 0;
      }
      if (id === "rawWater" && random(s) < 0.4) s.stats.internal -= 15;
      log(s, "使用" + item.name);
      if (s.battle) combatTurn(s, "item", () => {});
      break;
    }
    case "craft": {
      const item = items[id];
      if (
        s.location !== 0 ||
        !item?.recipe ||
        s.facilities[item.facility!] < (item.level || 1) ||
        !pay(s, item.recipe)
      ) {
        log(s, "需要在营地满足设施等级与配方材料。");
        break;
      }
      advance(
        s,
        (item.hours || 1) *
          (s.talent === "engineer"
            ? 0.8
            : s.talent === "medic" && item.kind === "药剂"
              ? 0.7
              : 1),
      );
      add(s, id, ["arrow", "bolt", "bullet", "dart"].includes(id) ? 5 : 1);
      s.crafted++;
      log(s, "制作完成：" + item.name);
      break;
    }
    case "upgrade": {
      if (s.location !== 0) break;
      const n = s.facilities[id];
      if (n >= (id === "medicine" ? 2 : 3) || !pay(s, facilityCost(n))) break;
      s.facilities[id]++;
      if (id === "fence") s.fence = 100;
      advance(s, s.talent === "engineer" ? 1.6 : 2);
      log(s, "设施升级完成。");
      break;
    }
    case "repair":
      if (s.location === 0 && pay(s, { wood: 4, vine: 2 })) {
        s.fence = 100;
        advance(s, 1);
        log(s, "木栅栏耐久已恢复。");
      }
      break;
    case "sleep":
      if (s.location === 0) {
        advance(s, 8, true);
        log(s, "你从八小时睡眠中醒来。");
      }
      break;
    case "wait":
      advance(s, Number(payload) || 1);
      break;
    case "gatherWater":
      advance(s, 0.5);
      add(s, "rawWater", 6);
      log(s, "收集生水六份，请煮沸再饮用。");
      break;
    case "equip":
      if ((inventory(s)[id] || 0) > 0) {
        if (s.location === 0 && !s.bag[id]) {
          if (weight(s) + (items[id]?.weight || 0.2) > capacity(s)) {
            log(s, "负重不足，不能取出装备。");
            break;
          }
          s.storage[id]--;
          s.bag[id] = 1;
        }
        const item = items[id];
        if (item.kind === "武器" || id === "knife")
          s.equipment[item.ammo ? "ranged" : "melee"] = id;
        else if (item.kind === "防具") s.equipment.armor = id;
        else s.equipment.tool = id;
        log(s, "装备" + item.name);
      }
      break;
    case "store":
      if (s.location === 0) {
        for (const k of Object.keys(s.bag)) {
          if (
            Object.values(s.equipment).includes(k) ||
            ["pack", "torch", "mask"].includes(k)
          )
            continue;
          s.storage[k] = (s.storage[k] || 0) + s.bag[k];
          s.bag[k] = 0;
        }
        log(s, "战利品已存入营地。");
      }
      break;
    case "take":
      if (
        s.location === 0 &&
        (s.storage[id] || 0) > 0 &&
        weight(s) + (items[id]?.weight || 0.2) <= capacity(s)
      ) {
        s.storage[id]--;
        s.bag[id] = (s.bag[id] || 0) + 1;
      }
      break;
    case "deposit":
      if (
        s.location === 0 &&
        (s.bag[id] || 0) > 0 &&
        !Object.values(s.equipment).includes(id)
      ) {
        s.bag[id]--;
        s.storage[id] = (s.storage[id] || 0) + 1;
      }
      break;
    case "wolf":
      if (s.wolfFound) {
        if (!s.wolf) {
          if (s.wolfMeat < 5 && pay(s, { meat: 1 })) s.wolfMeat++;
          else if (s.wolfBandage < 2 && pay(s, { bandage: 1 })) s.wolfBandage++;
          if (s.wolfMeat >= 5 && s.wolfBandage >= 2) {
            s.wolf = 1;
            log(s, "白狼成为你的伙伴。");
          }
        } else if (s.wolf < 5 && pay(s, { meat: 3 })) {
          s.wolf++;
          log(s, "白狼升级。");
        }
      }
      break;
    case "camel":
      if (s.camelFound && !s.camel && pay(s, { grass: 10, water: 1 })) {
        s.camel = true;
        log(s, "骆驼已驯服，负重增加40kg，移动加快20%。");
      }
      break;
    case "gift":
      if (
        s.kuru &&
        s.friendship < 5 &&
        ["roast", "wine", "ironaxe", "pearl"].includes(id) &&
        pay(s, { [id]: 1 })
      ) {
        s.friendship = Math.min(5, s.friendship + (id === "ironaxe" ? 2 : 1));
        if (s.friendship >= 3) add(s, "iron", 5);
        if (s.friendship === 5) {
          add(s, "ironwood", 1);
          pearl(s, 3);
        }
        log(s, "库鲁好感提升至" + s.friendship + "星。");
      }
      break;
    case "trade":
      if (
        s.kuru &&
        ["roast", "wine", "ironaxe", "pearl"].includes(id) &&
        pay(s, { [id]: 1 })
      ) {
        add(s, "iron", 4);
        add(s, "herb", 3);
        add(s, "fiber", 2);
        log(s, "交易得到铁矿、草药与合成纤维。");
      }
      break;
    case "altar":
      if (s.location === 10 && s.progress[10] === 5 && pay(s, { tonic: 3 }))
        pearl(s, 7);
      break;
    case "canoe":
      if (
        s.location === 11 &&
        s.progress[11] === 5 &&
        !s.canoe &&
        pay(s, { obsidian: 10, alloy: 5, hide: 15 })
      ) {
        s.canoe = true;
        advance(s, 3);
        log(s, "隔热舱加固完成。");
      }
      break;
    case "tile":
      if (s.puzzle) {
        toggle(s.board, Number(payload));
        s.moves++;
        if (s.board.every(Boolean)) {
          s.puzzle = false;
          s.puzzleDone = true;
          s.blueprint = true;
          pearl(s, 4);
          if (s.moves <= 10) {
            s.lab = true;
            log(s, `明暗盘${s.moves}步解开，研究所暗门开启。获得造船图纸。`);
          } else {
            s.volcano = true;
            s.eruption = day(s) + 7;
            log(s, "地壳震动！火山周期激活，七天后进入爆发窗口。");
          }
        }
      }
      break;
    case "activateVolcano":
      if (s.puzzleDone) {
        s.volcano = true;
        s.eruption = day(s) + 7;
        log(s, "你转动观测石盘，地脉开始苏醒。");
      }
      break;
    case "openPuzzle":
      if (s.location === 5 && !s.puzzleDone && s.progress[5] === 5)
        s.puzzle = true;
      break;
    case "closePuzzle":
      s.puzzle = false;
      break;
    case "ending": {
      const checks = routeChecks(s)[id as "A"];
      if (checks?.every(Boolean)) {
        if (id === "A")
          pay(s, {
            ironwood: 1,
            sail: 1,
            wood: 50,
            vine: 30,
            roast: 20,
            water: 20,
          });
        s.ending = id;
        if (!s.stamps.includes(id)) s.stamps.push(id);
        log(s, "逃生成功，你的故事将被海风记住。");
      } else log(s, "逃生条件尚未满足。");
      break;
    }
    case "gmHeal":
      s.stats = {
        hp: 100,
        hunger: 100,
        water: 100,
        external: 100,
        internal: 100,
        spirit: 100,
      };
      s.ending = null;
      log(s, "GM：恢复满状态。");
      break;
    case "gmSupply":
      for (const k of Object.keys(items))
        if (
          ![
            "ironwood",
            "sail",
            "pass",
            "disk",
            "uniform",
            "sextant",
            "gunplan",
          ].includes(k)
        )
          add(s, k, 30);
      log(s, "GM：补给空投已抵达（不含剧情物品）。");
      break;
    case "gmDay":
      advance(s, 24 - hour(s) + 8);
      break;
    case "gmPuzzle":
      s.moves = 0;
      break;
  }
  checkLife(s);
  return s;
}

export function act(
  input: State,
  type: string,
  payload: string | number = "",
): State {
  const s = reduceAction(input, type, payload);
  const mark = (key: string, text: string) => {
    if (!s.milestones.some((m) => m.key === key))
      s.milestones.push({ key, day: day(s), text });
  };
  if (type !== "new") {
    if (!input.wolf && s.wolf) mark("wolf", "白狼成为同行的伙伴");
    if (!input.camel && s.camel) mark("camel", "解救并驯服沙漠骆驼");
    if (!input.puzzleDone && s.puzzleDone)
      mark("puzzle", `日月明暗盘于${s.moves}步解开`);
    if (!input.lab && s.lab) mark("lab", "发现破风口研究所");
    if (input.friendship < 5 && s.friendship === 5)
      mark("kuru", "库鲁赠予千年铁木");
    for (let z = 1; z < 12; z++)
      if (input.progress[z] < 5 && s.progress[z] === 5) {
        s.bossKills++;
        mark("zone-" + z, "攻克" + zones[z].name + "守关战");
      }
    if (!input.ending && s.ending && s.ending !== "death")
      mark("ending", "逃生成功 · " + s.ending);
  }
  return s;
}
