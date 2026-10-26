"use client";

import { useState } from "react";
import { formatBytes } from "@/lib/compress";

export type DailyPoint = { day: string; images: number; bytes_saved: number };

type Metric = "images" | "bytes_saved";

const METRICS: { value: Metric; label: string }[] = [
  { value: "images", label: "Images saved" },
  { value: "bytes_saved", label: "Data saved" },
];

function formatValue(metric: Metric, value: number) {
  return metric === "images" ? value.toLocaleString() : formatBytes(value);
}

function formatDay(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

// Rounds the axis maximum up to a readable number so gridlines land on clean values.
function niceMax(value: number) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value)!;
  return step * power;
}

export function DailyChart({ data }: { data: DailyPoint[] }) {
  const [metric, setMetric] = useState<Metric>("images");
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const max = niceMax(Math.max(0, ...data.map((d) => d[metric])));
  const ticks = [max, max / 2, 0];
  const dense = data.length > 45;
  const labelIndexes = new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]);
  const total = data.reduce((sum, d) => sum + d[metric], 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {METRICS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMetric(m.value)}
              aria-pressed={metric === m.value}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                metric === m.value ? "bg-ink text-white" : "bg-surface text-ink hover:bg-surface-strong"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">
          Total <span className="font-semibold text-ink">{formatValue(metric, total)}</span>
        </p>
      </div>

      <div className="flex gap-4">
        <div className="flex h-64 flex-col justify-between text-right text-xs text-muted">
          {ticks.map((tick) => (
            <span key={tick} className="-translate-y-2 leading-none">
              {formatValue(metric, Math.round(tick))}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-64" onMouseLeave={() => setHover(null)}>
            {ticks.map((tick, i) => (
              <div
                key={tick}
                className="absolute inset-x-0 h-px bg-surface-strong"
                style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
                aria-hidden
              />
            ))}

            <div className={`absolute inset-0 flex items-end ${dense ? "gap-px" : "gap-0.5"}`}>
              {data.map((point, index) => {
                const height = (point[metric] / max) * 100;
                return (
                  <div
                    key={point.day}
                    className="relative flex h-full flex-1 items-end"
                    onMouseEnter={() => setHover(index)}
                    onFocus={() => setHover(index)}
                    tabIndex={0}
                    aria-label={`${formatDay(point.day)}: ${formatValue(metric, point[metric])}`}
                  >
                    <div
                      className={`w-full rounded-t transition-colors duration-150 ${
                        hover === index ? "bg-accent-hover" : "bg-accent"
                      }`}
                      style={{ height: `${height}%`, minHeight: point[metric] > 0 ? 2 : 0 }}
                    />
                  </div>
                );
              })}
            </div>

            {hover !== null && data[hover] && (
              <div
                className="pointer-events-none absolute -top-4 z-10 -translate-x-1/2 -translate-y-full rounded-card bg-ink px-4 py-2 text-sm whitespace-nowrap text-white shadow-md"
                style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
              >
                <p className="font-semibold">{formatValue(metric, data[hover][metric])}</p>
                <p className="text-on-dark">{formatDay(data[hover].day)}</p>
              </div>
            )}
          </div>

          <div className="relative mt-2 h-4 text-xs text-muted">
            {data.map((point, index) =>
              labelIndexes.has(index) ? (
                <span
                  key={point.day}
                  className={`absolute ${
                    index === 0 ? "left-0" : index === data.length - 1 ? "right-0" : "-translate-x-1/2"
                  }`}
                  style={index !== 0 && index !== data.length - 1 ? { left: `${((index + 0.5) / data.length) * 100}%` } : undefined}
                >
                  {formatDay(point.day)}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>

      <button type="button" onClick={() => setShowTable((v) => !v)} className="text-sm font-semibold text-accent hover:text-accent-hover">
        {showTable ? "Hide table" : "Show as table"}
      </button>

      {showTable && (
        <div className="max-h-80 overflow-y-auto rounded-card">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface-strong text-ink">
              <tr>
                <th className="px-4 py-2 font-semibold">Day</th>
                <th className="px-4 py-2 text-right font-semibold">Images saved</th>
                <th className="px-4 py-2 text-right font-semibold">Data saved</th>
              </tr>
            </thead>
            <tbody>
              {data.map((point, i) => (
                <tr key={point.day} className={i % 2 ? "bg-surface" : "bg-white"}>
                  <td className="px-4 py-2 text-muted">{formatDay(point.day)}</td>
                  <td className="px-4 py-2 text-right text-ink">{point.images.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-ink">{formatBytes(point.bytes_saved)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
