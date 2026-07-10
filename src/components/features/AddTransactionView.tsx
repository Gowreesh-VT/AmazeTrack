"use client";

import React, { useEffect, useState } from 'react';
import { Edit2, Plus, Check, X, Calendar, Wallet, Tag, Info, AlertTriangle } from 'lucide-react';
import { useAppContext } from '@/lib/AppContext';

export function AddTransactionView() {
  const {
    form, setForm, editing, parentCategories, allCategories,
    submitTransaction, deleteTransaction, setIsAddExpenseOpen
  } = useAppContext();

  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    // Trigger mounting animation
    const timer = setTimeout(() => setIsRendered(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsRendered(false);
    setTimeout(() => setIsAddExpenseOpen(false), 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitTransaction(e);
    handleClose();
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      await deleteTransaction(editing);
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Animated Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300 ease-in-out cursor-pointer ${isRendered ? 'opacity-100' : 'opacity-0'}`} 
        onClick={handleClose}
      />

      {/* Animated Modal Card (Receipt Styling) */}
      <div 
        className={`relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-white/[0.08] bg-[#ffffff] dark:bg-[#121420] p-7 flex flex-col gap-5 shadow-2xl z-10 transition-all duration-300 ease-out transform ${isRendered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'} max-h-[90vh] overflow-y-auto custom-scrollbar`}
      >
        {/* Receipt Perforated Saw-tooth Edge Top decoration */}
        <div className="absolute top-0 left-0 right-0 h-3 flex overflow-hidden opacity-60 pointer-events-none z-20">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="w-3.5 h-3.5 bg-zinc-950 rounded-full -mt-2 flex-shrink-0" style={{ marginRight: '-1px' }} />
          ))}
        </div>

        {/* Top accent glow (Dark mode only) */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-b from-purple-600/15 to-transparent rounded-full blur-2xl pointer-events-none hidden dark:block" />

        {/* Header */}
        <div className="flex items-center justify-between relative z-10 pt-2.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
              {editing ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" strokeWidth={2.5} />}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white tracking-tight leading-tight">
                {editing ? "Transaction Details" : "New Transaction"}
              </h2>
              <p className="text-[9px] text-zinc-500 dark:text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                {editing ? "Receipt summary & management" : "Enter purchase values"}
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleClose}
            className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Decorative Dashed Separator */}
        <div className="border-t-2 border-dashed border-zinc-200 dark:border-white/[0.08] my-1" />

        <form className="flex flex-col gap-5 relative z-10" onSubmit={handleSubmit}>
          {/* Main Display Amount Section (Large and Centered like Receipt summary) */}
          <div className="flex flex-col items-center justify-center py-4 bg-zinc-50/50 dark:bg-white/[0.01] rounded-2xl border border-zinc-100 dark:border-white/[0.03]">
            <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Total Amount</span>
            <div className="relative flex items-center justify-center w-full max-w-[240px]">
              <span className={`text-2xl font-black mr-1 ${form.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                {form.type === "income" ? "+" : "-"}₹
              </span>
              <input
                className={`w-full bg-transparent text-center text-4xl font-black outline-none transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700 ${form.type === "income" ? "text-emerald-500" : "text-rose-500"}`}
                inputMode="decimal"
                min="1"
                required
                type="number"
                placeholder="0"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
              />
            </div>
          </div>

          {/* Toggle Type Selector */}
          <div className="flex bg-zinc-100 dark:bg-zinc-900/60 p-1.5 rounded-2xl border border-zinc-200 dark:border-white/[0.04]">
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${form.type !== "income" ? "bg-white dark:bg-white/[0.08] text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"}`}
              onClick={() => setForm({ ...form, type: "expense" })}
            >
              Expense
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${form.type === "income" ? "bg-white dark:bg-white/[0.08] text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"}`}
              onClick={() => setForm({ ...form, type: "income", isAmortized: false })}
            >
              Income
            </button>
          </div>

          {/* Metadata Rows (Aligned matching details image) */}
          <div className="space-y-4">
            {/* Category selection Row */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-zinc-500" /> Category
              </span>
              <div className="relative min-w-[160px] max-w-[200px]">
                <select
                  className="h-10 w-full rounded-xl border border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.03] pl-3 pr-8 font-bold text-zinc-800 dark:text-white outline-none focus:ring-1 focus:ring-purple-500/50 transition-all appearance-none cursor-pointer text-xs"
                  required
                  value={form.categoryId}
                  onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                >
                  <option value="" disabled>Select category</option>
                  {parentCategories.map((parent: any) => {
                    const subs = allCategories.filter((c: any) => c.parentId === parent.id);
                    return (
                      <optgroup key={parent.id} label={parent.name} className="bg-white dark:bg-[#121422] text-zinc-900 dark:text-white font-bold text-xs">
                        <option value={parent.id}>{parent.name} (General)</option>
                        {subs.map((sub: any) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 dark:text-zinc-500">
                  <svg width="10" height="6" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Date selection Row */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" /> Date
              </span>
              <input
                className="h-10 w-[160px] rounded-xl border border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.03] px-3 font-bold text-zinc-800 dark:text-white outline-none focus:ring-1 focus:ring-purple-500/50 transition-all cursor-pointer [color-scheme:light] dark:[color-scheme:dark] text-xs text-right"
                required
                type="date"
                value={form.spentAt}
                onChange={(event) => setForm({ ...form, spentAt: event.target.value })}
              />
            </div>

            {/* Note input Row */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-zinc-500" /> Description
              </span>
              <input
                className="h-10 w-[160px] rounded-xl border border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.03] px-3 font-bold text-zinc-800 dark:text-white outline-none focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-700 text-xs text-right"
                maxLength={160}
                placeholder="Required memo..."
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
              />
            </div>
          </div>

          {/* Decorative Dashed Separator */}
          <div className="border-t-2 border-dashed border-zinc-200 dark:border-white/[0.08] my-1" />

          {form.type !== "income" && (
            <>
              {/* Amortization (Spread Expense) Toggle */}
              <div className="flex items-center justify-between bg-zinc-50/50 dark:bg-[#171927]/30 p-4 rounded-2xl border border-zinc-150 dark:border-white/[0.03]">
                <div>
                  <span className="font-bold text-zinc-800 dark:text-white text-xs">Spread Expense</span>
                  <p className="text-[9px] text-zinc-500 dark:text-zinc-500 mt-0.5">Distribute cost over multiple months</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.isAmortized || false}
                  onChange={(e) => setForm({ ...form, isAmortized: e.target.checked })}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer accent-purple-600"
                />
              </div>

              {form.isAmortized && (
                <div className="flex items-center justify-between gap-4 animate-scale-in">
                  <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider pl-1">Months</span>
                  <div className="relative w-[160px]">
                    <select
                      className="h-10 w-full rounded-xl border border-zinc-200 dark:border-white/[0.06] bg-zinc-50 dark:bg-white/[0.03] pl-3 pr-8 font-bold text-zinc-800 dark:text-white outline-none focus:ring-1 focus:ring-purple-500/50 transition-all appearance-none cursor-pointer text-xs"
                      value={form.amortizeMonths || "12"}
                      onChange={(e) => setForm({ ...form, amortizeMonths: e.target.value })}
                    >
                      <option value="2">2 Months</option>
                      <option value="3">3 Months</option>
                      <option value="4">4 Months</option>
                      <option value="6">6 Months</option>
                      <option value="12">12 Months (1 Year)</option>
                      <option value="24">24 Months (2 Years)</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 dark:text-zinc-500">
                      <svg width="10" height="6" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Submit & Cancel Actions */}
          <div className="flex flex-col gap-2.5 mt-2">
            <button 
              type="submit"
              className="w-full h-13 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold shadow-md shadow-purple-500/10 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 border-none cursor-pointer text-xs"
            >
              {editing ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" strokeWidth={2.5} />}
              {editing ? "Save Changes" : (form.type === "income" ? "Add Income" : "Add Expense")}
            </button>

            {editing && (
              <button
                type="button"
                onClick={handleDelete}
                className="w-full h-11 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 font-bold transition-all flex justify-center items-center gap-2 border border-red-500/10 hover:border-red-500/20 text-xs cursor-pointer"
              >
                Delete Transaction
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="w-full h-11 rounded-2xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 font-bold transition-all text-xs flex items-center justify-center gap-2 cursor-pointer border-none"
            >
              Close Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
