import { describe, it, expect, vi } from "vitest";
import { isOutsideEating, getMessVsOutsideFoodRatio } from "@/lib/analytics";
import { DriveData, Transaction } from "@/lib/types";
import { POST as updateBenchmarks } from "@/app/api/benchmarks/update/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/apiAuth", () => ({
  requireUserId: vi.fn(() => "user-1"),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    categoryAggregate: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn((promises) => Promise.all(promises)),
  },
}));


// Extracted benchmark update builder logic from page.tsx to test correctness of deltas
function buildBenchmarkUpdates(
  nextData: DriveData,
  isOptedIn: boolean,
  currentMonth: string,
  parentCategories: any[]
): { updates: any[]; nextContribution: any } {
  if (!isOptedIn) {
    if (nextData.lastAggregateContribution) {
      const updates: any[] = [];
      const month = nextData.lastAggregateContribution.periodStart;
      for (const [catId, amount] of Object.entries(nextData.lastAggregateContribution.byCategory)) {
        if (amount > 0) {
          updates.push({
            categoryId: catId,
            deltaAmount: -amount,
            deltaUserCount: -1,
          });
        }
      }
      return { updates, nextContribution: null };
    }
    return { updates: [], nextContribution: null };
  }

  const monthlyTransactions = (nextData.transactions ?? []).filter((t) => {
    return !t.deletedAt && 
           (t.type === "expense" || t.type === "debt") && 
           t.spentAt.slice(0, 7) === currentMonth;
  });

  const actualByCategory: Record<string, number> = {};
  for (const t of monthlyTransactions) {
    actualByCategory[t.categoryId] = (actualByCategory[t.categoryId] || 0) + t.amount;
  }

  const lastContrib = nextData.lastAggregateContribution || { periodStart: currentMonth, byCategory: {} };
  const updates: any[] = [];

  if (lastContrib.periodStart !== currentMonth) {
    // Subtract previous month contributions
    const oldUpdates: any[] = [];
    for (const [catId, amount] of Object.entries(lastContrib.byCategory)) {
      if (amount > 0) {
        oldUpdates.push({
          categoryId: catId,
          deltaAmount: -amount,
          deltaUserCount: -1,
        });
      }
    }
    
    // Add current month contributions
    for (const catId of parentCategories.map((c) => c.id)) {
      const actual = actualByCategory[catId] || 0;
      if (actual > 0) {
        updates.push({
          categoryId: catId,
          deltaAmount: actual,
          deltaUserCount: 1,
        });
      }
    }
  } else {
    // Same month: compare actual spent vs. last contribution
    const allCategoryIds = new Set([
      ...parentCategories.map((c) => c.id),
      ...Object.keys(lastContrib.byCategory),
      ...Object.keys(actualByCategory)
    ]);

    for (const catId of allCategoryIds) {
      const last = lastContrib.byCategory[catId] || 0;
      const actual = actualByCategory[catId] || 0;
      const deltaAmount = actual - last;
      
      let deltaUserCount = 0;
      if (last === 0 && actual > 0) {
        deltaUserCount = 1;
      } else if (last > 0 && actual === 0) {
        deltaUserCount = -1;
      }

      if (deltaAmount !== 0 || deltaUserCount !== 0) {
        updates.push({
          categoryId: catId,
          deltaAmount,
          deltaUserCount,
        });
      }
    }
  }

  return {
    updates,
    nextContribution: {
      periodStart: currentMonth,
      byCategory: actualByCategory,
    },
  };
}

// Extracted UI suppression calculation logic from page.tsx to verify the participation floor
function getBenchmarkList(benchmarkData: any[], localSpend: Record<string, number>, parentCategories: any[], minUserFloor = 5) {
  return parentCategories.map((cat) => {
    const aggregate = benchmarkData.find((a) => a.categoryId === cat.id);
    const userSpend = localSpend[cat.id] || 0;
    
    if (!aggregate || aggregate.userCount < minUserFloor) {
      return { cat, userSpend, average: 0, userCount: aggregate?.userCount || 0, isBelowThreshold: true };
    }

    const average = Number(aggregate.totalAmount) / aggregate.userCount;
    return {
      cat,
      userSpend,
      average,
      userCount: aggregate.userCount,
      isBelowThreshold: false,
    };
  });
}

