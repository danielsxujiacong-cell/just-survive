import type { State, Statuses, Battle } from "../types";
import { items, enemies, zones } from "../data";
import { events, eventById } from "../data/events";
import {
  add,
  pay,
  random,
  advance,
  log,
  day,
  hour,
  weight,
  capacity,
  inventory,
} from "./game";
export const emptyStatus = (): Statuses => ({
  bleed: 0,
  poison: 0,
  root: 0,
  paralyze: 0,
  armorbreak: 0,
  rage: 0,
});
export const maxHP = (s: State) => (s.talent === "athlete" ? 120 : 100);
export function battleFor(
  s: State,
  enemyId: string,
  origin: "region" | "journey" = "region",
): Battle {
  if (!s.seenEnemies.includes(enemyId)) s.seenEnemies.push(enemyId);
  const e = enemies[enemyId];
  return {
    enemy: { ...e },
    hp: e.hp,
    distance: 3,
    turn: 0,
    wolfCD: 0,
    stun: 0,
    bleed: 0,
    message:
      origin === "journey"
        ? "路途伏击！保住补给并突破包围。"
        : "敌影逼近，选择瞄准部位。",
    aim: "torso",
    enemyStatus: emptyStatus(),
    playerStatus: emptyStatus(),
    environment:
      s.weather === "大雨"
        ? "泥泞湿地"
        : s.weather === "浓雾"
          ? "浓雾遮蔽"
          : s.location === 5
            ? "狭窄洞道"
            : s.location === 10
              ? "深雪冰面"
              : s.location === 11
                ? "硫烟热地"
                : "林间空地",
    playerPos: 0,
    enemyPos: 3,
    skillCD: 0,
    enemyId,
    origin,
  };
}
export function queueEvent(s: State, zone = s.location) {
  if (s.encounter || s.puzzle || s.battle) return;
  const pool = events.filter((e) => e.zone === zone);
  const fresh = pool.filter((e) => !s.seenEvents.includes(e.id));
  s.encounter =
    (fresh[0] || pool[Math.floor(random(s) * pool.length)])?.id || null;
}
export function startJourney(s: State, to: number) {
  if (!zones[to] || to === s.location) return;
  if (to === 9 && !s.lab) {
    log(s, "研究所暗门尚未开启。");
    return;
  }
  if (to === 5 && !s.bag.torch) {
    log(s, "溶洞行军必须携带火把。");
    return;
  }
  if (to === 10 && (s.equipment.armor !== "coat" || !s.bag.torch)) {
    log(s, "雪原行军需要装备毛皮大衣并携带火把。");
    return;
  }
  const travel =
    (to === 0 ? zones[s.location].hours : zones[to].hours) *
    (s.camel ? 0.8 : 1) *
    (s.talent === "sailor" ? 0.85 : 1) *
    (s.stats.hunger < 30 ? 1.5 : 1);
  s.journey = {
    from: s.location,
    to,
    stage: 0,
    stages: 4,
    hours: travel,
    returning: false,
    incident: null,
    history: [],
  };
  s.selected = to;
  log(
    s,
    `出发前往${zones[to].name}，分四段行进，预计${travel.toFixed(1)}小时。`,
  );
}
export function advanced(
  s: State,
  type: string,
  payload: string | number,
): boolean {
  const id = String(payload);
  switch (type) {
    case "talent": {
      if (s.talent) return true;
      if (
        ![
          "engineer",
          "botanist",
          "hunter",
          "athlete",
          "sailor",
          "medic",
        ].includes(id)
      )
        return true;
      s.talent = id;
      s.prologue = "playing";
      if (id === "athlete") s.stats.hp = 120;
      if (id === "botanist") add(s, "seed", 3);
      if (id === "sailor") {
        add(s, "rod", 1);
        add(s, "water", 3);
      }
      if (id === "medic") {
        add(s, "firstaid", 1);
        add(s, "tonic", 2);
      }
      log(s, "你选择了自己的生存之道。");
      return true;
    }
    case "journeyStep": {
      const j = s.journey;
      if (!j || j.incident || s.battle) return true;
      advance(s, j.hours / j.stages);
      if (s.ending) return true;
      j.stage++;
      s.stats.hunger -= 0.5;
      s.stats.water -= 0.5;
      const threshold =
        (s.weather === "暴风" || s.weather === "大雨" ? 0.55 : 0.2) +
        (hour(s) > 20 || hour(s) < 5 ? 0.2 : 0) +
        Math.max(j.from, j.to) * 0.008;
      if (j.stage < j.stages && random(s) < threshold) {
        j.incident =
          s.weather === "大雨" || s.weather === "暴风"
            ? "landslide"
            : hour(s) > 20 || hour(s) < 5
              ? "ambush"
              : random(s) < 0.5
                ? "bottle"
                : "marker";
        j.history.push(`阶段${j.stage}：${j.incident}`);
        log(s, "旅途发生意外，请选择应对方式。");
      }
      if (j.stage >= j.stages) {
        s.location = j.to;
        s.selected = j.to;
        s.journey = null;
        log(s, `抵达${zones[s.location].name}。`);
      }
      return true;
    }
    case "journeyChoice": {
      const j = s.journey;
      if (!j?.incident) return true;
      if (j.incident === "landslide") {
        if (id === "tool") {
          if (!pay(s, { vine: 2 })) {
            log(s, "没有足够藤条，无法设置安全绳。");
            return true;
          }
          log(s, "借藤条绕过坍塌边缘。");
        } else {
          s.stats.external -= 10;
          s.stats.hp -= 4;
          log(s, "你强行穿过山洪，腿部被碎石划伤。");
        }
      } else if (j.incident === "ambush") {
        if (id === "tool" && pay(s, { meat: 1 })) {
          log(s, "抛下生肉，狼群转向争食。");
        } else {
          s.battle = battleFor(s, "wolf", "journey");
          log(s, "夜行的狼群封住了退路。");
        }
      } else if (j.incident === "bottle") {
        if (id === "tool") {
          advance(s, 0.2);
          add(s, "water", 1);
          add(s, "herb", 2);
          log(s, "漂流瓶旁留着前人的应急补给。");
        } else log(s, "你放弃搜寻，继续赶路。");
      } else {
        if (id === "tool") {
          advance(s, 0.15);
          s.stats.spirit += 6;
          log(s, "旧路标证明有人走过这里，你重新找回了方向。");
        } else {
          s.stats.spirit -= 2;
          log(s, "你离开路标，强行穿过灌木。");
        }
      }
      j.incident = null;
      return true;
    }
    case "journeyRetreat": {
      const j = s.journey;
      if (!j) return true;
      const traveled = (j.hours * j.stage) / j.stages;
      const back =
        j.from === 0
          ? traveled
          : traveled + zones[j.from].hours * (s.camel ? 0.8 : 1);
      s.journey = {
        from: j.to,
        to: 0,
        stage: 0,
        stages: 3,
        hours: Math.max(0.3, back),
        returning: true,
        incident: null,
        history: [...j.history, "紧急折返营地"],
      };
      s.selected = 0;
      log(s, "你转身折返；已走过的路依然需要时间。");
      return true;
    }
    case "chooseEvent": {
      const ev = eventById[s.encounter || ""];
      if (!ev) return true;
      const [index, code] = id.split(":");
      const c = ev.choices[Number(index)];
      if (!c) return true;
      if (c.check && s.stats[c.check.stat] < c.check.min) {
        log(s, `属性检定未通过：${c.check.stat}需要${c.check.min}。`);
        return true;
      }
      if (c.need && !(inventory(s)[c.need] > 0)) {
        log(s, "工具检定失败：缺少" + items[c.need].name);
        return true;
      }
      if (c.code && c.code !== code) {
        log(s, "密码错误，警报消耗了你的冷静。");
        s.stats.spirit -= 3;
        return true;
      }
      if (c.cost && !pay(s, c.cost)) {
        log(s, "缺少该选择需要的材料。");
        return true;
      }
      advance(s, c.hours || 0.25);
      if (s.ending) return true;
      const result = random(s) < (c.chance ?? 1) ? c.success : c.failure!;
      if (result.gain)
        for (const [k, n] of Object.entries(result.gain)) add(s, k, n);
      if (result.stats)
        for (const [k, n] of Object.entries(result.stats))
          s.stats[k as keyof typeof s.stats] += n;
      log(s, ev.title + "：" + result.text);
      if (!s.seenEvents.includes(ev.id)) s.seenEvents.push(ev.id);
      if (ev.page !== undefined && !s.pages.includes(ev.page)) {
        s.pages.push(ev.page);
        log(s, `收录幸存者日记残页 ${ev.page + 1}/12。`);
      }
      s.encounter = null;
      return true;
    }
    case "campEvent":
      if (s.location === 0) {
        advance(s, 0.3);
        queueEvent(s);
      }
      return true;
    case "plant": {
      if (
        s.location !== 0 ||
        !s.facilities.garden ||
        s.garden.ready ||
        !["herb", "mint"].includes(id)
      )
        return true;
      if (pay(s, { seed: 1, water: 1 })) {
        s.garden = {
          herb: id === "herb" ? 4 + s.facilities.garden * 2 : 0,
          mint: id === "mint" ? 4 + s.facilities.garden * 2 : 0,
          ready: s.time + 24,
        };
        advance(s, 0.25);
        log(s, "种植箱已播种，24小时后可以收获。");
      }
      return true;
    }
    case "harvest":
      if (s.location === 0 && s.garden.ready && s.time >= s.garden.ready) {
        add(s, "herb", s.garden.herb * (s.talent === "botanist" ? 2 : 1));
        add(s, "mint", s.garden.mint * (s.talent === "botanist" ? 2 : 1));
        add(s, "seed", 2);
        s.garden = { herb: 0, mint: 0, ready: 0 };
        advance(s, 0.25);
        log(s, "收获草药，留下两份种子供下次播种。");
      }
      return true;
    case "setTrap":
      if (s.location === 0 && pay(s, { steeltrap: 1 })) {
        s.traps++;
        log(s, "已在栅栏外布置捕兽夹。");
      }
      return true;
    case "setFirewall":
      if (s.location === 0 && pay(s, { wood: 3, resin: 1 })) {
        s.firewall += 1;
        log(s, "已备好一轮火墙燃料。");
      }
      return true;
    case "closeDefense":
      s.defense = null;
      return true;
    case "fish": {
      if (![1, 6].includes(s.location)) {
        log(s, "请到浅滩海岸或诡谲暗流垂钓。");
        return true;
      }
      if (!s.bag.rod) {
        log(s, "背包中需要钓鱼竿。");
        return true;
      }
      advance(s, 0.5);
      s.fishing = {
        phase: 0,
        tension: 25,
        progress: 0,
        attempts: 0,
        last: "等待游标进入绿色安全区，再点击收竿。",
      };
      return true;
    }
    case "fishTick":
      if (s.fishing) s.fishing.phase = (s.fishing.phase + 3) % 200;
      return true;
    case "reel": {
      const f = s.fishing;
      if (!f) return true;
      const cursor = f.phase <= 100 ? f.phase : 200 - f.phase;
      const safe = Math.abs(cursor - 50) <= (s.talent === "sailor" ? 27 : 18);
      f.attempts++;
      f.tension += safe ? -6 : 25;
      f.progress += safe ? 34 : 5;
      f.last = safe
        ? "稳稳收线，鱼已接近岸边。"
        : "收线过猛！张力上升，鱼线可能断裂。";
      if (f.tension >= 100 || f.attempts >= 10) {
        log(s, "鱼线崩断，鱼逃走了。");
        s.fishing = null;
        advance(s, 0.25);
      } else if (f.progress >= 100) {
        const roll = random(s);
        add(
          s,
          roll < 0.12 ? "pearl" : roll < 0.3 ? "eelcatch" : "fish",
          roll < 0.3 ? 1 : 3,
        );
        if (roll < 0.12) add(s, "crystal", 1);
        log(
          s,
          roll < 0.12
            ? "钓起深海珍宝：珍珠与水晶！"
            : roll < 0.3
              ? "钓到一尾电鳗，绝缘处理后可烹饪。"
              : "钓起三尾海鲈鱼。",
        );
        s.fishing = null;
        advance(s, 0.5);
      }
      return true;
    }
    case "cancelFish":
      s.fishing = null;
      return true;
    case "aim":
      if (s.battle && ["head", "limbs", "torso"].includes(id))
        s.battle.aim = id as Battle["aim"];
      return true;
  }
  return false;
}
export function nightDefense(s: State) {
  const rounds: string[] = [];
  const pack = 28 + Math.floor(day(s) / 8) * 4;
  let pressure = pack;
  rounds.push(`第1轮：兽群逼近，威胁强度${pack}。`);
  if (s.traps) {
    s.traps--;
    pressure -= 14;
    rounds.push("第2轮：捕兽夹夹住领头野兽，威胁减少14，捕兽夹消耗1。");
  } else rounds.push("第2轮：外缘没有捕兽夹，兽群完整逼近。");
  if (s.firewall) {
    s.firewall--;
    pressure -= 18;
    rounds.push("第3轮：火墙阻断侧翼，威胁减少18，消耗一轮预备燃料。");
  } else rounds.push("第3轮：侧翼没有火墙，木栅栏独自承压。");
  const loss = Math.max(5, pressure);
  const absorbed = Math.min(loss, s.fence);
  s.fence -= absorbed;
  const breach = Math.max(0, loss - absorbed);
  const damage = breach ? Math.min(35, 10 + breach) : 0;
  let loot = 0;
  if (damage) {
    s.stats.hp -= damage;
    s.stats.external -= Math.round(damage * 0.7);
    s.storage.roast = Math.max(0, (s.storage.roast || 0) - 2);
    rounds.push(`第4轮：防线被突破，受到${damage}伤害，丢失两份烤肉。`);
  } else {
    loot = 3;
    s.storage.meat = (s.storage.meat || 0) + loot;
    rounds.push(`第4轮：栅栏挡下兽群，耐久下降${absorbed}，得到生肉×3。`);
  }
  s.defense = { day: day(s), rounds, damage, loot, barrier: s.fence };
  log(s, "夜袭战报：" + rounds.at(-1));
}
