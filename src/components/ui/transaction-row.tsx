import React from 'react';
import { Edit2, Trash2, TrendingDown, TrendingUp, Plus, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { Transaction, Category } from '@/lib/types';

export function TransactionRow({
  transaction,
  category,
  onEdit,
  currencySymbol,
}: {
  transaction: Transaction;
  category?: Category | undefined;
  onEdit: () => void;
  currencySymbol: string;
}) {
  const color = category?.color ?? "#71717a";
  const initial = (category?.name ?? "?")[0].toUpperCase();
  const isIncome = transaction.type === "income";

  return (
    <div 
      className="group relative flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:bg-muted/50 transition-all duration-200 cursor-pointer hover:ring-2 hover:ring-primary/20"
      onClick={onEdit}
    >
      
      {/* Category icon */}
      <div
        className="h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm text-white select-none shadow-sm"
        style={{ backgroundColor: color }}
      >
        {initial}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground leading-tight">
          {transaction.note || category?.name || "Expense"}
        </p>
        <p className="text-[11px] font-medium text-muted-foreground mt-1 flex items-center gap-1.5">
          {new Date(transaction.spentAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
          <span className="opacity-50">•</span>
          {new Date(transaction.spentAt).toLocaleTimeString("en-IN", { hour: 'numeric', minute: '2-digit' })}
          {transaction.isAmortized && (
            <>
              <span className="opacity-50">•</span>
              <span className="text-[9px] font-bold text-purple-400">
                Spread
              </span>
            </>
          )}
        </p>
      </div>

      <div className="flex items-center gap-3 min-w-0 shrink justify-end">
        <div className="flex items-center gap-1 min-w-0">
          {isIncome ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          )}
          <p className={`text-sm font-semibold tracking-tight truncate ${isIncome ? "text-emerald-500" : "text-rose-500"}`}>
            {formatCurrency(
              transaction.isAmortized && transaction.amortizeMonths
                ? transaction.amount / transaction.amortizeMonths
                : transaction.amount,
              currencySymbol
            )}
          </p>
        </div>
      </div>
    </div>
  );
}


