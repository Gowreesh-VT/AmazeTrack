import React from 'react';
import { Edit2, Plus, Check } from 'lucide-react';
import { useAppContext } from '@/lib/AppContext';

export function AddTransactionView() {
  const {
    form, setForm, editing, parentCategories, allCategories,
    submitTransaction, setActiveView, currencySymbol, deleteTransaction
  } = useAppContext();

  return (
    <>
    <form className="flex flex-1 flex-col gap-6 py-6 max-w-md mx-auto w-full justify-center animate-fade-up" onSubmit={submitTransaction}>
          {/* Form Card */}
          <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.07] bg-gradient-to-b from-[#0f1120] to-[#0a0c14] p-8 flex flex-col gap-6 shadow-2xl">
            {/* Top accent glow */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-b from-purple-600/20 to-transparent rounded-full blur-2xl pointer-events-none" />

            {/* Form title */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/30 flex-shrink-0">
                {editing ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" strokeWidth={2.5} />}
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  {editing ? (form.type === "income" ? "Edit Income" : "Edit Expense") : (form.type === "income" ? "Add Income" : "Add Expense")}
                </h2>
                <p className="text-[11px] text-zinc-600 font-medium">All fields marked with * are required</p>
              </div>
            </div>

            {/* Type Selector Toggle */}
            <div className="flex bg-white/[0.04] p-1 rounded-2xl border border-white/[0.07]">
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${form.type !== "income" ? "bg-white/[0.10] text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                onClick={() => setForm({ ...form, type: "expense" })}
              >
                Expense
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${form.type === "income" ? "bg-white/[0.10] text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                onClick={() => setForm({ ...form, type: "income", isAmortized: false })}
              >
                Income
              </button>
            </div>

            {/* Amount */}
            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.12em] pl-1">Amount *</span>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-violet-400 font-bold text-xl pointer-events-none">₹</span>
                <input
                  className="h-16 w-full rounded-2xl border border-white/[0.07] bg-white/[0.04] pl-12 pr-5 text-2xl font-extrabold text-white outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500/40 transition-all placeholder:text-zinc-700"
                  inputMode="decimal"
                  min="1"
                  required
                  type="number"
                  placeholder="0"
                  value={form.amount}
                  onChange={(event) => setForm({ ...form, amount: event.target.value })}
                />
              </div>
            </label>

            {/* Category */}
            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.12em] pl-1">Category *</span>
              <div className="relative">
                <select
                  className="h-14 w-full rounded-2xl border border-white/[0.07] bg-white/[0.04] px-5 font-semibold text-white outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500/40 transition-all appearance-none cursor-pointer text-[15px]"
                  required
                  value={form.categoryId}
                  onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                >
                  {parentCategories.map((parent: any) => {
                    const subs = allCategories.filter((c: any) => c.parentId === parent.id);
                    return (
                      <optgroup key={parent.id} label={parent.name} className="bg-[#1c1f2e] text-white">
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
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </label>

            {/* Date */}
            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.12em] pl-1">Date *</span>
              <input
                className="h-14 w-full rounded-2xl border border-white/[0.07] bg-white/[0.04] px-5 font-semibold text-white outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500/40 transition-all cursor-pointer [color-scheme:dark] text-[15px]"
                required
                type="date"
                value={form.spentAt}
                onChange={(event) => setForm({ ...form, spentAt: event.target.value })}
              />
            </label>

            {/* Note */}
            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.12em] pl-1">Note</span>
              <input
                className="h-14 w-full rounded-2xl border border-white/[0.07] bg-white/[0.04] px-5 font-semibold text-white outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500/40 transition-all placeholder:text-zinc-700 text-[15px]"
                maxLength={160}
                placeholder="What was this for?"
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
              />
            </label>

            {form.type !== "income" && (
              <>
                {/* Amortization (Spread Expense) Toggle */}
                <div className="flex items-center justify-between bg-white/[0.04] p-4 rounded-2xl border border-white/[0.07]">
                  <div>
                    <span className="font-bold text-white text-sm">Spread Expense</span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Distribute this cost over multiple months</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.isAmortized || false}
                    onChange={(e) => setForm({ ...form, isAmortized: e.target.checked })}
                    className="rounded border-zinc-700 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                {form.isAmortized && (
                  <label className="flex flex-col gap-2 animate-fade-in">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.12em] pl-1">Months to Spread Over *</span>
                    <select
                      className="h-14 w-full rounded-2xl border border-white/[0.07] bg-white/[0.04] px-5 font-semibold text-white outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500/40 transition-all appearance-none cursor-pointer text-[15px] font-bold text-card-foreground"
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
                  </label>
                )}
              </>
            )}

            {/* Submit */}
            <button className="mt-2 h-14 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-[15px] font-bold text-white shadow-xl shadow-violet-500/25 transition-all duration-200 hover:shadow-violet-500/45 hover:scale-[1.01] active:scale-[0.98] border-0 flex items-center justify-center gap-2">
              {editing ? (
                <><Check className="w-5 h-5" /> Save changes</>
              ) : (
                <>
                  <Plus className="w-5 h-5" strokeWidth={2.5} />
                  {form.type === "income" ? "Add income" : "Add expense"}
                </>
              )}
            </button>

            {editing && (
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  className="flex-1 py-3 text-[13px] font-semibold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl transition-all"
                  onClick={() => setActiveView("home")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-1 py-3 text-[13px] font-semibold text-red-500/80 hover:text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-2xl transition-all flex justify-center items-center gap-2"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this transaction?")) {
                      deleteTransaction(editing);
                      setActiveView("home");
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </form>
    </>
  );
}
