"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const C = { blue: "#4285F4", red: "#EA4335", yellow: "#FBBC05", green: "#34A853" };
// I s s u e H u b
const COLORS = [C.blue, C.blue, C.red, C.red, C.yellow, C.yellow, C.green, C.green];

type CSSVars = React.CSSProperties & Record<string, string | number>;

export function IssueHubWordmark({
  className,
  as: Tag = "h1",
  size = "text-4xl",
  hoverWave = true,          // <- turn hover wave on/off
  waveFollowCursor = true,   // <- wave starts from side of cursor (left/right)
  staggerMs = 70,            // <- delay between letters
  ampPx = 8,                 // <- wave height in px
}: {
  className?: string;
  as?: React.ElementType;
  size?: string;
  hoverWave?: boolean;
  waveFollowCursor?: boolean;
  staggerMs?: number;
  ampPx?: number;
}) {
  const letters = React.useMemo(() => "IssueHub".split(""), []);
  const [dir, setDir] = React.useState<1 | -1>(1); // 1 = L→R, -1 = R→L

  const styleFor = (i: number): CSSVars => {
    const order = dir === 1 ? i : letters.length - 1 - i;
    return { color: COLORS[i % COLORS.length], "--d": order };
  };

  const decideDir = (e: React.MouseEvent<HTMLElement>) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    setDir(e.clientX < centerX ? 1 : -1);
  };

  const onEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (!hoverWave) return;
    decideDir(e);
  };

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!hoverWave || !waveFollowCursor) return;
    decideDir(e);
  };

  return (
    <Tag
      aria-label="IssueHub"
      className={cn("ih-wordmark font-extrabold tracking-tight leading-none select-none", size, className)}
      style={{ fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui", "--stagger": `${staggerMs}ms`, "--amp": `${ampPx}px` } as CSSVars}
      data-hover={hoverWave ? "wave" : "off"}
      onMouseEnter={hoverWave ? onEnter : undefined}
      onMouseMove={hoverWave && waveFollowCursor ? onMove : undefined}
    >
      {letters.map((ch, i) => (
        <span key={i} className="ih-letter inline-block will-change-transform" style={styleFor(i)}>
          {ch}
        </span>
      ))}

      <style jsx>{`
        @keyframes ih-wave {
          0%   { transform: translateY(0) scale(1); }
          30%  { transform: translateY(calc(-1 * var(--amp))) scale(1.06); }
          60%  { transform: translateY(0) scale(1); }
          100% { transform: translateY(0) scale(1); }
        }
        /* Hover wave only when enabled */
        .ih-wordmark[data-hover="wave"]:hover .ih-letter {
          animation-name: ih-wave;
          animation-duration: 520ms;
          animation-timing-function: cubic-bezier(.22,1,.36,1);
          animation-fill-mode: both;
          animation-delay: calc(var(--d) * var(--stagger));
          transform-origin: 50% 100%;
        }
        @media (prefers-reduced-motion: reduce) {
          .ih-letter { animation: none !important; }
          .ih-wordmark[data-hover="wave"]:hover .ih-letter { animation: none !important; }
        }
      `}</style>
    </Tag>
  );
}
