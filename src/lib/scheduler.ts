import { DriveData, Transaction, RecurringTemplate, Subscription } from "./types";

// Helper to normalized date string: YYYY-MM-DD
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Find safe monthly occurrence (preserving month boundary)
function getMonthlyOccurrence(startDateStr: string, index: number): Date {
  const start = new Date(startDateStr);
  const year = start.getFullYear();
  const month = start.getMonth() + index;
  const day = start.getDate();

  const candidate = new Date(year, month, day);
  const expectedMonth = (start.getMonth() + index) % 12;
  const normalizedMonth = expectedMonth < 0 ? expectedMonth + 12 : expectedMonth;
  
  if (candidate.getMonth() !== normalizedMonth) {
    // Return last day of the target month
    return new Date(year, month + 1, 0);
  }
  return candidate;
}

// Find safe weekly occurrence
function getWeeklyOccurrence(startDateStr: string, index: number): Date {
  const start = new Date(startDateStr);
  return new Date(start.getTime() + index * 7 * 24 * 60 * 60 * 1000);
}

export function generateScheduledTransactions(driveData: DriveData): {
  updatedData: DriveData;
  generatedCount: number;
} {
  const timestamp = new Date().toISOString();
  const todayStr = toDateStr(new Date());
  const today = new Date(todayStr);

  const transactions = [...driveData.transactions];
  let generatedCount = 0;

  // 1. Process Repeating Transaction Templates (Part A)
  const templates = driveData.recurringTemplates ?? [];
  for (const template of templates) {
    if (!template.active) continue;

    const start = new Date(template.startDate);
    if (start > today) continue; // Future start date

    let index = 0;
    while (true) {
      let occurrenceDate: Date;
      if (template.frequency === "weekly") {
        occurrenceDate = getWeeklyOccurrence(template.startDate, index);
      } else {
        occurrenceDate = getMonthlyOccurrence(template.startDate, index);
      }

      if (occurrenceDate > today) break;

      const occDateStr = toDateStr(occurrenceDate);

      // Check if transaction with this recurringTemplateId and date already exists
      const exists = transactions.some(
        (t) =>
          !t.deletedAt &&
          t.recurringTemplateId === template.id &&
          t.spentAt.slice(0, 10) === occDateStr
      );

      if (!exists) {
        // Create new transaction
        const newTx: Transaction = {
          id: crypto.randomUUID(),
          amount: template.amount,
          type: "expense",
          categoryId: template.categoryId,
          note: template.note,
          spentAt: new Date(`${occDateStr}T12:00:00`).toISOString(),
          createdAt: timestamp,
          updatedAt: timestamp,
          recurringTemplateId: template.id,
        };
        transactions.push(newTx);
        generatedCount++;
      }

      index++;
      // Safety limit to prevent infinite loops (e.g. 5 years)
      if (index > 260) break;
    }
  }

  // 2. Process Subscriptions (Part B)
  // Check from 6 months ago (180 days) up to today
  const subs = driveData.subscriptions ?? [];
  const startCheckingFrom = new Date(today.getFullYear(), today.getMonth() - 6, 1);

  for (const sub of subs) {
    if (!sub.active) continue;

    // Iterate month-by-month in checking window
    let index = 0;
    while (true) {
      const monthDate = new Date(startCheckingFrom.getFullYear(), startCheckingFrom.getMonth() + index, 1);
      if (monthDate > today) break;

      // Calculate billing day for this target month
      const lastDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
      const actualBillingDay = Math.min(sub.billingDay, lastDayOfMonth);
      const billingDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), actualBillingDay);

      if (billingDate > today) {
        index++;
        continue;
      }

      const billingDateStr = toDateStr(billingDate);

      // Check if transaction exists
      const exists = transactions.some(
        (t) =>
          !t.deletedAt &&
          t.recurringTemplateId === sub.id &&
          t.spentAt.slice(0, 10) === billingDateStr
      );

      if (!exists) {
        const newTx: Transaction = {
          id: crypto.randomUUID(),
          amount: sub.amount,
          type: "expense", // OTT / mess advance are standard expense transactions
          categoryId: sub.categoryId,
          note: sub.name,
          spentAt: new Date(`${billingDateStr}T12:00:00`).toISOString(),
          createdAt: timestamp,
          updatedAt: timestamp,
          recurringTemplateId: sub.id,
        };
        transactions.push(newTx);
        generatedCount++;
      }

      index++;
      if (index > 24) break;
    }
  }

  return {
    updatedData: {
      ...driveData,
      transactions,
      updatedAt: timestamp,
    },
    generatedCount,
  };
}
