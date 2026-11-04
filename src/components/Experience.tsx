import { useEffect, useState } from "react";
import { Compass, ChevronDown, Navigation } from "lucide-react";
import type { State } from "../types";
import { endingNames, items, zones } from "../data";
import { capacity, weight, day } from "../engine/game";
import { routeTargets, survivalHints, type Route } from "../engine/qol";
import { prologueThunder } from "../audio/synth";
import type { Run } from "./DeepPanels";
export function SurvivalCompass({ s, run }: { s: State; run: Run }) {
  const [open, setOpen] = useState(true);
  const hints = survivalHints(s),
    targets = routeTargets(s, s.trackedRoute);
  return (
    <section className="survival-compass">
      <button
        className="compass-heading"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Compass size={19} />
        <b>荒野生存指南针</b>
        <span>
          第{day(s)}天 · 当前目标 {s.trackedRoute}
        </span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="compass-body">
          <div className="route-chips">
            {(["A", "B", "C", "D"] as Route[]).map((r) => (
              <button
                key={r}
                aria-pressed={s.trackedRoute === r}
                className={s.trackedRoute === r ? "tracking" : ""}
                onClick={() => run("trackRoute", r)}
              >
                <b>{r}</b>
                {endingNames[r].split(" · ")[1]}
              </button>
            ))}
          </div>
          <p className="target-zones">
            <Navigation size={12} /> 下一步目的地：
            {targets.map((z) => zones[z].name).join(" / ")}{" "}
            <span>海图金色信标已标出</span>
          </p>
          <div className="survival-hints">
            {hints.map((h) => (
              <button key={h.text} onClick={() => run("select", h.zone)}>
                <small>{h.kind}</small>
                <span>{h.text}</span>
                <b>→</b>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
export function LoadoutButtons({
  s,
  run,
  target,
  busy,
}: {
  s: State;
  run: Run;
  target: number;
  busy: boolean;
}) {
  return (
    <div className="loadout-shortcuts">
      <div>
        <button
          disabled={busy || s.location !== 0}
          onClick={() => run("unload")}
        >
          📦 一键卸货入库
        </button>
        <button
          disabled={busy || s.location !== 0}
          onClick={() => run("prepare", target)}
        >
          🎒 一键最佳整备
        </button>
      </div>
      <small>
        口粮4 + 净水4 + 外伤/内伤药各2 · 按战力/耐久选装备 · 至少留出60%采集负重
      </small>
      {s.loadoutReport && (
        <p
          className={
            s.loadoutReport.missing.length ? "loadout-warning" : "loadout-ready"
          }
          role="status"
        >
          整备 {weight(s).toFixed(1)} / {capacity(s)}kg ·{" "}
          {s.loadoutReport.missing.length
            ? "储物不足：" + s.loadoutReport.missing.join("、")
            : "装备与补给齐备，可以出发"}
        </p>
      )}
    </div>
  );
}
const prologueText =
  "雷声撕开了船舱。\n海水吞没了灯火，也吞没了归途。\n\n你攥着最后一块浮木，在黑暗中漂流。\n直到一线晨光，照亮陌生的海岸。\n\n没有救援，没有答案。\n只有还未熄灭的呼吸。\n\n从今天起，写下你的荒野日记。";
export function Prologue({ run, muted }: { run: Run; muted: boolean }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!muted) prologueThunder();
    const timer = setInterval(
      () => setCount((n) => Math.min(prologueText.length, n + 1)),
      42,
    );
    return () => clearInterval(timer);
  }, []);
  return (
    <div
      className="prologue"
      role="dialog"
      aria-modal="true"
      aria-label="海难漂流序章"
    >
      <div className="lightning" />
      <svg className="prologue-sea" viewBox="0 0 1000 250">
        <path
          d="M0 170Q100 80 200 170T400 170T600 170T800 170T1000 170V250H0Z"
          fill="#435c5d"
        />
        <path
          d="M0 195Q100 120 200 195T400 195T600 195T800 195T1000 195V250H0Z"
          fill="#273c3e"
        />
      </svg>
      <span className="eyebrow">PROLOGUE / THE LAST LIGHT</span>
      <div className="prologue-paper">
        <h1>海难之后</h1>
        <p>
          {prologueText.slice(0, count)}
          <i className="typing-cursor" />
        </p>
      </div>
      <button className="primary" onClick={() => run("continuePrologue")}>
        {count < prologueText.length ? "跳过演出，踏上孤岛" : "醒来，活下去"}{" "}
        <kbd>Space</kbd>
      </button>
      <small>按空格或 Enter 随时跳过 · 演出不消耗生存时间</small>
    </div>
  );
}
export function CombatEffects({ fx }: { fx: State["combatFx"] }) {
  if (!fx) return null;
  return (
    <div
      key={fx.serial}
      aria-hidden="true"
      className={
        "combat-fx fx-" +
        fx.kind +
        (fx.critical ? " fx-critical" : "") +
        (fx.weak ? " fx-weak" : "")
      }
    >
      <svg viewBox="0 0 600 350">
        {fx.kind === "ranged" ? (
          <g className="arrow-trail">
            <path d="M70 260L510 90" stroke="#f4d49c" strokeWidth="4" />
            <path
              d="M492 87L512 90 501 108"
              stroke="#fff0ce"
              strokeWidth="3"
              fill="none"
            />
          </g>
        ) : fx.kind !== "miss" ? (
          <path
            className="slash-trail"
            d={
              fx.kind === "wolf"
                ? "M190 70L420 280M240 50L470 260M290 30L520 240"
                : "M130 280Q230 80 490 65Q310 140 220 310"
            }
            stroke="#ffe0a0"
            fill="#dbb46c44"
            strokeWidth="3"
          />
        ) : null}
      </svg>
      <div className="damage-burst">
        {fx.kind === "miss"
          ? "MISS"
          : fx.critical
            ? "暴击！"
            : fx.weak
              ? "弱点命中"
              : ""}
        <b>{fx.damage > 0 ? "-" + Math.round(fx.damage) : ""}</b>
      </div>
    </div>
  );
}
