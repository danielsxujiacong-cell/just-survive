import {
  SurvivalCompass,
  LoadoutButtons,
  Prologue,
  CombatEffects,
} from "./components/Experience";
import { EndingScroll } from "./components/EndingScroll";
import { keyboardAction } from "./engine/keyboard";
import { gearCondition } from "./engine/qol";
import {
  TalentSelect,
  JourneyPanel,
  EventPanel,
  FishingPanel,
  DefensePanel,
  BattleAim,
  Codex,
  Garden,
} from "./components/DeepPanels";
import { maxHP } from "./engine/advanced";
import { setAmbient } from "./audio/synth";
import { useEffect, useState } from "react";
import {
  Compass,
  Flame,
  Backpack,
  Users,
  BookOpen,
  Heart,
  Droplets,
  Utensils,
  Shield,
  Brain,
  Sun,
  Moon,
  Wind,
  Settings,
  Save,
  RotateCcw,
  Volume2,
  VolumeX,
  ChevronRight,
  Anchor,
  Swords,
  Hammer,
  Leaf,
  Map,
  Star,
} from "lucide-react";
import type { State, Bag } from "./types";
import { items, zones, facilities, facilityCost, endingNames } from "./data";
import {
  act,
  newGame,
  day,
  hour,
  weight,
  capacity,
  inventory,
  has,
  temperature,
  routeChecks,
} from "./engine/game";
import { IslandMap } from "./components/IslandMap";
import { sound, ambience } from "./audio/synth";
const KEY = "just-survive-v1",
  MANUAL = KEY + "-manual";
function decodeSave(raw: string): State {
  const saved = JSON.parse(raw);
  if (
    ![1, 2, 3].includes(saved.version) ||
    !Array.isArray(saved.progress) ||
    saved.progress.length !== 12 ||
    !saved.stats
  )
    throw Error("存档格式不兼容");
  const fresh = newGame();
  return {
    ...fresh,
    ...saved,
    version: 3,
    talent: saved.talent ?? "engineer",
    prologue: saved.prologue ?? (saved.talent ? "done" : "pending"),
    bossKills:
      saved.bossKills ?? saved.progress.filter((n: number) => n === 5).length,
    facilities: { ...fresh.facilities, ...saved.facilities },
    battle: saved.battle?.enemyStatus ? saved.battle : null,
  };
}
function load(key = KEY) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return decodeSave(raw);
  } catch {}
  return newGame();
}

const costText = (b: Bag, s: State) =>
  Object.entries(b)
    .map(([k, v]) => `${items[k]?.name || k} ${inventory(s)[k] || 0}/${v}`)
    .join(" · ");
