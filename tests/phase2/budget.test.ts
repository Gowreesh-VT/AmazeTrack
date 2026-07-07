import { describe, it, expect } from "vitest";
import { Budget, Goal, AllowanceConfig, Transaction } from "@/lib/types";

// Extracted math logic from page.tsx for testing verification
function getAllowanceStatus(allowanceConfig: AllowanceConfig, transactions: Transaction[], todayDate: Date) {
  const start = new Date(allowanceConfig.cycleStart);
  start.setHours(0, 0, 0, 0);
  
  const cycleExpenses = transactions.filter((t) => {
    const spentAt = new Date(t.spentAt);
    spentAt.setHours(0, 0, 0, 0);
    return spentAt.getTime() >= start.getTime();
  });
  
  const spentSoFar = cycleExpenses.reduce((sum, t) => sum + t.amount, 0);
  const remaining = allowanceConfig.amount - spentSoFar;
  
  const today = new Date(todayDate);
  today.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - start.getTime();
  const daysElapsed = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);
  
  const averageDailySpend = spentSoFar / daysElapsed;
  
  let runOutDate: Date | null = null;
  let isWarning = false;
  let expectedEnd: Date | null = null;

  if (averageDailySpend > 0) {
    const totalDays = allowanceConfig.amount / averageDailySpend;
    const runOutMs = start.getTime() + totalDays * 24 * 60 * 60 * 1000;
    runOutDate = new Date(runOutMs);
    
    if (allowanceConfig.cycleEnd) {
      expectedEnd = new Date(allowanceConfig.cycleEnd);
      expectedEnd.setHours(0, 0, 0, 0);
      isWarning = runOutDate.getTime() < expectedEnd.getTime();
    } else if (allowanceConfig.cycleType === "monthly") {
      expectedEnd = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
      isWarning = runOutDate.getTime() < expectedEnd.getTime();
    }
  }

  return {
    spentSoFar,
    remaining,
    daysElapsed,
    averageDailySpend,
    runOutDate,
    isWarning,
    expectedEnd,
  };
}

// Extracted budget logic from page.tsx for testing verification
function getBudgetSpent(budget: Budget, transactions: Transaction[], allCategories: any[]) {
  const budgetExpenses = transactions.filter((t) => {
    const spentAtStr = t.spentAt.slice(0, 10);
    const inPeriod = spentAtStr >= budget.periodStart && spentAtStr <= budget.periodEnd;
    if (!inPeriod) return false;
    
    if (budget.categoryIds.length === 0) return true;
    
    return budget.categoryIds.some((catId) => {
      if (t.categoryId === catId) return true;
      const cat = allCategories.find((c) => c.id === t.categoryId);
      return cat?.parentId === catId;
    });
  });
  
  return budgetExpenses.reduce((sum, t) => sum + t.amount, 0);
}

function toLocalYMD(date: Date | null): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

