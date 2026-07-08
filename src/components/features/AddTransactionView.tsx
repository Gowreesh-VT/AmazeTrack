import React, { useEffect, useState } from 'react';
import { Edit2, Plus, Check, X } from 'lucide-react';
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
        className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 ease-in-out cursor-pointer ${isRendered ? 'opacity-100' : 'opacity-0'}`} 
        onClick={handleClose}
      />

      {/* Animated Modal Card */}
      <div 
        className={`relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-gradient-to-b dark:from-[#111322] dark:to-[#07080f] p-8 flex flex-col gap-6 shadow-2xl z-10 transition-all duration-300 ease-out transform ${isRendered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'} max-h-[90vh] overflow-y-auto custom-scrollbar`}
      >
        {/* Top accent glow (Dark mode only) */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-b from-purple-600/20 to-transparent rounded-full blur-2xl pointer-events-none hidden dark:block" />

        {/* Header */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 flex-shrink-0">
              {editing ? <Edit2 className="w-[18px] h-[18px]" /> : <Plus className="w-[18px] h-[18px]" strokeWidth={2.5} />}
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight leading-tight">
                {editing 
                  ? (form.type === "income" ? "Edit Income" : "Edit Expense") 
                  : (form.type === "income" ? "Add Income" : "Add Expense")}
              </h2>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                {editing ? "Modify Transaction Details" : "Record new transaction"}
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleClose}
            className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <form className="flex flex-col gap-6 relative z-10" onSubmit={handleSubmit}>
          {/* Type Selector Toggle (Expense vs Income) */}
          <div className="flex bg-zinc-100 dark:bg-white/[0.03] p-1.5 rounded-2xl border border-zinc-200 dark:border-white/[0.05]">
            <button
              type="button"
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${form.type !== "income" ? "bg-white dark:bg-white/[0.08] text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"}`}
              onClick={() => setForm({ ...form, type: "expense" })}
            >
              Expense
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${form.type === "income" ? "bg-white dark:bg-white/[0.08] text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"}`}
              onClick={() => setForm({ ...form, type: "income", isAmortized: false })}
            >
              Income
            </button>
          </div>

          {/* Amount Input */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">Amount *</span>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400 font-extrabold text-2xl pointer-events-none">₹</span>
              <input
                className="h-16 w-full rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-zinc-50 dark:bg-white/[0.03] pl-12 pr-5 text-3xl font-black text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-600/50 dark:focus:ring-purple-500/50 focus:border-purple-500 dark:focus:border-purple-500 transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
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

          {/* Category Select */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">Category *</span>
            <div className="relative">
              <select
                className="h-14 w-full rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-zinc-50 dark:bg-white/[0.03] px-5 font-bold text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-600/50 dark:focus:ring-purple-500/50 transition-all appearance-none cursor-pointer text-sm"
                required
                value={form.categoryId}
                onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
              >
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
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 dark:text-zinc-500">
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Date & Note in Two-Column Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date Input */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">Date *</span>
              <input
                className="h-14 w-full rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-zinc-50 dark:bg-white/[0.03] px-5 font-bold text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-600/50 dark:focus:ring-purple-500/50 transition-all cursor-pointer [color-scheme:light] dark:[color-scheme:dark] text-sm"
                required
                type="date"
                value={form.spentAt}
                onChange={(event) => setForm({ ...form, spentAt: event.target.value })}
              />
            </div>

            {/* Note Input */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">Note</span>
              <input
                className="h-14 w-full rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-zinc-50 dark:bg-white/[0.03] px-5 font-bold text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-600/50 dark:focus:ring-purple-500/50 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-700 text-sm"
                maxLength={160}
                placeholder="Description"
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
              />
            </div>
          </div>

          {form.type !== "income" && (
            <>
              {/* Amortization (Spread Expense) Toggle */}
              <div className="flex items-center justify-between bg-zinc-50 dark:bg-white/[0.03] p-4.5 rounded-2xl border border-zinc-200 dark:border-white/[0.05]">
                <div>
                  <span className="font-bold text-zinc-800 dark:text-white text-sm">Spread Expense</span>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-0.5">Distribute this cost over multiple months</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.isAmortized || false}
                  onChange={(e) => setForm({ ...form, isAmortized: e.target.checked })}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-purple-600 focus:ring-purple-500 w-4.5 h-4.5 cursor-pointer accent-purple-600"
                />
              </div>

              {form.isAmortized && (
                <div className="flex flex-col gap-2 animate-fade-in">
                  <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">Months to Spread Over *</span>
                  <div className="relative">
                    <select
                      className="h-14 w-full rounded-2xl border border-zinc-200 dark:border-white/[0.07] bg-zinc-50 dark:bg-white/[0.03] px-5 font-bold text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-600/50 dark:focus:ring-purple-500/50 transition-all appearance-none cursor-pointer text-sm"
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
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 dark:text-zinc-500">
                      <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Submit & Cancel Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 order-2 sm:order-1 h-14 rounded-2xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 font-bold transition-all text-sm flex items-center justify-center gap-2 cursor-pointer border-none"
            >
              Cancel
            </button>

            <button 
              type="submit"
              className="flex-[2] order-1 sm:order-2 h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 border-none cursor-pointer text-sm"
            >
              {editing ? <Check className="w-4.5 h-4.5" /> : <Plus className="w-4.5 h-4.5" strokeWidth={2.5} />}
              {editing ? "Save Changes" : (form.type === "income" ? "Add Income" : "Add Expense")}
            </button>
          </div>

          {editing && (
            <button
              type="button"
              onClick={handleDelete}
              className="h-14 w-full rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 font-bold transition-all flex justify-center items-center gap-2 border border-red-500/20 hover:border-red-500/30 text-sm cursor-pointer"
            >
              Delete Transaction
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