export default function App({
  initialState,
  storageKey = KEY,
}: { initialState?: State; storageKey?: string } = {}) {
  const manualKey = storageKey + "-manual";
  const [s, setS] = useState<State>(() => initialState ?? load(storageKey)),
    [tab, setTab] = useState("camp"),
    [gm, setGM] = useState(false),
    [settings, setSettings] = useState(false),
    [transferCount, setTransferCount] = useState("5"),
    [muted, setMuted] = useState(false),
    [category, setCategory] = useState("补给"),
    [bagFilter, setBagFilter] = useState("全部"),
    [notice, setNotice] = useState("");
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(s));
  }, [s]);
  useEffect(() => {
    if (!s.journey || s.journey.incident || s.battle || s.ending) return;
    const timer = setTimeout(() => run("journeyStep"), 1000);
    return () => clearTimeout(timer);
  }, [
    s.journey?.stage,
    s.journey?.to,
    s.journey?.incident,
    s.battle,
    s.ending,
  ]);
  useEffect(() => {
    if (!s.fishing) return;
    const timer = setInterval(() => run("fishTick"), 60);
    return () => clearInterval(timer);
  }, [!!s.fishing]);
  useEffect(() => {
    setAmbient(
      !muted && !!s.talent,
      s.location === 0 ? "camp" : hour(s) > 20 || hour(s) < 5 ? "night" : "sea",
    );
    return () => setAmbient(false);
  }, [muted, s.talent, s.location, hour(s) > 20 || hour(s) < 5]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F9") {
        e.preventDefault();
        setGM((v) => !v);
        return;
      }
      if (e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
      const target = e.target as HTMLElement;
      if (target.matches("input,textarea,select") || target.isContentEditable)
        return;
      if (e.key === "Escape" && (settings || gm)) {
        e.preventDefault();
        setSettings(false);
        setGM(false);
        return;
      }
      if (
        s.puzzle &&
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
      ) {
        e.preventDefault();
        const buttons = [
          ...document.querySelectorAll<HTMLButtonElement>(
            ".puzzle-grid button",
          ),
        ];
        const i = Math.max(
          0,
          buttons.indexOf(document.activeElement as HTMLButtonElement),
        );
        const delta = (
          { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 } as Record<
            string,
            number
          >
        )[e.key];
        buttons[(i + delta + 9) % 9]?.focus();
        return;
      }
      const code =
        document.querySelector<HTMLInputElement>('[aria-label="舱门密码"]')
          ?.value || "";
      const tile = Number(
        (document.activeElement as HTMLElement)?.dataset.cell || 0,
      );
      const action = keyboardAction(s, e.key, code, tile);
      if (action) {
        e.preventDefault();
        run(action.type, action.payload ?? "");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [s, settings, gm]);
  useEffect(() => {
    if (s.combatFx?.weak || s.combatFx?.critical) {
      document
        .querySelector(".battle")
        ?.animate(
          [
            { transform: "translate(0)" },
            { transform: "translate(-4px,2px)" },
            { transform: "translate(4px,-2px)" },
            { transform: "translate(0)" },
          ],
          { duration: 220 },
        );
    }
  }, [s.combatFx?.serial]);
  function run(type: string, payload: string | number = "") {
    if (!muted && type !== "fishTick") {
      sound(type);
      if (type === "travel" || type === "sleep")
        ambience(type === "sleep" ? "fire" : "sea");
    }
    setS((prev) => act(prev, type, payload));
  }
  function save() {
    localStorage.setItem(manualKey, JSON.stringify(s));
    setNotice("手动存档已保存");
  }
  function restore() {
    const raw = localStorage.getItem(manualKey);
    if (raw) {
      try {
        setS(decodeSave(raw));
        setNotice("已读取手动存档");
      } catch {
        setNotice("存档无法读取");
      }
    } else setNotice("还没有手动存档");
  }
  const zone = zones[s.selected],
    here = zones[s.location],
    checks = routeChecks(s);
  const busy =
    !!s.battle ||
    s.puzzle ||
    !!s.ending ||
    !!s.journey ||
    !!s.encounter ||
    !!s.fishing ||
    !s.talent ||
    s.prologue === "playing";
  const routeLabels = {
    A: [
      "取得造船图纸",
      "千年铁木 ×1",
      "完整航海帆布 ×1",
      "木材50 / 藤条30 / 烤肉20 / 纯净水20",
      "返回营地建造帆船",
    ],
    B: [
      "十步内解谜发现研究所",
      "通行证 / 硬盘 / 制服",
      "第15天之后的偶数日",
      "抵达浅滩海岸",
    ],
    C: ["激活地脉活动", "加固隔热冲浪舱", "抵达火山口，主动引爆逃生"],
    D: ["集齐七颗龙珠", "回到营地召唤神龙"],
  };
  return (
    <div className="app">
      <header>
        <a className="brand" href="#">
          <Compass size={35} />
          <div>
            <strong>
              荒野日记<span>孤岛重制版</span>
            </strong>
            <small>WILDERNESS DIARY / LONE ISLAND</small>
          </div>
        </a>
        <div className="header-middle">
          <span className="live-dot" /> 本地生存档案{" "}
          {s.gmUsed > 0 && <b className="debug-save">🔧 调试模式存档</b>}{" "}
          <span className="separator">/</span> 自动保存已开启
        </div>
        <div className="toolbar">
          <button title="保存" onClick={save}>
            <Save size={16} />
            <span>存档</span>
          </button>
          <button title="读档" onClick={restore}>
            <RotateCcw size={16} />
          </button>
          <button
            title="音效"
            aria-label="音效"
            aria-pressed={!muted}
            onClick={() => setMuted(!muted)}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            title="设置"
            aria-label="设置"
            className={settings ? "active" : ""}
            onClick={() => setSettings(!settings)}
          >
            <Settings size={16} />
          </button>
        </div>
      </header>
      {settings && (
        <div className="settings-menu">
          <strong>荒野设置</strong>
          <button onClick={save}>手动存档</button>
          <button onClick={restore}>读取存档</button>
          <button
            onClick={() => {
              if (confirm("重新开局？保留手动存档与继承图鉴。")) {
                run("new");
                setSettings(false);
                setGM(false);
              }
            }}
          >
            重新开局
          </button>
          <button
            onClick={() => {
              setGM((v) => !v);
              setSettings(false);
            }}
          >
            开发者工具 <kbd>F9</kbd>
          </button>
          <small>正常游玩不会启用调试。使用GM后会永久标记本周目存档。</small>
        </div>
      )}
      {notice && (
        <div className="notice" onClick={() => setNotice("")}>
          {notice} · 点击关闭
        </div>
      )}
      {gm && (
        <div className="gm">
          <b>GM 调优面板</b>
          <button onClick={() => run("gmHeal")}>恢复满状态</button>
          <button disabled={busy} onClick={() => run("gmSupply")}>
            空投补给
          </button>
          <button disabled={busy} onClick={() => run("gmDay")}>
            下一天
          </button>
          <button onClick={() => run("gmPuzzle")}>重置明暗盘步数</button>
          <button
            onClick={() => {
              if (confirm("确定重新开局？当前自动存档会被替换，手动存档保留。"))
                run("new");
            }}
          >
            重新开局
          </button>
        </div>
      )}
      <section className="status-bar">
        <div className="date">
          <small>存活时间</small>
          <strong>第 {String(day(s)).padStart(2, "0")} 天</strong>
          <span>
            {
              [
                "春 · 万物初生",
                "夏 · 烈日当空",
                "秋 · 风起荒野",
                "冬 · 凛冬将至",
              ][Math.floor((day(s) - 1) / 15) % 4]
            }
          </span>
        </div>
        <div className="clock">
          <div>
            {hour(s) > 6 && hour(s) < 20 ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
            <b>
              {Math.floor(hour(s)).toString().padStart(2, "0")}:
              {Math.floor((hour(s) % 1) * 60)
                .toString()
                .padStart(2, "0")}
            </b>
            <span>
              {s.weather} / {temperature(s)}°C
            </span>
          </div>
          <div className="dayline">
            <i style={{ left: `${(hour(s) / 24) * 100}%` }} />
          </div>
          <small>
            00 <span>06</span>
            <span>12</span>
            <span>18</span>24
          </small>
        </div>
        <div className="vitals">
          {(
            [
              ["hp", "生命", Heart],
              ["hunger", "饱食", Utensils],
              ["water", "水分", Droplets],
              ["external", "外伤健康", Shield],
              ["internal", "内伤健康", Leaf],
              ["spirit", "精神", Brain],
            ] as const
          ).map(([key, label, Icon]) => (
            <div
              className={"vital " + key + (s.stats[key] < 30 ? " danger" : "")}
              key={key}
            >
              <div>
                <Icon size={12} />
                <span>{label}</span>
                <b>{Math.ceil(s.stats[key])}</b>
              </div>
              <div className="meter">
                <i
                  style={{
                    width: `${(s.stats[key] / (key === "hp" ? maxHP(s) : 100)) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
      {s.gmUsed > 0 && (
        <div className="debug-indicator">
          🔧 调试模式存档 · 本周目使用过GM工具
        </div>
      )}
      <SurvivalCompass s={s} run={run} />
      <main>
        <section className="stage">
          <div className="section-heading">
            <div>
              <Map size={16} />
              <span>
                {s.battle ? "战术遭遇" : s.puzzle ? "古代机关" : "孤岛海图"}
              </span>
              <small>ISLAND ATLAS</small>
            </div>
            <span className="location-dot">当前位置 · {here.name}</span>
          </div>
          <div className="map-wrap">
            <IslandMap s={s} onSelect={(id) => !busy && run("select", id)} />
            <CombatEffects fx={s.combatFx} />
            {s.journey && !s.battle && <JourneyPanel s={s} run={run} />}
            <div className="map-caption">
              <span>探索未知，记住归途。</span>
              <small>选择地图节点，规划你的下一步</small>
            </div>
            <div className="map-legend">
              <i /> 已探索 <i /> 未探索 <i /> 当前选中
            </div>
            <div className="map-index">
              SURVEY NO. 001
              <br />
              孤岛地形勘测图
            </div>
            {s.battle && (
              <div
                className={
                  "overlay battle" +
                  (s.combatFx?.critical || s.combatFx?.weak ? " critical" : "")
                }
              >
                <span className="eyebrow">
                  HOSTILE ENCOUNTER · 回合 {s.battle.turn + 1}
                </span>
                <Swords size={38} />
                <h2>{s.battle.enemy.name}</h2>
                <p>
                  生命 {Math.max(0, s.battle.hp)} / {s.battle.enemy.hp} · 攻击{" "}
                  {s.battle.enemy.attack}{" "}
                  {s.battle.enemy.poison ? "· 有毒" : ""}
                </p>
                <div
                  key={`battle-bar-${s.battle.turn}`}
                  className={
                    "enemy-meter" +
                    (s.combatFx &&
                    s.combatFx.serial === s.turns &&
                    s.combatFx.damage > 0
                      ? " struck"
                      : "")
                  }
                >
                  <i
                    style={{
                      width: `${(s.battle.hp / s.battle.enemy.hp) * 100}%`,
                    }}
                  />
                </div>
                <BattleAim s={s} run={run} />
                <div className="battle-coordinates">
                  你 · 坐标{s.battle.playerPos}{" "}
                  {s.wolf
                    ? `/ 白狼 · 坐标${Math.min(s.battle.enemyPos - 1, s.battle.playerPos + 1)}`
                    : ""}{" "}
                  / 敌人 · 坐标{s.battle.enemyPos} / 间距 {s.battle.distance}格
                </div>
                <div className="distance-track">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      className={
                        s.battle!.enemyPos === i
                          ? "occupied"
                          : s.battle!.playerPos === i
                            ? "player-cell"
                            : ""
                      }
                      key={i}
                    >
                      {s.battle!.playerPos === i
                        ? "♙"
                        : s.battle!.enemyPos === i
                          ? "♟"
                          : s.wolf &&
                              i ===
                                Math.min(
                                  s.battle!.enemyPos - 1,
                                  s.battle!.playerPos + 1,
                                )
                            ? "♞"
                            : "·"}
                      <small>{i === 0 ? "退避位" : "格 " + i}</small>
                    </div>
                  ))}
                </div>
                <p
                  className="combat-message"
                  key={`battle-message-${s.battle.turn}`}
                >
                  {s.battle.message}
                </p>
                <div className="combat-buttons">
                  {[
                    ["advance", "前进一格"],
                    ["retreat", "后撤一格"],
                    ["heavy", "近战重击"],
                    ["thrust", "中距突刺"],
                    ["ranged", "远程射击"],
                    [
                      "skill",
                      `武器战技 ${s.battle.skillCD ? "冷却" + s.battle.skillCD : ""}`,
                    ],
                    ["net", "投掷网"],
                    [
                      "wolf",
                      `白狼扑咬 ${s.battle.wolfCD ? "冷却" + s.battle.wolfCD : ""}`,
                    ],
                    ["flee", "尝试逃离"],
                  ].map(([id, name]) => (
                    <button key={id} onClick={() => run("combat", id)}>
                      {name}{" "}
                      <kbd>
                        {(
                          {
                            advance: "A",
                            retreat: "D",
                            heavy: "Q",
                            ranged: "W",
                            wolf: "E",
                            skill: "F",
                            thrust: "T",
                            net: "G",
                            flee: "Esc",
                          } as Record<string, string>
                        )[id] || ""}
                      </kbd>
                    </button>
                  ))}
                </div>
                <button
                  disabled={!keyboardAction(s, "r")}
                  className="combat-medicine"
                  onClick={() => {
                    const a = keyboardAction(s, "r");
                    if (a) run(a.type, a.payload ?? "");
                  }}
                >
                  使用合适药剂 <kbd>R</kbd>
                </button>
                <small>
                  长柄武器在距离2可压制近战敌人；战斗补给在右侧行囊使用。
                </small>
              </div>
            )}
            {s.encounter && <EventPanel key={s.encounter} s={s} run={run} />}
            {s.fishing && <FishingPanel s={s} run={run} />}
            {s.puzzle && (
              <div className="overlay puzzle">
                <span className="eyebrow">THE SUN & MOON MECHANISM</span>
                <h2>九宫格 · 日月明暗盘</h2>
                <p>点击石盘，翻转自身与上下左右。点亮全部九格。</p>
                <div className="puzzle-grid">
                  {s.board.map((lit, i) => (
                    <button
                      data-cell={i}
                      aria-label={`机关${i + 1} ${lit ? "明" : "暗"}`}
                      key={i}
                      className={lit ? "lit" : ""}
                      onClick={() => run("tile", i)}
                    >
                      {lit ? <Sun /> : <Moon />}
                      <kbd>{i + 1}</kbd>
                    </button>
                  ))}
                </div>
                <p>
                  已用 <b>{s.moves}</b> 步 / 十步内开启隐藏暗门
                </p>
                <small>超过十步解开，将唤醒沉睡的火山。</small>
                <button onClick={() => run("closePuzzle")}>
                  暂离机关 <kbd>Esc</kbd>
                </button>
              </div>
            )}
          </div>
          <div className="destination">
            <div className="destination-top">
              <div>
                <span className="eyebrow">
                  {String(zone.id).padStart(2, "0")} /{" "}
                  {zone.id === 0 ? "SAFE HAVEN" : "EXPEDITION"}
                </span>
                <h2>
                  {zone.name}
                  <span>
                    {zone.id === 0
                      ? "安全区域"
                      : "◆".repeat(Math.min(5, Math.ceil(zone.id / 2)))}
                  </span>
                </h2>
              </div>
              <span className="progress-label">
                探索进度 <b>{s.progress[zone.id]}/5</b>
              </span>
            </div>
            <p>{zone.story}</p>
            <div className="resource-list">
              {zone.resources.map((k) => (
                <span key={k}>{items[k].name}</span>
              ))}
            </div>
            <LoadoutButtons s={s} run={run} target={zone.id} busy={busy} />
            <div className="travel-row">
              <div>
                <span>
                  ◷{" "}
                  {zone.id === s.location
                    ? "已抵达"
                    : `${((zone.id === 0 ? here.hours : zone.hours) * (s.camel ? 0.8 : 1) * (s.stats.hunger < 30 ? 1.5 : 1)).toFixed(1)} 小时`}
                </span>
                <span>饱食 / 水分随行进消耗</span>
              </div>
              {s.location !== zone.id ? (
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => run("travel", zone.id)}
                >
                  整装出发 <kbd>Space</kbd>
                  <ChevronRight size={16} />
                </button>
              ) : s.location > 0 ? (
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => run("explore")}
                >
                  {s.progress[s.location] === 5
                    ? "快速采集 / 重访事件"
                    : "深入探索"}{" "}
                  <kbd>Space</kbd>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => run("sleep")}
                >
                  休息八小时 <Moon size={16} />
                </button>
              )}
            </div>
          </div>
          {zone.id > 0 && s.progress[zone.id] === 5 && (
            <div className="sweep-action">
              <button
                className="primary"
                disabled={
                  busy ||
                  !(s.location === zone.id || (s.location === 0 && s.wolf > 0))
                }
                onClick={() => run("sweep", zone.id)}
              >
                ⚡{" "}
                {s.location === 0
                  ? "委托白狼 / 整轮扫荡"
                  : "安全扫荡 / 整轮采集"}
              </button>
              <small>
                2小时 · 饱食/水分双倍消耗 · 无战斗奇遇 · 剧情需亲自重访
              </small>
            </div>
          )}
          <div className="field-actions">
            <button
              disabled={busy || s.location === 0}
              onClick={() => run("travel", 0)}
            >
              ⌂ 返回营地
            </button>
            <button disabled={busy} onClick={() => run("gatherWater")}>
              收集生水 · 0.5h
            </button>
            <button disabled={busy} onClick={() => run("fish")}>
              垂钓 · 1h
            </button>
            <button disabled={busy} onClick={() => run("wait", 1)}>
              等待 · 1h
            </button>
            {s.location === 10 && s.progress[10] === 5 && (
              <button disabled={busy} onClick={() => run("altar")}>
                祭坛：献上汤药×3
              </button>
            )}
            {s.location === 5 && s.progress[5] === 5 && !s.puzzleDone && (
              <button onClick={() => run("openPuzzle")}>重返明暗盘</button>
            )}
            {s.puzzleDone && !s.volcano && (
              <button disabled={busy} onClick={() => run("activateVolcano")}>
                激活地脉
              </button>
            )}
          </div>
          <div className="latest-log">
            <BookOpen size={15} />
            <div>
              <small>最新日记</small>
              <p>{s.logs[0]}</p>
            </div>
          </div>
        </section>
        <aside className="console">
          <nav>
            {[
              ["camp", "营地", Flame],
              ["bag", "行囊", Backpack],
              ["friends", "伙伴", Users],
              ["diary", "日记", BookOpen],
              ["codex", "图鉴", Compass],
            ].map(([id, label, Icon]) => (
              <button
                key={id as string}
                className={tab === id ? "selected" : ""}
                onClick={() => setTab(id as string)}
              >
                {typeof Icon !== "string" && <Icon size={16} />}
                <span>{label as string}</span>
              </button>
            ))}
          </nav>
          <div className="console-content">
            {tab === "camp" && (
              <>
                <div className="panel-title">
                  <h3>让火光继续燃烧</h3>
                  <span>
                    {s.location === 0 ? "营地可操作" : "请返回营地建造"}
                  </span>
                </div>
                <div className="facility-grid">
                  {facilities.map((f, i) => {
                    const n = s.facilities[f.id];
                    const Icon = [
                      Flame,
                      Hammer,
                      Leaf,
                      Moon,
                      Droplets,
                      Shield,
                      Leaf,
                      Droplets,
                    ][i];
                    return (
                      <div className="facility" key={f.id}>
                        <div>
                          <Icon size={20} />
                          <span>Lv.{n}</span>
                        </div>
                        <strong>{f.name}</strong>
                        <small>
                          {f.id === "fence"
                            ? `耐久 ${s.fence}/100`
                            : [
                                "温暖与烹饪",
                                "工具与武装",
                                "伤病治疗",
                                "睡眠恢复",
                                "每日自动补给",
                                "防线",
                                "培育药草与薄荷",
                                "晨间补水，雨天增产",
                              ][i]}
                        </small>
                        <button
                          title={costText(facilityCost(n), s)}
                          disabled={
                            busy ||
                            s.location !== 0 ||
                            n >= f.max ||
                            !has(s, facilityCost(n))
                          }
                          onClick={() => run("upgrade", f.id)}
                        >
                          {n >= f.max
                            ? "已达最高级"
                            : `升级 · ${5 + n * 5}木 ${3 + n * 3}石`}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  className="wide subtle"
                  disabled={
                    busy || s.location !== 0 || !has(s, { wood: 4, vine: 2 })
                  }
                  onClick={() => run("repair")}
                >
                  修复栅栏 · 木材4 / 藤条2
                </button>
                <Garden s={s} run={run} busy={busy} />
                <div className="subheading">
                  <h3>生存制造</h3>
                  <small>物资来自背包与营地储物</small>
                </div>
                <div className="chips">
                  {["补给", "武器", "防具", "工具", "药剂", "弹药", "材料"].map(
                    (c) => (
                      <button
                        className={category === c ? "chosen" : ""}
                        key={c}
                        onClick={() => setCategory(c)}
                      >
                        {c}
                      </button>
                    ),
                  )}
                </div>
                <div className="recipes">
                  {Object.entries(items)
                    .filter(([, v]) => v.recipe && v.kind === category)
                    .map(([id, item]) => (
                      <div className="recipe" key={id}>
                        <div>
                          <strong>
                            {item.name}
                            {item.kind === "弹药" ? " ×5" : ""}
                          </strong>
                          <small>{costText(item.recipe!, s)}</small>
                          <small>
                            {
                              facilities.find((f) => f.id === item.facility)
                                ?.name
                            }{" "}
                            Lv.{item.level} · {item.hours || 1}h
                          </small>
                        </div>
                        <button
                          disabled={
                            busy ||
                            s.location !== 0 ||
                            s.facilities[item.facility!] < (item.level || 1) ||
                            !has(s, item.recipe!)
                          }
                          onClick={() => run("craft", id)}
                        >
                          制作
                        </button>
                      </div>
                    ))}
                </div>
                <div className="subheading">
                  <h3>
                    <Anchor size={16} /> 逃生工程
                  </h3>
                  <small>四条路，四种命运</small>
                </div>
                <Routes />
              </>
            )}
            {tab === "bag" && (
              <>
                <div className="panel-title">
                  <h3>出发前，整理行囊</h3>
                  <span>
                    {weight(s).toFixed(1)} / {capacity(s)} kg
                  </span>
                </div>
                <div className="load-meter">
                  <i
                    style={{
                      width: `${Math.min(100, (weight(s) / capacity(s)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="equipment">
                  {Object.entries(s.equipment)
                    .slice(0, 3)
                    .map(([slot, id]) => (
                      <div key={slot}>
                        <small>
                          {
                            { melee: "近战", ranged: "远程", armor: "防具" }[
                              slot
                            ]
                          }
                        </small>
                        <b>{items[id]?.name || "未装备"}</b>
                      </div>
                    ))}
                </div>
                <div className="chips">
                  {[
                    "全部",
                    "补给",
                    "材料",
                    "武器",
                    "药剂",
                    "防具",
                    "工具",
                    "弹药",
                  ].map((c) => (
                    <button
                      className={bagFilter === c ? "chosen" : ""}
                      key={c}
                      onClick={() => setBagFilter(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="subheading">
                  <h3>出门背包</h3>
                </div>
                <div className="batch-selector">
                  <span>批量存取</span>
                  {["1", "5", "10", "all"].map((n) => (
                    <button
                      className={transferCount === n ? "chosen" : ""}
                      key={n}
                      onClick={() => setTransferCount(n)}
                    >
                      {n === "all" ? "全部" : n}
                    </button>
                  ))}
                </div>
                <LoadoutButtons s={s} run={run} target={zone.id} busy={busy} />
                <Inventory bag={s.bag} storage={false} />
                <div className="subheading">
                  <h3>营地储物箱</h3>
                  <small>无限容量 · 营地取用</small>
                </div>
                <Inventory bag={s.storage} storage />
              </>
            )}
            {tab === "friends" && (
              <>
                <div className="panel-title">
                  <h3>荒野中的同行者</h3>
                  <span>你不必独自面对</span>
                </div>
                <div className="friend-card">
                  <span className="animal">♘</span>
                  <h3>受伤的白狼 {s.wolf ? "Lv." + s.wolf : ""}</h3>
                  <p>
                    {s.wolf
                      ? "随行闪避 +15%，扑咬可定身并造成流血。"
                      : s.wolfFound
                        ? `累计喂养：生肉 ${s.wolfMeat}/5 · 绷带 ${s.wolfBandage}/2`
                        : "探索竹林第五层后相遇。"}
                  </p>
                  <button
                    disabled={busy || !s.wolfFound || s.wolf >= 5}
                    onClick={() => run("wolf")}
                  >
                    {s.wolf ? "喂养升级 · 生肉×3" : "喂食生肉 / 包扎"}
                  </button>
                </div>
                <div className="friend-card">
                  <span className="animal">♞</span>
                  <h3>沙漠骆驼 {s.camel ? "· 已驯服" : ""}</h3>
                  <p>负重 +40kg · 行进时间 -20%。丘陵第五层解救。</p>
                  <button
                    disabled={
                      busy ||
                      !s.camelFound ||
                      s.camel ||
                      !has(s, { grass: 10, water: 1 })
                    }
                    onClick={() => run("camel")}
                  >
                    青草×10 + 纯净水×1
                  </button>
                </div>
                <div className="friend-card">
                  <span className="animal">♜</span>
                  <h3>野蛮人库鲁</h3>
                  <p>
                    {"★".repeat(s.friendship)}
                    {"☆".repeat(5 - s.friendship)} ·
                    三星赠铁矿，五星赠铁木与龙珠。
                  </p>
                  {!s.kuru ? (
                    <small>幽暗密林第五层开启交易。</small>
                  ) : (
                    ["roast", "wine", "ironaxe", "pearl"].map((k) => (
                      <div className="trade" key={k}>
                        <span>{items[k].name}</span>
                        <button
                          disabled={
                            busy || !has(s, { [k]: 1 }) || s.friendship === 5
                          }
                          onClick={() => run("gift", k)}
                        >
                          赠礼
                        </button>
                        <button
                          disabled={busy || !has(s, { [k]: 1 })}
                          onClick={() => run("trade", k)}
                        >
                          交易
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="subheading">
                  <h3>七星连珠</h3>
                  <small>{s.pearls.length} / 7</small>
                </div>
                <div className="pearls">
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <span
                      className={s.pearls.includes(n) ? "owned" : ""}
                      key={n}
                    >
                      {n}★
                    </span>
                  ))}
                </div>
                <p className="hint">
                  晴海岸 · 雨丘陵 · 库鲁五星 · 明暗盘 · 雾暗流 · 遗迹守卫 ·
                  雪原祭坛
                </p>
                <Routes />
                <div className="subheading">
                  <h3>区域图鉴</h3>
                </div>
                {zones
                  .filter((z) => z.id !== 9 || s.lab)
                  .map((z) => (
                    <p className="codex-row" key={z.id}>
                      {z.name}
                      <span>{s.progress[z.id]}/5</span>
                    </p>
                  ))}
              </>
            )}
            {tab === "codex" && <Codex s={s} />}
            {tab === "diary" && (
              <>
                <div className="panel-title">
                  <h3>写给未来的自己</h3>
                  <span>荒野日记 · 第 {day(s)} 天</span>
                </div>
                <div className="diary-intro">
                  海浪会抹去脚印，文字不会。
                  <br />
                  每一次归来，都值得被记住。
                </div>
                {s.logs.map((line, i) => (
                  <div className="diary-entry" key={i}>
                    <small>{line.slice(0, line.indexOf("  "))}</small>
                    <p>{line.slice(line.indexOf("  ") + 2)}</p>
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="console-footer">
            <span className="live-dot" /> 离线存档 · 无需网络 <span>v3.0</span>
          </div>
        </aside>
      </main>
      <footer>
        <span>WILDERNESS DIARY</span>
        <span>活下去，然后找到回家的路。</span>
        <span>纯前端 · 原创绘制 / 合成音效</span>
      </footer>
      {!s.talent && <TalentSelect run={run} />}
      {s.defense && !s.ending && <DefensePanel s={s} run={run} />}
      {s.prologue === "playing" && <Prologue run={run} muted={muted} />}
      {s.ending && (
        <EndingScroll
          s={s}
          onNew={() => {
            if (confirm("开启新的日记？")) run("new");
          }}
          onRestore={restore}
        />
      )}
    </div>
  );
  function Inventory({ bag, storage }: { bag: Bag; storage: boolean }) {
    const entries = Object.entries(bag).filter(
      ([k, n]) =>
        n > 0 &&
        items[k] &&
        (bagFilter === "全部" || items[k].kind === bagFilter),
    );
    return (
      <div className="inventory">
        {!entries.length && <p className="hint">这里暂时没有物品。</p>}
        {entries.map(([k, n]) => (
          <div className="inventory-row" key={k}>
            <div>
              <strong>
                {items[k].name} <em>×{n}</em>
              </strong>
              <small>
                {(items[k].weight * n).toFixed(1)} kg
                {(items[k].kind === "武器" || k === "knife") &&
                  ` · 耐久 ${gearCondition(s, k).toFixed(0)}%`}
              </small>
            </div>
            <div>
              {items[k].heal && (
                <button
                  disabled={
                    !!s.ending ||
                    s.puzzle ||
                    !!s.encounter ||
                    !!s.fishing ||
                    (storage && (s.location !== 0 || !!s.journey))
                  }
                  onClick={() => run("use", k)}
                >
                  使用
                </button>
              )}
              {(items[k].kind === "武器" ||
                items[k].kind === "防具" ||
                items[k].kind === "工具" ||
                k === "knife") && (
                <button disabled={busy} onClick={() => run("equip", k)}>
                  装备
                </button>
              )}
              {(items[k].kind === "武器" || k === "knife") &&
                gearCondition(s, k) < 100 && (
                  <button
                    disabled={
                      busy ||
                      s.location !== 0 ||
                      s.facilities.work < 2 ||
                      !has(s, { wood: 2, iron: 1 })
                    }
                    onClick={() => run("repairGear", k)}
                    title="木材2、生铁1、0.5小时"
                  >
                    修复
                  </button>
                )}
              <button
                disabled={busy || s.location !== 0}
                onClick={() =>
                  run(
                    "transfer",
                    `${storage ? "take" : "put"}:${k}:${transferCount}`,
                  )
                }
              >
                {storage ? "取" : "存"}
                {transferCount === "all" ? "全部" : transferCount}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }
  function Routes() {
    return (
      <div className="routes">
        {(["A", "B", "C", "D"] as const).map((key) => (
          <details key={key}>
            <summary>
              <span onClick={() => run("trackRoute", key)}>{key}</span>
              {endingNames[key].split(" · ")[1]}
              <small>
                {checks[key].filter(Boolean).length}/{checks[key].length}
              </small>
            </summary>
            <div className="route-body">
              {routeLabels[key].map((label, i) => (
                <p key={label} className={checks[key][i] ? "complete" : ""}>
                  {checks[key][i] ? "✓" : "○"} {label}
                </p>
              ))}
              {key === "C" && (
                <>
                  <p>
                    黑曜石 {inventory(s).obsidian || 0}/10 · 合金{" "}
                    {inventory(s).alloy || 0}/5 · 兽皮 {inventory(s).hide || 0}
                    /15
                  </p>
                  <button
                    disabled={
                      busy ||
                      s.canoe ||
                      s.location !== 11 ||
                      s.progress[11] < 5 ||
                      !has(s, { obsidian: 10, alloy: 5, hide: 15 })
                    }
                    onClick={() => run("canoe")}
                  >
                    加固隔热舱 · 3h
                  </button>
                  {s.volcano && (
                    <p>爆发窗口：第{s.eruption}天；准备完成可主动引爆。</p>
                  )}
                </>
              )}
              <button
                className="wide"
                disabled={busy || !checks[key].every(Boolean)}
                onClick={() => run("ending", key)}
              >
                启动逃生 · {key}
              </button>
            </div>
          </details>
        ))}
      </div>
    );
  }
}
