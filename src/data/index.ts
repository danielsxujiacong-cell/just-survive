import type { Item, Zone, Enemy } from "../types";
export const items: Record<string, Item> = {};
const raw: Record<string, string> = {
  wood: "木材",
  stone: "石块",
  coconut: "椰子",
  kelp: "海带",
  bamboo: "竹子",
  grass: "青草",
  berry: "浆果",
  iron: "生铁矿",
  herb: "药草",
  vine: "藤条",
  hardwood: "硬木",
  resin: "树脂",
  mint: "薄荷",
  glow: "发光赤芝",
  niter: "硝石",
  sulfur: "硫磺",
  crystal: "水晶",
  salt: "海盐",
  pearl: "珍珠",
  fish: "深海鱼",
  driftwood: "漂流木",
  parts: "精炼零件",
  tablet: "古老石板",
  mithril: "秘银碎块",
  canvas: "帆布",
  scrap: "废金属",
  gear: "生锈齿轮",
  can: "罐头",
  wine: "烈酒",
  reagent: "医疗试剂",
  electronics: "电子元件",
  fiber: "合成纤维",
  battery: "高能电池",
  lotus: "雪莲",
  coldiron: "寒铁",
  finefur: "优质毛皮",
  ice: "冰晶",
  obsidian: "黑曜石",
  puresulfur: "纯硫磺",
  hematite: "赤铁矿",
  meat: "生肉",
  hide: "兽皮",
  tendon: "兽筋",
  alloy: "古代合金",
  ironwood: "千年铁木",
  sail: "完整航海帆布",
  knife: "救生小刀",
  flint: "打火石",
  sextant: "六分仪",
  pass: "研究所通行证",
  disk: "实验数据硬盘",
  uniform: "研究员制服",
  gunplan: "燧发枪蓝图",
  rawWater: "生水",
};
Object.entries(raw).forEach(
  ([id, name]) =>
    (items[id] = {
      name,
      weight: ["knife", "sextant"].includes(id) ? 0.5 : 0.2,
      kind: "材料",
    }),
);
items.coconut.heal = { water: 22, hunger: 10 };
items.berry.heal = { hunger: 12, water: 5 };
items.kelp.heal = { hunger: 8 };
items.can.heal = { hunger: 40 };
items.meat.heal = { hunger: 16, internal: -18 };
items.rawWater.heal = { water: 28 };
items.herb.heal = { internal: 12 };
items.fish.heal = { hunger: 18, internal: -10 };
items.wine.heal = { spirit: 15, water: -8 };
items.knife.power = 9;
function craft(
  id: string,
  name: string,
  kind: string,
  recipe: Record<string, number>,
  facility: string,
  level: number,
  extra: Partial<Item> = {},
) {
  items[id] = {
    name,
    kind,
    recipe,
    facility,
    level,
    weight: kind === "武器" ? 2 : kind === "防具" ? 3 : 0.2,
    hours: 1,
    ...extra,
  };
}
craft("water", "纯净水", "补给", { rawWater: 1, wood: 1 }, "fire", 1, {
  heal: { water: 36 },
});
craft("roast", "烤肉", "补给", { meat: 1, wood: 1 }, "fire", 1, {
  heal: { hunger: 32 },
});
craft("stew", "椰汁炖肉", "补给", { meat: 1, coconut: 1 }, "fire", 1, {
  heal: { hunger: 40, water: 24, hp: 5 },
});
craft("soup", "海鲜浓汤", "补给", { fish: 1, kelp: 2, salt: 1 }, "fire", 2, {
  heal: { hunger: 45, water: 35, internal: 8 },
});
craft("feast", "精力大餐", "补给", { roast: 2, berry: 2, mint: 1 }, "fire", 3, {
  heal: { hunger: 65, spirit: 35, hp: 15 },
});
craft("charcoal", "木炭", "材料", { wood: 2 }, "fire", 1);
craft("axe", "石斧", "武器", { wood: 3, stone: 4 }, "work", 1, {
  power: 17,
  range: 1,
});
craft(
  "ironaxe",
  "双刃铁斧",
  "武器",
  { iron: 6, wood: 4, tendon: 1 },
  "work",
  2,
  { power: 32, range: 1, hours: 2 },
);
craft(
  "blackaxe",
  "黑曜石战斧",
  "武器",
  { obsidian: 8, iron: 5, hide: 3 },
  "work",
  3,
  { power: 48, range: 1, hours: 2 },
);
craft("spear", "竹枪", "武器", { bamboo: 4, stone: 2, vine: 2 }, "work", 1, {
  power: 19,
  range: 2,
});
craft(
  "steelspear",
  "精钢长矛",
  "武器",
  { iron: 8, hardwood: 4, alloy: 2 },
  "work",
  3,
  { power: 38, range: 2 },
);
craft("bow", "竹弓", "武器", { bamboo: 4, tendon: 2, vine: 3 }, "work", 1, {
  power: 23,
  range: 4,
  ammo: "arrow",
});
craft(
  "crossbow",
  "复合弩",
  "武器",
  { iron: 6, hardwood: 4, gear: 2 },
  "work",
  2,
  { power: 39, range: 4, ammo: "bolt" },
);
craft(
  "gun",
  "燧发枪",
  "武器",
  { iron: 10, gear: 4, hardwood: 4, gunplan: 1 },
  "work",
  3,
  { power: 65, range: 4, ammo: "bullet" },
);
craft("blowgun", "吹箭筒", "武器", { bamboo: 3, resin: 2 }, "work", 1, {
  power: 15,
  range: 4,
  ammo: "dart",
});
craft("arrow", "竹箭", "弹药", { bamboo: 1, stone: 1 }, "work", 1);
craft("bolt", "铁箭", "弹药", { iron: 1, wood: 1 }, "work", 2);
craft(
  "bullet",
  "黑火药弹丸",
  "弹药",
  { niter: 1, sulfur: 1, charcoal: 1, iron: 1 },
  "work",
  3,
);
craft("dart", "麻痹毒针", "弹药", { bamboo: 1, herb: 1, sulfur: 1 }, "work", 1);
craft("vinearmor", "藤甲", "防具", { vine: 6, grass: 4 }, "work", 1, {
  power: 4,
});
craft("leather", "兽皮战甲", "防具", { hide: 8, vine: 4 }, "work", 2, {
  power: 8,
});
craft("suit", "防护服", "防具", { fiber: 6, reagent: 2, hide: 4 }, "work", 3, {
  power: 12,
});
craft("coat", "毛皮大衣", "防具", { finefur: 6, hide: 4, vine: 3 }, "work", 2, {
  power: 9,
});
craft(
  "mask",
  "防毒面具",
  "工具",
  { charcoal: 3, fiber: 2, resin: 2 },
  "work",
  2,
);
craft("torch", "火把", "工具", { wood: 2, resin: 1 }, "work", 1);
craft("pick", "铁镐", "工具", { iron: 4, wood: 3 }, "work", 2);
craft("rod", "钓鱼竿", "工具", { bamboo: 3, vine: 3 }, "work", 1);
craft("pack", "藤条背包", "工具", { vine: 10, hide: 3 }, "work", 1);
craft("bandage", "草药绷带", "药剂", { grass: 3, herb: 1 }, "medicine", 1, {
  heal: { external: 30 },
});
craft("salve", "金疮药", "药剂", { herb: 3, resin: 1 }, "medicine", 2, {
  heal: { external: 60, hp: 10 },
});
craft(
  "tonic",
  "苦味汤药",
  "药剂",
  { herb: 3, mint: 1, water: 1 },
  "medicine",
  1,
  { heal: { internal: 35, hp: 12 } },
);
craft(
  "antibiotic",
  "秘制抗生素",
  "药剂",
  { reagent: 2, lotus: 1, water: 1 },
  "medicine",
  2,
  { heal: { internal: 80, hp: 20 } },
);
craft(
  "firstaid",
  "急救包",
  "药剂",
  { bandage: 2, tonic: 1, wine: 1 },
  "medicine",
  2,
  { heal: { hp: 45, external: 25 } },
);
craft(
  "adrenaline",
  "肾上腺素",
  "药剂",
  { reagent: 2, glow: 2 },
  "medicine",
  2,
  { heal: { hp: 35, spirit: 30 } },
);
craft("net", "投掷网", "工具", { vine: 4, tendon: 1 }, "work", 1);
items.seed = { name: "草药种子", weight: 0.05, kind: "材料" };
items.honey = {
  name: "野蜂蜜",
  weight: 0.2,
  kind: "补给",
  heal: { hunger: 22, spirit: 8 },
};
items.eelcatch = { name: "电鳗鱼获", weight: 0.4, kind: "材料" };
craft("crowbar", "铁撬棍", "工具", { iron: 4, wood: 2 }, "work", 2);
craft("steeltrap", "捕兽夹", "工具", { iron: 3, vine: 2 }, "work", 2);
craft("grilleel", "炭烤电鳗", "补给", { eelcatch: 1, wood: 1 }, "fire", 1, {
  heal: { hunger: 45, water: 12 },
});
export const facilities = [
  { id: "fire", name: "篝火 / 石炉", max: 3 },
  { id: "work", name: "木工 / 铁匠台", max: 3 },
  { id: "medicine", name: "药剂实验台", max: 2 },
  { id: "bed", name: "睡眠庇护所", max: 3 },
  { id: "trap", name: "净水与捕兽陷阱", max: 3 },
  { id: "fence", name: "防御木栅栏", max: 3 },
  { id: "garden", name: "草药种植箱", max: 3 },
  { id: "rain", name: "雨水收集器", max: 3 },
];
export function facilityCost(level: number) {
  return {
    wood: 5 + level * 5,
    stone: 3 + level * 3,
    ...(level > 1 ? { iron: 3 } : {}),
  };
}
export const zones: Zone[] = [
  [
    0,
    "避风营地",
    20,
    75,
    0,
    [],
    [],
    "",
    "火光尚未熄灭，这里是你在孤岛上的家。",
  ],
  [
    1,
    "浅滩海岸",
    15,
    88,
    1,
    ["coconut", "wood", "stone", "kelp"],
    ["crab", "piranha"],
    "crab",
    "残骸藏着小刀与打火石。晴天，潮水会送来一星龙珠。",
  ],
  [
    2,
    "翠微竹林",
    32,
    68,
    1.5,
    ["bamboo", "wood", "grass", "berry"],
    ["snake", "boar"],
    "boarking",
    "野猪王守着一只受伤的白狼。",
  ],
  [
    3,
    "乱石丘陵",
    45,
    78,
    2,
    ["stone", "iron", "herb", "vine"],
    ["wolf", "vulture"],
    "wolf",
    "受困的骆驼渴望青草与干净的水。雨中石缝闪着二星之光。",
  ],
  [
    4,
    "幽暗密林",
    38,
    50,
    2.5,
    ["hardwood", "resin", "mint", "glow"],
    ["bear", "wolves"],
    "bear",
    "库鲁的部落愿意以真诚交换千年铁木。",
  ],
  [
    5,
    "钟乳溶洞",
    55,
    55,
    3,
    ["niter", "sulfur", "iron", "crystal"],
    ["bat", "python"],
    "python",
    "日月明暗盘连接着两条命运。十步以内，暗门开启。",
  ],
  [
    6,
    "诡谲暗流",
    22,
    40,
    3,
    ["salt", "pearl", "fish", "driftwood"],
    ["eel", "shark"],
    "shark",
    "只有浓雾笼罩时，沉没的宝匣才会浮出水面。",
  ],
  [
    7,
    "远古遗迹",
    68,
    65,
    3.5,
    ["parts", "tablet", "herb", "mithril"],
    ["guard", "spider"],
    "gargoyle",
    "石像鬼胸前的合金，仍保留着古文明的余温。",
  ],
  [
    8,
    "搁浅沉船",
    12,
    22,
    4,
    ["canvas", "scrap", "gear", "can", "wine"],
    ["sailor", "octopus"],
    "kraken",
    "甲板下的巨怪守着最后一面完整的帆。",
  ],
  [
    9,
    "破风口研究所",
    50,
    25,
    4.5,
    ["reagent", "electronics", "fiber", "battery"],
    ["robot", "mutant"],
    "doctor",
    "废弃研究所里，补给船的秘密仍在运行。",
  ],
  [
    10,
    "极寒雪原",
    75,
    30,
    5,
    ["lotus", "coldiron", "finefur", "ice"],
    ["polarbear", "icewolf"],
    "icewolf",
    "三份汤药能融化祭坛的坚冰。",
  ],
  [
    11,
    "赤焰火山口",
    85,
    50,
    5,
    ["obsidian", "puresulfur", "hematite"],
    ["lizard", "priest"],
    "priest",
    "将地脉的怒吼，变成离岛的最后一道浪。",
  ],
].map(
  (a) =>
    ({
      id: a[0],
      name: a[1],
      x: a[2],
      y: a[3],
      hours: a[4],
      resources: a[5],
      enemies: a[6],
      boss: a[7],
      story: a[8],
    }) as Zone,
);
const enemyRows: [string, string, number, number, number, boolean?][] = [
  ["crab", "寄居蟹", 24, 5, 1],
  ["piranha", "食人鱼", 30, 6, 1],
  ["snake", "毒蛇", 32, 7, 1, true],
  ["boar", "野猪", 43, 8, 1],
  ["boarking", "狂暴野猪王", 90, 13, 1],
  ["wolf", "灰狼", 45, 9, 1],
  ["vulture", "秃鹫", 35, 8, 2],
  ["bear", "黑熊", 75, 13, 1],
  ["wolves", "精英狼群", 70, 12, 1],
  ["bat", "吸血蝙蝠", 42, 8, 1],
  ["python", "洞穴巨蟒", 100, 14, 1, true],
  ["eel", "电鳗", 50, 10, 2],
  ["shark", "双髻鲨", 100, 14, 1],
  ["guard", "遗迹守卫犬", 65, 12, 1],
  ["spider", "剧毒蜘蛛", 52, 10, 2, true],
  ["gargoyle", "石像鬼统领", 125, 16, 1],
  ["sailor", "变异水手", 72, 12, 1],
  ["octopus", "巨型章鱼", 85, 13, 2],
  ["kraken", "深海巨怪触手", 145, 17, 2],
  ["robot", "失控机械犬", 85, 14, 1],
  ["mutant", "变异实验体", 90, 14, 1, true],
  ["doctor", "疯狂博士变异体", 165, 18, 2, true],
  ["polarbear", "雪原白熊", 95, 15, 1],
  ["icewolf", "冰原狼王", 135, 17, 1],
  ["lizard", "熔岩巨蜥", 100, 16, 1],
  ["priest", "狂暴野人祭司", 155, 18, 2, true],
];
export const enemies: Record<string, Enemy> = Object.fromEntries(
  enemyRows.map(([id, name, hp, attack, range, poison]) => [
    id,
    { name, hp, attack, range, poison },
  ]),
);
export const weatherNames = ["晴朗", "大雨", "浓雾", "暴风", "火山灰"];
export const endingNames: Record<string, string> = {
  A: "乘风破浪 · 方舟远航",
  B: "黎明潜行 · 破风口物资船",
  C: "绝境冲浪 · 火山大爆发",
  D: "神龙降临 · 七星连珠",
  death: "最后一页 · 长眠荒野",
};
