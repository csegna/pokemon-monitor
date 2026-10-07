"use client";

import { useState } from "react";

import { parseApiDate } from "@/lib/format";
import type { MarketPricePoint } from "@/lib/types";

const WIDTH = 500;
const HEIGHT = 200;
const PAD_LEFT = 44;
const PAD_RIGHT = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 22;

export function PriceHistoryChart({ points, retailPrice }: { points: MarketPricePoint[]; retailPrice: number | null }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">
        No price data yet - it&apos;s checked every few hours. Use &quot;Refresh now&quot; to fetch the first one.
      </p>
    );
  }

  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const values = points.map((p) => p.price);
  const rawMax = Math.max(...values, retailPrice ?? 0);
  const maxVal = Math.max(20, Math.ceil(rawMax / 20) * 20);

  const xFor = (i: number) => (points.length === 1 ? PAD_LEFT : PAD_LEFT + (i / (points.length - 1)) * plotW);
  const yFor = (v: number) => PAD_TOP + plotH - (v / maxVal) * plotH;

  const yTicks = [0, maxVal / 2, maxVal];
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(p.price)}`).join(" ");
  const areaPath = `M${xFor(0)},${yFor(0)} L${points.map((p, i) => `${xFor(i)},${yFor(p.price)}`).join(" L")} L${xFor(
    points.length - 1
  )},${yFor(0)} Z`;

  const last = points[points.length - 1];
  const lastX = xFor(points.length - 1);
  const lastY = yFor(last.price);
  const retailY = retailPrice != null ? yFor(Math.min(retailPrice, maxVal)) : null;

  const hovered = hoverIndex != null ? points[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Market price over time"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={yFor(tick)} y2={yFor(tick)} stroke="var(--grid-line)" strokeWidth="1" />
            <text x={PAD_LEFT - 8} y={yFor(tick) + 3} fontSize="10" fill="var(--text-muted)" textAnchor="end" fontFamily="ui-monospace, monospace">
              ${tick.toFixed(0)}
            </text>
          </g>
        ))}

        {retailY != null && retailPrice != null && (
          <>
            <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={retailY} y2={retailY} stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="3,4" />
            <text x={WIDTH - PAD_RIGHT} y={retailY - 5} fontSize="10.5" fill="var(--text-muted)" textAnchor="end" fontFamily="ui-monospace, monospace">
              Retail ${retailPrice.toFixed(2)}
            </text>
          </>
        )}

        <path d={areaPath} fill="var(--accent)" opacity="0.1" stroke="none" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        <circle cx={lastX} cy={lastY} r="4.5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
        <text x={lastX - 8} y={lastY - 9} fontSize="11" fontWeight="600" fill="var(--text-primary)" textAnchor="end" fontFamily="ui-monospace, monospace">
          ${last.price.toFixed(2)}
        </text>

        {hoverIndex != null && (
          <>
            <line x1={xFor(hoverIndex)} x2={xFor(hoverIndex)} y1={PAD_TOP} y2={PAD_TOP + plotH} stroke="var(--text-muted)" strokeWidth="1" opacity="0.5" />
            <circle cx={xFor(hoverIndex)} cy={yFor(points[hoverIndex].price)} r="5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
          </>
        )}

        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={plotW}
          height={plotH}
          fill="transparent"
          className="cursor-crosshair"
          onMouseMove={(event) => {
            const svg = event.currentTarget.ownerSVGElement;
            if (!svg) return;
            const rect = svg.getBoundingClientRect();
            const scale = WIDTH / rect.width;
            const mouseX = (event.clientX - rect.left) * scale;
            const i = Math.round(((mouseX - PAD_LEFT) / plotW) * (points.length - 1));
            setHoverIndex(Math.max(0, Math.min(points.length - 1, i)));
          }}
        />
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-y-[110%] whitespace-nowrap rounded-md px-2.5 py-1.5 font-mono text-[11.5px]"
          style={{
            left: `${(xFor(hoverIndex!) / WIDTH) * 100}%`,
            top: `${(yFor(hovered.price) / HEIGHT) * 100}%`,
            transform: "translate(-50%, -110%)",
            background: "var(--text-primary)",
            color: "var(--bg)",
          }}
        >
          {parseApiDate(hovered.fetched_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · $
          {hovered.price.toFixed(2)}
        </div>
      )}
    </div>
  );
}