describe("Phase 4: Benchmarks & Food Classification", () => {
  const parentCategories = [
    { id: "mess-canteen", name: "Mess/Canteen" },
    { id: "auto-ola", name: "Auto/Ola" },
    { id: "laundry", name: "Laundry" },
  ];

  describe("Aggregate delta arithmetic", () => {
    it("should compute correct delta amount when transaction amount is updated", () => {
      const baseData: DriveData = {
        version: 1,
        userId: "user-1",
        categories: [],
        transactions: [
          { id: "t1", amount: 150, type: "expense", categoryId: "laundry", spentAt: "2026-07-01T12:00:00Z", createdAt: "a", updatedAt: "a" }
        ],
        budgets: [],
        goals: [],
        subscriptions: [],
        lastAggregateContribution: {
          periodStart: "2026-07",
          byCategory: { laundry: 100 }, // previous contribution was 100
        },
        updatedAt: "a",
      };

      const result = buildBenchmarkUpdates(baseData, true, "2026-07", parentCategories);

      expect(result.updates).toContainEqual({
        categoryId: "laundry",
        deltaAmount: 50, // 150 - 100 = 50
        deltaUserCount: 0, // already counted
      });
      expect(result.nextContribution.byCategory.laundry).toBe(150);
    });
  });

  describe("Opt-out cleanup", () => {
    it("should subtract entire user contribution and decrement userCount on opt-out", () => {
      const baseData: DriveData = {
        version: 1,
        userId: "user-1",
        categories: [],
        transactions: [],
        budgets: [],
        goals: [],
        subscriptions: [],
        lastAggregateContribution: {
          periodStart: "2026-07",
          byCategory: { laundry: 120, "mess-canteen": 400 },
        },
        updatedAt: "a",
      };

      const result = buildBenchmarkUpdates(baseData, false, "2026-07", parentCategories);

      expect(result.updates).toContainEqual({ categoryId: "laundry", deltaAmount: -120, deltaUserCount: -1 });
      expect(result.updates).toContainEqual({ categoryId: "mess-canteen", deltaAmount: -400, deltaUserCount: -1 });
      expect(result.nextContribution).toBeNull();
    });

    it("should not double-subtract if triggered more than once", () => {
      const dataWithNoContribution: DriveData = {
        version: 1,
        userId: "user-1",
        categories: [],
        transactions: [],
        budgets: [],
        goals: [],
        subscriptions: [],
        lastAggregateContribution: null, // already opted out/cleaned up
        updatedAt: "a",
      };

      const result = buildBenchmarkUpdates(dataWithNoContribution, false, "2026-07", parentCategories);
      expect(result.updates).toHaveLength(0);
    });
  });

  describe("Zero-to-nonzero transition", () => {
    it("should increment userCount on the exact transition from 0 to >0 spend", () => {
      const baseData: DriveData = {
        version: 1,
        userId: "user-1",
        categories: [],
        transactions: [
          { id: "t1", amount: 80, type: "expense", categoryId: "auto-ola", spentAt: "2026-07-02T12:00:00Z", createdAt: "a", updatedAt: "a" }
        ],
        budgets: [],
        goals: [],
        subscriptions: [],
        lastAggregateContribution: {
          periodStart: "2026-07",
          byCategory: {}, // no previous spend in auto-ola
        },
        updatedAt: "a",
      };

      const result = buildBenchmarkUpdates(baseData, true, "2026-07", parentCategories);

      expect(result.updates).toContainEqual({
        categoryId: "auto-ola",
        deltaAmount: 80,
        deltaUserCount: 1, // transitioned from 0 to 80
      });
    });
  });

  describe("Participation floor suppression", () => {
    it("should hide benchmark comparison when userCount is below 5", () => {
      const benchmarkData = [
        { categoryId: "mess-canteen", totalAmount: 4000, userCount: 4 }, // under floor (5)
        { categoryId: "auto-ola", totalAmount: 3000, userCount: 6 }, // above floor
      ];

      const localSpend = { "mess-canteen": 500, "auto-ola": 200 };

      const comparison = getBenchmarkList(benchmarkData, localSpend, parentCategories, 5);

      const mess = comparison.find(c => c.cat.id === "mess-canteen");
      expect(mess?.isBelowThreshold).toBe(true);
      expect(mess?.average).toBe(0);

      const auto = comparison.find(c => c.cat.id === "auto-ola");
      expect(auto?.isBelowThreshold).toBe(false);
      expect(auto?.average).toBe(500); // 3000 / 6 = 500
    });
  });

  describe("Mess vs Outside Food Classification", () => {
    it("should classify keywords correctly", () => {
      expect(isOutsideEating("Swiggy delivery")).toBe(true);
      expect(isOutsideEating("Zomato dinner")).toBe(true);
      expect(isOutsideEating("Regular mess food")).toBe(false);
      expect(isOutsideEating("Dominos pizza")).toBe(true);
    });

    it("should resolve ambiguous notes (mess + swiggy) as outside eating due to precedence", () => {
      const txs: Transaction[] = [
        { id: "1", amount: 200, type: "expense", categoryId: "mess-canteen", spentAt: "2026-07-01T12:00:00Z", createdAt: "a", updatedAt: "a", note: "Mess Swiggy" }
      ];

      const ratio = getMessVsOutsideFoodRatio(txs, "2026-07");
      
      // Since note matches outside eating keyword "swiggy", it is categorized as outsideSpend
      expect(ratio.outsideSpend).toBe(200);
      expect(ratio.messSpend).toBe(0);
      expect(ratio.ratioPercent).toBe(100);
    });
  });

  describe("Benchmarks update opt-in verification", () => {
    it("should reject benchmark updates if user is not opted-in", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({ id: "user-1", benchmarkOptIn: false } as any);

      const req = new Request("http://localhost/api/benchmarks/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: "2026-07",
          updates: [{ categoryId: "laundry", deltaAmount: 10, deltaUserCount: 1 }],
        }),
      });

      const res = await updateBenchmarks(req);
      expect(res.status).toBe(403);
      const payload = await res.json();
      expect(payload.error).toContain("Please opt-in to benchmarking first");
    });

    it("should allow benchmark updates if user is opted-in", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({ id: "user-1", benchmarkOptIn: true } as any);
      vi.spyOn(prisma.categoryAggregate, "upsert").mockResolvedValue({} as any);

      const req = new Request("http://localhost/api/benchmarks/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: "2026-07",
          updates: [{ categoryId: "laundry", deltaAmount: 10, deltaUserCount: 1 }],
        }),
      });

      const res = await updateBenchmarks(req);
      expect(res.status).toBe(200);
      const payload = await res.json();
      expect(payload.ok).toBe(true);
    });
  });
});
