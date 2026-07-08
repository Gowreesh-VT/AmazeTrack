import React, { useEffect, useRef } from 'react';
import { TrendingUp, AlertTriangle, X, FileSpreadsheet, Shield, MapPin } from 'lucide-react';
import {
  getTrendData,
  getCategoryBreakdown,
  getCalendarHeatmap,
  getDayOfWeekPattern,
  getMessVsOutsideFoodRatio,
  getTopMerchants,
  getSemesterComparison,
  getBudgetActualCumulative,
  getSplitHistoryTrend,
  getForecast,
  flattenAmortizedTransactions
} from '@/lib/analytics';
import { formatCurrency } from '@/lib/currency';
import { useAppContext } from '@/lib/AppContext';


export function AnalyticsView() {
  const {
    analyticsTab, setAnalyticsTab, transactions, currencySymbol, breakdown,
    monthTotal, driveData, budgetProgress, allCategories, handleAddSubcategory,
    trendPeriod, setTrendPeriod, trendDays, setTrendDays,
    selectedBreakdownCategoryId, setSelectedBreakdownCategoryId,
    splits, session, benchmarkOptIn, toggleBenchmarkOptIn, benchmarkData, parentCategories
  } = useAppContext();

  return (
    <>
    <section id="analytics-tab-content" className="flex flex-1 flex-col gap-6 px-6 pt-6 pb-28 max-w-md md:max-w-5xl mx-auto w-full">
          <div className="flex bg-white/[0.06] border border-white/[0.08] p-1 rounded-2xl">
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${analyticsTab === "overview" ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
              onClick={() => setAnalyticsTab("overview")}
            >
              Overview
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${analyticsTab === "categories" ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
              onClick={() => setAnalyticsTab("categories")}
            >
              Patterns
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${analyticsTab === "budgets" ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
              onClick={() => setAnalyticsTab("budgets")}
            >
              Budgets & Benchmarks
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${analyticsTab === "map" ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
              onClick={() => setAnalyticsTab("map")}
            >
              <MapPin className="w-3 h-3" />
              Map
            </button>
          </div>

          {/* Sub-tab 1: Overview */}
          {analyticsTab === "overview" && (
            <div className="flex flex-col gap-6">
              {/* Trend Chart Card */}
              <div className="glass p-5 rounded-3xl flex flex-col gap-4 border border-zinc-100 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-foreground text-sm">Spending Trend</h3>
                    {selectedBreakdownCategoryId && (
                      <button
                        type="button"
                        onClick={() => setSelectedBreakdownCategoryId(null)}
                        className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full mt-1 flex items-center gap-1 hover:bg-purple-100 transition-colors"
                      >
                        Filter: {allCategories.find((c: any) => c.id === selectedBreakdownCategoryId)?.name} <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Trend Period Switcher */}
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-[10px] font-bold">
                      {(["daily", "weekly", "monthly"] as const).map((p: any) => (
                        <button
                          key={p}
                          type="button"
                          className={`px-2.5 py-1 rounded-md transition-all uppercase ${trendPeriod === p ? "bg-white dark:bg-zinc-700 text-foreground dark:text-white shadow-xs" : "text-muted-foreground hover:text-zinc-600 dark:hover:text-zinc-300"}`}
                          onClick={() => {
                            setTrendPeriod(p);
                            if (p === "daily") setTrendDays(30);
                          }}
                        >
                          {p.slice(0, 3)}
                        </button>
                      ))}
                    </div>

                    {/* Trend Days Range Switcher */}
                    {trendPeriod === "daily" && (
                      <select
                        className="bg-zinc-100 dark:bg-zinc-850 border-0 rounded-lg text-[10px] font-bold px-2 py-1 outline-none text-zinc-600 dark:text-zinc-300"
                        value={trendDays}
                        onChange={(e) => setTrendDays(Number(e.target.value))}
                      >
                        <option value={7}>7 Days</option>
                        <option value={30}>30 Days</option>
                        <option value={90}>90 Days</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* SVG Trend Line Drawing */}
                {(() => {
                  const points = getTrendData(driveData?.transactions ?? [], selectedBreakdownCategoryId, trendDays, trendPeriod);
                  if (points.length === 0) return <div className="h-44 flex items-center justify-center text-xs text-zinc-400 italic">No transactions in selected range</div>;

                  const width = 500;
                  const height = 180;
                  const padding = 35;
                  
                  const maxVal = Math.max(...points.map((p: any) => Math.max(p.currentAmount, p.previousAmount)), 100);

                  const getX = (idx: number) => padding + (idx / (points.length - 1)) * (width - 2 * padding);
                  const getY = (val: number) => height - padding - (val / maxVal) * (height - 2 * padding);

                  // Generate Path strings
                  let currentPath = "";
                  let previousPath = "";

                  points.forEach((p: any, idx: any) => {
                    const cx = getX(idx);
                    const cyCurrent = getY(p.currentAmount);
                    const cyPrev = getY(p.previousAmount);

                    if (idx === 0) {
                      currentPath = `M ${cx} ${cyCurrent}`;
                      previousPath = `M ${cx} ${cyPrev}`;
                    } else {
                      currentPath += ` L ${cx} ${cyCurrent}`;
                      previousPath += ` L ${cx} ${cyPrev}`;
                    }
                  });

                  return (
                    <div className="w-full overflow-x-auto select-none">
                      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[420px] h-auto overflow-visible">
                        <defs>
                          <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#9333ea" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#9333ea" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        <line x1={padding} y1={getY(0)} x2={width - padding} y2={getY(0)} stroke="#e4e4e7" strokeWidth="1" />
                        <line x1={padding} y1={getY(maxVal / 2)} x2={width - padding} y2={getY(maxVal / 2)} stroke="#f4f4f5" strokeWidth="1" strokeDasharray="4 4" />
                        <line x1={padding} y1={getY(maxVal)} x2={width - padding} y2={getY(maxVal)} stroke="#f4f4f5" strokeWidth="1" strokeDasharray="4 4" />

                        {/* Y-Axis Label */}
                        <text x={padding - 5} y={getY(maxVal) + 3} textAnchor="end" className="text-[8px] font-bold fill-zinc-400">₹{Math.round(maxVal)}</text>
                        <text x={padding - 5} y={getY(0) + 3} textAnchor="end" className="text-[8px] font-bold fill-zinc-400">₹0</text>

                        {/* Previous Period Path (Dotted) */}
                        <path d={previousPath} fill="none" stroke="#d4d4d8" strokeWidth="1.5" strokeDasharray="3 3" />

                        {/* Current Period Fill & Path */}
                        {points.length > 1 && (
                          <path d={`${currentPath} L ${getX(points.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`} fill="url(#currentGrad)" />
                        )}
                        <path d={currentPath} fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />

                        {/* Dots and Labels */}
                        {points.map((p: any, idx: any) => {
                          const showLabel = points.length <= 10 || idx === 0 || idx === points.length - 1 || idx === Math.floor(points.length / 2);
                          return (
                            <g key={idx}>
                              <circle cx={getX(idx)} cy={getY(p.currentAmount)} r="3.5" fill="#a855f7" stroke="#ffffff" strokeWidth="1.5" />
                              {showLabel && (
                                <text x={getX(idx)} y={height - 8} textAnchor="middle" className="text-[8px] font-extrabold fill-zinc-400">{p.label}</text>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                      
                      {/* Legend */}
                      <div className="flex items-center gap-4 justify-center text-[10px] font-bold text-zinc-500 mt-2">
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-0.5 bg-purple-500 inline-block" /> Current Period
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-0.5 border-t border-dashed border-zinc-400 inline-block" /> Preceding Period
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Forecast and Heatmap row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Linear Projection Forecast */}
                <div className="glass p-5 rounded-3xl flex flex-col gap-4 border border-zinc-100 shadow-sm relative overflow-hidden">
                  <h3 className="font-bold text-foreground text-sm">Month-End Forecast</h3>
                  {(() => {
                    const totalLimit = (driveData?.budgets ?? []).reduce((sum: any, b: any) => sum + b.limitAmount, 0);
                    const forecast = getForecast(driveData?.transactions ?? [], totalLimit);
                    const isOverBudget = totalLimit > 0 && forecast.projectedSpend > totalLimit;

                    return (
                      <div className="flex flex-col gap-3 py-1">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Projected Spend</span>
                          <span className={`text-3xl font-extrabold tracking-tight ${isOverBudget ? "text-red-500" : "text-zinc-900"}`}>
                            {formatCurrency(forecast.projectedSpend, currencySymbol)}
                          </span>
                        </div>

                        <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? "bg-red-500" : "bg-purple-600"}`}
                            style={{ width: `${Math.min(totalLimit > 0 ? (forecast.projectedSpend / totalLimit) * 100 : 50, 100)}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-xs font-semibold text-zinc-500">
                          <span>Spent so far: {formatCurrency(forecast.currentSpend, currencySymbol)}</span>
                          {totalLimit > 0 && (
                            <span>Limit: {formatCurrency(totalLimit, currencySymbol)}</span>
                          )}
                        </div>

                        <p className="text-[10px] text-zinc-400 font-medium leading-relaxed mt-1">
                          Based on average daily spending of {formatCurrency(forecast.currentSpend / Math.max(1, new Date().getDate()), currencySymbol)} over the past {new Date().getDate()} days. 
                          {isOverBudget ? " ⚠️ You are projected to exceed your current total budget limit." : " You are currently on track to stay within budget."}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Calendar Heatmap */}
                <div className="glass p-5 rounded-3xl flex flex-col gap-4 border border-zinc-100 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-foreground text-sm">Calendar Heatmap</h3>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                    </span>
                  </div>
                  
                  {(() => {
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = now.getMonth();
                    const heatmap = getCalendarHeatmap(driveData?.transactions ?? [], year, month);
                    
                    // First day of month offset
                    const firstDayOffset = new Date(year, month, 1).getDay();

                    return (
                      <div className="flex flex-col gap-4 select-none">
                        {/* Weekday headers */}
                        <div className="grid grid-cols-7 gap-1.5 text-center text-[8px] font-extrabold text-zinc-400 uppercase tracking-wider">
                          <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1.5">
                          {/* Empty cells before month start */}
                          {Array.from({ length: firstDayOffset }).map((_, idx) => (
                            <div key={`offset-${idx}`} className="aspect-square rounded-md bg-transparent" />
                          ))}
                          
                          {/* Month days */}
                          {heatmap.map((pt: any) => {
                            const intensityColors = [
                              "bg-zinc-50 border border-zinc-100 hover:bg-zinc-100", // 0
                              "bg-purple-100 border border-purple-200/30 hover:bg-purple-200", // 1
                              "bg-purple-300 hover:bg-purple-400", // 2
                              "bg-purple-500 hover:bg-purple-600", // 3
                              "bg-purple-700 hover:bg-purple-800", // 4
                            ];
                            
                            return (
                              <div
                                key={pt.dayNum}
                                className={`aspect-square rounded-md flex items-center justify-center text-[9px] font-bold transition-all cursor-pointer ${intensityColors[pt.intensity]} ${pt.intensity > 1 ? "text-white" : "text-zinc-600"}`}
                                title={`${pt.dateStr}: ${formatCurrency(pt.amount, currencySymbol)}`}
                              >
                                {pt.dayNum}
                              </div>
                            );
                          })}
                        </div>

                        {/* Intensity Legend */}
                        <div className="flex items-center gap-1.5 justify-end text-[8px] font-bold text-zinc-400">
                          <span>Less</span>
                          <span className="w-2.5 h-2.5 rounded bg-zinc-50 border border-zinc-100" />
                          <span className="w-2.5 h-2.5 rounded bg-purple-100 border border-purple-200/30" />
                          <span className="w-2.5 h-2.5 rounded bg-purple-300" />
                          <span className="w-2.5 h-2.5 rounded bg-purple-500" />
                          <span className="w-2.5 h-2.5 rounded bg-purple-700" />
                          <span>More</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Client-side PDF/Image Export Button */}
              <button
                type="button"
                onClick={() => {
                  // Style a simple print layout and print
                  window.print();
                }}
                className="w-full h-12 rounded-2xl bg-zinc-900 text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 hover:bg-zinc-800"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Print / Save Analytics Report
              </button>
            </div>
          )}

          {/* Sub-tab 2: Patterns */}
          {analyticsTab === "categories" && (
            <div className="flex flex-col gap-6">
              {/* Category Breakdown & Mess vs Outside Food */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Category breakdown (donut + ranked list) */}
                <div className="glass p-5 rounded-3xl flex flex-col gap-4 border border-zinc-100 shadow-sm">
                  <h3 className="font-bold text-foreground text-sm">Category Share</h3>
                  
                  {(() => {
                    const currentMonth = new Date().toISOString().slice(0, 7);
                    const breakdown = getCategoryBreakdown(driveData?.transactions ?? [], allCategories, currentMonth);

                    if (breakdown.length === 0) {
                      return <div className="py-12 text-center text-xs text-zinc-400 italic">No transactions this month</div>;
                    }

                    // Compute simple SVG pie circles (donut)
                    let strokeAccumulator = 0;
                    const radius = 50;
                    const circumference = 2 * Math.PI * radius; // ~314.16

                    return (
                      <div className="flex flex-col gap-5">
                        <div className="flex justify-center items-center py-2 relative">
                          <svg viewBox="0 0 120 120" className="w-32 h-32 transform -rotate-90">
                            {breakdown.map((item: any, idx: any) => {
                              const strokeDash = (item.percentage / 100) * circumference;
                              const strokeOffset = circumference - strokeAccumulator;
                              strokeAccumulator += strokeDash;

                              return (
                                <circle
                                  key={idx}
                                  cx="60"
                                  cy="60"
                                  r={radius}
                                  fill="none"
                                  stroke={item.category.color}
                                  strokeWidth="12"
                                  strokeDasharray={`${strokeDash} ${circumference}`}
                                  strokeDashoffset={strokeOffset}
                                  className="transition-all duration-500 hover:stroke-[14px]"
                                />
                              );
                            })}
                            <circle cx="60" cy="60" r="40" fill="#ffffff" />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total</span>
                            <span className="font-extrabold text-zinc-900 text-sm">
                              {formatCurrency(breakdown.reduce((sum: any, item: any) => sum + item.amount, 0), currencySymbol)}
                            </span>
                          </div>
                        </div>

                        {/* List */}
                        <div className="flex flex-col gap-3.5">
                          {breakdown.map((item: any, idx: any) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSelectedBreakdownCategoryId(item.category.id);
                                setAnalyticsTab("overview");
                              }}
                              className="flex items-center justify-between text-left group w-full hover:bg-zinc-50 p-1.5 rounded-xl transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.category.color }} />
                                <span className="font-bold text-zinc-700 text-xs truncate group-hover:text-purple-600 transition-colors">
                                  {item.category.name}
                                </span>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="font-extrabold text-zinc-900 text-xs">{formatCurrency(item.amount, currencySymbol)}</span>
                                <span className="text-[9px] font-bold text-zinc-400">{item.percentage}%</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Mess vs Outside Eating Food Ratio */}
                <div className="glass p-5 rounded-3xl flex flex-col gap-4 border border-zinc-100 shadow-sm relative overflow-hidden">
                  <h3 className="font-bold text-foreground text-sm">Mess vs. Outside Eating</h3>
                  
                  {(() => {
                    const currentMonth = new Date().toISOString().slice(0, 7);
                    const ratioData = getMessVsOutsideFoodRatio(driveData?.transactions ?? [], currentMonth);
                    const total = ratioData.messSpend + ratioData.outsideSpend;

                    if (total === 0) {
                      return <div className="py-12 text-center text-xs text-zinc-400 italic">No food/mess spend this month</div>;
                    }

                    return (
                      <div className="flex flex-col gap-4 py-1">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Outside Eating Ratio</span>
                          <span className="text-2xl font-extrabold text-pink-500">{ratioData.ratioPercent}%</span>
                        </div>

                        {/* Comparative Split Bar */}
                        <div className="h-5 w-full rounded-xl bg-zinc-100 overflow-hidden flex shadow-inner">
                          {ratioData.messSpend > 0 && (
                            <div
                              className="h-full bg-blue-500 flex items-center justify-center text-[9px] font-extrabold text-white transition-all"
                              style={{ width: `${(ratioData.messSpend / total) * 100}%` }}
                              title={`Mess: ${formatCurrency(ratioData.messSpend, currencySymbol)}`}
                            >
                              {((ratioData.messSpend / total) * 100) >= 15 && "Mess"}
                            </div>
                          )}
                          {ratioData.outsideSpend > 0 && (
                            <div
                              className="h-full bg-pink-500 flex items-center justify-center text-[9px] font-extrabold text-white transition-all border-l border-white"
                              style={{ width: `${(ratioData.outsideSpend / total) * 100}%` }}
                              title={`Outside Eating: ${formatCurrency(ratioData.outsideSpend, currencySymbol)}`}
                            >
                              {((ratioData.outsideSpend / total) * 100) >= 15 && "Outside"}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs font-semibold mt-1">
                          <div className="border-l-2 border-blue-500 pl-2">
                            <p className="text-[10px] text-zinc-400 uppercase">Mess/Canteen Spend</p>
                            <p className="font-extrabold text-foreground mt-0.5">{formatCurrency(ratioData.messSpend, currencySymbol)}</p>
                          </div>
                          <div className="border-l-2 border-pink-500 pl-2">
                            <p className="text-[10px] text-zinc-400 uppercase">Swiggy/Zomato/Eating Out</p>
                            <p className="font-extrabold text-foreground mt-0.5">{formatCurrency(ratioData.outsideSpend, currencySymbol)}</p>
                          </div>
                        </div>

                        <p className="text-[10px] text-zinc-400 font-medium leading-relaxed mt-2 border-t border-zinc-100 pt-3">
                          💡 Outside eating includes transactions under the Mess/Canteen category whose descriptions match common keywords like Zomato, Swiggy, Canteen, Dominos, or Restaurant.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Day of Week Pattern & Top Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Day-of-week Pattern */}
                <div className="glass p-5 rounded-3xl flex flex-col gap-4 border border-zinc-100 shadow-sm">
                  <h3 className="font-bold text-foreground text-sm">Weekday Spending Patterns</h3>
                  
                  {(() => {
                    const pattern = getDayOfWeekPattern(driveData?.transactions ?? []);
                    const maxAvg = Math.max(...pattern.map((p: any) => p.averageAmount), 10);
                    
                    return (
                      <div className="flex flex-col gap-4 select-none">
                        <div className="h-36 flex items-end justify-between px-2 pt-2 border-b border-zinc-200">
                          {pattern.map((pt: any, idx: any) => {
                            const barHeight = (pt.averageAmount / maxAvg) * 100;
                            return (
                              <div key={idx} className="flex flex-col items-center flex-1 group">
                                <div className="text-[8px] font-bold text-zinc-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  ₹{Math.round(pt.averageAmount)}
                                </div>
                                <div
                                  className="w-5 bg-gradient-to-t from-purple-500 to-purple-600 rounded-t-md transition-all group-hover:from-purple-600 group-hover:to-purple-700 shadow-sm"
                                  style={{ height: `${Math.max(barHeight, 4)}%` }}
                                />
                                <span className="text-[9px] font-bold text-zinc-400 mt-2 block uppercase">{pt.dayLabel}</span>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                          Bar values show your average daily spending for each day of the week, calculated across all transaction logs.
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Top merchants/notes */}
                <div className="glass p-5 rounded-3xl flex flex-col gap-4 border border-zinc-100 shadow-sm">
                  <h3 className="font-bold text-foreground text-sm">Top Merchants / Notes</h3>
                  
                  {(() => {
                    const merchants = getTopMerchants(driveData?.transactions ?? [], 5);

                    if (merchants.length === 0) {
                      return <div className="py-12 text-center text-xs text-zinc-400 italic">No notes entered in transactions yet</div>;
                    }

                    return (
                      <div className="flex flex-col gap-3 py-1">
                        {merchants.map((item: any, idx: any) => (
                          <div key={idx} className="flex items-center justify-between border-b border-zinc-50 pb-2.5 last:border-0 last:pb-0">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-foreground text-xs truncate">{item.note}</p>
                              <p className="text-[9px] text-zinc-400 font-bold uppercase">{item.count} {item.count === 1 ? "transaction" : "transactions"}</p>
                            </div>
                            <span className="font-extrabold text-zinc-900 text-sm ml-2">{formatCurrency(item.totalAmount, currencySymbol)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 3: Budgets & Benchmarking */}
          {analyticsTab === "budgets" && (
            <div className="flex flex-col gap-6">
              
              {/* Budgets cumulative vs limit Overlay */}
              <div className="glass p-5 rounded-3xl flex flex-col gap-4 border border-zinc-100 shadow-sm">
                <h3 className="font-bold text-foreground text-sm">Cumulative Budget Overlay</h3>
                
                {(() => {
                  const activeBudgets = (driveData?.budgets ?? []).filter((b: any) => {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    return b.periodEnd >= todayStr;
                  });

                  if (activeBudgets.length === 0) {
                    return <div className="py-12 text-center text-xs text-zinc-400 italic">No active budgets this period</div>;
                  }

                  return (
                    <div className="flex flex-col gap-6">
                      {activeBudgets.map((budget: any) => {
                        const points = getBudgetActualCumulative(driveData?.transactions ?? [], budget, allCategories);
                        const maxVal = Math.max(budget.limitAmount, ...points.map((p: any) => p.actualSpent), 100);

                        const width = 500;
                        const height = 150;
                        const padding = 35;

                        const getX = (idx: number) => padding + (idx / (points.length - 1)) * (width - 2 * padding);
                        const getY = (val: number) => height - padding - (val / maxVal) * (height - 2 * padding);

                        let actualPath = "";
                        points.forEach((p: any, idx: any) => {
                          const cx = getX(idx);
                          const cy = getY(p.actualSpent);
                          if (idx === 0) {
                            actualPath = `M ${cx} ${cy}`;
                          } else {
                            actualPath += ` L ${cx} ${cy}`;
                          }
                        });

                        return (
                          <div key={budget.id} className="border-b border-zinc-50 pb-5 last:border-0 last:pb-0">
                            <div className="flex justify-between items-baseline mb-2">
                              <span className="font-bold text-foreground text-xs">{budget.name}</span>
                              <span className="text-[10px] font-bold text-zinc-400">Limit: {formatCurrency(budget.limitAmount, currencySymbol)}</span>
                            </div>

                            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                              {/* Horizontal limit line (dashed red) */}
                              <line
                                x1={padding}
                                y1={getY(budget.limitAmount)}
                                x2={width - padding}
                                y2={getY(budget.limitAmount)}
                                stroke="#ef4444"
                                strokeWidth="1.5"
                                strokeDasharray="4 4"
                              />

                              {/* Cumulative actual spent line */}
                              <path d={actualPath} fill="none" stroke="#9333ea" strokeWidth="2.5" />

                              {/* Text values */}
                              <text x={width - padding - 5} y={getY(budget.limitAmount) - 5} textAnchor="end" className="text-[8px] font-bold fill-red-500">Limit line</text>
                              <text x={width - padding - 5} y={getY(points[points.length - 1].actualSpent) - 5} textAnchor="end" className="text-[8px] font-bold fill-purple-600">Spent</text>

                              {/* Axes labels */}
                              <text x={padding} y={height - 5} textAnchor="start" className="text-[8px] font-bold fill-zinc-400">{budget.periodStart}</text>
                              <text x={width - padding} y={height - 5} textAnchor="end" className="text-[8px] font-bold fill-zinc-400">{budget.periodEnd}</text>
                            </svg>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Splits historical chart & Benchmarking */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Splits historical summary chart */}
                <div className="glass p-5 rounded-3xl flex flex-col gap-4 border border-zinc-100 shadow-sm">
                  <h3 className="font-bold text-foreground text-sm">Splits History (Owed vs Owe)</h3>
                  
                  {(() => {
                    const history = getSplitHistoryTrend(splits, session?.user?.id || "", 8);
                    const maxVal = Math.max(...history.map((pt: any) => Math.max(pt.owedToYou, pt.youOwe)), 100);

                    const width = 500;
                    const height = 150;
                    const padding = 35;

                    const getX = (idx: number) => padding + (idx / (history.length - 1)) * (width - 2 * padding);
                    const getY = (val: number) => height - padding - (val / maxVal) * (height - 2 * padding);

                    let owedPath = "";
                    let owePath = "";

                    history.forEach((pt: any, idx: any) => {
                      const cx = getX(idx);
                      if (idx === 0) {
                        owedPath = `M ${cx} ${getY(pt.owedToYou)}`;
                        owePath = `M ${cx} ${getY(pt.youOwe)}`;
                      } else {
                        owedPath += ` L ${cx} ${getY(pt.owedToYou)}`;
                        owePath += ` L ${cx} ${getY(pt.youOwe)}`;
                      }
                    });

                    return (
                      <div className="flex flex-col gap-3">
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                          {/* Grid lines */}
                          <line x1={padding} y1={getY(0)} x2={width - padding} y2={getY(0)} stroke="#e4e4e7" strokeWidth="1" />
                          <line x1={padding} y1={getY(maxVal / 2)} x2={width - padding} y2={getY(maxVal / 2)} stroke="#f4f4f5" strokeWidth="1" strokeDasharray="3 3" />
                          <line x1={padding} y1={getY(maxVal)} x2={width - padding} y2={getY(maxVal)} stroke="#f4f4f5" strokeWidth="1" strokeDasharray="3 3" />

                          {/* Paths */}
                          <path d={owedPath} fill="none" stroke="#16a34a" strokeWidth="2" />
                          <path d={owePath} fill="none" stroke="#ef4444" strokeWidth="2" />

                          {/* Dots */}
                          {history.map((pt: any, idx: any) => (
                            <g key={idx}>
                              <circle cx={getX(idx)} cy={getY(pt.owedToYou)} r="2.5" fill="#16a34a" />
                              <circle cx={getX(idx)} cy={getY(pt.youOwe)} r="2.5" fill="#ef4444" />
                            </g>
                          ))}
                        </svg>

                        {/* Legend */}
                        <div className="flex items-center gap-4 justify-center text-[9px] font-bold text-zinc-500">
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-0.5 bg-green-600 inline-block" /> Owed to You (Credits)
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-0.5 bg-red-500 inline-block" /> You Owe (Debts)
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Peer Benchmarking Card */}
                <div className="glass p-5 rounded-3xl flex flex-col gap-4 border border-zinc-100 shadow-sm">
                  <h3 className="font-bold text-foreground text-sm">Peer Benchmarking</h3>
                  
                  {!benchmarkOptIn ? (
                    <div className="flex flex-col gap-3.5 py-4 text-center items-center">
                      <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-700 text-xs">Opt-in Required</h4>
                        <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed px-4">
                          Share your own monthly category totals anonymously to unlock peer benchmarks and compare with other hostellers.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleBenchmarkOptIn(true)}
                        className="h-9 px-4 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md shadow-purple-500/20 active:scale-95 transition-all hover:bg-purple-700"
                      >
                        Enable Benchmarks
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {(() => {
                        const currentMonth = new Date().toISOString().slice(0, 7);
                        
                        // Parse local spend
                        const localSpend: Record<string, number> = {};
                        const localMonthTxs = (driveData?.transactions ?? []).filter(
                          (t: any) =>
                            !t.deletedAt &&
                            (t.type === "expense" || t.type === "debt") &&
                            t.spentAt.slice(0, 7) === currentMonth
                        );
                        for (const t of localMonthTxs) {
                          localSpend[t.categoryId] = (localSpend[t.categoryId] || 0) + t.amount;
                        }

                        // Benchmark threshold floor: 5 users
                        const minUserFloor = 5;

                        const benchmarkList = parentCategories.map((cat: any) => {
                          const aggregate = benchmarkData.find((a: any) => a.categoryId === cat.id);
                          const userSpend = localSpend[cat.id] || 0;
                          
                          if (!aggregate || aggregate.userCount < minUserFloor) {
                            return { cat, userSpend, average: 0, userCount: aggregate?.userCount || 0, isBelowThreshold: true };
                          }

                          const average = Number(aggregate.totalAmount) / aggregate.userCount;
                          const percentDiff = average > 0 ? ((userSpend - average) / average) * 100 : 0;

                          return {
                            cat,
                            userSpend,
                            average,
                            percentDiff,
                            userCount: aggregate.userCount,
                            isBelowThreshold: false,
                          };
                        });

                        const visibleItems = benchmarkList.filter((item: any) => !item.isBelowThreshold);
                        const hiddenCount = benchmarkList.length - visibleItems.length;
                        const maxBarVal = Math.max(...visibleItems.flatMap((i: any) => [i.userSpend, i.average]), 100);

                        return (
                          <div className="flex flex-col gap-4">
                            {visibleItems.length === 0 ? (
                              <p className="text-xs text-zinc-400 italic py-4 text-center">No peer data available yet. More users need to opt-in.</p>
                            ) : (
                              <div className="flex flex-col gap-3">
                                {visibleItems.map((item: any, idx: any) => {
                                  const youPct = (item.userSpend / maxBarVal) * 100;
                                  const avgPct = (item.average / maxBarVal) * 100;
                                  const isOver = item.percentDiff > 0;
                                  return (
                                    <div key={idx} className="flex flex-col gap-1.5">
                                      <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span className="text-zinc-300 flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: item.cat.color }} />
                                          {item.cat.name}
                                        </span>
                                        <span className={`font-extrabold ${isOver ? "text-rose-400" : "text-emerald-400"}`}>
                                          {isOver ? `+${item.percentDiff.toFixed(0)}% above` : `${Math.abs(item.percentDiff).toFixed(0)}% below`}
                                        </span>
                                      </div>
                                      {/* You bar */}
                                      <div className="flex items-center gap-2">
                                        <span className="text-[8px] text-zinc-500 w-5 shrink-0 font-bold">You</span>
                                        <div className="flex-1 h-2.5 rounded-full bg-white/[0.05] overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all duration-700 ${isOver ? "bg-rose-500" : "bg-violet-500"}`}
                                            style={{ width: `${youPct}%` }}
                                          />
                                        </div>
                                        <span className="text-[8px] text-zinc-400 font-bold w-14 text-right shrink-0">{formatCurrency(item.userSpend, currencySymbol)}</span>
                                      </div>
                                      {/* Peers bar */}
                                      <div className="flex items-center gap-2">
                                        <span className="text-[8px] text-zinc-500 w-5 shrink-0 font-bold">Avg</span>
                                        <div className="flex-1 h-2.5 rounded-full bg-white/[0.05] overflow-hidden">
                                          <div
                                            className="h-full rounded-full bg-zinc-500 transition-all duration-700"
                                            style={{ width: `${avgPct}%` }}
                                          />
                                        </div>
                                        <span className="text-[8px] text-zinc-400 font-bold w-14 text-right shrink-0">{formatCurrency(item.average, currencySymbol)}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="flex items-start gap-1.5 text-[9px] text-zinc-500 font-bold bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06] mt-1">
                              <Shield className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                              <span>
                                Privacy floor: {minUserFloor} users required. {hiddenCount > 0 ? `${hiddenCount} categor${hiddenCount === 1 ? "y" : "ies"} hidden.` : "All categories shown."}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Semester-over-Semester allowance comparison */}
              {(() => {
                const comparison = getSemesterComparison(driveData?.transactions ?? [], driveData?.allowanceConfig);
                if (!comparison) return null; // Hide if not semester allowance

                return (
                  <div className="glass p-5 rounded-3xl flex flex-col gap-4 border border-zinc-100 shadow-sm relative overflow-hidden">
                    <h3 className="font-bold text-foreground text-sm">Semester-over-Semester Comparison</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                      <div className="flex flex-col gap-1 border-r border-zinc-100 pr-5">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Current Cycle Spend</span>
                        <span className="text-3xl font-extrabold text-zinc-950">{formatCurrency(comparison.currentTotal, currencySymbol)}</span>
                        {comparison.hasPrevious && (
                          <span className={`text-[10px] font-bold mt-1 ${comparison.percentChange > 0 ? "text-red-500" : "text-green-600"}`}>
                            {comparison.percentChange > 0 ? `+${comparison.percentChange}% higher` : `${comparison.percentChange}% lower`} than previous semester
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1 pl-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Previous Cycle Spend</span>
                        <span className="text-xl font-extrabold text-zinc-500">
                          {comparison.hasPrevious ? formatCurrency(comparison.previousTotal, currencySymbol) : "No logs recorded"}
                        </span>
                        <p className="text-[9px] text-zinc-400 leading-normal mt-1 font-medium">
                          Compares spending totals in the current semester cycle (since {driveData?.allowanceConfig?.cycleStart}) against logs from the preceding cycle.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Sub-tab 4: Map View */}
          {analyticsTab === "map" && (
            <MapView transactions={transactions} currencySymbol={currencySymbol} />
          )}
        </section>
    </>
  );
}

// ─── Leaflet Map Component ────────────────────────────────────────────────────
function MapView({ transactions, currencySymbol }: { transactions: any[]; currencySymbol: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const geoTxns = transactions.filter(
    (t) => !t.deletedAt && t.latitude != null && t.longitude != null && t.type !== "income"
  );

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Inject Leaflet CSS once
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const loadMap = () => {
      const L = (window as any).L;
      if (!L) return;

      const defaultCenter: [number, number] = geoTxns.length > 0
        ? [geoTxns[0].latitude, geoTxns[0].longitude]
        : [20.5937, 78.9629]; // India center

      const map = L.map(mapRef.current, {
        center: defaultCenter,
        zoom: geoTxns.length > 0 ? 14 : 5,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Custom pin icon
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:28px;height:28px;background:linear-gradient(135deg,#7c3aed,#db2777);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -30],
      });

      geoTxns.forEach((t) => {
        const amtFormatted = new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: currencySymbol === "₹" ? "INR" : "USD",
          maximumFractionDigits: 0,
        }).format(t.amount);

        const popup = `
          <div style="font-family:system-ui,sans-serif;min-width:160px">
            <div style="font-weight:700;font-size:13px;color:#18181b">${t.note || "Transaction"}</div>
            <div style="font-size:12px;color:#7c3aed;font-weight:700;margin:4px 0">${amtFormatted}</div>
            <div style="font-size:10px;color:#71717a">${new Date(t.spentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
          </div>
        `;
        L.marker([t.latitude, t.longitude], { icon }).addTo(map).bindPopup(popup);
      });

      mapInstanceRef.current = map;
    };

    // Load Leaflet JS if not already loaded
    if ((window as any).L) {
      loadMap();
    } else {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = loadMap;
      document.head.appendChild(script);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Spending Map</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase mt-0.5">
            {geoTxns.length} location-tagged transaction{geoTxns.length !== 1 ? "s" : ""}
          </p>
        </div>
        {geoTxns.length > 0 && (
          <div className="text-[10px] font-bold text-violet-400 bg-violet-500/10 px-3 py-1.5 rounded-xl border border-violet-500/15">
            Tap a pin for details
          </div>
        )}
      </div>

      {geoTxns.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 bg-white/[0.03] rounded-3xl border border-dashed border-white/[0.08]">
          <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-violet-400" />
          </div>
          <div className="text-center">
            <h4 className="font-bold text-white text-sm">No location data yet</h4>
            <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed max-w-64">
              Transactions with GPS coordinates will show as map pins here. Add location when logging a transaction.
            </p>
          </div>
        </div>
      ) : (
        <div
          ref={mapRef}
          className="w-full rounded-3xl overflow-hidden border border-white/[0.08] shadow-lg"
          style={{ height: "420px" }}
        />
      )}

      {/* Location-tagged txn list */}
      {geoTxns.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider">Tagged Transactions</h3>
          {geoTxns.slice(0, 10).map((t: any) => (
            <div key={t.id} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] px-4 py-3 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <div>
                  <p className="font-bold text-white text-xs">{t.note || "Transaction"}</p>
                  <p className="text-[10px] text-zinc-500 font-medium">{new Date(t.spentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                </div>
              </div>
              <span className="font-extrabold text-rose-400 text-sm">−{formatCurrency(t.amount, currencySymbol)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
