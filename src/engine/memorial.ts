import type { State } from "../types";
import { day } from "./game";
import { endingNames } from "../data";
const backgrounds: Record<string, string> = {
  A: `<circle cx="780" cy="90" r="60" fill="#e9cfa2"/><path d="M0 270Q150 200 300 260T600 260T1000 250V380H0Z" fill="#325f67"/><path d="M0 310Q180 250 350 310T700 300T1000 310" fill="none" stroke="#95bdb8" stroke-width="3"/><g class="ending-ship" transform="translate(430 140)"><path d="M-140 125H140L95 175H-95Z" fill="#543e2c" stroke="#c7a66d" stroke-width="3"/><path d="M0-110V130" stroke="#e4cea0" stroke-width="5"/><path d="M-10-100L-10 105H-120Z" fill="#e3d4ae"/><path d="M8-70L115 100H8Z" fill="#b6b390"/></g>`,
  B: `<path d="M0 220L80 100 160 200 230 70 320 180 400 110 500 230V380H0Z" fill="#2b4246"/><circle cx="800" cy="90" r="45" fill="#e3d5ab"/><g class="ending-ship" transform="translate(550 180)"><path d="M-210 65H210L140 135H-170Z" fill="#243239" stroke="#a4b9ad" stroke-width="3"/><path d="M-95 65V-35H100V65M20-35V-80H70V-35" fill="#66776e" stroke="#a4b9ad" stroke-width="3"/><path d="M40-65L220-20 220 85 40-35Z" fill="#d4cda433"/><path d="M-70-10H-40M-10-10H20M50-10H80" stroke="#ead19a" stroke-width="14"/></g><path d="M0 310Q150 280 350 310T700 300T1000 310V380H0Z" fill="#6a898a88"/>`,
  C: `<path d="M500 310L720 40 930 310Z" fill="#422c2b"/><path d="M680 90L720 40 760 92 740 85 720 110 700 80Z" fill="#f6b47e"/><path class="eruption-stream" d="M720 50Q650-60 560 40M720 50Q810-80 900 10M720 50V-70" stroke="#f29a59" stroke-width="12" fill="none"/><path d="M0 330Q150 100 360 160Q200 200 250 300Q400 210 600 290T1000 300V380H0Z" fill="#47808b" stroke="#9dc7be" stroke-width="4"/><g class="surf-pod" transform="translate(310 200) rotate(-20)"><ellipse rx="85" ry="28" fill="#ac9d77" stroke="#e3c995" stroke-width="4"/><path d="M-40 0Q0-70 45 0Z" fill="#273b3c"/><circle cy="-20" r="12" fill="#b5cebd"/></g>`,
  D: `<g class="dragon-aura"><circle cx="500" cy="185" r="140" fill="none" stroke="#d9c582" stroke-width="2"/><circle cx="500" cy="185" r="120" fill="none" stroke="#85b49e" stroke-width="3" stroke-dasharray="8 14"/></g><path class="celestial-dragon" d="M250 280Q100 130 300 90Q470 50 610 170Q770 310 850 120Q880 50 810 40L790 90 760 50Q720 110 790 150Q750 220 630 130Q450-20 240 60Q60 140 190 300" fill="none" stroke="#82b8a0" stroke-width="24"/><path d="M790 45L820 12 830 50M800 90L855 80" stroke="#edda9e" stroke-width="5" fill="none"/><circle cx="808" cy="63" r="5" fill="#f9db89"/>${Array.from(
    { length: 7 },
    (_, i) => {
      const a = (i * Math.PI * 2) / 7;
      return `<circle cx="${500 + Math.cos(a) * 140}" cy="${185 + Math.sin(a) * 140}" r="13" fill="#d6aa5b" stroke="#f2d795" stroke-width="2"/>`;
    },
  ).join("")}`,
  death: `<circle cx="760" cy="100" r="45" fill="#929c99"/><path d="M0 280Q250 200 500 280T1000 250V380H0Z" fill="#30493f"/><path d="M450 290V170Q500 120 550 170V290" fill="#637267" stroke="#a3ac95" stroke-width="3"/><path d="M475 190H525M500 165V225" stroke="#c3c6ae" stroke-width="3"/>`,
};
export function sceneSVG(ending: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 380" role="img" aria-label="${endingNames[ending] || "孤岛回忆"}"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${ending === "C" ? "#60342b" : ending === "D" ? "#1c463b" : "#1b343b"}"/><stop offset="1" stop-color="#172923"/></linearGradient></defs><rect width="1000" height="380" fill="url(#sky)"/>${backgrounds[ending] || backgrounds.death}</svg>`;
}
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function memorialSVG(s: State) {
  const ending = s.ending || "death",
    timeline = s.milestones.filter((m) =>
      ["wolf", "camel", "puzzle", "kuru", "ending"].includes(m.key),
    );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1250" viewBox="0 0 1000 1250"><rect width="1000" height="1250" fill="#162720"/><rect x="22" y="22" width="956" height="1206" rx="10" fill="none" stroke="#b59c68" stroke-width="2"/><svg x="40" y="50" width="920" height="350" viewBox="0 0 1000 380">${sceneSVG(ending).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg><g fill="#dfcba0" font-family="Microsoft YaHei, sans-serif" text-anchor="middle"><text x="500" y="448" font-size="15" letter-spacing="6">WILDERNESS DIARY / SURVIVOR</text><text x="500" y="515" font-size="35">${escape(endingNames[ending])}</text><text x="500" y="568" font-size="18">第${day(s)}天逃生 · 击败${s.kills}敌人 · 守关战${s.bossKills}场</text><text x="500" y="605" font-size="16">图鉴 ${s.seenItems.length}种物品 / ${s.seenEnemies.length}种生态 / ${s.pages.length}篇残页</text></g><path d="M145 670V1060" stroke="#b59c68" stroke-width="2"/>${timeline
    .slice(0, 6)
    .map(
      (m, i) =>
        `<circle cx="145" cy="${690 + i * 62}" r="5" fill="#ddbc79"/><text x="175" y="${697 + i * 62}" fill="#d8d8b9" font-family="Microsoft YaHei, sans-serif" font-size="18">第${m.day}天 · ${escape(m.text)}</text>`,
    )
    .join(
      "",
    )}<g text-anchor="middle" font-family="Microsoft YaHei, sans-serif" fill="#c5b581"><text x="500" y="1130" font-size="19">${s.gmUsed ? "🔧 调试模式存档" : "凭自己的双手，走出了荒野"}</text><text x="500" y="1180" font-size="13" letter-spacing="3">孤岛幸存者 · ${escape(ending)} · SEED ${s.seed}</text></g></svg>`;
}
export async function downloadMemorial(s: State) {
  const svg = memorialSVG(s),
    url = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    );
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 1250;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw Error("PNG生成失败");
    const png = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = png;
    link.download = `孤岛幸存者-${s.ending}-第${day(s)}天.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(png), 10000);
  } finally {
    URL.revokeObjectURL(url);
  }
}
