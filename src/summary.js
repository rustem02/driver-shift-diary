/**
 * Считает сводку по списку поездок за день.
 * @param {Array<{amount: number, commission: number, payment: 'cash'|'card'}>} trips
 */
export function calculateSummary(trips) {
  const summary = {
    tripsCount: trips.length,
    revenue: 0,
    commission: 0,
    net: 0,
    byPayment: {
      cash: { count: 0, amount: 0 },
      card: { count: 0, amount: 0 },
    },
  };

  for (const trip of trips) {
    summary.revenue += trip.amount;
    summary.commission += trip.commission;

    const bucket = summary.byPayment[trip.payment];
    if (bucket) {
      bucket.count += 1;
      bucket.amount += trip.amount;
    }
  }

  summary.net = summary.revenue - summary.commission;
  return summary;
}
