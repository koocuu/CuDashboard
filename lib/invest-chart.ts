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

function percentageMap(active: Holding[], totalAmountCny: number) {
  const rows = active.map((holding) => {
    const rawUnits = totalAmountCny > 0 ? (holding.amountCny / totalAmountCny) * 10000 : 0;
    const units = Math.floor(rawUnits);
    return { id: holding.id, units, remainder: rawUnits - units };
  });
  let unitsLeft = totalAmountCny > 0
    ? 10000 - rows.reduce((sum, row) => sum + row.units, 0)
    : 0;
  const ranked = [...rows].sort((a, b) => b.remainder - a.remainder);
  for (let index = 0; index < ranked.length && unitsLeft > 0; index++, unitsLeft--) {
    ranked[index].units += 1;
  }
  return new Map(rows.map((row) => [row.id, row.units / 100]));
}

export function colorForHolding(holding: Pick<Holding, "market">, index: number) {
  if (holding.market === "cn") return CN_COLORS[index % CN_COLORS.length];
  if (holding.market === "us") return US_COLORS[index % US_COLORS.length];
  return OTHER_COLORS[index % OTHER_COLORS.length];
}

export function buildPositionSlices(holdings: Holding[], limit = 4) {
  const active = holdings
    .filter((h) => h.status === "active" && h.amountCny > 0)
    .sort((a, b) => b.amountCny - a.amountCny);
  const totalAmountCny = active.reduce((sum, holding) => sum + holding.amountCny, 0);
  const percentages = percentageMap(active, totalAmountCny);
  const holdingPct = (holding: Holding) => percentages.get(holding.id) ?? 0;

  const top = active.slice(0, limit);
  const slices: PositionSlice[] = top.map((holding, index) => ({
    key: String(holding.id),
    label: holding.name,
    value: holdingPct(holding),
    color: colorForHolding(holding, index),
    market: holding.market,
  }));

  const rest = active.slice(limit);
  const restValue = pct(rest.reduce((sum, holding) => sum + holdingPct(holding), 0));
  if (restValue > 0) {
    slices.push({
      key: "other-holdings",
      label: "其他持仓",
      value: restValue,
      color: OTHER_COLORS[0],
      market: "other",
    });
  }

  const cashHolding = active.find(
    (holding) => holding.symbol.toUpperCase() === "CASH" || holding.name.includes("现金"),
  );
  const cash = cashHolding ? holdingPct(cashHolding) : 0;
  const investedPct = totalAmountCny > 0 ? pct(100 - cash) : 0;

  return { slices, total: investedPct, investedPct, cash, totalAmountCny };
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
  const { slices, total, investedPct, cash, totalAmountCny } = buildPositionSlices(holdings, 99);
  const percentages = percentageMap(active, totalAmountCny);

  return {
    capturedAt: new Date().toISOString(),
    total,
    investedPct,
    cash,
    totalAmountCny,
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
      amountCny: h.amountCny,
      positionPct: percentages.get(h.id) ?? 0,
    })),
  };
}
