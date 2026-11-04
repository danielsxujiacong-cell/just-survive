import { useState } from "react";
import { BookOpen, Sun, Moon, Star, Target, Wind, Shield } from "lucide-react";
import type { State } from "../types";
import { eventById, events } from "../data/events";
import { talents, pages, enemyAnatomy } from "../data/lore";
import { items, enemies, zones } from "../data";
import { inventory, has, day } from "../engine/game";
const statNames: Record<string, string> = {
  hp: "生命",
  hunger: "饱食",
  water: "水分",
  external: "外伤健康",
  internal: "内伤健康",
  spirit: "精神",
};
export type Run = (type: string, payload?: string | number) => void;
export function TalentSelect({ run }: { run: Run }) {
  return (
    <div className="talent-screen">
      <div className="talent-heading">
        <span className="eyebrow">EVERY SURVIVOR HAS A PAST</span>
        <h1>在海浪抹去名字之前</h1>
        <p>选择你的过去。它会改变你在孤岛上的生存方式。</p>
      </div>
      <div className="talent-grid">
        {talents.map((t, i) => (
          <button key={t.id} onClick={() => run("talent", t.id)}>
            <span className="talent-symbol">{t.icon}</span>
            <h2>{t.name}</h2>
            <small>{t.subtitle}</small>
            <p>{t.description}</p>
            <b>
              以此身份醒来 → <kbd>{i + 1}</kbd>
            </b>
          </button>
        ))}
      </div>
      <small>
        所有出身共享完整四条逃生路线。每一次重生，都会保留你发现的图鉴。
      </small>
    </div>
  );
}
export function JourneyPanel({ s, run }: { s: State; run: Run }) {
  const j = s.journey;
  if (!j) return null;
  const labels: Record<string, [string, string, string]> = {
    landslide: [
      "山洪截断了山路",
      "用藤条×2设置安全绳",
      "强行穿过 · 外伤-10 / 生命-4",
    ],
    ambush: ["夜色里亮起狼的眼睛", "抛下生肉×1引开狼群", "强行突围 · 进入战斗"],
    bottle: ["海流送来一只漂流瓶", "花0.2小时收集补给", "放弃搜寻，继续赶路"],
    marker: [
      "灌木间发现前人的路标",
      "辨认路标 · 0.15h / 精神+6",
      "强行穿行 · 精神-2",
    ],
  };
  return (
    <div className="journey-panel">
      <span className="eyebrow">
        ON THE ROAD · {j.stage}/{j.stages}
      </span>
      <h3>{j.returning ? "紧急折返营地" : `前往${zones[j.to].name}`}</h3>
      <div className="journey-steps">
        {Array.from({ length: j.stages }, (_, i) => (
          <span key={i} className={i < j.stage ? "done" : ""} />
        ))}
      </div>
      {j.incident ? (
        <>
          <p>{labels[j.incident][0]}</p>
          <div className="journey-choices">
            <button
              disabled={j.incident === "landslide" && !has(s, { vine: 2 })}
              onClick={() => run("journeyChoice", "tool")}
            >
              {labels[j.incident][1]}
            </button>
            <button onClick={() => run("journeyChoice", "push")}>
              {labels[j.incident][2]}
            </button>
          </div>
        </>
      ) : (
        <p>沿途行军中……每一阶段都会推进游戏时间。</p>
      )}
      <button className="emergency" onClick={() => run("journeyRetreat")}>
        紧急折返营地
      </button>
    </div>
  );
}
export function EventPanel({ s, run }: { s: State; run: Run }) {
  const [code, setCode] = useState("");
  const ev = eventById[s.encounter || ""];
  if (!ev) return null;
  return (
    <div className="overlay encounter">
      <span className="eyebrow">
        WILDERNESS ENCOUNTER · {zones[ev.zone].name}
      </span>
      <BookOpen size={30} />
      <h2>{ev.title}</h2>
      <p className="event-story">{ev.text}</p>
      {ev.choices.some((c) => c.code) && (
        <label className="code-input">
          舱门密码
          <input
            aria-label="舱门密码"
            maxLength={4}
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
      )}
      <div className="event-choices">
        {ev.choices.map((c, i) => (
          <button
            key={c.label}
            disabled={
              (!!c.cost && !has(s, c.cost)) ||
              (!!c.need && !inventory(s)[c.need]) ||
              (!!c.check && s.stats[c.check.stat] < c.check.min)
            }
            onClick={() => run("chooseEvent", i + ":" + code)}
          >
            <b>{String.fromCharCode(65 + i)}.</b>
            <kbd>{i + 1}</kbd>
            <span>
              {c.label}
              <small>
                {c.cost &&
                  Object.entries(c.cost)
                    .map(([k, n]) => `${items[k].name}×${n}`)
                    .join(" / ")}{" "}
                {c.need ? "需要 " + items[c.need].name : ""}{" "}
                {c.chance ? `成功率 ${c.chance * 100}%` : ""}
                {c.check
                  ? ` / ${statNames[c.check.stat]}≥${c.check.min}`
                  : ""}{" "}
                · {c.hours || 0.25}h
              </small>
            </span>
          </button>
        ))}
      </div>
      {ev.page !== undefined && (
        <small>此处藏着《前人幸存者日记》残页 {ev.page + 1}。</small>
      )}
    </div>
  );
}
export function FishingPanel({ s, run }: { s: State; run: Run }) {
  const f = s.fishing;
  if (!f) return null;
  const cursor = f.phase <= 100 ? f.phase : 200 - f.phase;
  return (
    <div className="overlay fishing">
      <span className="eyebrow">TIDE & TENSION</span>
      <h2>听见鱼线的呼吸</h2>
      <p>等游标进入绿色区域再收竿。连续三次稳妥收线即可钓起鱼获。</p>
      <div className="fishing-water">
        <span>﹏</span>
        <i>♧</i>
      </div>
      <div className="fishing-bar">
        <div
          style={{
            left: s.talent === "sailor" ? "23%" : "32%",
            width: s.talent === "sailor" ? "54%" : "36%",
          }}
        />
        <i style={{ left: cursor + "%" }} />
      </div>
      <div className="fishing-values">
        <span>鱼线张力 {f.tension}/100</span>
        <span>收线进度 {f.progress}/100</span>
      </div>
      <p aria-live="polite">{f.last}</p>
      <button className="primary" onClick={() => run("reel")}>
        稳住 · 收竿 <kbd>Space</kbd>
      </button>
      <button onClick={() => run("cancelFish")}>
        放开鱼线 <kbd>Esc</kbd>
      </button>
    </div>
  );
}
export function DefensePanel({ s, run }: { s: State; run: Run }) {
  if (!s.defense) return null;
  return (
    <div className="modal-backdrop">
      <div className="defense-report">
        <Shield size={35} />
        <span className="eyebrow">NIGHT WATCH · DAY {s.defense.day}</span>
        <h2>夜袭 · 守住火光</h2>
        {s.defense.rounds.map((r, i) => (
          <p key={r} style={{ animationDelay: i * 0.15 + "s" }}>
            {r}
          </p>
        ))}
        <div className="defense-summary">
          剩余栅栏 {s.defense.barrier} / 100 · 生命损失 {s.defense.damage} ·
          获得生肉 {s.defense.loot}
        </div>
        <button className="primary" onClick={() => run("closeDefense")}>
          收起战报
        </button>
      </div>
    </div>
  );
}
export function BattleAim({ s, run }: { s: State; run: Run }) {
  const b = s.battle;
  if (!b) return null;
  const names = enemyAnatomy(b.enemy.name);
  return (
    <>
      <div className="battle-environment">
        <Wind size={12} />
        {b.environment} · 瞄准弱点，控制距离
      </div>
      <div className="aim-options">
        {(["head", "torso", "limbs"] as const).map((k) => (
          <button
            key={k}
            className={b.aim === k ? "aim-selected" : ""}
            onClick={() => run("aim", k)}
          >
            <Target size={12} />
            {names[k]}{" "}
            <kbd>{k === "head" ? "1" : k === "torso" ? "2" : "3"}</kbd>
            <small>
              {k === "head"
                ? "命中-25% / 伤害×1.6 / 概率眩晕"
                : k === "limbs"
                  ? "正常命中 / 限制移动 / 破甲"
                  : "命中+15% / 稳健输出"}
            </small>
          </button>
        ))}
      </div>
      <div className="status-pills">
        <span>敌方</span>
        {Object.entries(b.enemyStatus)
          .filter(([, n]) => n > 0)
          .map(([k, n]) => (
            <b key={k}>
              {statusName[k]} {n === 99 ? "" : n}
            </b>
          ))}
        <span>自身</span>
        {Object.entries(b.playerStatus)
          .filter(([, n]) => n > 0)
          .map(([k, n]) => (
            <b className="negative" key={k}>
              {statusName[k]} {n}
            </b>
          ))}
      </div>
    </>
  );
}
const statusName: Record<string, string> = {
  bleed: "流血",
  poison: "中毒",
  root: "定身",
  paralyze: "麻痹",
  armorbreak: "破甲",
  rage: "狂暴",
};
export function Codex({ s }: { s: State }) {
  const [section, setSection] = useState("pages");
  return (
    <>
      <div className="panel-title">
        <h3>孤岛 · 全图鉴</h3>
        <span>多周目继承发现记录</span>
      </div>
      <div className="codex-stats">
        <div>
          <b>
            {s.seenItems.length}/{Object.keys(items).length}
          </b>
          <small>物品</small>
        </div>
        <div>
          <b>
            {s.seenEnemies.length}/{Object.keys(enemies).length}
          </b>
          <small>生态</small>
        </div>
        <div>
          <b>{s.pages.length}/12</b>
          <small>残页</small>
        </div>
        <div>
          <b>{s.seenEvents.length}/60</b>
          <small>奇遇</small>
        </div>
      </div>
      <div className="stamp-row">
        {["A", "B", "C", "D"].map((k) => (
          <span key={k} className={s.stamps.includes(k) ? "stamped" : ""}>
            <Star size={15} />
            {k} {s.stamps.includes(k) ? "已通关" : "未达成"}
          </span>
        ))}
      </div>
      <div className="chips">
        {[
          ["pages", "日记残页"],
          ["items", "物品"],
          ["enemies", "怪物弱点"],
          ["events", "奇遇记录"],
        ].map(([key, name]) => (
          <button
            className={section === key ? "chosen" : ""}
            onClick={() => setSection(key)}
            key={key}
          >
            {name}
          </button>
        ))}
      </div>
      {section === "pages" && (
        <>
          {s.pages.length === 12 && (
            <p className="truth-unlocked">
              末日真相已拼齐：黎明计划唤醒远古磁场，失控的生命实验将船只卷入孤岛。
            </p>
          )}
          {pages.map((p, i) => (
            <details className="lore-entry" key={i}>
              <summary>
                {s.pages.includes(i) ? p.title : `残页 ${i + 1} · 未发现`}
                <small>{zones[p.zone].name}</small>
              </summary>
              <p>
                {s.pages.includes(i)
                  ? p.text
                  : "探索这个区域的奇遇，寻找前人的字迹。"}
              </p>
            </details>
          ))}
        </>
      )}
      {section === "items" &&
        Object.entries(items).map(([key, item]) => (
          <details className="lore-entry" key={key}>
            <summary>
              {s.seenItems.includes(key) ? item.name : "未发现物品"}
              <small>{item.kind}</small>
            </summary>
            {s.seenItems.includes(key) && (
              <p>
                重量 {item.weight}kg{item.power ? ` · 战力 ${item.power}` : ""}
                {item.recipe
                  ? " · 配方：" +
                    Object.entries(item.recipe)
                      .map(([k, n]) => `${items[k].name}×${n}`)
                      .join(" / ")
                  : " · 探索、交易或奇遇获得"}
              </p>
            )}
          </details>
        ))}
      {section === "enemies" &&
        Object.entries(enemies).map(([key, e]) => (
          <details className="lore-entry" key={key}>
            <summary>
              {s.seenEnemies.includes(key) ? e.name : "未知生物"}
              <small>
                {s.seenEnemies.includes(key) ? `生命${e.hp}` : "未遭遇"}
              </small>
            </summary>
            {s.seenEnemies.includes(key) && (
              <p>
                攻击{e.attack} · 触及{e.range}格{e.poison ? " · 咬击中毒" : ""}
                。{enemyAnatomy(e.name).head}命中难，但伤害×1.6并可能眩晕；打击
                {enemyAnatomy(e.name).limbs}可限制移动。
                {e.range === 1
                  ? "长柄武器隔位阻击可有效压制。"
                  : "使用白狼、麻痹毒针或投掷网争取输出窗口。"}
              </p>
            )}
          </details>
        ))}
      {section === "events" &&
        events.map((ev) => (
          <details className="lore-entry" key={ev.id}>
            <summary>
              {s.seenEvents.includes(ev.id) ? ev.title : "未记录奇遇"}
              <small>{zones[ev.zone].name}</small>
            </summary>
            <p>
              {s.seenEvents.includes(ev.id)
                ? ev.text
                : "进入区域并探索以解锁。"}
            </p>
          </details>
        ))}
    </>
  );
}
export function Garden({
  s,
  run,
  busy,
}: {
  s: State;
  run: Run;
  busy: boolean;
}) {
  return (
    <div className="garden-panel">
      <div className="subheading">
        <h3>种植与守夜</h3>
        <small>
          第{day(s)}天 · 种子 {inventory(s).seed || 0}
        </small>
      </div>
      <p>
        {s.garden.ready
          ? s.time >= s.garden.ready
            ? "药苗已经成熟。"
            : `距成熟还有 ${(s.garden.ready - s.time).toFixed(1)} 小时`
          : "每次播种需种子×1与纯净水×1，收获会返还种子。"}
      </p>
      <div className="garden-actions">
        <button
          disabled={
            busy ||
            s.location !== 0 ||
            !s.facilities.garden ||
            !!s.garden.ready ||
            !has(s, { seed: 1, water: 1 })
          }
          onClick={() => run("plant", "herb")}
        >
          种植药草
        </button>
        <button
          disabled={
            busy ||
            s.location !== 0 ||
            !s.facilities.garden ||
            !!s.garden.ready ||
            !has(s, { seed: 1, water: 1 })
          }
          onClick={() => run("plant", "mint")}
        >
          种植薄荷
        </button>
        <button
          disabled={
            busy ||
            s.location !== 0 ||
            !s.garden.ready ||
            s.time < s.garden.ready
          }
          onClick={() => run("harvest")}
        >
          收获
        </button>
      </div>
      <p>
        已布捕兽夹 {s.traps} · 火墙燃料 {s.firewall}
      </p>
      <div className="garden-actions">
        <button
          disabled={busy || s.location !== 0 || !has(s, { steeltrap: 1 })}
          onClick={() => run("setTrap")}
        >
          布置捕兽夹
        </button>
        <button
          disabled={busy || s.location !== 0 || !has(s, { wood: 3, resin: 1 })}
          onClick={() => run("setFirewall")}
        >
          预备火墙 · 3木1脂
        </button>
      </div>
      <button
        className="wide subtle"
        disabled={busy || s.location !== 0}
        onClick={() => run("campEvent")}
      >
        巡视营地 · 发现奇遇
      </button>
    </div>
  );
}
