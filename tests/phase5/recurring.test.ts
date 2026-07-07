import { describe, it, expect } from "vitest";
import { generateScheduledTransactions } from "@/lib/scheduler";
import { DriveData, RecurringTemplate, Subscription, emptyDriveData } from "@/lib/types";

describe("Phase 5: Recurring Templates & Subscriptions", () => {
  it("should be idempotent and not generate duplicate transactions for the same occurrence", () => {
    const baseData = emptyDriveData("user-1");

    const template: RecurringTemplate = {
      id: "tmpl-1",
      amount: 400,
      categoryId: "mess-canteen",
      note: "Weekly Mess Advance",
      frequency: "weekly",
      startDate: "2026-06-01", // in past relative to current 2026-07 date
      active: true,
    };

    baseData.recurringTemplates = [template];

    // First generation run
    const run1 = generateScheduledTransactions(baseData);
    expect(run1.generatedCount).toBeGreaterThan(0);
    const count1 = run1.updatedData.transactions.length;

    // Second generation run
    const run2 = generateScheduledTransactions(run1.updatedData);
    expect(run2.generatedCount).toBe(0); // No new ones generated
    expect(run2.updatedData.transactions.length).toBe(count1); // Same count
  });

  it("should not generate transactions for deactivated templates, but preserve historical ones", () => {
    const baseData = emptyDriveData("user-1");

    const template: RecurringTemplate = {
      id: "tmpl-2",
      amount: 500,
      categoryId: "laundry",
      note: "Monthly Laundry",
      frequency: "monthly",
      startDate: "2026-06-01",
      active: false, // inactive!
    };

    baseData.recurringTemplates = [template];

    // Seed a historical transaction matching the template
    const historicTx = {
      id: "hist-1",
      amount: 500,
      type: "expense" as const,
      categoryId: "laundry",
      note: "Monthly Laundry",
      spentAt: "2026-06-01T12:00:00.000Z",
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z",
      recurringTemplateId: "tmpl-2",
    };

    baseData.transactions = [historicTx];

    const run = generateScheduledTransactions(baseData);
    
    // Should generate 0 new occurrences since active is false
    expect(run.generatedCount).toBe(0);
    // Should preserve the historic transaction
    expect(run.updatedData.transactions).toHaveLength(1);
    expect(run.updatedData.transactions[0].id).toBe("hist-1");
  });

  it("should handle active/inactive subscriptions month-by-month", () => {
    const baseData = emptyDriveData("user-1");

    const subscription: Subscription = {
      id: "sub-1",
      name: "Netflix",
      amount: 199,
      categoryId: "subscriptions",
      billingDay: 15,
      active: false, // deactivated!
    };

    baseData.subscriptions = [subscription];

    const run = generateScheduledTransactions(baseData);
    
    expect(run.generatedCount).toBe(0);
  });
});