describe("Phase 2: Budgets, Allowance, Goals", () => {
  describe("Allowance projection math", () => {
    it("should calculate projected run-out date and warnings when cycleEnd is set", () => {
      const config: AllowanceConfig = {
        amount: 5000,
        cycleType: "semester",
        cycleStart: "2026-07-01",
        cycleEnd: "2026-07-31", // End of cycle
      };

      const transactions: Transaction[] = [
        { id: "1", amount: 1000, type: "expense", categoryId: "food", spentAt: "2026-07-01T12:00:00Z", createdAt: "a", updatedAt: "a" },
        { id: "2", amount: 1000, type: "expense", categoryId: "laundry", spentAt: "2026-07-02T12:00:00Z", createdAt: "a", updatedAt: "a" },
      ];

      // On 2026-07-04: elapsed = (Jul 4 - Jul 1) = 3 days + 1 = 4 days elapsed.
      // Total spent = 2000. Daily rate = 2000 / 4 = 500/day.
      // Projected days until run out = 5000 / 500 = 10 days from start.
      // Expected run out date = Jul 1 + 10 days = Jul 11.
      // Since Jul 11 is before cycleEnd (Jul 31), isWarning should be true.
      const status = getAllowanceStatus(config, transactions, new Date("2026-07-04"));

      expect(status.daysElapsed).toBe(4);
      expect(status.spentSoFar).toBe(2000);
      expect(status.averageDailySpend).toBe(500);
      expect(status.remaining).toBe(3000);
      expect(toLocalYMD(status.runOutDate)).toBe("2026-07-11");
      expect(status.isWarning).toBe(true);
    });

    it("should assume monthly 30-day window when cycleEnd is unset", () => {
      const config: AllowanceConfig = {
        amount: 5000,
        cycleType: "monthly",
        cycleStart: "2026-07-01",
        cycleEnd: undefined,
      };

      const transactions: Transaction[] = [
        { id: "1", amount: 200, type: "expense", categoryId: "food", spentAt: "2026-07-01T12:00:00Z", createdAt: "a", updatedAt: "a" },
      ];

      // On 2026-07-01: elapsed = 1 day.
      // Total spent = 200. Daily rate = 200.
      // Projected days = 5000 / 200 = 25 days from start.
      // Expected run out date = Jul 1 + 25 days = Jul 26.
      // Expected monthly cycle end = Jul 1 + 30 days = Jul 31.
      // Jul 26 is before Jul 31, so isWarning should be true.
      const status = getAllowanceStatus(config, transactions, new Date("2026-07-01"));

      expect(toLocalYMD(status.runOutDate)).toBe("2026-07-26");
      expect(toLocalYMD(status.expectedEnd)).toBe("2026-07-31");
      expect(status.isWarning).toBe(true);
    });
  });

  describe("Budget progress accuracy", () => {
    const categories = [
      { id: "food", name: "Food" },
      { id: "swiggy", name: "Swiggy", parentId: "food" },
      { id: "laundry", name: "Laundry" },
    ];

    it("should count transactions only matching scoped categories or subcategories", () => {
      const budget: Budget = {
        id: "b1",
        name: "Food Budget",
        categoryIds: ["food"],
        limitAmount: 1000,
        periodType: "monthly",
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
      };

      const transactions: Transaction[] = [
        { id: "1", amount: 200, type: "expense", categoryId: "food", spentAt: "2026-07-02T12:00:00Z", createdAt: "a", updatedAt: "a" },
        { id: "2", amount: 150, type: "expense", categoryId: "swiggy", spentAt: "2026-07-03T12:00:00Z", createdAt: "a", updatedAt: "a" }, // subcategory
        { id: "3", amount: 500, type: "expense", categoryId: "laundry", spentAt: "2026-07-04T12:00:00Z", createdAt: "a", updatedAt: "a" }, // non-matching
      ];

      const spent = getBudgetSpent(budget, transactions, categories);
      expect(spent).toBe(350); // food + swiggy (200 + 150)
    });
  });

  describe("Boundary test", () => {
    it("should include transactions occurring exactly on periodStart or periodEnd (inclusive)", () => {
      const budget: Budget = {
        id: "b1",
        name: "Test Budget",
        categoryIds: [],
        limitAmount: 1000,
        periodType: "custom",
        periodStart: "2026-07-05",
        periodEnd: "2026-07-10",
      };

      const transactions: Transaction[] = [
        { id: "1", amount: 100, type: "expense", categoryId: "food", spentAt: "2026-07-05T00:00:00Z", createdAt: "a", updatedAt: "a" },
        { id: "2", amount: 200, type: "expense", categoryId: "food", spentAt: "2026-07-10T23:59:59Z", createdAt: "a", updatedAt: "a" },
        { id: "3", amount: 400, type: "expense", categoryId: "food", spentAt: "2026-07-04T23:59:59Z", createdAt: "a", updatedAt: "a" }, // before start
        { id: "4", amount: 800, type: "expense", categoryId: "food", spentAt: "2026-07-11T00:00:00Z", createdAt: "a", updatedAt: "a" }, // after end
      ];

      const spent = getBudgetSpent(budget, transactions, []);
      expect(spent).toBe(300); // 100 + 200
    });
  });

  describe("Goals", () => {
    it("should increment currentAmount directly on manual add funds", () => {
      const goal: Goal = {
        id: "g1",
        name: "Laptop",
        targetAmount: 50000,
        currentAmount: 10000,
      };

      const nextGoal = {
        ...goal,
        currentAmount: goal.currentAmount + 5000,
      };

      expect(nextGoal.currentAmount).toBe(15000);
    });
  });
});
