import type { State, Bag } from "../types";
import { items, zones } from "../data";
import {
  day,
  inventory,
  weight,
  capacity,
  add,
  advance,
  log,
  random,
  routeChecks,
} from "./game";
export type Route = "A" | "B" | "C" | "D";
export const sharedStock = (s: State) => {
  const result = { ...s.storage };
  for (const [k, n] of Object.entries(s.bag)) result[k] = (result[k] || 0) + n;
  return result;
};
export const gearCondition = (s: State, id: string) => s.durability[id] ?? 100;
export function routeTargets(s: State, route: Route): number[] {
  const stock = sharedStock(s),
    targets = new Set<number>();
  const need = (id: string, n: number, z: number) => {
    if ((stock[id] || 0) < n) targets.add(z);
  };
  if (route === "A") {
    if (!s.blueprint) targets.add(5);
    need("ironwood", 1, 4);
    need("sail", 1, 8);
    need("wood", 50, 1);
    need("vine", 30, 3);
    need("roast", 20, 0);
    need("water", 20, 0);
    if (!targets.size) targets.add(0);
  }
  if (route === "B") {
    if (!s.lab) targets.add(5);
    if (["pass", "disk", "uniform"].some((k) => !stock[k]))
      targets.add(s.lab ? 9 : 5);
    if (s.lab && ["pass", "disk", "uniform"].every((k) => stock[k] > 0))
      targets.add(1);
  }
  if (route === "C") {
    if (!s.volcano) targets.add(5);
    if (!s.canoe) {
      need("obsidian", 10, 11);
      need("alloy", 5, 7);
      need("hide", 15, 2);
      targets.add(11);
    } else targets.add(11);
  }
  if (route === "D") {
    const sources = [1, 3, 4, 5, 6, 7, 10];
    sources.forEach((z, i) => {
      if (!s.pearls.includes(i + 1)) targets.add(z);
    });
    if (!targets.size) targets.add(0);
  }
  return [...targets];
}
export function survivalHints(
  s: State,
): { text: string; zone: number; kind: string }[] {
  const hints: { text: string; zone: number; kind: string }[] = [];
  const stock = sharedStock(s);
  const push = (text: string, zone: number, kind = "阶段目标") =>
    hints.push({ text, zone, kind });
  if (s.stats.water < 35)
    push("水分快告急：先喝净水或椰子；没有净水时回营煮沸生水。", 0, "生存警报");
  if (s.stats.external < 60 || s.stats.internal < 60)
    push(
      "伤病正在持续损耗生命：用绷带止血、汤药治疗内伤，再继续探索。",
      0,
      "生存警报",
    );
  if (!s.ending && routeChecks(s)[s.trackedRoute].every(Boolean))
    push(
      `结局${s.trackedRoute}的条件已经全部满足！打开营地/伙伴中的「逃生工程」，点击「启动逃生 · ${s.trackedRoute}」。`,
      s.location,
      "逃生就绪",
    );
  if (s.weather === "浓雾" && !s.pearls.includes(5))
    push("浓雾机缘：暗流第五层的沉没宝匣藏着五星龙珠与六分仪。", 6, "天气机缘");
  if (s.weather === "大雨" && !s.pearls.includes(2))
    push("雨水漫过丘陵石缝：通关第五层后重访，可拾取二星龙珠。", 3, "天气机缘");
  if (s.weather === "晴朗" && s.progress[1] === 5 && !s.pearls.includes(1))
    push("晴日退潮：重访浅滩海岸，寻找一星龙珠。", 1, "天气机缘");
  if (!stock.spear && !stock.steelspear)
    push(
      "先制作竹枪：竹子4、石块2、藤条2。长柄武器能在距离2压制野兽，再挑战竹林第五层。",
      2,
    );
  if (!s.facilities.trap)
    push(
      `第${day(s)}天的首要补给：用木材5、石块3建净水捕兽设施，每天清晨补充水和食物原料。`,
      0,
    );
  if (s.wolfFound && !s.wolf)
    push(
      `白狼正在等你：还需生肉${Math.max(0, 5 - s.wolfMeat)}与绷带${Math.max(0, 2 - s.wolfBandage)}，结伴后可委托安全扫荡。`,
      2,
      "伙伴线索",
    );
  else if (!s.wolfFound && s.progress[2] > 0)
    push(
      "竹林深处有白狼哀嚎：准备生肉5份、绷带2份，击败第五层野猪王。",
      2,
      "伙伴线索",
    );
  if (s.camelFound && !s.camel)
    push(
      "解救的骆驼需要青草10与纯净水1；驯服后负重增加40kg，行军加快20%。",
      3,
      "伙伴线索",
    );
  if (s.kuru && s.friendship < 5)
    push(
      `库鲁好感${s.friendship}/5：赠送烤肉、烈酒或珍珠，五星可获得千年铁木与三星龙珠。`,
      4,
      "伙伴线索",
    );
  if (!s.blueprint && (stock.spear || stock.steelspear))
    push(
      "带上火把进入溶洞。日月盘十步内复位会打开研究所暗门；两种解法都能获得造船图纸。",
      5,
    );
  if (s.stats.spirit < 45 || hourLate(s))
    push(
      "疲惫时别硬撑：20:00—22:00在营地睡眠，可获得额外精神与内伤恢复。",
      0,
      "营地节律",
    );
  if (s.loadoutReport?.missing.some((t) => t.includes("内伤药")))
    push(
      "整备还缺内伤药：药草3、薄荷1、纯净水1可在草药臼制作苦味汤药，补齐后再出发。",
      0,
      "整备补缺",
    );
  if (hints.length < 2) {
    const target = routeTargets(s, s.trackedRoute)[0] ?? 0;
    push(
      `你已具备远行基础。查看结局${s.trackedRoute}缺口，前往${zones[target].name}推进下一步。`,
      target,
      "逃生导航",
    );
  }
  if (hints.length < 2)
    push(
      s.wolf
        ? "已清关区域可委托白狼安全扫荡；出门用最佳整备，回营一键卸货，省下往返与逐件整理。"
        : "别把物资都背在身上：出门用最佳整备，至少预留60%负重；回营用一键卸货保留补给。",
      0,
      "省力生存",
    );
  return hints.slice(0, 3);
}
function hourLate(s: State) {
  const h = s.time % 24;
  return h >= 20 || h < 5;
}
function move(s: State, id: string, n: number, toBag: boolean) {
  const from = toBag ? s.storage : s.bag,
    to = toBag ? s.bag : s.storage;
  const unit = items[id]?.weight || 0.2;
  const available = from[id] || 0;
  const room = toBag
    ? Math.max(0, Math.floor((capacity(s) - weight(s) + 1e-8) / unit))
    : available;
  const count = Math.min(available, n, room);
  if (count > 0) {
    from[id] -= count;
    to[id] = (to[id] || 0) + count;
  }
  return count;
}
const provisions: Record<string, number> = {
  roast: 4,
  stew: 4,
  soup: 4,
  feast: 4,
  can: 4,
  water: 4,
  bandage: 2,
  salve: 2,
  tonic: 2,
  antibiotic: 2,
  firstaid: 1,
};
export function unload(s: State) {
  let count = 0;
  for (const [id, n] of Object.entries(s.bag)) {
    let keep = Object.values(s.equipment).includes(id) ? 1 : 0;
    if (["torch", "mask", "pack"].includes(id)) keep = Math.max(keep, 1);
    keep = Math.max(keep, provisions[id] || 0);
    count += move(s, id, Math.max(0, n - keep), false);
  }
  log(s, `一键卸货：${count}件物资入库，保留装备与核心口粮药品。`);
}
export function prepare(s: State, target: number) {
  // 重排随身物资，再按优先级取用；从不生成、销毁或突破负重预算。
  for (const [id, n] of Object.entries(s.bag)) move(s, id, n, false);
  s.equipment = { melee: "", ranged: "", armor: "", tool: "" };
  if (s.storage.pack) move(s, "pack", 1, true);
  const budget = capacity(s) * 0.4;
  const missing: string[] = [];
  const take = (id: string, n: number, required = false) => {
    const unit = items[id]?.weight || 0.2;
    const room = Math.max(0, Math.floor((budget - weight(s) + 1e-8) / unit));
    const got = move(s, id, Math.min(n, room), true);
    if (required && got < n) missing.push(`${items[id].name}${n - got}`);
    return got;
  };
  const choose = (ids: string[]) =>
    ids
      .filter((id) => s.storage[id] > 0 && gearCondition(s, id) > 0)
      .sort(
        (a, b) =>
          (items[b].power || 0) * gearCondition(s, b) -
            (items[a].power || 0) * gearCondition(s, a) ||
          gearCondition(s, b) - gearCondition(s, a),
      )[0];
  const melee = choose(
    Object.keys(items).filter(
      (k) => (items[k].kind === "武器" && !items[k].ammo) || k === "knife",
    ),
  );
  const rangedIds = Object.keys(items).filter((k) => !!items[k].ammo);
  const ranged =
    choose(rangedIds.filter((k) => (s.storage[items[k].ammo!] || 0) > 0)) ||
    choose(rangedIds);
  const armor =
    (target === 10 ||
      (Math.floor((day(s) - 1) / 15) % 4 === 3 && target !== 11)) &&
    s.storage.coat
      ? "coat"
      : choose(
          Object.keys(items).filter(
            (k) => items[k].kind === "防具" && k !== "coat",
          ),
        ) || (s.storage.coat ? "coat" : "");
  if (armor && take(armor, 1)) s.equipment.armor = armor;
  if (melee && take(melee, 1)) s.equipment.melee = melee;
  if (ranged && take(ranged, 1)) s.equipment.ranged = ranged;
  let food = 4;
  for (const id of ["feast", "stew", "soup", "roast", "can"]) {
    const got = take(id, Math.min(food, s.storage[id] || 0));
    food -= got;
    if (!food) break;
  }
  if (food) missing.push(`熟食${food}`);
  take("water", 4, true);
  for (const group of [
    ["salve", "bandage"],
    ["antibiotic", "tonic"],
  ]) {
    let n = 2;
    for (const id of group) n -= take(id, Math.min(n, s.storage[id] || 0));
    if (n) missing.push(`${group[0] === "salve" ? "外伤药" : "内伤药"}${n}`);
  }
  if (ranged) take(items[ranged].ammo!, 10, true);
  if ([5, 10].includes(target)) take("torch", 1, true);
  else if (s.storage.torch) take("torch", 1);
  if (target === 11) take("mask", 1, true);
  if (s.storage.pick && take("pick", 1)) s.equipment.tool = "pick";
  if ([1, 6].includes(target) && s.storage.rod) take("rod", 1);
  if (!s.equipment.melee) missing.push("近战武器1");
  if (target === 10 && s.equipment.armor !== "coat") missing.push("毛皮大衣1");
  s.loadoutReport = { target, weight: weight(s), budget, missing };
  log(
    s,
    `最佳整备完成：${weight(s).toFixed(1)}/${capacity(s)}kg，预留${Math.floor((1 - weight(s) / capacity(s)) * 100)}%负重。${missing.length ? "缺少：" + missing.join("、") : "口粮、药品与装备已就绪。"}`,
  );
}
export function qol(s: State, type: string, payload: string | number): boolean {
  switch (type) {
    case "trackRoute":
      if (["A", "B", "C", "D"].includes(String(payload)))
        s.trackedRoute = String(payload) as Route;
      return true;
    case "unload":
      if (s.location === 0) unload(s);
      return true;
    case "prepare":
      if (s.location === 0) prepare(s, Number(payload) || s.selected);
      return true;
    case "transfer": {
      if (s.location !== 0) return true;
      const [direction, id, amount] = String(payload).split(":");
      if (!items[id]) return true;
      const n =
        amount === "all"
          ? Number.MAX_SAFE_INTEGER
          : Math.max(0, Math.floor(Number(amount) || 0));
      if (direction === "put" && Object.values(s.equipment).includes(id)) {
        move(s, id, Math.min(n, Math.max(0, (s.bag[id] || 0) - 1)), false);
      } else move(s, id, n, direction === "take");
      return true;
    }
    case "sweep": {
      const z = Number(payload);
      if (
        !zones[z] ||
        z === 0 ||
        s.progress[z] !== 5 ||
        !(s.location === z || (s.location === 0 && s.wolf))
      )
        return true;
      if (s.stats.hunger < 15 || s.stats.water < 15) {
        log(s, "扫荡需至少15饱食与15水分，请先补给。");
        return true;
      }
      const food = s.stats.hunger,
        water = s.stats.water;
      advance(s, 2);
      s.stats.hunger -= food - s.stats.hunger;
      s.stats.water -= water - s.stats.water;
      if (s.ending) return true;
      for (const id of zones[z].resources) {
        if (id === "glow" && s.time % 24 >= 6 && s.time % 24 < 20) continue;
        add(
          s,
          id,
          (9 + Math.floor(random(s) * 7)) *
            (s.talent === "botanist" && ["herb", "mint"].includes(id) ? 2 : 1),
        );
      }
      s.sweeps++;
      log(
        s,
        `${s.location === 0 ? "白狼带回" : "安全扫荡获得"}${zones[z].name}整轮采集物资，耗时2小时，饱食水分消耗翻倍。特殊剧情仍需亲自重访。`,
      );
      return true;
    }
    case "repairGear":
      if (s.location === 0 && s.facilities.work >= 2) {
        const id = String(payload);
        if (
          (inventory(s)[id] || 0) > 0 &&
          (inventory(s).iron || 0) >= 1 &&
          (inventory(s).wood || 0) >= 2
        ) {
          const consume = (k: string, n: number) => {
            const used = Math.min(s.bag[k] || 0, n);
            s.bag[k] = (s.bag[k] || 0) - used;
            s.storage[k] = (s.storage[k] || 0) - (n - used);
          };
          consume("iron", 1);
          consume("wood", 2);
          advance(s, 0.5);
          s.durability[id] = 100;
          log(s, "已修复" + items[id].name + "耐久。");
        }
      }
      return true;
  }
  return false;
}
