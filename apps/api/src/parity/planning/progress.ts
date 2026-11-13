export type ProgressCounts = {
  total: number;
  completed: number;
  totalPoints: number;
  completedPoints: number;
};

export function emptyCounts(): ProgressCounts {
  return { total: 0, completed: 0, totalPoints: 0, completedPoints: 0 };
}

export function addCounts(rows: ProgressCounts[]): ProgressCounts {
  return rows.reduce(
    (sum, row) => ({
      total: sum.total + row.total,
      completed: sum.completed + row.completed,
      totalPoints: sum.totalPoints + row.totalPoints,
      completedPoints: sum.completedPoints + row.completedPoints,
    }),
    emptyCounts(),
  );
}

export function progress(counts: ProgressCounts, estimates: boolean) {
  const ratio = (done: number, total: number) =>
    total ? Math.round((done / total) * 10_000) / 100 : 0;
  return {
    total: counts.total,
    completed: counts.completed,
    percent: ratio(counts.completed, counts.total),
    totalPoints: estimates ? counts.totalPoints : null,
    completedPoints: estimates ? counts.completedPoints : null,
    pointsPercent: estimates
      ? ratio(counts.completedPoints, counts.totalPoints)
      : null,
  };
}
