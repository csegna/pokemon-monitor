"use client";

import { useState } from "react";

import type { WeeklyRestockCount } from "@/lib/types";

const WIDTH = 720;
const HEIGHT = 180;
const PAD_LEFT = 28;
const PAD_BOTTOM = 22;
const PAD_TOP = 10;

function weekLabel(isoDate: string): string {
  // week_start is a plain "YYYY-MM-DD" date string (no time/timezone
  // component from the backend), so a direct Date parse is safe here -
  // this is not one of the naive-UTC-datetime cases format.ts guards against.
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function WeeklyBarChart({ weeks }: { weeks: WeeklyRestockCount[] }) {
  const [hovered, setHovered] = useState<{ index: number; x: number; y: number } | null>(null);

  const maxVal = Math.max(4, ...weeks.map((w) => w.count));
  const plotW = WIDTH - PAD_LEFT - 8;
  const plotH = HEIGHT - PAD_BOTTOM - PAD_TOP;
  const slot = plotW / Math.max(weeks.length, 1);
  const barW = Math.min(24, slot * 0.5);
  const gap = 2;

  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Weekly restock counts">
        {yTicks.map((tick) => {
          const y = PAD_TOP + plotH - (tick / maxVal) * plotH;
          return (
            <g key={tick}>
              <line x1={PAD_LEFT} x2={WIDTH - 4} y1={y} y2={y} stroke="var(--grid-line)" strokeWidth="1" />
              <text x={4} y={y + 3} fontSize="10.5" fill="var(--text-muted)" fontFamily="ui-monospace, monospace">
                {tick}
              </text>
            </g>
          );
        })}

        {weeks.map((week, i) => {
          const isCurrent = i === weeks.length - 1;
          const cx = PAD_LEFT + i * slot + slot / 2;
          const barH = (week.count / maxVal) * plotH;
          const x = cx - barW / 2;
          const y = PAD_TOP + plotH - barH;
          return (
            <g key={week.week_start}>
              <rect
                x={x + gap / 2}
                y={y}
                width={Math.max(barW - gap, 2)}
                height={Math.max(barH, 1)}
                rx="4"
                fill="var(--accent)"
                opacity={isCurrent ? 1 : 0.45}
                className="cursor-pointer"
                onMouseEnter={() => setHovered({ index: i, x: cx, y })}
                onMouseLeave={() => setHovered(null)}
              />
              {i % 2 === 0 && (
                <text
                  x={cx}
                  y={HEIGHT - 5}
                  fontSize="10"
                  fill="var(--text-muted)"
                  textAnchor="middle"
                  fontFamily="ui-monospace, monospace"
                >
                  {weekLabel(week.week_start)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[110%] whitespace-nowrap rounded-md px-2.5 py-1.5 font-mono text-[11.5px]"
          style={{
            left: `${(hovered.x / WIDTH) * 100}%`,
            top: `${(hovered.y / HEIGHT) * 100}%`,
            background: "var(--text-primary)",
            color: "var(--bg)",
          }}
        >
          {weekLabel(weeks[hovered.index].week_start)} · {weeks[hovered.index].count} restock
          {weeks[hovered.index].count === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}
