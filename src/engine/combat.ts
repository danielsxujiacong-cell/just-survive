import type { State } from "../types";
import { items } from "../data";
import { advance, log, random, pay, weight, add } from "./game";
export function combatTurn(s: State, action: string, onWin: () => void) {
  const b = s.battle;
  if (!b) return;
  const es = b.enemyStatus,
    ps = b.playerStatus;
  const melee = items[s.equipment.melee] || items.knife,
    ranged = items[s.equipment.ranged];
  let hit = 0,
    attacking = false,
    protectedTurn = false;
  const skill = action === "skill",
    gunSkill = skill && s.equipment.ranged === "gun";
  if (ps.paralyze) {
    ps.paralyze--;
    b.message = "神经麻痹使你无法行动。";
  } else {
    if (action === "item") {
      b.message = "你使用了补给，敌人继续行动。";
    } else if (action === "advance" || action === "retreat") {
      if (ps.root) b.message = "双腿被定身，无法移动。";
      else {
        const before = b.distance;
        b.distance = Math.max(
          1,
          Math.min(4, b.distance + (action === "advance" ? -1 : 1)),
        );
        if (b.distance !== before)
          b.playerPos = Math.max(
            0,
            b.playerPos + (action === "advance" ? 1 : -1),
          );
        b.message = action === "advance" ? "你向敌人推进。" : "你拉开距离。";
        if (/泥泞|深雪/.test(b.environment) && random(s) < 0.12) {
          s.stats.external -= 3;
          b.message += " 湿滑地面让你失去平衡。";
        }
      }
    } else if (action === "flee") {
      advance(s, 0.25);
      if (random(s) < (es.root ? 0.95 : 0.75)) {
        s.battle = null;
        log(s, "你甩开了敌人。");
        return;
      }
      b.message = "逃离失败，敌人堵住退路。";
    } else if (action === "wolf") {
      if (!s.wolf || b.wolfCD) {
        log(s, "白狼尚不可出战。");
        return;
      }
      hit = 12 + s.wolf * 5;
      attacking = true;
      es.bleed = 3;
      es.root = 2;
      b.wolfCD = 3;
      b.message = "白狼撕咬，敌人流血并被牵制。";
    } else if (action === "net") {
      if (!pay(s, { net: 1 })) return;
      es.root = 3;
      es.paralyze = 1;
      b.message = "投掷网命中，敌人陷入束缚。";
    } else if (
      action === "ranged" ||
      gunSkill ||
      (skill && s.equipment.ranged === "blowgun")
    ) {
      if (skill && b.skillCD) {
        log(s, "战技仍在冷却。");
        return;
      }
      if (!ranged?.ammo || !pay(s, { [ranged.ammo]: 1 })) {
        log(s, "没有远程武器或弹药不足。");
        return;
      }
      attacking = true;
      hit = (ranged.power || 0) * (gunSkill ? 2 : 1);
      let chance =
        (s.stats.spirit < 40 ? 0.6 : 0.9) +
        (b.aim === "torso" ? 0.15 : b.aim === "head" ? -0.25 : 0) -
        (s.weather === "浓雾" ? 0.2 : 0) -
        (b.environment === "狭窄洞道" ? 0.1 : 0);
      if (b.distance === 1 && !gunSkill) chance *= 0.5;
      if (gunSkill) {
        b.skillCD = 4;
        chance = 0.95;
        b.message = "燧发枪·零距轰击！";
        es.armorbreak = 3;
      } else if (skill) {
        b.skillCD = 3;
        es.paralyze = 2;
        b.message = "吹箭·神经麻痹！";
      } else b.message = "远程射击";
      if (random(s) > chance) hit = 0;
      if (hit && s.equipment.ranged === "blowgun") {
        es.poison = 3;
        if (random(s) < 0.5) es.paralyze = 2;
      }
    } else {
      if (skill && b.skillCD) {
        log(s, "战技仍在冷却。");
        return;
      }
      if (b.distance > (melee.range || 1)) {
        log(s, "超出武器触及距离。");
        return;
      }
      attacking = true;
      hit = (melee.power || 9) * (action === "heavy" ? 1.25 : 1);
      let chance =
        (s.stats.spirit < 40 ? 0.65 : 0.92) +
        (b.aim === "torso" ? 0.15 : b.aim === "head" ? -0.25 : 0);
      if (skill) {
        b.skillCD = 3;
        if (["spear", "steelspear"].includes(s.equipment.melee)) {
          protectedTurn = true;
          es.root = 2;
          hit *= 1.25;
          b.message = "长矛·隔位阻击！";
        } else if (["axe", "ironaxe", "blackaxe"].includes(s.equipment.melee)) {
          hit *= 1.6;
          es.armorbreak = 3;
          b.message = "战斧·旋风斩！";
        } else {
          hit *= 1.3;
          b.message = "奋力一击！";
        }
      } else b.message = action === "heavy" ? "近战重击" : "中距突刺";
      protectedTurn ||=
        melee.range === 2 && b.distance === 2 && b.enemy.range === 1;
      if (random(s) > chance) hit = 0;
    }
    if (attacking) {
      if (hit) {
        if (b.aim === "head") {
          hit *= 1.6;
          if (random(s) < 0.35) es.paralyze = 1;
        }
        if (b.aim === "limbs") {
          es.root = 2;
          es.armorbreak = Math.max(es.armorbreak, 1);
        }
        if (es.armorbreak) hit *= 1.2;
        const crit =
          0.18 +
          (s.talent === "hunter" &&
          ["bow", "spear", "steelspear"].includes(
            action === "ranged" ? s.equipment.ranged : s.equipment.melee,
          )
            ? 0.2
            : 0);
        if (random(s) < crit) {
          hit *= 1.6;
          b.message += " 暴击！";
        }
        hit = Math.round(hit);
        b.hp -= hit;
        b.message += ` 造成${hit}伤害`;
        if (s.equipment.melee === "blackaxe" && action !== "ranged")
          s.stats.hp += hit * 0.12;
      } else b.message += " · 未命中";
    }
  }
  if (es.bleed) {
    b.hp -= 4;
    es.bleed--;
    b.message += " · 流血4";
  }
  if (es.poison) {
    b.hp -= 5;
    es.poison--;
    b.message += " · 毒伤5";
  }
  if (ps.bleed) {
    s.stats.hp -= 3;
    ps.bleed--;
  }
  if (ps.poison) {
    s.stats.internal -= 3;
    ps.poison--;
  }
  b.turn++;
  s.stats.hunger -= 0.35;
  s.stats.water -= 0.4;
  if (b.wolfCD) b.wolfCD--;
  if (b.skillCD) b.skillCD--;
  if (b.hp <= 0) {
    s.kills++;
    add(s, "meat", 2);
    add(s, "hide", 2);
    add(s, "tendon", 1);
    if (/熊|狼|野猪/.test(b.enemy.name)) add(s, "finefur", 1);
    log(s, `击败${b.enemy.name}，经过${b.turn}回合。`);
    const origin = b.origin;
    s.battle = null;
    if (origin === "region") onWin();
    advance(s, 0.2);
    return;
  }
  if (b.hp < b.enemy.hp * 0.35 && !es.rage) {
    es.rage = 99;
    b.message += " · 敌人狂暴！";
  }
  if (es.paralyze) {
    es.paralyze--;
    b.message += " · 敌人麻痹，跳过攻击";
  } else if (!protectedTurn) {
    if (b.distance > b.enemy.range) {
      if (!es.root) b.distance--;
      else b.message += " · 定身阻止敌人逼近";
    } else {
      const dodge =
        0.08 +
        s.stats.spirit / 700 +
        (s.wolf ? 0.15 : 0) +
        (s.talent === "athlete" ? 0.15 : 0) -
        weight(s) / 1000;
      if (random(s) < Math.max(0.03, dodge)) b.message += " · 闪避";
      else {
        const armor =
          (items[s.equipment.armor]?.power || 0) * (ps.armorbreak ? 0.5 : 1);
        const damage = Math.max(
          2,
          Math.round(b.enemy.attack * (es.rage ? 1.3 : 1) - armor),
        );
        s.stats.hp -= damage;
        s.stats.external -= damage * 0.25;
        if (b.enemy.poison) {
          ps.poison = 3;
          s.stats.internal -= 3;
        }
        if (/蜘蛛|章鱼|触手/.test(b.enemy.name) && random(s) < 0.25)
          ps.root = 2;
        if (/鳗|机械/.test(b.enemy.name) && random(s) < 0.2) ps.paralyze = 1;
        if (/狼|熊|蝙蝠/.test(b.enemy.name) && random(s) < 0.25) ps.bleed = 3;
        if (/石像|祭司|博士/.test(b.enemy.name) && random(s) < 0.2)
          ps.armorbreak = 3;
        b.message += ` · 受到${damage}伤害`;
      }
    }
  } else b.message += " · 隔位阻击成功";
  if (es.root) es.root--;
  if (es.armorbreak) es.armorbreak--;
  if (ps.root) ps.root--;
  if (ps.armorbreak) ps.armorbreak--;
  if (b.playerPos + b.distance > 4) b.playerPos = 4 - b.distance;
  b.enemyPos = b.playerPos + b.distance;
  b.stun = es.paralyze;
  b.bleed = es.bleed;
  advance(s, 0.08);
}
