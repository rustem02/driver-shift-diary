import { describe, it, expect } from "vitest";
import { calculateSummary } from "../src/summary.js";

describe("calculateSummary", () => {
  it("считает число поездок, выручку, комиссию и «на руки»", () => {
    const trips = [
      {
        id: "t1",
        start: "2026-10-01T08:10:00+05:00",
        end: "2026-10-01T08:32:00+05:00",
        amount: 2400,
        payment: "card",
        commission: 360,
      },
      {
        id: "t2",
        start: "2026-10-01T09:05:00+05:00",
        end: "2026-10-01T09:20:00+05:00",
        amount: 1500,
        payment: "cash",
        commission: 225,
      },
    ];

    const summary = calculateSummary(trips);

    expect(summary.tripsCount).toBe(2);
    expect(summary.revenue).toBe(3900);
    expect(summary.commission).toBe(585);
    expect(summary.net).toBe(3315);
  });

  it("разбивает выручку на наличные и карту", () => {
    const trips = [
      { amount: 2400, payment: "card", commission: 360 },
      { amount: 1500, payment: "cash", commission: 225 },
      { amount: 1000, payment: "cash", commission: 150 },
    ];

    const summary = calculateSummary(trips);

    expect(summary.byPayment.cash).toEqual({ count: 2, amount: 2500 });
    expect(summary.byPayment.card).toEqual({ count: 1, amount: 2400 });
  });

  it("возвращает нули для пустого списка", () => {
    expect(calculateSummary([])).toEqual({
      tripsCount: 0,
      revenue: 0,
      commission: 0,
      net: 0,
      byPayment: {
        cash: { count: 0, amount: 0 },
        card: { count: 0, amount: 0 },
      },
    });
  });
});
