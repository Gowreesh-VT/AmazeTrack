import { Transaction, Category, Budget, AllowanceConfig } from "./types";

// Helper to check if note matches outside eating keywords
export function isOutsideEating(note: string | undefined): boolean {
  if (!note) return false;
  const lower = note.toLowerCase();
  const keywords = [
    "swiggy",
    "zomato",
    "dominos",
    "pizza",
    "burger",
    "restaurant",
    "cafe",
    "kfc",
    "maggi",
    "eating out",
    "outside",
    "dinner out",
    "lunch out",
    "food delivery",
  ];
  return keywords.some((k) => lower.includes(k));
}

// 1. Spending Trend Line
export type TrendPoint = {
  label: string;
  currentAmount: number;
  previousAmount: number;
  dateStr: string;
};

export function getTrendData(
  transactions: Transaction[],
  categoryId: string | null,
  days: number,
  periodType: "daily" | "weekly" | "monthly"
): TrendPoint[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const points: TrendPoint[] = [];

  // Filter transactions by optional category and exclude deleted
  const filtered = transactions.filter(
    (t) =>
      !t.deletedAt &&
      (t.type === "expense" || t.type === "debt") &&
      (!categoryId || t.categoryId === categoryId)
  );

  if (periodType === "daily") {
    // Generate daily points for past `days` days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().slice(0, 10);
      
      const compDate = new Date(now.getTime() - (i + days) * 24 * 60 * 60 * 1000);
      const compDateStr = compDate.toISOString().slice(0, 10);

      const currentSum = filtered
        .filter((t) => t.spentAt.slice(0, 10) === dateStr)
        .reduce((sum, t) => sum + t.amount, 0);

      const previousSum = filtered
        .filter((t) => t.spentAt.slice(0, 10) === compDateStr)
        .reduce((sum, t) => sum + t.amount, 0);

      const dayLabel = date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      points.push({
        label: dayLabel,
        currentAmount: currentSum,
        previousAmount: previousSum,
        dateStr,
      });
    }
  } else if (periodType === "weekly") {
    // Weekly (past 8 weeks or custom weeks based on days)
    const numWeeks = Math.max(8, Math.ceil(days / 7));
    for (let i = numWeeks - 1; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i * 7 + 6) * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      
      const compWeekStart = new Date(now.getTime() - ((i + numWeeks) * 7 + 6) * 24 * 60 * 60 * 1000);
      const compWeekEnd = new Date(now.getTime() - (i + numWeeks) * 7 * 24 * 60 * 60 * 1000);

      const currentSum = filtered
        .filter((t) => {
          const tDate = new Date(t.spentAt);
          return tDate >= weekStart && tDate <= weekEnd;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const previousSum = filtered
        .filter((t) => {
          const tDate = new Date(t.spentAt);
          return tDate >= compWeekStart && tDate <= compWeekEnd;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const labelStr = `Wk -${i}`;
      points.push({
        label: i === 0 ? "This Week" : labelStr,
        currentAmount: currentSum,
        previousAmount: previousSum,
        dateStr: weekEnd.toISOString().slice(0, 10),
      });
    }
  } else if (periodType === "monthly") {
    // Monthly (past 6 months)
    for (let i = 5; i >= 0; i--) {
      const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = targetMonth.toISOString().slice(0, 7);

      const compMonth = new Date(now.getFullYear(), now.getMonth() - i - 6, 1);
      const compMonthStr = compMonth.toISOString().slice(0, 7);

      const currentSum = filtered
        .filter((t) => t.spentAt.slice(0, 7) === monthStr)
        .reduce((sum, t) => sum + t.amount, 0);

      const previousSum = filtered
        .filter((t) => t.spentAt.slice(0, 7) === compMonthStr)
        .reduce((sum, t) => sum + t.amount, 0);

      const labelStr = targetMonth.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      points.push({
        label: labelStr,
        currentAmount: currentSum,
        previousAmount: previousSum,
        dateStr: monthStr,
      });
    }
  }

  return points;
}

// 2. Category Breakdown
export type CategoryBreakdownItem = {
  category: Category;
  amount: number;
  percentage: number;
};

export function getCategoryBreakdown(
  transactions: Transaction[],
  categories: Category[],
  monthStr: string // YYYY-MM
): CategoryBreakdownItem[] {
  const monthTxs = transactions.filter(
    (t) =>
      !t.deletedAt &&
      (t.type === "expense" || t.type === "debt") &&
      t.spentAt.slice(0, 7) === monthStr
  );

  const total = monthTxs.reduce((sum, t) => sum + t.amount, 0);
  if (total === 0) return [];

  const parentCategories = categories.filter((c) => !c.parentId);

  const items = parentCategories.map((parent) => {
    const subcategoryIds = categories.filter((c) => c.parentId === parent.id).map((c) => c.id);
    const amount = monthTxs
      .filter((t) => t.categoryId === parent.id || subcategoryIds.includes(t.categoryId))
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      category: parent,
      amount,
      percentage: Number(((amount / total) * 100).toFixed(1)),
    };
  });

  return items.filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
}

// 3. Calendar Heatmap
export type HeatmapPoint = {
  dateStr: string;
  dayNum: number;
  amount: number;
  intensity: number; // 0 to 4
};

export function getCalendarHeatmap(transactions: Transaction[], year: number, month: number): HeatmapPoint[] {
  const points: HeatmapPoint[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const monthTxs = transactions.filter(
    (t) =>
      !t.deletedAt &&
      (t.type === "expense" || t.type === "debt") &&
      t.spentAt.slice(0, 7) === monthStr
  );

  // Group by day
  const dailyTotals: Record<number, number> = {};
  for (const t of monthTxs) {
    const day = new Date(t.spentAt).getDate();
    dailyTotals[day] = (dailyTotals[day] || 0) + t.amount;
  }

  // Find max daily spend to scale intensities
  const maxSpend = Math.max(...Object.values(dailyTotals), 1);

  for (let d = 1; d <= daysInMonth; d++) {
    const amount = dailyTotals[d] || 0;
    const dateStr = `${monthStr}-${String(d).padStart(2, "0")}`;
    
    let intensity = 0;
    if (amount > 0) {
      const ratio = amount / maxSpend;
      if (ratio < 0.25) intensity = 1;
      else if (ratio < 0.5) intensity = 2;
      else if (ratio < 0.75) intensity = 3;
      else intensity = 4;
    }

    points.push({
      dateStr,
      dayNum: d,
      amount,
      intensity,
    });
  }

  return points;
}

// 4. Day-of-Week Pattern
export type WeekdayPoint = {
  dayLabel: string; // "Mon", "Tue" etc.
  totalAmount: number;
  averageAmount: number;
};

export function getDayOfWeekPattern(transactions: Transaction[]): WeekdayPoint[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const counts: Record<number, Set<string>> = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set(), 6: new Set() };
  const sums: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  const validTxs = transactions.filter(
    (t) => !t.deletedAt && (t.type === "expense" || t.type === "debt")
  );

  for (const t of validTxs) {
    const d = new Date(t.spentAt);
    const dayOfWeek = d.getDay();
    const dateStr = t.spentAt.slice(0, 10);

    counts[dayOfWeek].add(dateStr);
    sums[dayOfWeek] += t.amount;
  }

  return days.map((label, idx) => {
    const numDaysWithSpend = counts[idx].size || 1;
    return {
      dayLabel: label,
      totalAmount: sums[idx],
      averageAmount: Number((sums[idx] / numDaysWithSpend).toFixed(2)),
    };
  });
}

// 5. Mess vs Outside Food Ratio
export type MessRatioData = {
  messSpend: number;
  outsideSpend: number;
  ratioPercent: number; // outside as % of total
};

export function getMessVsOutsideFoodRatio(transactions: Transaction[], monthStr: string): MessRatioData {
  const monthTxs = transactions.filter(
    (t) =>
      !t.deletedAt &&
      (t.type === "expense" || t.type === "debt") &&
      t.spentAt.slice(0, 7) === monthStr
  );

  let messSpend = 0;
  let outsideSpend = 0;

  for (const t of monthTxs) {
    const isMessCategory = t.categoryId === "mess-canteen";
    const isOutside = isOutsideEating(t.note);

    if (isOutside) {
      outsideSpend += t.amount;
    } else if (isMessCategory) {
      messSpend += t.amount;
    }
  }

  const total = messSpend + outsideSpend;
  const ratioPercent = total > 0 ? Number(((outsideSpend / total) * 100).toFixed(1)) : 0;

  return {
    messSpend,
    outsideSpend,
    ratioPercent,
  };
}

// 6. Top Merchants / Notes
export type NoteRanking = {
  note: string;
  count: number;
  totalAmount: number;
};

export function getTopMerchants(transactions: Transaction[], limit = 5): NoteRanking[] {
  const noteGroups: Record<string, { count: number; total: number }> = {};

  const validTxs = transactions.filter(
    (t) => !t.deletedAt && (t.type === "expense" || t.type === "debt") && t.note
  );

  for (const t of validTxs) {
    let cleanNote = t.note!.trim();
    // Strip common splits prefixes
    cleanNote = cleanNote
      .replace(/^\[Shared\]\s*/i, "")
      .replace(/^\[Split\]\s*/i, "")
      .replace(/\s*\(Payer:.*?\)$/i, "")
      .trim();

    if (!cleanNote) continue;

    const key = cleanNote.toLowerCase();
    const existing = noteGroups[key] || { count: 0, total: 0 };
    noteGroups[key] = {
      count: existing.count + 1,
      total: existing.total + t.amount,
    };
  }

  // Map to array and resolve proper casing from first occurrence or capitalizing
  const list = Object.entries(noteGroups).map(([key, stats]) => {
    // Find original casing
    const original = validTxs.find((t) => {
      const clean = t.note!.trim()
        .replace(/^\[Shared\]\s*/i, "")
        .replace(/^\[Split\]\s*/i, "")
        .replace(/\s*\(Payer:.*?\)$/i, "")
        .trim();
      return clean.toLowerCase() === key;
    });

    const properNoteName = original
      ? original.note!.trim()
          .replace(/^\[Shared\]\s*/i, "")
          .replace(/^\[Split\]\s*/i, "")
          .replace(/\s*\(Payer:.*?\)$/i, "")
          .trim()
      : key.charAt(0).toUpperCase() + key.slice(1);

    return {
      note: properNoteName,
      count: stats.count,
      totalAmount: stats.total,
    };
  });

  return list.sort((a, b) => b.totalAmount - a.totalAmount).slice(0, limit);
}

// 7. Semester-over-Semester
export type SemesterComparison = {
  currentTotal: number;
  previousTotal: number;
  percentChange: number;
  hasPrevious: boolean;
};

export function getSemesterComparison(
  transactions: Transaction[],
  allowanceConfig: AllowanceConfig | undefined
): SemesterComparison | null {
  if (!allowanceConfig || allowanceConfig.cycleType !== "semester") return null;

  const currentStart = new Date(allowanceConfig.cycleStart);
  currentStart.setHours(0, 0, 0, 0);

  const now = new Date();
  const currentTotal = transactions
    .filter((t) => {
      if (t.deletedAt || (t.type !== "expense" && t.type !== "debt")) return false;
      const tDate = new Date(t.spentAt);
      return tDate >= currentStart && tDate <= now;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const prevStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 5, currentStart.getDate());
  prevStart.setHours(0, 0, 0, 0);
  const prevEnd = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);

  const previousTotal = transactions
    .filter((t) => {
      if (t.deletedAt || (t.type !== "expense" && t.type !== "debt")) return false;
      const tDate = new Date(t.spentAt);
      return tDate >= prevStart && tDate <= prevEnd;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const percentChange = previousTotal > 0 ? Number((((currentTotal - previousTotal) / previousTotal) * 100).toFixed(1)) : 0;

  return {
    currentTotal,
    previousTotal,
    percentChange,
    hasPrevious: previousTotal > 0,
  };
}

// 8. Cumulative Budget vs Actual Overlay
export type CumulativePoint = {
  dayLabel: string;
  actualSpent: number;
  limitLine: number;
};

export function getBudgetActualCumulative(
  transactions: Transaction[],
  budget: Budget,
  allCategories: Category[]
): CumulativePoint[] {
  const start = new Date(budget.periodStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(budget.periodEnd);
  end.setHours(0, 0, 0, 0);

  const subcategoryIds = allCategories
    .filter((c) => budget.categoryIds.includes(c.parentId || ""))
    .map((c) => c.id);

  const budgetTxs = transactions.filter((t) => {
    if (t.deletedAt || (t.type !== "expense" && t.type !== "debt")) return false;
    
    const tDate = new Date(t.spentAt);
    tDate.setHours(0, 0, 0, 0);
    const inPeriod = tDate >= start && tDate <= end;
    if (!inPeriod) return false;

    if (budget.categoryIds.length === 0) return true;
    return budget.categoryIds.includes(t.categoryId) || subcategoryIds.includes(t.categoryId);
  });

  const points: CumulativePoint[] = [];
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  let cumulativeSum = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let d = 0; d < totalDays; d++) {
    const currentDate = new Date(start.getTime() + d * 24 * 60 * 60 * 1000);
    const currentDateStr = currentDate.toISOString().slice(0, 10);

    if (currentDate.getTime() > today.getTime()) {
      points.push({
        dayLabel: `Day ${d + 1}`,
        actualSpent: cumulativeSum,
        limitLine: budget.limitAmount,
      });
      continue;
    }

    const daySum = budgetTxs
      .filter((t) => t.spentAt.slice(0, 10) === currentDateStr)
      .reduce((sum, t) => sum + t.amount, 0);

    cumulativeSum += daySum;

    points.push({
      dayLabel: `Day ${d + 1}`,
      actualSpent: cumulativeSum,
      limitLine: budget.limitAmount,
    });
  }

  return points;
}

// 9. Split/Settle Summary Over Time
export type SplitTrendPoint = {
  label: string;
  owedToYou: number;
  youOwe: number;
};

export function getSplitHistoryTrend(splits: any[], userId: string, weeks = 8): SplitTrendPoint[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const points: SplitTrendPoint[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().slice(0, 10);

    let owedToYou = 0;
    let youOwe = 0;

    for (const split of splits) {
      const splitDate = new Date(split.createdAt);
      if (splitDate > date) continue;

      if (split.status === "settled") {
        const settledDate = new Date(split.updatedAt);
        if (settledDate <= date) continue; 
      }

      if (split.status === "disputed") continue;

      const amount = Number(split.amount);
      if (split.requesterId === userId) {
        owedToYou += amount;
      } else if (split.recipientId === userId) {
        youOwe += amount;
      }
    }

    points.push({
      label: i === 0 ? "Now" : `Wk -${i}`,
      owedToYou,
      youOwe,
    });
  }

  return points;
}

// 10. Forecast Month-End
export type ForecastResult = {
  currentSpend: number;
  projectedSpend: number;
  percentOfBudget: number;
  daysRemaining: number;
};

export function getForecast(transactions: Transaction[], totalLimit = 0): ForecastResult {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentMonthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const monthTxs = transactions.filter(
    (t) =>
      !t.deletedAt &&
      (t.type === "expense" || t.type === "debt") &&
      t.spentAt.slice(0, 7) === currentMonthStr
  );

  const currentSpend = monthTxs.reduce((sum, t) => sum + t.amount, 0);
  const daysElapsed = Math.max(1, day);

  const dailyAverage = currentSpend / daysElapsed;
  const projectedSpend = Number((dailyAverage * daysInMonth).toFixed(2));
  
  const percentOfBudget = totalLimit > 0 ? Number(((projectedSpend / totalLimit) * 100).toFixed(1)) : 0;
  const daysRemaining = daysInMonth - daysElapsed;

  return {
    currentSpend,
    projectedSpend,
    percentOfBudget,
    daysRemaining,
  };
}
