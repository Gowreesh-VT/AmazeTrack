import React from "react";
import { formatCurrency } from "@/lib/currency";

export function ExpenseHeatmap({ 
  transactions, 
  currencySymbol 
}: { 
  transactions: any[]; 
  currencySymbol: string;
}) {
  // We'll show the last 30 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split("T")[0];
  });

  // Calculate totals per day
  const dailyTotals = days.reduce((acc, dateStr) => {
    acc[dateStr] = 0;
    return acc;
  }, {} as Record<string, number>);

  transactions.forEach((tx) => {
    const dateStr = tx.spentAt.split("T")[0];
    if (dailyTotals[dateStr] !== undefined && tx.type === "expense") {
      dailyTotals[dateStr] += tx.amount;
    }
  });

  const maxDaily = Math.max(1, ...Object.values(dailyTotals));

  return (
    <div className="bg-white/40 dark:bg-zinc-900/40 p-5 rounded-3xl border border-border/80 shadow-xs mb-6">
      <h3 className="font-extrabold text-card-foreground text-sm mb-4">30-Day Expense Heatmap</h3>
      <div className="flex flex-wrap gap-1.5 justify-start">
        {days.map((dateStr) => {
          const total = dailyTotals[dateStr];
          const intensity = total / maxDaily; // 0 to 1
          
          let bgColor = "bg-zinc-100 dark:bg-zinc-800";
          if (intensity > 0) bgColor = "bg-purple-200 dark:bg-purple-900/40";
          if (intensity > 0.3) bgColor = "bg-purple-300 dark:bg-purple-800/60";
          if (intensity > 0.6) bgColor = "bg-purple-500 dark:bg-purple-600";
          if (intensity > 0.8) bgColor = "bg-purple-600 dark:bg-purple-500";

          return (
            <div 
              key={dateStr}
              title={`${dateStr}: ${formatCurrency(total, currencySymbol)}`}
              className={`w-4 h-4 sm:w-5 sm:h-5 rounded-sm ${bgColor} transition-colors hover:ring-2 hover:ring-purple-400 cursor-pointer`}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-zinc-500 justify-end">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-zinc-100 dark:bg-zinc-800" />
        <div className="w-3 h-3 rounded-sm bg-purple-300 dark:bg-purple-800/60" />
        <div className="w-3 h-3 rounded-sm bg-purple-600 dark:bg-purple-500" />
        <span>More</span>
      </div>
    </div>
  );
}
