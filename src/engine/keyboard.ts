import type { State } from "../types";
import { eventById } from "../data/events";
import { inventory } from "./game";
export function keyboardAction(
  s: State,
  key: string,
  code = "",
  tile = 0,
): { type: string; payload?: string | number } | null {
  const k = key.toLowerCase();
  if (s.prologue === "playing")
    return [" ", "enter", "escape"].includes(k)
      ? { type: "continuePrologue" }
      : null;
  if (!s.talent)
    return /^[1-6]$/.test(k)
      ? {
          type: "talent",
          payload: [
            "engineer",
            "botanist",
            "hunter",
            "athlete",
            "sailor",
            "medic",
          ][Number(k) - 1],
        }
      : null;
  if (s.ending) return null;
  if (s.defense)
    return ["escape", " ", "enter"].includes(k)
      ? { type: "closeDefense" }
      : null;
  if (s.puzzle) {
    if (k === "escape") return { type: "closePuzzle" };
    if (/^[1-9]$/.test(k)) return { type: "tile", payload: Number(k) - 1 };
    if (k === " " || k === "enter") return { type: "tile", payload: tile };
    return null;
  }
  if (s.encounter) {
    const e = eventById[s.encounter];
    if (/^[1-3]$/.test(k) && e.choices[Number(k) - 1])
      return { type: "chooseEvent", payload: Number(k) - 1 + ":" + code };
    if (k === "escape") {
      const i = e.choices.findIndex((c) =>
        /谨慎离开|保留体力|退回主路|献上一束|不冒险/.test(c.label),
      );
      if (i >= 0) return { type: "chooseEvent", payload: i + ":" };
    }
    return null;
  }
  if (s.fishing)
    return k === " "
      ? { type: "reel" }
      : k === "escape"
        ? { type: "cancelFish" }
        : null;
  if (s.battle) {
    const aims: Record<string, string> = {
      "1": "head",
      "2": "torso",
      "3": "limbs",
    };
    if (aims[k]) return { type: "aim", payload: aims[k] };
    const combat: Record<string, string> = {
      q: "heavy",
      w: "ranged",
      e: "wolf",
      a: "advance",
      d: "retreat",
      f: "skill",
      t: "thrust",
      g: "net",
    };
    if (combat[k]) return { type: "combat", payload: combat[k] };
    if (k === "escape") return { type: "combat", payload: "flee" };
    if (k === "r") {
      if (
        s.stats.hp >= (s.talent === "athlete" ? 115 : 95) &&
        s.stats.external >= 90 &&
        s.stats.internal >= 90 &&
        !s.battle.playerStatus.poison &&
        !s.battle.playerStatus.bleed
      )
        return null;
      const pool = inventory(s);
      const keys =
        s.stats.hp < 60
          ? ["firstaid", "tonic", "adrenaline"]
          : s.stats.external < 80
            ? ["salve", "bandage"]
            : s.stats.internal < 80
              ? ["antibiotic", "tonic"]
              : ["firstaid", "tonic", "bandage"];
      const id = keys.find((id) => (pool[id] || 0) > 0);
      return id ? { type: "use", payload: id } : null;
    }
    return null;
  }
  if (s.journey)
    return k === "escape"
      ? { type: "journeyRetreat" }
      : k === " "
        ? s.journey.incident
          ? { type: "journeyChoice", payload: "push" }
          : { type: "journeyStep" }
        : null;
  if (k === " ")
    return s.location === s.selected
      ? s.location
        ? { type: "explore" }
        : { type: "sleep" }
      : { type: "travel", payload: s.selected };
  return null;
}
