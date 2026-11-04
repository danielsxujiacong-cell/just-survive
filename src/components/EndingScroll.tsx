import { useState, useEffect } from "react";
import type { State } from "../types";
import { sceneSVG, memorialSVG, downloadMemorial } from "../engine/memorial";
import { endingNames, items, enemies } from "../data";
import { day } from "../engine/game";
export function EndingScroll({
  s,
  onNew,
  onRestore,
}: {
  s: State;
  onNew: () => void;
  onRestore: () => void;
}) {
  const [card, setCard] = useState(false),
    [error, setError] = useState("");
  const ending = s.ending || "death";
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && card) {
        e.preventDefault();
        setCard(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card]);
  const prose: Record<string, string> = {
    A: "风灌满了帆。你最后望向那一点火光，然后转身，驶向世界。",
    B: "补给船穿过晨雾。你将硬盘藏进制服，终于看见陆地的灯。",
    C: "炽热的海浪托起隔热舱。毁灭的力量，成为你通向自由的航道。",
    D: "七颗星照亮夜空。神龙穿云而至，你的荒野日记写下了不可思议的结尾。",
    death: "孤岛记住了你的勇气。下一次，黄昏之前，记得回家。",
  };
  return (
    <div
      className={"epic-ending epic-" + ending}
      role="dialog"
      aria-modal="true"
      aria-label="史诗通关战报画卷"
    >
      <div
        className="ending-cinema"
        dangerouslySetInnerHTML={{ __html: sceneSVG(ending) }}
      />
      <div className="ending-scroll">
        <span className="eyebrow">
          {ending === "death"
            ? "THE LAST PAGE"
            : "A NEW HORIZON / SURVIVOR CHRONICLE"}
        </span>
        <h1>{endingNames[ending]}</h1>
        <p className="ending-prose">{prose[ending]}</p>
        {s.gmUsed > 0 && <span className="debug-save">🔧 调试模式存档</span>}
        <div className="ending-stats">
          <span>
            生存<b>{day(s)} 天</b>
          </span>
          <span>
            击败敌人<b>{s.kills}</b>
          </span>
          <span>
            守关 Boss<b>{s.bossKills}</b>
          </span>
          <span>
            安全扫荡<b>{s.sweeps}</b>
          </span>
        </div>
        <h3>那些让你活下来的日子</h3>
        <ol className="life-timeline">
          <li>
            <time>第1天</time>
            <span>海难之后，在陌生海岸醒来</span>
          </li>
          {s.milestones.map((m) => (
            <li key={m.key}>
              <time>第{m.day}天</time>
              <span>{m.text}</span>
            </li>
          ))}
        </ol>
        <div className="ending-codex">
          物品 {s.seenItems.length}/{Object.keys(items).length} · 生态{" "}
          {s.seenEnemies.length}/{Object.keys(enemies).length} · 残页{" "}
          {s.pages.length}/12 · 奇遇 {s.seenEvents.length}/60
        </div>
        <div className="ending-actions">
          <button className="primary" onClick={() => setCard(true)}>
            生成幸存者通关纪念卡
          </button>
          <button onClick={onNew}>开启新的日记</button>
          <button onClick={onRestore}>读取手动存档</button>
        </div>
      </div>
      {card && (
        <div className="memorial-modal">
          <button className="memorial-close" onClick={() => setCard(false)}>
            关闭纪念卡 <kbd>Esc</kbd>
          </button>
          <img
            alt="幸存者通关纪念卡"
            src={
              "data:image/svg+xml;charset=utf-8," +
              encodeURIComponent(memorialSVG(s))
            }
          />
          <button
            className="primary"
            onClick={() =>
              void downloadMemorial(s).catch(() =>
                setError("图片生成失败，请重试。"),
              )
            }
          >
            下载 PNG 纪念卡
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
