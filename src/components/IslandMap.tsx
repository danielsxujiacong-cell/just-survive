import { zones } from "../data";
import type { State } from "../types";
export function IslandMap({
  s,
  onSelect,
}: {
  s: State;
  onSelect: (id: number) => void;
}) {
  return (
    <svg
      className={"island-map weather-" + s.weather}
      viewBox="0 0 900 720"
      role="group"
      aria-label="可点击的孤岛探索海图"
    >
      <defs>
        <pattern id="sea" width="50" height="35" patternUnits="userSpaceOnUse">
          <path
            d="M0 20 Q12 13 24 20 T48 20"
            fill="none"
            stroke="#81928c"
            strokeWidth=".6"
            opacity=".12"
          />
        </pattern>
        <radialGradient id="land">
          <stop stopColor="#566251" />
          <stop offset="1" stopColor="#303e35" />
        </radialGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity=".4" />
        </filter>
        <pattern id="rain" width="30" height="45" patternUnits="userSpaceOnUse">
          <path d="M20 0L8 30" stroke="#b1cbc4" opacity=".25" />
        </pattern>
      </defs>
      <rect width="900" height="720" fill="#152c2e" />
      <rect
        className="ocean-ripples"
        width="900"
        height="720"
        fill="url(#sea)"
      />
      <g opacity=".18" stroke="#b4bca4" strokeDasharray="3 9">
        <path d="M0 180H900M0 360H900M0 540H900M225 0V720M450 0V720M675 0V720" />
      </g>
      <path
        d="M105 168Q125 112 195 127L278 175 356 140 403 106 457 153 535 112 596 146 655 136 692 210 766 248 748 305 795 356 765 411 800 450 741 498 695 560 594 547 544 585 485 564 434 610 356 588 304 635 232 603 180 646 112 620 130 566 95 520 155 459 136 399 182 349 159 300 195 251Z"
        fill="url(#land)"
        stroke="#b4b39a"
        strokeWidth="2"
        filter="url(#shadow)"
      />
      {[0.93, 0.81, 0.67, 0.5].map((scale, i) => (
        <path
          key={scale}
          d="M105 168Q125 112 195 127L278 175 356 140 403 106 457 153 535 112 596 146 655 136 692 210 766 248 748 305 795 356 765 411 800 450 741 498 695 560 594 547 544 585 485 564 434 610 356 588 304 635 232 603 180 646 112 620 130 566 95 520 155 459 136 399 182 349 159 300 195 251Z"
          transform={`translate(${450 * (1 - scale)} ${370 * (1 - scale)}) scale(${scale})`}
          fill="none"
          stroke="#a8ad8b"
          opacity={0.24 - i * 0.035}
        />
      ))}
      <g stroke="#93a68a" fill="none" opacity=".23">
        {Array.from({ length: 70 }, (_, i) => {
          const x = 230 + ((i * 73) % 420),
            y = 230 + ((i * 41) % 300);
          return <path key={i} d={`M${x} ${y}l-7 13h14z m0 13v5`} />;
        })}
        <path
          d="M570 225l35-55 40 55m-60-23 20-32 21 32M674 348l38-56 41 56m-58-29 17-27 18 27"
          strokeWidth="3"
        />
      </g>
      <path
        d="M520 200Q470 300 500 350T430 480"
        fill="none"
        stroke="#8caeab"
        opacity=".5"
        strokeWidth="3"
      />
      <g fill="none" stroke="#c9ba8c" opacity=".28" strokeDasharray="4 7">
        {zones
          .slice(1)
          .filter((z) => z.id !== 9 || s.lab)
          .map((z) => (
            <path
              key={z.id}
              d={`M180 540 Q${z.x * 9 - 30} ${z.y * 6 - 50} ${z.x * 9} ${z.y * 6.8}`}
            />
          ))}
      </g>
      {zones
        .filter((z) => z.id !== 9 || s.lab)
        .map((z) => (
          <g
            key={z.id}
            role="button"
            tabIndex={0}
            aria-label={z.name}
            onClick={() => onSelect(z.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSelect(z.id);
            }}
            className={
              "map-node" +
              (s.progress[z.id] === 4
                ? " boss-warning"
                : s.progress[z.id] < 5
                  ? " explorable"
                  : " cleared")
            }
            transform={`translate(${z.x * 9},${z.y * 6.8})`}
          >
            <circle
              r={s.selected === z.id ? 24 : 18}
              fill={s.selected === z.id ? "#cbb176" : "#182c29"}
              stroke={s.selected === z.id ? "#f7dda1" : "#b8bda2"}
              strokeWidth={s.location === z.id ? 3 : 1}
            />
            <text
              textAnchor="middle"
              y="5"
              fill={s.selected === z.id ? "#192824" : "#e1d6b7"}
              fontSize="16"
            >
              {z.id === 0
                ? "⌂"
                : s.progress[z.id] === 5
                  ? "✓"
                  : String(z.id).padStart(2, "0")}
            </text>
            <text
              textAnchor="middle"
              y="38"
              fill="#e6dfc6"
              fontSize="13"
              letterSpacing="1"
            >
              {z.name}
            </text>
            {z.id > 0 && (
              <g transform="translate(-17 46)">
                {Array.from({ length: 5 }, (_, i) => (
                  <rect
                    key={i}
                    x={i * 7}
                    width="5"
                    height="3"
                    fill={s.progress[z.id] > i ? "#d4b676" : "#627569"}
                  />
                ))}
              </g>
            )}
            {s.location === z.id && <circle cy="-30" r="3" fill="#e8c88a" />}
          </g>
        ))}
      {s.journey &&
        (() => {
          const j = s.journey;
          const from = zones[j.from],
            to = zones[j.to];
          const t = j.stage / j.stages;
          const sx = from.x * 9,
            sy = from.y * 6.8,
            ex = to.x * 9,
            ey = to.y * 6.8,
            cx = (sx + ex) / 2 + 25,
            cy = (sy + ey) / 2 - 40;
          const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex,
            y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey;
          return (
            <g>
              <path
                d={`M${sx} ${sy}Q${cx} ${cy} ${ex} ${ey}`}
                fill="none"
                stroke="#f1cf8a"
                strokeWidth="2"
                strokeDasharray="5 7"
              />
              {Array.from({ length: j.stages - 1 }, (_, i) => {
                const u = (i + 1) / j.stages;
                return (
                  <circle
                    key={i}
                    cx={
                      (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * cx + u * u * ex
                    }
                    cy={
                      (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * cy + u * u * ey
                    }
                    r="4"
                    fill="#c8b17c"
                  />
                );
              })}
              <g
                className="marcher"
                style={{ transform: `translate(${x}px,${y}px)` }}
              >
                <circle
                  r="15"
                  fill="#e8c582"
                  stroke="#172b25"
                  strokeWidth="3"
                />
                <text textAnchor="middle" y="5" fontSize="21" fill="#172b25">
                  ♙
                </text>
                <circle
                  className="marcher-pulse"
                  r="22"
                  stroke="#e8c582"
                  fill="none"
                />
              </g>
            </g>
          );
        })()}
      <g
        transform="translate(790 100)"
        fill="none"
        stroke="#b4bba5"
        opacity=".65"
      >
        <circle r="34" />
        <path d="M0-44V44M-44 0H44M0-30L7 0 0 30-7 0Z" />
        <text
          y="-53"
          textAnchor="middle"
          fill="#b4bba5"
          stroke="none"
          fontSize="13"
        >
          N
        </text>
      </g>
      <text x="60" y="675" fill="#91a296" fontSize="11" letterSpacing="4">
        THE FORGOTTEN ISLAND · 23° N / 121° E
      </text>
      {s.weather === "大雨" || s.weather === "暴风" ? (
        <rect
          className="weather-particles"
          width="900"
          height="720"
          fill="url(#rain)"
          pointerEvents="none"
        />
      ) : null}
      {s.weather === "浓雾" && (
        <g
          className="fog-drift"
          pointerEvents="none"
          opacity=".12"
          fill="#e5f3df"
        >
          <ellipse cx="300" cy="270" rx="300" ry="110" />
          <ellipse cx="650" cy="490" rx="250" ry="100" />
        </g>
      )}
      {(s.weather === "火山灰" || s.location === 10) && (
        <g className="weather-particles" fill="#d5d4bf" opacity=".5">
          {Array.from({ length: 40 }, (_, i) => (
            <circle
              key={i}
              cx={(i * 83) % 900}
              cy={(i * 47) % 720}
              r={(i % 3) + 1}
            />
          ))}
        </g>
      )}
      <rect
        className="night-tint"
        pointerEvents="none"
        width="900"
        height="720"
        fill="#071127"
        opacity={
          s.time % 24 < 6 || s.time % 24 > 20
            ? 0.38
            : s.time % 24 > 18
              ? 0.16
              : 0
        }
      />
    </svg>
  );
}
