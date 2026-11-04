export const coastline =
  "M105 168Q125 112 195 127L278 175 356 140 403 106 457 153 535 112 596 146 655 136 692 210 766 248 748 305 795 356 765 411 800 450 741 498 695 560 594 547 544 585 485 564 434 610 356 588 304 635 232 603 180 646 112 620 130 566 95 520 155 459 136 399 182 349 159 300 195 251Z";
export function TerrainDefs() {
  return (
    <>
      <clipPath id="island-clip">
        <path d={coastline} />
      </clipPath>
      <linearGradient id="sand-gold" x2="1" y2="1">
        <stop stopColor="#bfaa72" />
        <stop offset="1" stopColor="#7d7950" />
      </linearGradient>
      <linearGradient id="glacier-blue" x2="1" y2="1">
        <stop stopColor="#dae6d7" />
        <stop offset=".45" stopColor="#86b8c0" />
        <stop offset="1" stopColor="#466d82" />
      </linearGradient>
      <radialGradient id="lava-glow">
        <stop stopColor="#e69857" />
        <stop offset=".35" stopColor="#ad533c" />
        <stop offset="1" stopColor="#3b302c" />
      </radialGradient>
      <pattern
        id="sand-marks"
        width="24"
        height="18"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M1 8q5-4 10 0m7 5l3-2"
          stroke="#e5d4a3"
          fill="none"
          strokeWidth=".8"
          opacity=".45"
        />
      </pattern>
      <pattern
        id="forest-marks"
        width="34"
        height="34"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M16 3L6 20H11L4 28H28L21 20H26Z"
          fill="#183f31"
          stroke="#678568"
          strokeWidth=".7"
        />
        <path d="M16 26v7" stroke="#a6aa78" />
      </pattern>
      <pattern
        id="ice-marks"
        width="45"
        height="35"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M0 28L15 4 30 27M9 13L15 4 21 14 17 12 15 16 12 12"
          fill="none"
          stroke="#e7f2e7"
          strokeWidth="1.2"
          opacity=".6"
        />
      </pattern>
    </>
  );
}
export function TerrainLayer() {
  return (
    <g clipPath="url(#island-clip)" pointerEvents="none">
      <path
        d="M50 90L245 115 245 265 185 420 300 620 175 720 45 650Z"
        fill="url(#sand-gold)"
        opacity=".85"
      />
      <path
        d="M50 90L245 115 245 265 185 420 300 620 175 720 45 650Z"
        fill="url(#sand-marks)"
      />
      <path
        d="M210 260Q380 170 485 320L530 540 330 625 185 510Z"
        fill="#28523b"
        opacity=".87"
      />
      <path
        d="M210 260Q380 170 485 320L530 540 330 625 185 510Z"
        fill="url(#forest-marks)"
        opacity=".65"
      />
      <path
        d="M470 100L720 100 790 245 665 310 565 255 475 220Z"
        fill="url(#glacier-blue)"
        opacity=".95"
      />
      <path
        d="M470 100L720 100 790 245 665 310 565 255 475 220Z"
        fill="url(#ice-marks)"
      />
      <path
        d="M630 295L780 270 850 365 800 530 645 500 603 398Z"
        fill="url(#lava-glow)"
        opacity=".94"
      />
      <g className="lava-fissures" fill="none" stroke="#eaa15b" strokeWidth="2">
        <path d="M730 305L715 340 750 362 710 390 725 440M770 335L755 360 785 400 760 450M687 368L665 410 681 445 655 477" />
        <path d="M750 362L777 351M710 390L683 385" strokeWidth="1" />
      </g>
      <path
        d="M465 300Q550 270 590 375L550 450 470 435 430 360Z"
        fill="#777763"
        opacity=".7"
      />
      <g transform="translate(520 341)">
        <path
          d="M-30 18L-18-18 13-28 34 18Z"
          fill="#8b8d79"
          stroke="#bac0a4"
          strokeWidth="1.5"
        />
        <path d="M-15 18Q-16-15 9-12Q27-5 23 18Z" fill="#182a28" />
        <path
          d="M-5-10L-1 0 4-10M9-12L13 1 18-8"
          stroke="#a9b7a1"
          fill="none"
        />
      </g>
      <g
        transform="translate(618 400)"
        fill="#9d9b7c"
        stroke="#ccc5a0"
        strokeWidth="1.2"
      >
        <path d="M-28 25V-15H-16V25M-3 25V-28H10V25M23 25V-8H35V25M-34 28H42V34H-34Z" />
        <path d="M-32-15L-20-25-12-15M-8-28L5-36 17-28" fill="#b4ae8d" />
        <path d="M-17 25L-3 10 11 25" fill="#514c3c" />
      </g>
      <g transform="translate(134 142) rotate(-20)">
        <path
          d="M-30 15H40L22 35H-15Z"
          fill="#624d36"
          stroke="#c9b383"
          strokeWidth="2"
        />
        <path d="M0-35V17M0-30L30 10H0Z" fill="#cebd91" stroke="#e3d1a7" />
        <path d="M-5-12L-12-2 0 7" stroke="#574a38" fill="none" />
      </g>
      <g transform="translate(691 160)">
        <path
          d="M-40 30L-12-24 5 0 20-34 55 30Z"
          fill="#a0c7cf"
          stroke="#d7e8e2"
          strokeWidth="2"
        />
        <path
          d="M-24 0L-12-24 0-3-9-7-12 0-17-6M7-8L20-34 36-7 25-15 19-7 14-13"
          fill="#eaf1e8"
          stroke="none"
        />
      </g>
    </g>
  );
}
