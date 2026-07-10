import type { Holding } from "@/lib/db/schema";

export type PositionSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
  market: string;
};

const CN_COLORS = ["#E2694E", "#EF8972", "#F3A18F", "#D85B43"];
const US_COLORS = ["#8DA3C4", "#A5B5CF", "#BDCADB", "#748DB4"];
const OTHER_COLORS = ["#B8AEA2", "#CCC4BA"];

function pct(value: number) {
  return Math.round(value * 100) / 100;
}

export function colorForHolding(holding: Pick<Holding, "market">, index: number) {
  if (holding.market === "cn") return CN_COLORS[index % CN_COLORS.length];
  if (holding.market === "us") return US_COLORS[index % US_COLORS.length];
  return OTHER_COLORS[index % OTHER_COLORS.length];
}

export function buildPositionSlices(holdings: Holding[], limit = 4) {
  const active = holdings
    .filter((h) => h.status === "active" && h.positionPct > 0)
    .sort((a, b) => b.positionPct - a.positionPct);

  const top = active.slice(0, limit);
  const slices: PositionSlice[] = top.map((holding, index) => ({
    key: String(holding.id),
    label: holding.name,
    value: pct(holding.positionPct),
    color: colorForHolding(holding, index),
    market: holding.market,
  }));

  const rest = active.slice(limit);
  const restValue = pct(rest.reduce((sum, h) => sum + h.positionPct, 0));
  if (restValue > 0) {
    slices.push({
      key: "other-holdings",
      label: "其他持仓",
      value: restValue,
      color: OTHER_COLORS[0],
      market: "other",
    });
  }

  const total = pct(active.reduce((sum, h) => sum + h.positionPct, 0));
  const cash = total >= 99.9 ? 0 : pct(Math.max(0, 100 - total));
  if (cash > 0) {
    slices.push({
      key: "cash",
      label: "现金/未配置",
      value: cash,
      color: OTHER_COLORS[1],
      market: "cash",
    });
  }

  return { slices, total, cash };
}

export function donutGradient(slices: PositionSlice[]) {
  const sum = slices.reduce((acc, slice) => acc + slice.value, 0);
  if (sum <= 0) return "#E6E5E0";

  let cursor = 0;
  const stops = slices.map((slice) => {
    const start = cursor;
    const end = cursor + (slice.value / sum) * 100;
    cursor = end;
    return `${slice.color} ${start}% ${end}%`;
  });

  return `conic-gradient(${stops.join(", ")})`;
}

export function snapshotHoldings(holdings: Holding[]) {
  const active = holdings.filter((h) => h.status === "active");
  const { slices, total, cash } = buildPositionSlices(holdings, 99);

  return {
    capturedAt: new Date().toISOString(),
    total,
    cash,
    slices: slices.map(({ key, label, value, color, market }) => ({
      key,
      label,
      value,
      color,
      market,
    })),
    holdings: active.map((h) => ({
      market: h.market,
      symbol: h.symbol,
      name: h.name,
      positionPct: h.positionPct,
    })),
  };
}
