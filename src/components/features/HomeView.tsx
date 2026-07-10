import React from 'react';
import { Wallet, X, AlertTriangle, PiggyBank, TrendingUp, MessageSquare, Clock, Smartphone, Check, Sparkles, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { useAppContext } from '@/lib/AppContext';
import { TransactionRow } from '@/components/ui/transaction-row';
import { getTrendData } from '@/lib/analytics';

function parseBankSMS(text: string) {
  const AMOUNT_REGEX = /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i;
  const DEBIT_KEYWORDS = ["debited", "spent", "paid", "sent", "deducted", "txn"];
  const result = { amount: null as number | null, merchant: null as string | null, account: null as string | null };
  const lowerText = text.toLowerCase();
  if (!DEBIT_KEYWORDS.some((kw) => lowerText.includes(kw))) {
    return null;
  }
  const amountMatch = text.match(AMOUNT_REGEX);
  if (amountMatch && amountMatch[1]) {
    result.amount = parseFloat(amountMatch[1].replace(/,/g, ""));
  }
  const toMatch = text.match(/(?:to|vpa|at)\s+([A-Za-z0-9@\s\._\-&]+?)(?=\s+(?:on|ref|upi|via|$))/i);
  if (toMatch && toMatch[1]) {
    result.merchant = toMatch[1].trim();
  }
  const acctMatch = text.match(/(?:a\/c|acct|account).{0,5}([X*]+\d{3,4}|\d{4})/i);
  if (acctMatch && acctMatch[1]) {
    result.account = acctMatch[1];
  }
  return result;
}

export function HomeView() {
  const {
    activeView, setActiveView, currencySymbol, breakdown, loading,
    transactions, smartAlerts, setDismissedAlertIds, dismissedAlertIds,
    monthTransactions, globalDebtSummary,
    allCategories, startEdit, deleteTransaction, allowanceStatus, activeBudgets, monthTotal,
    monthIncome, netSavingsRate,
    driveData, setForm
  } = useAppContext();

  // SMS Import Simulation States
  const [smsText, setSmsText] = React.useState("");
  const [smsParsed, setSmsParsed] = React.useState<any>(null);
  const [smsStatusMessage, setSmsStatusMessage] = React.useState("");
  const [showSmsSimulator, setShowSmsSimulator] = React.useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showAllRecents, setShowAllRecents] = React.useState(false);

  // Calculate 7-Day Trend Points for Mini Analytics
  const trendPoints = React.useMemo(() => {
    return getTrendData(transactions ?? [], null, 7, "daily");
  }, [transactions]);

  const miniChartSvg = React.useMemo(() => {
    if (!trendPoints || trendPoints.length === 0) return null;
    const width = 280;
    const height = 90;
    const padding = 15;
    const maxVal = Math.max(...trendPoints.map((p: any) => p.currentAmount), 500);

    const getX = (idx: number) => padding + (idx / (trendPoints.length - 1)) * (width - 2 * padding);
    const getY = (val: number) => height - padding - (val / maxVal) * (height - 2 * padding);

    let currentPath = "";
    trendPoints.forEach((p: any, idx: number) => {
      const cx = getX(idx);
      const cy = getY(p.currentAmount);
      if (idx === 0) {
        currentPath = `M ${cx} ${cy}`;
      } else {
        currentPath += ` L ${cx} ${cy}`;
      }
    });

    return {
      points: trendPoints,
      currentPath,
      getX,
      getY,
      width,
      height,
      maxVal
    };
  }, [trendPoints]);

  const handleParseSMS = () => {
    if (!smsText.trim()) return;
    const parsed = parseBankSMS(smsText);
    if (!parsed || !parsed.amount) {
      setSmsStatusMessage("Could not identify expense amount or debit keyword.");
      setSmsParsed(null);
      return;
    }
    setSmsParsed(parsed);
    setSmsStatusMessage("");
  };

  const handleImportSMS = () => {
    if (!smsParsed) return;
    
    // Match categories
    const note = smsParsed.merchant || "SMS Auto Import";
    const lowerNote = note.toLowerCase();
    let categoryId = allCategories[0]?.id || "other";
    
    if (lowerNote.includes("zomato") || lowerNote.includes("swiggy") || lowerNote.includes("food") || lowerNote.includes("restaurant") || lowerNote.includes("mess") || lowerNote.includes("eat")) {
      const match = allCategories.find((c: any) => c.name.toLowerCase().includes("food") || c.name.toLowerCase().includes("eat") || c.name.toLowerCase().includes("drink"));
      if (match) categoryId = match.id;
    } else if (lowerNote.includes("uber") || lowerNote.includes("ola") || lowerNote.includes("transport") || lowerNote.includes("cab") || lowerNote.includes("auto") || lowerNote.includes("travel")) {
      const match = allCategories.find((c: any) => c.name.toLowerCase().includes("transport") || c.name.toLowerCase().includes("travel"));
      if (match) categoryId = match.id;
    } else if (lowerNote.includes("blinkit") || lowerNote.includes("groceries") || lowerNote.includes("shopping") || lowerNote.includes("market") || lowerNote.includes("shop")) {
      const match = allCategories.find((c: any) => c.name.toLowerCase().includes("groceries") || c.name.toLowerCase().includes("shopping") || c.name.toLowerCase().includes("shop"));
      if (match) categoryId = match.id;
    }

    setForm({
      amount: smsParsed.amount.toString(),
      type: "expense",
      categoryId,
      note: `Auto-parsed from SMS (${smsParsed.merchant || "Unknown"})`,
      spentAt: new Date().toISOString().split("T")[0],
      isAmortized: false,
      amortizeMonths: 12
    });
    setSmsText("");
    setSmsParsed(null);
    setActiveView("add-transaction");
  };

  // Recent Auto-parsed SMS list
  const parsedSmsTransactions = React.useMemo(() => {
    return (transactions ?? [])
      .filter((t: any) => t.note?.startsWith("Auto-parsed from SMS") && !t.deletedAt)
      .slice(0, 2);
  }, [transactions]);

  // Recurring Commitment Calculations
  const recurringCommitmentTotal = React.useMemo(() => {
    const activeSubs = (driveData?.subscriptions ?? []).filter((s: any) => s.active);
    const subsTotal = activeSubs.reduce((sum: any, s: any) => sum + s.amount, 0);
    
    const activeTemplates = (driveData?.recurringTemplates ?? []).filter((t: any) => t.active);
    const tmplsTotal = activeTemplates.reduce((sum: any, t: any) => {
      const monthlyAmount = t.frequency === "weekly" ? t.amount * 4 : t.amount;
      return sum + monthlyAmount;
    }, 0);
    
    return subsTotal + tmplsTotal;
  }, [driveData?.subscriptions, driveData?.recurringTemplates]);

  // Calculate month-over-month percent change
  const percentChange = React.useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    let lastMonth = thisMonth - 1;
    let lastMonthYear = thisYear;
    if (lastMonth < 0) {
      lastMonth = 11;
      lastMonthYear -= 1;
    }
    
    let thisMonthTotal = 0;
    let lastMonthTotal = 0;
    
    (transactions ?? []).forEach((t: any) => {
      if (t.deletedAt || t.type !== "expense") return;
      const d = new Date(t.spentAt);
      const m = d.getMonth();
      const y = d.getFullYear();
      if (m === thisMonth && y === thisYear) {
        thisMonthTotal += t.amount;
      } else if (m === lastMonth && y === lastMonthYear) {
        lastMonthTotal += t.amount;
      }
    });
    
    if (lastMonthTotal === 0) return null;
    return ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
  }, [transactions]);

  const activeSubsList = React.useMemo(() => {
    return (driveData?.subscriptions ?? []).filter((s: any) => s.active);
  }, [driveData]);

  const hasSidebarContent = activeSubsList.length > 0 || smartAlerts.length > 0;

  return (
    <>
    <section className="flex flex-1 flex-col gap-6 pt-4 max-w-[1400px] mx-auto w-full px-4 md:px-8 pb-20">
          


          {/* Top Dashboard Section */}
          <div className={`grid grid-cols-1 gap-6 ${hasSidebarContent ? 'lg:grid-cols-12' : ''}`}>
            
            {/* Main Cards (Spend & Wallet) */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 ${hasSidebarContent ? 'lg:col-span-8' : ''}`}>
              {/* Hero Spend Card with Mini Trend Line Chart on the right */}
          <div className="relative overflow-hidden rounded-[2rem] p-6 bg-[#2a2321] dark:bg-[#1a1715] border border-white/5 shadow-xl flex items-center justify-between gap-4">
            
            <div className="flex-1 min-w-0 z-10">
              <p className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Spent This Month</p>
              <p className="text-3xl font-black text-white tracking-tight">
                {formatCurrency(monthTotal, currencySymbol)}
              </p>
              <p className="text-[11px] font-semibold text-zinc-400 mt-2 flex items-center gap-1.5">
                {percentChange !== null ? (
                  <span className={percentChange > 0 ? "text-rose-500" : "text-emerald-500"}>
                    {percentChange > 0 ? "▲" : "▼"} {Math.abs(percentChange).toFixed(0)}% this month
                  </span>
                ) : (
                  <span>{monthTransactions.length} transactions</span>
                )}
              </p>
            </div>

            {/* Mini Trend Line Chart on the right */}
            {miniChartSvg && (
              <div className="w-[100px] h-[55px] shrink-0 z-10 relative flex flex-col justify-end">
                <svg viewBox={`0 0 ${miniChartSvg.width} ${miniChartSvg.height}`} className="w-full overflow-visible">
                  <path d={miniChartSvg.currentPath} fill="none" stroke="#f472b6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-90" />
                </svg>
              </div>
            )}
            
            {/* Subtle Chevron indicator at bottom center */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-zinc-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Primary Account Card (HDFC bank layout style) */}
          <div className="bg-[#1c1c1e] dark:bg-card border border-white/5 rounded-[2rem] p-6 flex flex-col gap-5 relative overflow-hidden group">
            {/* Subtle background pattern/gradient matching screenshot vibe */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent pointer-events-none"></div>
            
            {/* Split branch watermark badge at top right */}
            <div className="absolute right-5 top-5 w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-zinc-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="6" y1="3" x2="6" y2="15"></line>
                <circle cx="18" cy="6" r="3"></circle>
                <circle cx="6" cy="18" r="3"></circle>
                <path d="M18 9a9 9 0 0 1-9 9"></path>
              </svg>
            </div>

            <div className="flex items-start justify-between relative z-10">
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-500 flex items-center justify-center font-bold text-xl select-none border border-blue-500/30">
                  <Wallet className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest mb-1">Primary Balance</p>
                  <p className="text-3xl font-black text-white tracking-tight">
                    {formatCurrency(allowanceStatus ? allowanceStatus.remaining : 49552, currencySymbol)}
                  </p>
                  <p className="text-[11px] text-zinc-400 font-semibold mt-1">All accounts</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveView("settings")} // Just as a placeholder for View Details
                className="text-[10px] font-bold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 border border-white/5 backdrop-blur-md self-end mt-16"
              >
                View details <span className="opacity-50">&gt;</span>
              </button>
            </div>
          </div>
          </div> {/* End Main Cards */}

          {/* Sidebar Area (Subscriptions & Alerts) */}
          {hasSidebarContent && (
            <div className="lg:col-span-4 flex flex-col gap-5">
            {/* Subscriptions Card (Spotify/Zomato bubble style) */}
            {activeSubsList.length > 0 && (
              <div
                onClick={() => setActiveView("budgets")}
                className="bg-[#1c1c1e] dark:bg-card border border-white/5 rounded-2xl p-5 flex items-center justify-between hover:bg-[#252528] transition-all cursor-pointer group"
              >
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-sm font-bold text-white leading-none">{activeSubsList.length} Subscriptions</h3>
                  <p className="text-lg font-black text-white mt-1 flex items-center gap-1.5 tracking-tight">
                    {formatCurrency(recurringCommitmentTotal, currencySymbol)} <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">/ MONTH</span>
                  </p>
                </div>

                <div className="flex -space-x-1.5 overflow-hidden">
                  {activeSubsList.slice(0, 4).map((sub: any) => {
                    const name = sub.name.toLowerCase();
                    let emoji = "💳";
                    if (name.includes("spotify")) emoji = "🎵";
                    else if (name.includes("netflix")) emoji = "🍿";
                    else if (name.includes("zomato")) emoji = "🍔";
                    else if (name.includes("youtube")) emoji = "📺";
                    else if (name.includes("amazon")) emoji = "📦";
                    else if (name.includes("gym")) emoji = "💪";

                    return (
                      <div
                        key={sub.id}
                        className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs select-none shadow-sm shrink-0"
                        title={sub.name}
                      >
                        {emoji}
                      </div>
                    );
                  })}
                  {activeSubsList.length > 4 && (
                    <div className="w-7 h-7 rounded-full bg-purple-50/10 dark:bg-purple-950/20 border-2 border-card flex items-center justify-center text-[9px] font-bold text-purple-650 dark:text-purple-400 shrink-0">
                      +{activeSubsList.length - 4}
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Smart Alerts & In-App Reminders */}
          {smartAlerts.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                  </span>
                  <h3 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Smart Alerts</h3>
                </div>
                <span className="text-[10px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">
                  {smartAlerts.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {smartAlerts.map((alert: any) => (
                  <div
                    key={alert.id}
                    className={`relative flex items-start gap-3 p-4 rounded-2xl border text-xs font-semibold overflow-hidden transition-all animate-fade-up ${
                      alert.severity === "critical"
                        ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400"
                        : alert.severity === "warning"
                        ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400"
                        : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30 text-blue-700 dark:text-blue-400"
                    }`}
                  >
                    <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
                      alert.severity === "critical" ? "bg-red-500" : alert.severity === "warning" ? "bg-amber-500" : "bg-blue-400"
                    }`} />
                    <div className="flex-1 pl-1">
                      <p className="font-extrabold text-[13px] tracking-tight text-foreground">{alert.title}</p>
                      <p className="text-[11px] font-medium opacity-80 mt-1 leading-relaxed">{alert.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDismissedAlertIds([...dismissedAlertIds, alert.id])}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                      aria-label="Dismiss Alert"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
          )} {/* End Sidebar Area */}
          </div> {/* End Top Dashboard Section */}

          {/* Recent Activity Section (Full Width) */}
          <div className="flex flex-col gap-6 mt-4">
            <section className="pb-8">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between px-1 gap-4">
                <h2 className="text-base font-extrabold text-foreground tracking-tight">Recent</h2>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs opacity-70">🔍</span>
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 pl-9 pr-4 py-2 bg-muted/50 border border-border/50 rounded-xl text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              {loading ? (
                <div className="flex flex-col gap-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-16 rounded-2xl bg-muted border border-border/40 animate-pulse" />
                  ))}
                </div>
              ) : null}
              {!loading && transactions.length === 0 ? (
                <div className="bg-card border border-border rounded-3xl py-16 flex flex-col items-center justify-center text-center shadow-xs">
                  <div className="w-14 h-14 mb-4 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground">
                    <PiggyBank className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">No expenses yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Tap + Add Expense to start tracking.</p>
                </div>
              ) : null}
              {!loading && transactions.length > 0 && (() => {
                const now = new Date();
                now.setHours(0,0,0,0);
                const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
                const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
                const groups: { label: string; txns: typeof transactions }[] = [
                  { label: "Today", txns: [] },
                  { label: "Yesterday", txns: [] },
                  { label: "This Week", txns: [] },
                  { label: "Earlier", txns: [] },
                ];
                
                const filteredTxns = transactions.filter((t: any) => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  const cat = allCategories.find((c: any) => c.id === t.categoryId);
                  return (
                    (t.note || "").toLowerCase().includes(q) ||
                    (cat?.name || "").toLowerCase().includes(q)
                  );
                });

                const txnsToDisplay = showAllRecents 
                  ? (searchQuery.trim() ? filteredTxns.slice(0, 100) : filteredTxns.slice(0, 20))
                  : filteredTxns.slice(0, 4);

                txnsToDisplay.forEach((t: any) => {
                  const d = new Date(t.spentAt); d.setHours(0,0,0,0);
                  if (d.getTime() === now.getTime()) groups[0].txns.push(t);
                  else if (d.getTime() === yesterday.getTime()) groups[1].txns.push(t);
                  else if (d >= weekAgo) groups[2].txns.push(t);
                  else groups[3].txns.push(t);
                });
                return (
                  <div className="flex flex-col gap-4">
                    {groups.filter(g => g.txns.length > 0).map((group) => (
                      <div key={group.label}>
                        <p className="text-[10px] font-extrabold text-zinc-650 dark:text-zinc-500 uppercase tracking-[0.14em] mb-2 px-1">{group.label}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {group.txns.map((transaction: any) => (
                            <TransactionRow
                              key={transaction.id}
                              transaction={transaction}
                              category={allCategories.find((category: any) => category.id === transaction.categoryId)}
                              onEdit={() => startEdit(transaction)}
                              currencySymbol={currencySymbol}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {filteredTxns.length > 4 && (
                      <div className="flex justify-center mt-4">
                        <button
                          type="button"
                          onClick={() => setShowAllRecents(!showAllRecents)}
                          className="px-6 py-2.5 rounded-2xl bg-zinc-150 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/[0.08] text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99]"
                        >
                          {showAllRecents ? "Show Less" : "Show Recents"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </section>
          </div>
        </section>
    </>
  );
}
