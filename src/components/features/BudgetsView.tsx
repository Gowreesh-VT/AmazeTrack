import React from 'react';
import { Plus, Target, CheckCircle2, TrendingUp, AlertTriangle, Edit2, Trash2, Clock, Play, Pause, Percent } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useAppContext } from '@/lib/AppContext';

export function BudgetsView() {
  const {
    budgetsSubTab, setBudgetsSubTab, allCategories,
    budgetProgress, deleteBudget,
    goalsList, editingGoal, startEditGoal,
    quickAddFunds, setQuickAddFunds, addGoalFunds, deleteGoal,
    isAddingGoal, setIsAddingGoal,
    allowanceForm, setAllowanceForm,
    setIsEditingAllowance, allowanceConfig, isEditingAllowance, allowanceStatus,
    startAddGoal, setEditingRepeating, setRepeatingForm, setIsAddingRepeating,
    toggleRepeatingTemplate, deleteRepeatingTemplate, setEditingSubscription,
    setSubscriptionForm, setIsAddingSubscription, toggleSubscription, deleteSubscription,
    driveData, currencySymbol, todayInputValue, startAddBudget, startEditBudget,
    startEditAllowance, deleteAllowance, saveAllowance, activeBudgets, historyBudgets,
    monthIncome, monthTotal
  } = useAppContext();

  return (
    <>
    <section className="flex flex-1 flex-col gap-6 px-6 pt-6 pb-24 max-w-md md:max-w-5xl mx-auto w-full">
          {/* Segment Control */}
          <div className="flex bg-white/[0.06] border border-white/[0.08] p-1 rounded-2xl flex-wrap md:flex-nowrap gap-1">
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${budgetsSubTab === "budgets" ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
              onClick={() => setBudgetsSubTab("budgets")}
            >
              Budgets
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${budgetsSubTab === "allowance" ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
              onClick={() => setBudgetsSubTab("allowance")}
            >
              Allowance
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${budgetsSubTab === "goals" ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
              onClick={() => setBudgetsSubTab("goals")}
            >
              Goals
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${budgetsSubTab === "recurring" ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
              onClick={() => setBudgetsSubTab("recurring")}
            >
              Recurring
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${budgetsSubTab === "subscriptions" ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
              onClick={() => setBudgetsSubTab("subscriptions")}
            >
              Subscriptions
            </button>
          </div>

          {/* Sub-tab 1: Budgets */}
          {budgetsSubTab === "budgets" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Category Budgets</h2>
                <button
                  type="button"
                  onClick={startAddBudget}
                  className="text-xs font-bold text-white bg-violet-600 px-4 py-2 rounded-xl shadow-md shadow-violet-500/25 active:scale-95 transition-all hover:bg-violet-700"
                >
                  + Add Budget
                </button>
              </div>

              {/* Active Budgets */}
              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active</h3>
                {activeBudgets.length === 0 ? (
                  <p className="text-sm text-zinc-500 italic">No active budgets. Create one above!</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeBudgets.map((budget: any) => {
                      const progress = Math.min((budget.spent / budget.limitAmount) * 100, 100);
                      const pct = budget.spent / budget.limitAmount;
                      const isApproaching = pct >= 0.70 && pct < 0.90;
                      const isWarning = pct >= 0.90 && pct < 1.0;
                      const isOver = budget.spent > budget.limitAmount;
                      const barColor = isOver ? "#f87171" : isWarning ? "#fbbf24" : isApproaching ? "#fbbf24" : "#34d399";
                      return (
                      <div key={budget.id} className={`relative bg-white/[0.04] border rounded-3xl p-5 flex flex-col gap-3 overflow-hidden ${
                        isOver
                          ? "border-red-500/30 shadow-[0_0_24px_rgba(248,113,113,0.12)]"
                          : isWarning
                          ? "border-amber-500/25"
                          : "border-white/[0.08]"
                      }`}>
                        {isOver && <div className="absolute inset-0 bg-red-500/[0.04] pointer-events-none rounded-3xl" />}
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-white text-base">{budget.name}</h4>
                            <p className="text-xs text-zinc-500 font-medium">
                              {budget.categoryIds.length === 0
                                ? "All Categories"
                                : budget.categoryIds
                                    .map((id: any) => allCategories.find((c: any) => c.id === id)?.name ?? "")
                                    .filter(Boolean)
                                    .join(", ")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditBudget(budget)}
                              className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-blue-400 hover:bg-blue-500/15 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteBudget(budget.id)}
                              className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-red-500/15 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-end text-xs font-bold mb-2">
                            <span className={isOver ? "text-red-400" : isWarning ? "text-amber-400" : "text-zinc-400"}>
                              {formatCurrency(budget.spent, currencySymbol)} spent
                            </span>
                            <span className="text-zinc-600">of {formatCurrency(budget.limitAmount, currencySymbol)}</span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ease-out ${isOver ? "animate-pulse" : ""}`}
                              style={{
                                width: `${progress}%`,
                                backgroundColor: barColor,
                                boxShadow: isOver ? `0 0 12px ${barColor}80` : isWarning ? `0 0 8px ${barColor}50` : "none",
                              }}
                            />
                          </div>
                          {isOver && (
                            <p className="text-[10px] font-bold text-red-400 mt-1.5 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Over by {formatCurrency(budget.spent - budget.limitAmount, currencySymbol)}
                            </p>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                          Period: {new Date(budget.periodStart).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – {new Date(budget.periodEnd).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} · {budget.periodType}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                )}
              </div>

              {/* History Budgets */}
              {historyBudgets.length > 0 && (
                <div className="flex flex-col gap-4 mt-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">History (Expired)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {historyBudgets.map((budget: any) => (
                      <div key={budget.id} className="glass p-5 rounded-3xl flex flex-col gap-3 shadow-sm border border-zinc-100 opacity-60">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-zinc-700 text-base">{budget.name}</h4>
                            <p className="text-xs text-zinc-400 font-medium">
                              {budget.categoryIds.length === 0
                                ? "All Categories"
                                : budget.categoryIds
                                    .map((id: any) => allCategories.find((c: any) => c.id === id)?.name ?? "")
                                    .filter(Boolean)
                                    .join(", ")}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteBudget(budget.id)}
                            className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex justify-between items-end text-xs font-bold">
                          <span className="text-zinc-500">{formatCurrency(budget.spent, currencySymbol)} spent</span>
                          <span className="text-zinc-400">limit {formatCurrency(budget.limitAmount, currencySymbol)}</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                          Ended: {new Date(budget.periodEnd).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 2: Allowance */}
          {budgetsSubTab === "allowance" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900">Allowance & Burn Rate</h2>
                {allowanceConfig && !isEditingAllowance && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={startEditAllowance}
                      className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-2 rounded-xl hover:bg-purple-100 transition-all"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={deleteAllowance}
                      className="text-xs font-bold text-red-600 bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100 transition-all"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Onboarding State */}
              {!allowanceConfig && !isEditingAllowance && (
                <div className="glass p-6 rounded-3xl text-center flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                    <Percent className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base">Track your pocket money</h3>
                    <p className="text-xs text-zinc-500 font-medium mt-1">
                      Set a cycle amount to project exactly when your funds will run out based on your daily spending speed.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startEditAllowance}
                    className="w-full h-12 rounded-xl bg-purple-600 text-white text-sm font-bold shadow-md shadow-purple-500/20 active:scale-95 transition-all hover:bg-purple-700 mt-2"
                  >
                    Set up Allowance
                  </button>
                </div>
              )}

              {/* Setup/Edit Form */}
              {isEditingAllowance && (
                <form onSubmit={saveAllowance} className="glass p-6 rounded-3xl flex flex-col gap-4">
                  <h3 className="font-bold text-foreground text-sm mb-1">{allowanceConfig ? "Edit Allowance" : "Setup Allowance"}</h3>
                  
                  <label className="space-y-1">
                    <span className="text-xs font-bold text-zinc-600">Allowance Amount (₹)</span>
                    <input
                      type="number"
                      required
                      min="1"
                      className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                      value={allowanceForm.amount}
                      onChange={(e) => setAllowanceForm({ ...allowanceForm, amount: e.target.value })}
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-bold text-zinc-600">Cycle Type</span>
                    <select
                      className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                      value={allowanceForm.cycleType}
                      onChange={(e) => setAllowanceForm({ ...allowanceForm, cycleType: e.target.value as "monthly" | "semester" })}
                    >
                      <option value="monthly">Monthly Cycle (e.g. pocket money)</option>
                      <option value="semester">Semester Cycle</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-bold text-zinc-600">Cycle Start Date</span>
                    <input
                      type="date"
                      required
                      className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                      value={allowanceForm.cycleStart}
                      onChange={(e) => setAllowanceForm({ ...allowanceForm, cycleStart: e.target.value })}
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-bold text-zinc-600">Cycle End Date (Optional)</span>
                    <input
                      type="date"
                      className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                      value={allowanceForm.cycleEnd}
                      onChange={(e) => setAllowanceForm({ ...allowanceForm, cycleEnd: e.target.value })}
                    />
                  </label>

                  <div className="flex gap-3 mt-2">
                    <button
                      type="submit"
                      className="flex-1 h-11 rounded-xl bg-purple-600 text-white text-xs font-bold active:scale-95 transition-all hover:bg-purple-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingAllowance(false)}
                      className="flex-1 h-11 rounded-xl bg-zinc-100 text-zinc-600 text-xs font-bold active:scale-95 transition-all hover:bg-zinc-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Stats View */}
              {allowanceConfig && !isEditingAllowance && allowanceStatus && (
                <div className="flex flex-col gap-6">
                  {/* Headline Banner */}
                  <div className={`p-6 rounded-3xl border flex flex-col gap-2 ${
                    allowanceStatus.isWarning 
                      ? "bg-amber-50 border-amber-100 text-amber-900" 
                      : "bg-purple-50 border-purple-100 text-purple-900"
                  }`}>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-60">Status Projection</p>
                    <h3 className="text-2xl font-extrabold tracking-tight leading-tight">
                      {allowanceStatus.averageDailySpend > 0 
                        ? `At this pace, your money will run out on ${allowanceStatus.runOutDate?.toLocaleDateString("en-IN", { month: 'long', day: 'numeric', year: 'numeric' })}`
                        : "No spend recorded yet in this cycle."
                      }
                    </h3>
                    {allowanceStatus.isWarning && (
                      <p className="text-xs font-semibold flex items-center gap-1.5 mt-1 text-amber-700">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        Warning: This is before your cycle end date of {new Date(allowanceStatus.expectedEnd!).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}!
                      </p>
                    )}
                  </div>

                  {/* Core Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass p-5 rounded-3xl flex flex-col gap-1 border border-zinc-100">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Spent So Far</p>
                      <p className="text-2xl font-extrabold text-foreground">{formatCurrency(allowanceStatus.spentSoFar, currencySymbol)}</p>
                    </div>
                    <div className="glass p-5 rounded-3xl flex flex-col gap-1 border border-zinc-100">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Remaining</p>
                      <p className={`text-2xl font-extrabold ${allowanceStatus.remaining < 0 ? "text-orange-600" : "text-foreground"}`}>
                        {formatCurrency(allowanceStatus.remaining, currencySymbol)}
                      </p>
                    </div>
                    <div className="glass p-5 rounded-3xl flex flex-col gap-1 border border-zinc-100">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Avg Daily Spend</p>
                      <p className="text-2xl font-extrabold text-foreground">{formatCurrency(allowanceStatus.averageDailySpend, currencySymbol)}/day</p>
                    </div>
                    <div className="glass p-5 rounded-3xl flex flex-col gap-1 border border-zinc-100">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cycle Duration</p>
                      <p className="text-sm font-bold text-zinc-600 mt-1">
                        Day {allowanceStatus.daysElapsed} of cycle
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 3: Goals */}
          {budgetsSubTab === "goals" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Savings Goals</h2>
                <button
                  type="button"
                  onClick={startAddGoal}
                  className="text-xs font-bold text-white bg-violet-600 px-4 py-2 rounded-xl shadow-md shadow-violet-500/25 active:scale-95 transition-all hover:bg-violet-750"
                >
                  + Add Goal
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {goalsList.length === 0 ? (
                  <p className="text-sm text-zinc-500 italic">No savings goals. Create one above!</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {goalsList.map((goal: any) => {
                      const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                      const isDone = goal.currentAmount >= goal.targetAmount;
                      const quickVal = quickAddFunds[goal.id] ?? "";
                      
                      // Monthly Net Savings rate
                      const netMonthlySavings = Math.max(0, monthIncome - monthTotal);
                      const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
                      
                      let timelineText = "";
                      let trackStatus: "none" | "ontrack" | "behind" | "completed" = "none";
                      let targetNeededMonthly = 0;
                      
                      if (isDone) {
                        trackStatus = "completed";
                      } else if (netMonthlySavings > 0) {
                        const monthsToTarget = remainingAmount / netMonthlySavings;
                        const years = Math.floor(monthsToTarget / 12);
                        const months = Math.ceil(monthsToTarget % 12);
                        
                        timelineText = `Est. hit: in ${years > 0 ? `${years}y ` : ""}${months}m at current rate`;
                        
                        if (goal.targetDate) {
                          const today = new Date();
                          const targetDateObj = new Date(goal.targetDate);
                          const monthsToDeadline = Math.max(1, (targetDateObj.getFullYear() - today.getFullYear()) * 12 + (targetDateObj.getMonth() - today.getMonth()));
                          targetNeededMonthly = remainingAmount / monthsToDeadline;
                          
                          if (netMonthlySavings >= targetNeededMonthly) {
                            trackStatus = "ontrack";
                          } else {
                            trackStatus = "behind";
                          }
                        }
                      } else {
                        timelineText = "Est. hit: no active savings rate";
                        if (goal.targetDate) {
                          const today = new Date();
                          const targetDateObj = new Date(goal.targetDate);
                          const monthsToDeadline = Math.max(1, (targetDateObj.getFullYear() - today.getFullYear()) * 12 + (targetDateObj.getMonth() - today.getMonth()));
                          targetNeededMonthly = remainingAmount / monthsToDeadline;
                          trackStatus = "behind";
                        }
                      }
                      
                      return (
                        <div key={goal.id} className="relative bg-white/[0.04] border border-white/[0.08] p-5 rounded-3xl flex flex-col gap-3 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-white text-base">{goal.name}</h4>
                              {goal.targetDate && (
                                <p className="text-xs text-zinc-500 font-medium">
                                  Target Date: {new Date(goal.targetDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEditGoal(goal)}
                                className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-450 hover:text-blue-400 hover:bg-blue-500/15 transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteGoal(goal.id)}
                                className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-450 hover:text-red-400 hover:bg-red-500/15 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-end text-xs font-bold mb-1.5">
                              <span className={isDone ? "text-purple-450 font-extrabold" : "text-zinc-455"}>
                                {formatCurrency(goal.currentAmount, currencySymbol)} saved
                              </span>
                              <span className="text-zinc-500">target {formatCurrency(goal.targetAmount, currencySymbol)}</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden shadow-inner">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Timeline Projection Info */}
                          {!isDone && timelineText && (
                            <div className="text-[11px] font-bold p-3 rounded-2xl bg-white/[0.03] flex flex-col gap-1 border border-white/[0.06] mt-1">
                              <div className="flex justify-between items-center">
                                <span className="text-zinc-450">{timelineText}</span>
                                {trackStatus === "ontrack" && (
                                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-450 font-extrabold uppercase">On Track</span>
                                )}
                                {trackStatus === "behind" && (
                                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-450 font-extrabold uppercase">Behind</span>
                                )}
                              </div>
                              {trackStatus === "behind" && targetNeededMonthly > 0 && (
                                <p className="text-[10px] text-zinc-500 mt-0.5 leading-normal font-medium">
                                  Need to save <span className="font-extrabold text-zinc-350">{formatCurrency(targetNeededMonthly, currencySymbol)}/mo</span> to reach by deadline.
                                </p>
                              )}
                            </div>
                          )}
                          {isDone && (
                            <div className="text-[11px] font-extrabold px-3 py-2 rounded-2xl bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 flex items-center justify-between mt-1">
                              <span>Goal completed! 🎉</span>
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 uppercase">Done</span>
                            </div>
                          )}

                          {/* Quick Add Funds Inline Form */}
                          <div className="pt-2.5 border-t border-white/[0.06] flex items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex-1">Quick Add Funds:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-zinc-500">₹</span>
                              <input
                                type="number"
                                placeholder="0"
                                className="w-16 h-8 text-center rounded-lg bg-white/[0.04] border border-white/[0.07] outline-none text-xs font-bold text-white focus:ring-1 focus:ring-violet-500"
                                value={quickVal}
                                onChange={(e) => setQuickAddFunds({ ...quickAddFunds, [goal.id]: e.target.value })}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const val = Number(quickVal);
                                  if (!isNaN(val) && val > 0) {
                                    addGoalFunds(goal, val);
                                    setQuickAddFunds({ ...quickAddFunds, [goal.id]: "" });
                                  }
                                }}
                                className="h-8 px-3 rounded-lg bg-violet-600 text-white text-xs font-bold shadow-sm hover:bg-violet-750 active:scale-95 transition-all"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-tab 4: Recurring templates */}
          {budgetsSubTab === "recurring" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Recurring Spending Templates</h2>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">Automated transaction templates</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRepeating(null);
                    setRepeatingForm({
                      amount: "",
                      categoryId: allCategories.find((c: any) => !c.parentId)?.id ?? "other",
                      note: "",
                      frequency: "monthly",
                      startDate: todayInputValue(),
                      account: "",
                    });
                    setIsAddingRepeating(true);
                  }}
                  className="text-xs font-bold text-white bg-purple-600 px-4 py-2 rounded-xl shadow-md shadow-purple-500/20 active:scale-95 transition-all hover:bg-purple-700"
                >
                  + Add Template
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {!(driveData?.recurringTemplates) || driveData.recurringTemplates.length === 0 ? (
                  <div className="glass p-8 rounded-3xl text-center text-xs text-muted-foreground italic border border-dashed border-border">
                    No recurring transaction templates created yet. Set up templates to automatically log weekly laundry or monthly mess expenses.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {driveData.recurringTemplates.map((template: any) => {
                      const cat = allCategories.find((c: any) => c.id === template.categoryId);
                      return (
                        <div
                          key={template.id}
                          className={`glass p-5 rounded-3xl flex flex-col justify-between gap-4 border transition-all ${template.active ? "border-border" : "opacity-60 border-zinc-200/50 dark:border-zinc-900/50"}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-card-foreground text-base">{template.note}</h4>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400">
                                  {template.frequency}
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Starts: {template.startDate}
                                </span>
                                {template.account && (
                                  <span className="text-[10px] font-semibold text-muted-foreground bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                                    {template.account}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <span className="text-lg font-extrabold text-foreground">
                                {formatCurrency(template.amount, currencySymbol)}
                              </span>
                              <span className="text-[10px] text-muted-foreground block font-medium">/{template.frequency === "weekly" ? "wk" : "mo"}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-border/80 pt-3 mt-1">
                            <button
                              type="button"
                              onClick={() => toggleRepeatingTemplate(template)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${template.active ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100" : "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 hover:bg-green-100"}`}
                            >
                              {template.active ? (
                                <>
                                  <Pause className="w-3.5 h-3.5 fill-amber-600 dark:fill-amber-400 stroke-none" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <Play className="w-3.5 h-3.5 fill-green-600 dark:fill-green-400 stroke-none" />
                                  Resume
                                </>
                              )}
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRepeating(template);
                                  setRepeatingForm({
                                    amount: String(template.amount),
                                    categoryId: template.categoryId,
                                    note: template.note,
                                    frequency: template.frequency,
                                    startDate: template.startDate,
                                    account: template.account ?? "",
                                  });
                                  setIsAddingRepeating(true);
                                }}
                                className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-muted-foreground hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this repeating template? Existing auto-generated transactions will remain intact.")) {
                                    deleteRepeatingTemplate(template.id);
                                  }
                                }}
                                className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-muted-foreground hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-tab 5: Subscriptions */}
          {budgetsSubTab === "subscriptions" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Active Subscriptions</h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mt-0.5">Recurring OTT & gym commitments</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSubscription(null);
                    setSubscriptionForm({
                      name: "",
                      amount: "",
                      categoryId: "subscriptions",
                      billingDay: "1",
                    });
                    setIsAddingSubscription(true);
                  }}
                  className="text-xs font-bold text-white bg-violet-600 px-4 py-2 rounded-xl shadow-md shadow-violet-500/25 active:scale-95 transition-all hover:bg-violet-750"
                >
                  + Add Subscription
                </button>
              </div>

              {/* Subscriptions Commitment Banner Card */}
              {(() => {
                const activeSubs = (driveData?.subscriptions ?? []).filter((s: any) => s.active);
                const totalMonthlyCommitment = activeSubs.reduce((sum: any, s: any) => sum + s.amount, 0);

                return (
                  <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-violet-600/10 to-indigo-600/10 border border-violet-500/10 shadow-sm">
                    <div className="absolute right-[-5%] top-[-10%] w-24 h-24 bg-violet-500/10 rounded-full blur-xl pointer-events-none" />
                    
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-violet-400">Total Committed Monthly Spend</p>
                    <h3 className="text-3.5xl font-extrabold text-white mt-1 tracking-tight">
                      {formatCurrency(totalMonthlyCommitment, currencySymbol)}
                      <span className="text-sm font-bold text-zinc-500 ml-1">/ month</span>
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-medium leading-normal mt-1">
                      Calculated across {activeSubs.length} active subscription templates. Logged automatically on their respective billing days.
                    </p>
                  </div>
                );
              })()}

              <div className="flex flex-col gap-4">
                {!(driveData?.subscriptions) || driveData.subscriptions.length === 0 ? (
                  <div className="glass p-8 rounded-3xl text-center text-xs text-zinc-500 italic border border-dashed border-white/[0.08]">
                    No subscriptions added yet. Log Netflix, Spotify, or gym billing cycles to track commitments.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      const now = new Date();
                      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                      const sortedSubs = [...driveData.subscriptions].map((sub: any) => {
                        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                        const actualBillingDay = Math.min(sub.billingDay, lastDayOfMonth);
                        let billingDate = new Date(today.getFullYear(), today.getMonth(), actualBillingDay);
                        
                        if (billingDate < today) {
                          const nextMonthLastDay = new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate();
                          const nextMonthBillingDay = Math.min(sub.billingDay, nextMonthLastDay);
                          billingDate = new Date(today.getFullYear(), today.getMonth() + 1, nextMonthBillingDay);
                        }
                        
                        const diffTime = billingDate.getTime() - today.getTime();
                        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return { ...sub, billingDate, daysRemaining };
                      }).sort((a, b) => {
                        if (a.active !== b.active) return a.active ? -1 : 1;
                        return a.daysRemaining - b.daysRemaining;
                      });

                      return sortedSubs.map((sub: any) => {
                        const cat = allCategories.find((c: any) => c.id === sub.categoryId);
                        const isToday = sub.daysRemaining === 0;
                        const isTomorrow = sub.daysRemaining === 1;
                        const isSoon = sub.daysRemaining > 1 && sub.daysRemaining <= 5;
                        
                        return (
                          <div
                            key={sub.id}
                            className={`relative bg-white/[0.04] p-5 rounded-3xl flex flex-col justify-between gap-4 border transition-all ${sub.active ? "border-white/[0.08]" : "opacity-50 border-white/[0.04]"}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-white text-base">{sub.name}</h4>
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold text-zinc-400 bg-white/[0.06] px-2 py-0.5 rounded-md">
                                    Billing Day: {sub.billingDay === 1 ? "1st" : sub.billingDay === 2 ? "2nd" : sub.billingDay === 3 ? "3rd" : `${sub.billingDay}th`}
                                  </span>
                                  {cat && (
                                    <span className="text-[10px] font-semibold text-zinc-500 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                      {cat.name}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-lg font-extrabold text-white">
                                  {formatCurrency(sub.amount, currencySymbol)}
                                </span>
                                <span className="text-[10px] text-zinc-500 block font-medium">/ month</span>
                              </div>
                            </div>

                            {sub.active && (
                              <div className="flex items-center gap-1.5">
                                {isToday ? (
                                  <span className="text-[9px] font-extrabold px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider animate-pulse">Renewing Today</span>
                                ) : isTomorrow ? (
                                  <span className="text-[9px] font-extrabold px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">Renewing Tomorrow</span>
                                ) : isSoon ? (
                                  <span className="text-[9px] font-extrabold px-2.5 py-0.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wider">Renewing in {sub.daysRemaining} days</span>
                                ) : (
                                  <span className="text-[9px] font-extrabold px-2.5 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 border border-white/[0.06] uppercase tracking-wider">Next in {sub.daysRemaining} days</span>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between border-t border-white/[0.06] pt-3 mt-1">
                              <button
                                type="button"
                                onClick={() => toggleSubscription(sub)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${sub.active ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"}`}
                              >
                                {sub.active ? (
                                  <>
                                    <Pause className="w-3.5 h-3.5 fill-amber-400 stroke-none" />
                                    Pause
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3.5 h-3.5 fill-emerald-400 stroke-none" />
                                    Resume
                                  </>
                                )}
                              </button>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSubscription(sub);
                                    setSubscriptionForm({
                                      name: sub.name,
                                      amount: String(sub.amount),
                                      categoryId: sub.categoryId,
                                      billingDay: String(sub.billingDay),
                                    });
                                    setIsAddingSubscription(true);
                                  }}
                                  className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-blue-400 hover:bg-blue-500/15 transition-all"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this subscription? Past auto-generated transactions will remain intact.")) {
                                      deleteSubscription(sub.id);
                                    }
                                  }}
                                  className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-red-500/15 transition-all"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Sub-tab closures */}
        </section>
    </>
  );
}
