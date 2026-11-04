import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import App from "../src/App";
import { newGame } from "../src/engine/game";
import type { State } from "../src/types";
import "../src/style.css";
function Harness() {
  const [sample, setSample] = useState<State | null>(null),
    [key, setKey] = useState("");
  async function choose(name: string) {
    const state =
      name === "fresh"
        ? newGame(42)
        : await (
            await fetch("/tests/results/replays/" + name + ".json")
          ).json();
    setKey(name + "-" + Date.now());
    setSample(state);
  }
  return (
    <>
      <div
        className="qa-replay-controls"
        style={{
          position: "fixed",
          bottom: 8,
          left: 8,
          zIndex: 100,
          display: "flex",
          gap: 4,
          background: "#071510d9",
          padding: 6,
          border: "1px solid #73815a",
          borderRadius: 5,
        }}
      >
        <small style={{ padding: 6 }}>仅测试回放 · 独立存档</small>
        {[
          ["fresh", "新开局"],
          ["battle", "战斗回放"],
          ["puzzle", "机关回放"],
          ["beforeEnding", "通关前"],
          ["A", "结局A"],
          ["B", "结局B"],
          ["C", "结局C"],
          ["D", "结局D"],
        ].map(([id, label]) => (
          <button
            style={{ fontSize: 10, padding: "5px 8px" }}
            key={id}
            onClick={() => void choose(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {sample ? (
        <App
          key={key}
          initialState={sample}
          storageKey="just-survive-qa-isolated"
        />
      ) : (
        <div style={{ padding: 50, color: "#d2bf88" }}>
          <h1>界面回放验收</h1>
          <p>
            所有通关/战斗/解谜存档由零 GM
            正常操作仿真生成。使用独立存档键，不覆盖玩家存档。
          </p>
          <p>此入口只由开发服务器提供，不打包进 dist。</p>
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("qa-root")!).render(<Harness />);
