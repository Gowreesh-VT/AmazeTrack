"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import type { Category, DriveData, Transaction, Budget, Goal, AllowanceConfig, Subscription, RecurringTemplate } from "@/lib/types";
import { Home as HomeIcon, Plus, MoreHorizontal, LogOut, Trash2, Edit2, Wallet, Target, Calendar, Check, X, PiggyBank, Percent, AlertTriangle, Users, UserPlus, Coins, ArrowRight, CheckCircle2, XCircle, PlusCircle, Settings, TrendingUp, BarChart3, PieChart, Grid, FileSpreadsheet, Upload, Download, RefreshCw, User, Lock, Shield, Play, Pause, Clock, PanelLeft } from "lucide-react";
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
} from "@/lib/analytics";
import { generateScheduledTransactions } from "@/lib/scheduler";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type TransactionForm = {
  id?: string;
  amount: string;
  categoryId: string;
  note: string;
  spentAt: string;
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getPeriodEndDate(startDateStr: string, periodType: "weekly" | "monthly" | "semester" | "custom"): string {
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return startDateStr;
  
  if (periodType === "weekly") {
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return end.toISOString().slice(0, 10);
  } else if (periodType === "monthly") {
    const end = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
    const adjustedEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    return adjustedEnd.toISOString().slice(0, 10);
  }
  return startDateStr;
}

function visibleTransactions(data: DriveData | null) {
  return (data?.transactions ?? [])
    .filter((transaction) => !transaction.deletedAt && (transaction.type === "expense" || transaction.type === "debt"))
    .sort((a, b) => new Date(b.spentAt).getTime() - new Date(a.spentAt).getTime());
}

export default function Home() {
  const { data: session, status } = useSession();
  const [driveData, setDriveData] = useState<DriveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"home" | "budgets" | "splits" | "analytics" | "add">("home");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TransactionForm>({
    amount: "",
    categoryId: "",
    note: "",
    spentAt: todayInputValue(),
  });
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null);
  const [subName, setSubName] = useState("");

  // Sub-tab under "Budgets" tab
  const [budgetsSubTab, setBudgetsSubTab] = useState<"budgets" | "allowance" | "goals" | "recurring" | "subscriptions">("budgets");

  // Budget Modal/Form state
  const [isAddingBudget, setIsAddingBudget] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetForm, setBudgetForm] = useState({
    name: "",
    limitAmount: "",
    categoryIds: [] as string[],
    periodType: "monthly" as "weekly" | "monthly" | "semester" | "custom",
    periodStart: todayInputValue(),
    periodEnd: getPeriodEndDate(todayInputValue(), "monthly"),
  });

  // Allowance Form state
  const [isEditingAllowance, setIsEditingAllowance] = useState(false);
  const [allowanceForm, setAllowanceForm] = useState({
    amount: "",
    cycleType: "monthly" as "monthly" | "semester",
    cycleStart: todayInputValue(),
    cycleEnd: "",
  });

  // Goal Modal/Form state
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalForm, setGoalForm] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "0",
    targetDate: "",
  });
  
  // Quick Add Funds for Goals
  const [quickAddFunds, setQuickAddFunds] = useState<{ [goalId: string]: string }>({});

  // Room states
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");

  // Splits states
  const [splits, setSplits] = useState<any[]>([]);
  const [isAddingSharedExpense, setIsAddingSharedExpense] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Shared Expense Form state
  const [sharedExpenseForm, setSharedExpenseForm] = useState({
    roomId: "",
    totalAmount: "",
    categoryId: "",
    note: "",
    spentAt: todayInputValue(),
    splits: {} as { [userId: string]: string },
  });

  // Settings & Peer Benchmarks
  const [showSettings, setShowSettings] = useState(false);
  const [benchmarkOptIn, setBenchmarkOptIn] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState<any[]>([]);

  // Analytics
  const [analyticsTab, setAnalyticsTab] = useState<"overview" | "categories" | "budgets">("overview");
  const [selectedBreakdownCategoryId, setSelectedBreakdownCategoryId] = useState<string | null>(null);
  const [trendPeriod, setTrendPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [trendDays, setTrendDays] = useState<number>(30); // 7, 30, 90

  // PDF / CSV Import
  const [importModalType, setImportModalType] = useState<"pdf" | "csv" | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<any[]>([]);
  const [possibleDuplicates, setPossibleDuplicates] = useState<Record<string, boolean>>({});
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRawRows, setCsvRawRows] = useState<string[][]>([]);
  const [csvMapping, setCsvMapping] = useState({ date: 0, amount: 1, note: 2, category: 3 });
  const [showCsvMappingUI, setShowCsvMappingUI] = useState(false);

  // Budgets section sub-tab state
  const [budgetsSection, setBudgetsSection] = useState<"budgets" | "goals" | "recurring" | "subscriptions">("budgets");

  // Repeating Transactions Modals & Form State
  const [isAddingRepeating, setIsAddingRepeating] = useState(false);
  const [editingRepeating, setEditingRepeating] = useState<RecurringTemplate | null>(null);
  const [repeatingForm, setRepeatingForm] = useState({
    amount: "",
    categoryId: "",
    note: "",
    frequency: "monthly" as "weekly" | "monthly",
    startDate: todayInputValue(),
    account: "",
  });

  // Subscriptions Modals & Form State
  const [isAddingSubscription, setIsAddingSubscription] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [subscriptionForm, setSubscriptionForm] = useState({
    name: "",
    amount: "",
    categoryId: "subscriptions",
    billingDay: "1",
  });

  // Dark Mode
  const { theme: themeMode, setTheme: setThemeMode } = useTheme();

  // Sidebar Toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Option 3: Smart Alerts Dismissals
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  // Option 4: Parent Report Modal States
  const [showParentReport, setShowParentReport] = useState(false);
  const [parentReportForm, setParentReportForm] = useState({
    dateRange: "this-month" as "this-month" | "last-month" | "semester" | "custom",
    customStart: "",
    customEnd: "",
    includeSplits: true,
    selectedCategoryIds: [] as string[],
  });

  useEffect(() => {
    if (status !== "authenticated") return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [driveRes, roomsRes, splitsRes, settingsRes] = await Promise.all([
          fetch("/api/drive-data", { cache: "no-store" }),
          fetch("/api/rooms", { cache: "no-store" }),
          fetch("/api/splits", { cache: "no-store" }),
          fetch("/api/user/settings", { cache: "no-store" }),
        ]);

        if (!driveRes.ok) throw new Error(await driveRes.text());
        let data = (await driveRes.json()) as DriveData;
        
        // 1. Theme Configuration
        const storedTheme = localStorage.getItem("amazetrack_theme");
        if (storedTheme === "dark" || storedTheme === "light") {
          setThemeMode(storedTheme);
          if (storedTheme === "dark") {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        } else {
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          setThemeMode(prefersDark ? "dark" : "light");
          if (prefersDark) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }

        // 2. Scheduled Transactions check
        const { updatedData, generatedCount } = generateScheduledTransactions(data);
        if (generatedCount > 0) {
          data = updatedData;
          await fetch("/api/drive-data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ driveData: updatedData }),
          });
        }

        setDriveData(data);
        setForm((current) => ({ ...current, categoryId: data.categories.find((category) => !category.parentId)?.id ?? "" }));

        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          setRooms(roomsData);
          if (roomsData.length > 0) {
            setSelectedRoomId(roomsData[0].id);
          }
        }
        if (splitsRes.ok) {
          const splitsData = await splitsRes.json();
          setSplits(splitsData);
        }
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setBenchmarkOptIn(settingsData.benchmarkOptIn);
          
          if (generatedCount > 0 && settingsData.benchmarkOptIn) {
            await triggerBenchmarkUpdatesInternal(data, true);
          }

          if (settingsData.benchmarkOptIn) {
            const benchRes = await fetch("/api/benchmarks");
            if (benchRes.ok) {
              setBenchmarkData(await benchRes.json());
            }
          }
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load data");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [status]);

  const allCategories = useMemo(() => driveData?.categories ?? [], [driveData]);
  const parentCategories = useMemo(
    () => allCategories.filter((category) => !category.parentId),
    [allCategories],
  );
  const transactions = useMemo(() => visibleTransactions(driveData), [driveData]);
  const monthTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((transaction) => {
      const spentAt = new Date(transaction.spentAt);
      return spentAt.getMonth() === now.getMonth() && spentAt.getFullYear() === now.getFullYear();
    });
  }, [transactions]);
  const monthTotal = monthTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const breakdown = parentCategories
    .map((parent) => {
      const subcategoryIds = allCategories
        .filter((c) => c.parentId === parent.id)
        .map((c) => c.id);
      const amount = monthTransactions
        .filter(
          (transaction) =>
            transaction.categoryId === parent.id ||
            subcategoryIds.includes(transaction.categoryId),
        )
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      return { category: parent, amount };
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const budgetsList = useMemo(() => {
    if (!driveData?.budgets) return [];
    return driveData.budgets.map((budget) => {
      const budgetExpenses = transactions.filter((t) => {
        const spentAtStr = t.spentAt.slice(0, 10);
        const inPeriod = spentAtStr >= budget.periodStart && spentAtStr <= budget.periodEnd;
        if (!inPeriod) return false;
        
        if (budget.categoryIds.length === 0) return true;
        
        return budget.categoryIds.some((catId) => {
          if (t.categoryId === catId) return true;
          const cat = allCategories.find((c) => c.id === t.categoryId);
          return cat?.parentId === catId;
        });
      });
      
      const spent = budgetExpenses.reduce((sum, t) => sum + t.amount, 0);
      return {
        ...budget,
        spent,
      };
    });
  }, [driveData?.budgets, transactions, allCategories]);

  const activeBudgets = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return budgetsList.filter((b) => b.periodEnd >= todayStr);
  }, [budgetsList]);

  const historyBudgets = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return budgetsList.filter((b) => b.periodEnd < todayStr);
  }, [budgetsList]);

  const allowanceConfig = driveData?.allowanceConfig;
  const allowanceStatus = useMemo(() => {
    if (!allowanceConfig) return null;
    
    const start = new Date(allowanceConfig.cycleStart);
    start.setHours(0, 0, 0, 0);
    
    const cycleExpenses = transactions.filter((t) => {
      const spentAt = new Date(t.spentAt);
      spentAt.setHours(0, 0, 0, 0);
      return spentAt.getTime() >= start.getTime();
    });
    
    const spentSoFar = cycleExpenses.reduce((sum, t) => sum + t.amount, 0);
    const remaining = allowanceConfig.amount - spentSoFar;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - start.getTime();
    const daysElapsed = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);
    
    const averageDailySpend = spentSoFar / daysElapsed;
    
    let runOutDate: Date | null = null;
    let runOutDateStr = "";
    let isWarning = false;
    let expectedEnd: Date | null = null;

    if (averageDailySpend > 0) {
      const totalDays = allowanceConfig.amount / averageDailySpend;
      const runOutMs = start.getTime() + totalDays * 24 * 60 * 60 * 1000;
      runOutDate = new Date(runOutMs);
      runOutDateStr = runOutDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      
      if (allowanceConfig.cycleEnd) {
        expectedEnd = new Date(allowanceConfig.cycleEnd);
        expectedEnd.setHours(0, 0, 0, 0);
        isWarning = runOutDate.getTime() < expectedEnd.getTime();
      } else if (allowanceConfig.cycleType === "monthly") {
        expectedEnd = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
        isWarning = runOutDate.getTime() < expectedEnd.getTime();
      }
    } else {
      runOutDateStr = "no spend yet";
    }

    return {
      spentSoFar,
      remaining,
      daysElapsed,
      averageDailySpend,
      runOutDate,
      runOutDateStr,
      isWarning,
      expectedEnd,
    };
  }, [allowanceConfig, transactions]);

  const smartAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      type: "budget_warning" | "subscription_upcoming" | "allowance_warning";
      severity: "info" | "warning" | "critical";
      title: string;
      message: string;
    }> = [];

    // 1. Budget Warnings
    activeBudgets.forEach((budget) => {
      const pct = budget.spent / budget.limitAmount;
      if (pct >= 1.0) {
        alerts.push({
          id: `budget-crit-${budget.id}`,
          type: "budget_warning",
          severity: "critical",
          title: `Over Budget: ${budget.name}`,
          message: `You spent ${currency.format(budget.spent)} of your ${currency.format(budget.limitAmount)} budget limit.`,
        });
      } else if (pct >= 0.8) {
        alerts.push({
          id: `budget-warn-${budget.id}`,
          type: "budget_warning",
          severity: "warning",
          title: `Budget Alert: ${budget.name}`,
          message: `You spent ${Math.round(pct * 100)}% (${currency.format(budget.spent)}) of your ${currency.format(budget.limitAmount)} budget.`,
        });
      } else if (pct >= 0.5) {
        alerts.push({
          id: `budget-info-${budget.id}`,
          type: "budget_warning",
          severity: "info",
          title: `Budget Update: ${budget.name}`,
          message: `You reached ${Math.round(pct * 100)}% of your ${currency.format(budget.limitAmount)} budget.`,
        });
      }
    });

    // 2. Subscription Warnings (within 2 days)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    (driveData?.subscriptions ?? []).forEach((sub) => {
      if (!sub.active) return;
      
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

      if (daysRemaining >= 0 && daysRemaining <= 2) {
        alerts.push({
          id: `sub-warn-${sub.id}-${billingDate.toISOString().slice(0, 10)}`,
          type: "subscription_upcoming",
          severity: "warning",
          title: `Upcoming Renewal: ${sub.name}`,
          message: `Your monthly renewal of ${currency.format(sub.amount)} is in ${daysRemaining === 0 ? "today" : daysRemaining === 1 ? "tomorrow" : `${daysRemaining} days`} (${billingDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}).`,
        });
      }
    });

    // 3. Allowance Warn
    if (allowanceStatus && allowanceStatus.isWarning) {
      alerts.push({
        id: "allowance-warn-burn",
        type: "allowance_warning",
        severity: "warning",
        title: "Fast Allowance Burn Rate",
        message: `Your allowance runs out by ${allowanceStatus.runOutDateStr} if you keep spending at your current daily rate.`,
      });
    }

    return alerts.filter((alert) => !dismissedAlertIds.includes(alert.id));
  }, [activeBudgets, driveData?.subscriptions, allowanceStatus, dismissedAlertIds]);

  const goalsList = useMemo(() => {
    return driveData?.goals ?? [];
  }, [driveData?.goals]);

  // Phase 2 Sync Handlers
  async function saveBudget(e: FormEvent) {
    e.preventDefault();
    if (!driveData) return;

    const limitAmount = Number(budgetForm.limitAmount);
    if (isNaN(limitAmount) || limitAmount <= 0) return;

    const id = editingBudget?.id ?? crypto.randomUUID();
    const newBudget: Budget = {
      id,
      name: budgetForm.name.trim(),
      categoryIds: budgetForm.categoryIds,
      limitAmount,
      periodType: budgetForm.periodType,
      periodStart: budgetForm.periodStart,
      periodEnd: budgetForm.periodEnd,
    };

    const nextBudgets = editingBudget
      ? driveData.budgets.map(b => b.id === id ? newBudget : b)
      : [...driveData.budgets, newBudget];

    setDriveData({ ...driveData, budgets: nextBudgets });
    setIsAddingBudget(false);
    setEditingBudget(null);
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/drive-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgets: nextBudgets }),
      });
      if (!response.ok) throw new Error(await response.text());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sync budget");
    } finally {
      setSyncing(false);
    }
  }

  async function deleteBudget(id: string) {
    if (!driveData) return;

    const nextBudgets = driveData.budgets.filter(b => b.id !== id);

    setDriveData({ ...driveData, budgets: nextBudgets });
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/drive-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgets: nextBudgets }),
      });
      if (!response.ok) throw new Error(await response.text());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sync budget delete");
    } finally {
      setSyncing(false);
    }
  }

  async function saveAllowance(e: FormEvent) {
    e.preventDefault();
    if (!driveData) return;

    const amount = Number(allowanceForm.amount);
    if (isNaN(amount) || amount <= 0) return;

    const config: AllowanceConfig = {
      amount,
      cycleType: allowanceForm.cycleType,
      cycleStart: allowanceForm.cycleStart,
      cycleEnd: allowanceForm.cycleEnd ? allowanceForm.cycleEnd : undefined,
    };

    setDriveData({ ...driveData, allowanceConfig: config });
    setIsEditingAllowance(false);
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/drive-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowanceConfig: config }),
      });
      if (!response.ok) throw new Error(await response.text());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sync allowance");
    } finally {
      setSyncing(false);
    }
  }

  async function deleteAllowance() {
    if (!driveData) return;

    setDriveData({ ...driveData, allowanceConfig: undefined });
    setIsEditingAllowance(false);
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/drive-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowanceConfig: null }),
      });
      if (!response.ok) throw new Error(await response.text());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sync allowance deletion");
    } finally {
      setSyncing(false);
    }
  }

  async function saveGoal(e: FormEvent) {
    e.preventDefault();
    if (!driveData) return;

    const targetAmount = Number(goalForm.targetAmount);
    const currentAmount = Number(goalForm.currentAmount);
    if (isNaN(targetAmount) || targetAmount <= 0) return;
    if (isNaN(currentAmount) || currentAmount < 0) return;

    const id = editingGoal?.id ?? crypto.randomUUID();
    const newGoal: Goal = {
      id,
      name: goalForm.name.trim(),
      targetAmount,
      currentAmount,
      targetDate: goalForm.targetDate ? goalForm.targetDate : undefined,
    };

    const nextGoals = editingGoal
      ? driveData.goals.map(g => g.id === id ? newGoal : g)
      : [...driveData.goals, newGoal];

    setDriveData({ ...driveData, goals: nextGoals });
    setIsAddingGoal(false);
    setEditingGoal(null);
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/drive-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: nextGoals }),
      });
      if (!response.ok) throw new Error(await response.text());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sync goal");
    } finally {
      setSyncing(false);
    }
  }

  async function addGoalFunds(goal: Goal, amountToAdd: number) {
    if (!driveData || isNaN(amountToAdd) || amountToAdd <= 0) return;

    const nextGoals = driveData.goals.map(g => {
      if (g.id === goal.id) {
        return { ...g, currentAmount: g.currentAmount + amountToAdd };
      }
      return g;
    });

    setDriveData({ ...driveData, goals: nextGoals });
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/drive-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: nextGoals }),
      });
      if (!response.ok) throw new Error(await response.text());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add funds to goal");
    } finally {
      setSyncing(false);
    }
  }

  async function deleteGoal(id: string) {
    if (!driveData) return;

    const nextGoals = driveData.goals.filter(g => g.id !== id);

    setDriveData({ ...driveData, goals: nextGoals });
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/drive-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: nextGoals }),
      });
      if (!response.ok) throw new Error(await response.text());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sync goal delete");
    } finally {
      setSyncing(false);
    }
  }

  function startAddBudget() {
    setEditingBudget(null);
    setBudgetForm({
      name: "",
      limitAmount: "",
      categoryIds: [],
      periodType: "monthly",
      periodStart: todayInputValue(),
      periodEnd: getPeriodEndDate(todayInputValue(), "monthly"),
    });
    setIsAddingBudget(true);
  }

  function startEditBudget(budget: Budget) {
    setEditingBudget(budget);
    setBudgetForm({
      name: budget.name,
      limitAmount: String(budget.limitAmount),
      categoryIds: budget.categoryIds,
      periodType: budget.periodType,
      periodStart: budget.periodStart,
      periodEnd: budget.periodEnd,
    });
    setIsAddingBudget(true);
  }

  function startEditAllowance() {
    if (allowanceConfig) {
      setAllowanceForm({
        amount: String(allowanceConfig.amount),
        cycleType: allowanceConfig.cycleType,
        cycleStart: allowanceConfig.cycleStart,
        cycleEnd: allowanceConfig.cycleEnd ?? "",
      });
    } else {
      setAllowanceForm({
        amount: "",
        cycleType: "monthly",
        cycleStart: todayInputValue(),
        cycleEnd: "",
      });
    }
    setIsEditingAllowance(true);
  }

  function startAddGoal() {
    setEditingGoal(null);
    setGoalForm({
      name: "",
      targetAmount: "",
      currentAmount: "0",
      targetDate: "",
    });
    setIsAddingGoal(true);
  }

  function startEditGoal(goal: Goal) {
    setEditingGoal(goal);
    setGoalForm({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      currentAmount: String(goal.currentAmount),
      targetDate: goal.targetDate ?? "",
    });
    setIsAddingGoal(true);
  }

  function handleBudgetFormChange(field: string, value: any) {
    setBudgetForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "periodStart" || field === "periodType") {
        if (next.periodType !== "custom" && next.periodType !== "semester") {
          next.periodEnd = getPeriodEndDate(next.periodStart, next.periodType);
        }
      }
      return next;
    });
  }

  function toggleBudgetCategory(categoryId: string) {
    setBudgetForm((prev) => {
      const isSelected = prev.categoryIds.includes(categoryId);
      const nextCategoryIds = isSelected
        ? prev.categoryIds.filter((id) => id !== categoryId)
        : [...prev.categoryIds, categoryId];
      return { ...prev, categoryIds: nextCategoryIds };
    });
  }

  // Room Actions
  async function createRoom(e: FormEvent) {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setSyncing(true);
    setError(null);
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoomName.trim() }),
      });
      if (!response.ok) throw new Error(await response.text());
      const newRoom = await response.json();
      setRooms((current) => [newRoom, ...current]);
      setSelectedRoomId(newRoom.id);
      setNewRoomName("");
      setIsCreatingRoom(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create room");
    } finally {
      setSyncing(false);
    }
  }

  async function joinRoom(e: FormEvent) {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    setSyncing(true);
    setError(null);
    try {
      const response = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCodeInput.trim() }),
      });
      if (!response.ok) throw new Error(await response.text());
      const joinedRoom = await response.json();
      setRooms((current) => {
        const exists = current.some((r) => r.id === joinedRoom.id);
        return exists ? current : [joinedRoom, ...current];
      });
      setSelectedRoomId(joinedRoom.id);
      setInviteCodeInput("");
      setIsJoiningRoom(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join room");
    } finally {
      setSyncing(false);
    }
  }

  async function leaveRoom(roomId: string) {
    if (!confirm("Are you sure you want to leave this room?")) return;
    setSyncing(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${roomId}/leave`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(await response.text());
      setRooms((current) => current.filter((r) => r.id !== roomId));
      if (selectedRoomId === roomId) {
        setSelectedRoomId(rooms.find((r) => r.id !== roomId)?.id ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not leave room");
    } finally {
      setSyncing(false);
    }
  }

  // Splits Actions
  async function submitSharedExpense(e: FormEvent) {
    e.preventDefault();
    if (!driveData || !session?.user?.id) return;

    const roomId = sharedExpenseForm.roomId;
    const totalAmount = Number(sharedExpenseForm.totalAmount);
    const categoryId = sharedExpenseForm.categoryId;
    const note = sharedExpenseForm.note.trim();
    const spentAt = new Date(`${sharedExpenseForm.spentAt}T12:00:00`).toISOString();

    if (!roomId) {
      alert("Please select a room");
      return;
    }
    if (isNaN(totalAmount) || totalAmount <= 0) {
      alert("Invalid total amount");
      return;
    }
    if (!categoryId) {
      alert("Please select a category");
      return;
    }

    const room = rooms.find((r) => r.id === roomId);
    if (!room) {
      alert("Room not found");
      return;
    }

    const memberIds: string[] = room.memberships.map((m: any) => m.user.id);
    let finalSplits: { userId: string; amount: number }[] = [];

    if (splitMethod === "equal") {
      if (selectedExpenseMembers.length === 0) {
        alert("Please select at least one member to split with");
        return;
      }
      const share = Number((totalAmount / selectedExpenseMembers.length).toFixed(2));
      
      finalSplits = selectedExpenseMembers
        .filter((id: string) => id !== session.user.id)
        .map((id: string) => ({
          userId: id,
          amount: share,
        }));
    } else {
      let sum = 0;
      const customShares: { [userId: string]: number } = {};
      for (const id of memberIds) {
        const val = Number(sharedExpenseForm.splits[id]) || 0;
        customShares[id] = val;
        sum += val;
      }

      if (Math.abs(sum - totalAmount) > 0.01) {
        alert(`Sum of shares (₹${sum.toFixed(2)}) must equal total amount (₹${totalAmount.toFixed(2)})`);
        return;
      }

      finalSplits = memberIds
        .filter((id: string) => id !== session.user.id && customShares[id] > 0)
        .map((id: string) => ({
          userId: id,
          amount: customShares[id],
        }));
    }

    const timestamp = new Date().toISOString();
    const personalTxId = crypto.randomUUID();
    const optimistic: Transaction = {
      id: personalTxId,
      amount: totalAmount,
      type: "expense",
      categoryId,
      note: note ? `[Shared] ${note}` : `[Shared] Expense`,
      spentAt,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setDriveData((current) => {
      if (!current) return current;
      return {
        ...current,
        transactions: [...current.transactions, optimistic],
        updatedAt: timestamp,
      };
    });

    setSyncing(true);
    setError(null);
    setIsAddingSharedExpense(false);

    try {
      const driveTxRes = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: personalTxId,
          amount: totalAmount,
          type: "expense",
          categoryId,
          note: note ? `[Shared] ${note}` : `[Shared] Expense`,
          spentAt,
        }),
      });
      if (!driveTxRes.ok) throw new Error(await driveTxRes.text());

      const nextData: DriveData = {
        ...driveData,
        transactions: [...driveData.transactions, optimistic],
        updatedAt: timestamp,
      };
      await triggerBenchmarkUpdatesInternal(nextData);

      if (finalSplits.length > 0) {
        const splitRes = await fetch("/api/splits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            note: note || allCategories.find((c) => c.id === categoryId)?.name || "Shared Expense",
            splits: finalSplits,
          }),
        });
        if (!splitRes.ok) throw new Error(await splitRes.text());
        const newSplits = await splitRes.json();
        setSplits((current) => [...newSplits, ...current]);
      }
      
      setActiveView("splits");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save shared expense");
    } finally {
      setSyncing(false);
    }
  }

  async function respondToSplit(splitId: string, status: "accepted" | "disputed") {
    if (!driveData) return;
    setSyncing(true);
    setError(null);

    try {
      const split = splits.find((s) => s.id === splitId);
      if (!split) throw new Error("Split request not found");

      const response = await fetch(`/api/splits/${splitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error(await response.text());
      const updatedSplit = await response.json();

      setSplits((current) => current.map((s) => s.id === splitId ? updatedSplit : s));

      if (status === "accepted") {
        const timestamp = new Date().toISOString();
        const debtTxId = crypto.randomUUID();

        const label = (split.note || "").toLowerCase().trim();
        let categoryId = "other";
        const matchedCat = allCategories.find((c) => 
          label.includes(c.name.toLowerCase()) || 
          c.name.toLowerCase().includes(label)
        );
        if (matchedCat) {
          categoryId = matchedCat.id;
        }

        const noteText = `[Split] ${split.note || "Shared"} (Payer: ${split.requester.name || split.requester.email})`;

        const optimisticDebt: Transaction = {
          id: debtTxId,
          amount: Number(split.amount),
          type: "debt",
          categoryId,
          note: noteText,
          spentAt: split.createdAt,
          createdAt: timestamp,
          updatedAt: timestamp,
          splitRequestId: splitId,
        };

        setDriveData({
          ...driveData,
          transactions: [...driveData.transactions, optimisticDebt],
          updatedAt: timestamp,
        });

        const driveTxRes = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: debtTxId,
            amount: Number(split.amount),
            type: "debt",
            categoryId,
            note: noteText,
            spentAt: split.createdAt,
            splitRequestId: splitId,
          }),
        });
        if (!driveTxRes.ok) throw new Error(await driveTxRes.text());
        const nextData: DriveData = {
          ...driveData,
          transactions: [...driveData.transactions, optimisticDebt],
          updatedAt: timestamp,
        };
        await triggerBenchmarkUpdatesInternal(nextData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not respond to split request");
    } finally {
      setSyncing(false);
    }
  }

  async function initiateSettleUp(roomId: string, otherUserId: string) {
    if (!session?.user?.id) return;
    setSyncing(true);
    setError(null);

    const targetSplits = splits.filter((s) => {
      const isRoom = s.roomId === roomId;
      const isAccepted = s.status === "accepted";
      const isPair = 
        (s.requesterId === session.user.id && s.recipientId === otherUserId) ||
        (s.recipientId === session.user.id && s.requesterId === otherUserId);
      return isRoom && isAccepted && isPair;
    });

    try {
      const nextStatus = `settle_pending_by_${session.user.id}`;
      await Promise.all(
        targetSplits.map((s) =>
          fetch(`/api/splits/${s.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextStatus }),
          })
        )
      );

      const splitsRes = await fetch("/api/splits", { cache: "no-store" });
      if (splitsRes.ok) {
        setSplits(await splitsRes.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not initiate settle up");
    } finally {
      setSyncing(false);
    }
  }

  async function respondToSettlePending(roomId: string, otherUserId: string, action: "confirm" | "decline") {
    if (!session?.user?.id) return;
    setSyncing(true);
    setError(null);

    const targetSplits = splits.filter((s) => {
      const isRoom = s.roomId === roomId;
      const isSettlePending = s.status.startsWith("settle_pending_by_");
      const isPair = 
        (s.requesterId === session.user.id && s.recipientId === otherUserId) ||
        (s.recipientId === session.user.id && s.requesterId === otherUserId);
      return isRoom && isSettlePending && isPair;
    });

    try {
      const nextStatus = action === "confirm" ? "settled" : "accepted";
      await Promise.all(
        targetSplits.map((s) =>
          fetch(`/api/splits/${s.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextStatus }),
          })
        )
      );

      const splitsRes = await fetch("/api/splits", { cache: "no-store" });
      if (splitsRes.ok) {
        setSplits(await splitsRes.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not respond to settlement");
    } finally {
      setSyncing(false);
    }
  }

  const [splitMethod, setSplitMethod] = useState<"equal" | "custom">("equal");
  const [selectedExpenseMembers, setSelectedExpenseMembers] = useState<string[]>([]);

  const roomLedger = useMemo(() => {
    if (!selectedRoomId || !session?.user?.id) return [];
    const room = rooms.find((r: any) => r.id === selectedRoomId);
    if (!room) return [];

    const members = room.memberships.map((m: any) => m.user);
    const roomSplits = splits.filter((s: any) => s.roomId === selectedRoomId);

    const balances: { [key: string]: number } = {};
    
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const key = members[i].id < members[j].id 
          ? `${members[i].id}:${members[j].id}` 
          : `${members[j].id}:${members[i].id}`;
        balances[key] = 0;
      }
    }

    for (const split of roomSplits) {
      const isAccepted = split.status === "accepted" || split.status.startsWith("settle_pending_by_");
      if (!isAccepted) continue;

      const user1 = split.requesterId;
      const user2 = split.recipientId;
      
      const key = user1 < user2 ? `${user1}:${user2}` : `${user2}:${user1}`;
      const amount = Number(split.amount);
      
      if (user1 < user2) {
        balances[key] += amount;
      } else {
        balances[key] -= amount;
      }
    }

    const ledgers: any[] = [];
    for (const [key, balance] of Object.entries(balances)) {
      if (balance === 0) continue;
      const [u1, u2] = key.split(":");
      const user1Obj = members.find((m: any) => m.id === u1);
      const user2Obj = members.find((m: any) => m.id === u2);
      
      if (!user1Obj || !user2Obj) continue;

      const pairSplits = roomSplits.filter((s: any) => {
        const isPair = 
          (s.requesterId === u1 && s.recipientId === u2) ||
          (s.recipientId === u1 && s.requesterId === u2);
        return isPair && s.status.startsWith("settle_pending_by_");
      });
      const isSettlePending = pairSplits.length > 0;
      const initiatorId = isSettlePending ? pairSplits[0].status.replace("settle_pending_by_", "") : null;

      if (balance > 0) {
        ledgers.push({
          debtor: user2Obj,
          creditor: user1Obj,
          amount: balance,
          isSettlePending,
          initiatorId,
        });
      } else {
        ledgers.push({
          debtor: user1Obj,
          creditor: user2Obj,
          amount: Math.abs(balance),
          isSettlePending,
          initiatorId,
        });
      }
    }

    return ledgers;
  }, [selectedRoomId, rooms, splits, session?.user?.id]);

  const globalDebtSummary = useMemo(() => {
    if (!session?.user?.id || rooms.length === 0) return null;
    
    let totalOwedToMe = 0;
    let totalIOwe = 0;

    for (const room of rooms) {
      const members = room.memberships.map((m: any) => m.user);
      const roomSplits = splits.filter((s: any) => s.roomId === room.id);
      
      const balances: { [key: string]: number } = {};
      
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const key = members[i].id < members[j].id 
            ? `${members[i].id}:${members[j].id}` 
            : `${members[j].id}:${members[i].id}`;
          balances[key] = 0;
        }
      }

      for (const split of roomSplits) {
        if (split.status === "settled" || split.status === "disputed") continue;
        const isAccepted = split.status === "accepted" || split.status.startsWith("settle_pending_by_");
        if (!isAccepted) continue;

        const user1 = split.requesterId;
        const user2 = split.recipientId;
        
        const key = user1 < user2 ? `${user1}:${user2}` : `${user2}:${user1}`;
        const amount = Number(split.amount);
        
        if (user1 < user2) {
          balances[key] += amount;
        } else {
          balances[key] -= amount;
        }
      }

      for (const [key, balance] of Object.entries(balances)) {
        if (balance === 0) continue;
        const [u1, u2] = key.split(":");
        if (u1 !== session.user.id && u2 !== session.user.id) continue;

        const isU1Me = u1 === session.user.id;
        
        if (balance > 0) {
          if (isU1Me) {
            totalOwedToMe += balance;
          } else {
            totalIOwe += balance;
          }
        } else {
          const absBalance = Math.abs(balance);
          if (isU1Me) {
            totalIOwe += absBalance;
          } else {
            totalOwedToMe += absBalance;
          }
        }
      }
    }

    if (totalOwedToMe === 0 && totalIOwe === 0) return null;
    return { owedToMe: totalOwedToMe, IOwe: totalIOwe };
  }, [rooms, splits, session?.user?.id]);

  async function triggerBenchmarkUpdatesInternal(nextData: DriveData, forceOptInState?: boolean) {
    const isOptedIn = forceOptInState !== undefined ? forceOptInState : benchmarkOptIn;
    
    if (!isOptedIn) {
      if (nextData.lastAggregateContribution) {
        const updates: any[] = [];
        const month = nextData.lastAggregateContribution.periodStart;
        for (const [catId, amount] of Object.entries(nextData.lastAggregateContribution.byCategory)) {
          if (amount > 0) {
            updates.push({
              categoryId: catId,
              deltaAmount: -amount,
              deltaUserCount: -1,
            });
          }
        }
        if (updates.length > 0) {
          await fetch("/api/benchmarks/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ month, updates }),
          });
        }
        
        const timestamp = new Date().toISOString();
        const updatedWithNoContrib = {
          ...nextData,
          lastAggregateContribution: null,
          updatedAt: timestamp,
        };
        setDriveData(updatedWithNoContrib);
        await fetch("/api/drive-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ driveData: updatedWithNoContrib }),
        });
      }
      return;
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const monthlyTransactions = (nextData.transactions ?? []).filter((t) => {
      return !t.deletedAt && 
             (t.type === "expense" || t.type === "debt") && 
             t.spentAt.slice(0, 7) === currentMonth;
    });

    const actualByCategory: Record<string, number> = {};
    for (const t of monthlyTransactions) {
      actualByCategory[t.categoryId] = (actualByCategory[t.categoryId] || 0) + t.amount;
    }

    const lastContrib = nextData.lastAggregateContribution || { periodStart: currentMonth, byCategory: {} };
    const updates: any[] = [];

    if (lastContrib.periodStart !== currentMonth) {
      const oldUpdates: any[] = [];
      for (const [catId, amount] of Object.entries(lastContrib.byCategory)) {
        if (amount > 0) {
          oldUpdates.push({
            categoryId: catId,
            deltaAmount: -amount,
            deltaUserCount: -1,
          });
        }
      }
      if (oldUpdates.length > 0) {
        await fetch("/api/benchmarks/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ month: lastContrib.periodStart, updates: oldUpdates }),
        });
      }

      for (const catId of parentCategories.map((c) => c.id)) {
        const actual = actualByCategory[catId] || 0;
        if (actual > 0) {
          updates.push({
            categoryId: catId,
            deltaAmount: actual,
            deltaUserCount: 1,
          });
        }
      }
    } else {
      const allCategoryIds = new Set([
        ...parentCategories.map((c) => c.id),
        ...Object.keys(lastContrib.byCategory),
        ...Object.keys(actualByCategory)
      ]);

      for (const catId of allCategoryIds) {
        const last = lastContrib.byCategory[catId] || 0;
        const actual = actualByCategory[catId] || 0;
        const deltaAmount = actual - last;
        
        let deltaUserCount = 0;
        if (last === 0 && actual > 0) {
          deltaUserCount = 1;
        } else if (last > 0 && actual === 0) {
          deltaUserCount = -1;
        }

        if (deltaAmount !== 0 || deltaUserCount !== 0) {
          updates.push({
            categoryId: catId,
            deltaAmount,
            deltaUserCount,
          });
        }
      }
    }

    if (updates.length > 0) {
      const res = await fetch("/api/benchmarks/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentMonth, updates }),
      });
      if (!res.ok) throw new Error("Could not update benchmark aggregates");
    }

    const timestamp = new Date().toISOString();
    const updatedDriveData = {
      ...nextData,
      lastAggregateContribution: {
        periodStart: currentMonth,
        byCategory: actualByCategory,
      },
      updatedAt: timestamp,
    };
    
    setDriveData(updatedDriveData);
    await fetch("/api/drive-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driveData: updatedDriveData }),
    });
  };

  const toggleBenchmarkOptIn = async (checked: boolean) => {
    if (!driveData) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ benchmarkOptIn: checked }),
      });
      if (!res.ok) throw new Error("Could not save settings");
      const data = await res.json();
      setBenchmarkOptIn(data.benchmarkOptIn);
      
      const tempDriveData = { ...driveData };
      await triggerBenchmarkUpdatesInternal(tempDriveData, checked);
      
      if (checked) {
        const benchRes = await fetch("/api/benchmarks");
        if (benchRes.ok) {
          setBenchmarkData(await benchRes.json());
        }
      } else {
        setBenchmarkData([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not toggle opt-in");
    } finally {
      setSyncing(false);
    }
  };

  const loadPdfJs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
      script.onload = () => {
        const pdfjs = (window as any).pdfjsLib;
        pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
        resolve(pdfjs);
      };
      script.onerror = () => reject(new Error("Could not load PDF.js from CDN"));
      document.head.appendChild(script);
    });
  };

  const parsePdfFile = async (file: File) => {
    setIsImporting(true);
    setSyncing(true);
    setError(null);
    try {
      const pdfjs = await loadPdfJs();
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          let fullText = "";
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(" ");
            fullText += pageText + "\n";
          }

          const lines = fullText.split(/\n/);
          const parsed: any[] = [];
          
          const dateRegex = /(\d{2}[-/.]\d{2}[-/.]\d{2,4})/;

          for (const line of lines) {
            const dateMatch = line.match(dateRegex);
            if (!dateMatch) continue;

            const dateStr = dateMatch[1];
            const words = line.replace(dateStr, "").split(/\s+/).filter(Boolean);
            let amount: number | null = null;

            const numericCandidates = words.filter(
              (w) => /^\d+(?:\.\d{2})?$/.test(w.replace(/,/g, "")) && !w.includes("-") && !w.includes("/")
            );

            if (numericCandidates.length > 0) {
              const candidate = numericCandidates[numericCandidates.length - 1];
              amount = parseFloat(candidate.replace(/,/g, ""));
            }

            if (dateStr && amount && amount > 0 && amount < 100000) {
              const cleanWords = words.filter((w) => !numericCandidates.includes(w) && !/^\d{6,}$/.test(w));
              const note = cleanWords.join(" ").trim() || "UPI / Bank Transaction";

              let categoryId = "other";
              const matched = allCategories.find((c) =>
                note.toLowerCase().includes(c.name.toLowerCase()) ||
                c.name.toLowerCase().includes(note.toLowerCase())
              );
              if (matched) categoryId = matched.id;

              let formattedDate = todayInputValue();
              try {
                const parts = dateStr.split(/[-/.]/);
                if (parts.length === 3) {
                  let day = parts[0];
                  let month = parts[1];
                  let year = parts[2];
                  if (year.length === 2) year = "20" + year;
                  formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
                }
              } catch (_) {}

              parsed.push({
                id: crypto.randomUUID(),
                date: formattedDate,
                amount,
                note,
                categoryId,
              });
            }
          }

          if (parsed.length === 0) {
            alert("No transactions could be parsed from this PDF. Please verify it is a valid bank statement.");
            return;
          }

          runDuplicateDetection(parsed);
          setImportModalType(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error reading PDF pages");
        } finally {
          setIsImporting(false);
          setSyncing(false);
        }
      };

      reader.onerror = () => {
        alert("File reading error");
        setIsImporting(false);
        setSyncing(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load statement parser");
      setIsImporting(false);
      setSyncing(false);
    }
  };

  const processCsvFile = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      alert("CSV has too few lines");
      return;
    }

    const parseCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCsvLine(lines[0]);
    const rawRows = lines.slice(1).map(parseCsvLine).filter((r) => r.length > 0);

    setCsvHeaders(headers);
    setCsvRawRows(rawRows);

    let dateIdx = 0;
    let amountIdx = 1;
    let noteIdx = 2;
    let catIdx = 3;

    headers.forEach((h, idx) => {
      const lower = h.toLowerCase();
      if (lower.includes("date") || lower.includes("time") || lower.includes("spentat")) {
        dateIdx = idx;
      } else if (lower.includes("amount") || lower.includes("value") || lower.includes("rupee") || lower.includes("price")) {
        amountIdx = idx;
      } else if (lower.includes("note") || lower.includes("desc") || lower.includes("narr") || lower.includes("merchant") || lower.includes("partic")) {
        noteIdx = idx;
      } else if (lower.includes("cat")) {
        catIdx = idx;
      }
    });

    setCsvMapping({ date: dateIdx, amount: amountIdx, note: noteIdx, category: catIdx });
    setShowCsvMappingUI(true);
  };

  const confirmCsvMapping = () => {
    setShowCsvMappingUI(false);
    
    const parsed: any[] = [];
    for (const row of csvRawRows) {
      const rawDate = row[csvMapping.date] || "";
      const rawAmount = row[csvMapping.amount] || "";
      const rawNote = row[csvMapping.note] || "";
      const rawCat = row[csvMapping.category] || "";

      const amount = Math.abs(parseFloat(rawAmount.replace(/[^0-9.-]/g, "")));
      if (isNaN(amount) || amount === 0) continue;

      let formattedDate = todayInputValue();
      const dateMatch = rawDate.match(/(\d{2,4})[-/.](\d{2})[-/.](\d{2,4})/);
      if (dateMatch) {
        let p1 = dateMatch[1];
        let p2 = dateMatch[2];
        let p3 = dateMatch[3];
        if (p1.length === 4) {
          formattedDate = `${p1}-${p2.padStart(2, "0")}-${p3.padStart(2, "0")}`;
        } else {
          if (p3.length === 2) p3 = "20" + p3;
          formattedDate = `${p3}-${p2.padStart(2, "0")}-${p1.padStart(2, "0")}`;
        }
      }

      let categoryId = "other";
      const matched = allCategories.find(c => 
        rawCat.toLowerCase().includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(rawCat.toLowerCase()) ||
        rawNote.toLowerCase().includes(c.name.toLowerCase())
      );
      if (matched) categoryId = matched.id;

      parsed.push({
        id: crypto.randomUUID(),
        date: formattedDate,
        amount,
        note: rawNote || "Imported CSV Transaction",
        categoryId,
      });
    }

    if (parsed.length === 0) {
      alert("No valid transactions found in CSV. Please verify column mappings.");
      return;
    }

    runDuplicateDetection(parsed);
  };

  const runDuplicateDetection = (parsedList: any[]) => {
    const existing = driveData?.transactions.filter((t) => !t.deletedAt) || [];
    const duplicates: Record<string, boolean> = {};
    const defaultSelected: string[] = [];

    for (const t of parsedList) {
      const isDuplicate = existing.some((ext) => {
        const extDate = ext.spentAt.slice(0, 10);
        const parsedDate = t.date.slice(0, 10);
        return ext.amount === t.amount && extDate === parsedDate;
      });

      if (isDuplicate) {
        duplicates[t.id] = true;
      } else {
        defaultSelected.push(t.id);
      }
    }

    setPossibleDuplicates(duplicates);
    setSelectedImportIds(defaultSelected);
    setParsedTransactions(parsedList);
  };

  const commitImport = async () => {
    if (!driveData) return;
    const selected = parsedTransactions.filter((t) => selectedImportIds.includes(t.id));
    if (selected.length === 0) {
      alert("No transactions selected for import");
      return;
    }

    setIsImporting(true);
    setSyncing(true);
    setError(null);

    try {
      const timestamp = new Date().toISOString();
      const newTxs: Transaction[] = selected.map((t) => ({
        id: t.id,
        amount: t.amount,
        type: "expense",
        categoryId: t.categoryId,
        note: t.note.trim() || undefined,
        spentAt: new Date(`${t.date}T12:00:00`).toISOString(),
        createdAt: timestamp,
        updatedAt: timestamp,
      }));

      const nextData: DriveData = {
        ...driveData,
        transactions: [...driveData.transactions, ...newTxs],
        updatedAt: timestamp,
      };

      setDriveData(nextData);

      const res = await fetch("/api/drive-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveData: nextData }),
      });
      if (!res.ok) throw new Error("Could not sync imported transactions to Drive");

      await triggerBenchmarkUpdatesInternal(nextData);

      setParsedTransactions([]);
      setSelectedImportIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete import");
    } finally {
      setIsImporting(false);
      setSyncing(false);
    }
  };

  const exportTransactionsToCsv = () => {
    if (!driveData?.transactions) return;
    const header = "ID,Amount,Type,Category,Note,SpentAt,CreatedAt\n";
    const rows = driveData.transactions
      .filter((t) => !t.deletedAt)
      .map((t) => {
        const cat = allCategories.find((c) => c.id === t.categoryId)?.name || t.categoryId;
        return `"${t.id}","${t.amount}","${t.type}","${cat}","${(t.note || "").replace(/"/g, '""')}","${t.spentAt}","${t.createdAt}"`;
      })
      .join("\n");
    
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `amazetrack_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const headerTitle = useMemo(() => {
    switch (activeView) {
      case "home": return "Home";
      case "budgets": return "Budgets";
      case "splits": return "Splits";
      case "analytics": return "Analytics";
      case "add": return "Add Expense";
      default: return "AmazeTrack";
    }
  }, [activeView]);

  // Shared expense helper to start split modal
  function startAddSharedExpense() {
    if (rooms.length === 0) {
      alert("Please create or join a room first!");
      return;
    }
    const defaultRoom = rooms[0];
    const defaultMembers = defaultRoom.memberships.map((m: any) => m.user.id);
    
    setSharedExpenseForm({
      roomId: defaultRoom.id,
      totalAmount: "",
      categoryId: parentCategories[0]?.id ?? "",
      note: "",
      spentAt: todayInputValue(),
      splits: {},
    });
    setSplitMethod("equal");
    setSelectedExpenseMembers(defaultMembers);
    setShowAddMenu(false);
    setIsAddingSharedExpense(true);
  }

  function handleRoomSelect(roomId: string) {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    const defaultMembers = room.memberships.map((m: any) => m.user.id);
    setSharedExpenseForm((prev) => ({ ...prev, roomId, splits: {} }));
    setSelectedExpenseMembers(defaultMembers);
  }

  function startAdd() {
    setEditing(null);
    setForm({
      amount: "",
      categoryId: parentCategories[0]?.id ?? "",
      note: "",
      spentAt: todayInputValue(),
    });
    setActiveView("add");
  }

  function startEdit(transaction: Transaction) {
    setEditing(transaction);
    setForm({
      id: transaction.id,
      amount: String(transaction.amount),
      categoryId: transaction.categoryId,
      note: transaction.note ?? "",
      spentAt: transaction.spentAt.slice(0, 10),
    });
    setActiveView("add");
  }

  // 1. Repeating Transaction Templates CRUD
  const saveRepeatingTemplate = async (event: FormEvent) => {
    event.preventDefault();
    if (!driveData) return;

    const timestamp = new Date().toISOString();
    const id = editingRepeating?.id ?? crypto.randomUUID();
    const newTemplate: RecurringTemplate = {
      id,
      amount: Number(repeatingForm.amount),
      categoryId: repeatingForm.categoryId,
      note: repeatingForm.note.trim() || "Recurring Spend",
      frequency: repeatingForm.frequency,
      startDate: repeatingForm.startDate,
      active: editingRepeating ? editingRepeating.active : true,
      account: repeatingForm.account.trim() || undefined,
    };

    const currentTemplates = driveData.recurringTemplates ?? [];
    const exists = currentTemplates.some((t) => t.id === id);
    const updatedTemplates = exists
      ? currentTemplates.map((t) => (t.id === id ? newTemplate : t))
      : [...currentTemplates, newTemplate];

    const nextData: DriveData = {
      ...driveData,
      recurringTemplates: updatedTemplates,
      updatedAt: timestamp,
    };

    setDriveData(nextData);
    setIsAddingRepeating(false);
    setEditingRepeating(null);
    setSyncing(true);
    setError(null);

    try {
      const { updatedData: generatedData, generatedCount } = generateScheduledTransactions(nextData);
      const finalData = generatedCount > 0 ? generatedData : nextData;
      setDriveData(finalData);

      const response = await fetch("/api/drive-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveData: finalData }),
      });
      if (!response.ok) throw new Error("Could not save to Drive");

      await triggerBenchmarkUpdatesInternal(finalData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save repeating template");
    } finally {
      setSyncing(false);
    }
  };

  const toggleRepeatingTemplate = async (template: RecurringTemplate) => {
    if (!driveData) return;
    const timestamp = new Date().toISOString();
    const updated = (driveData.recurringTemplates ?? []).map((t) =>
      t.id === template.id ? { ...t, active: !t.active } : t
    );

    const nextData: DriveData = {
      ...driveData,
      recurringTemplates: updated,
      updatedAt: timestamp,
    };

    setDriveData(nextData);
    setSyncing(true);
    setError(null);

    try {
      let finalData = nextData;
      if (!template.active) {
        const { updatedData, generatedCount } = generateScheduledTransactions(nextData);
        if (generatedCount > 0) finalData = updatedData;
      }
      setDriveData(finalData);

      const response = await fetch("/api/drive-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveData: finalData }),
      });
      if (!response.ok) throw new Error("Could not save toggle state to Drive");

      await triggerBenchmarkUpdatesInternal(finalData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not toggle template");
    } finally {
      setSyncing(false);
    }
  };

  const deleteRepeatingTemplate = async (templateId: string) => {
    if (!driveData) return;
    const timestamp = new Date().toISOString();
    const updated = (driveData.recurringTemplates ?? []).filter((t) => t.id !== templateId);

    const nextData: DriveData = {
      ...driveData,
      recurringTemplates: updated,
      updatedAt: timestamp,
    };

    setDriveData(nextData);
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/drive-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveData: nextData }),
      });
      if (!response.ok) throw new Error("Could not delete from Drive");
      await triggerBenchmarkUpdatesInternal(nextData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete template");
    } finally {
      setSyncing(false);
    }
  };

  // 2. Subscriptions CRUD
  const saveSubscription = async (event: FormEvent) => {
    event.preventDefault();
    if (!driveData) return;

    const timestamp = new Date().toISOString();
    const id = editingSubscription?.id ?? crypto.randomUUID();
    const newSub: Subscription = {
      id,
      name: subscriptionForm.name.trim(),
      amount: Number(subscriptionForm.amount),
      categoryId: subscriptionForm.categoryId,
      billingDay: Number(subscriptionForm.billingDay),
      active: editingSubscription ? editingSubscription.active : true,
    };

    const currentSubs = driveData.subscriptions ?? [];
    const exists = currentSubs.some((s) => s.id === id);
    const updatedSubs = exists
      ? currentSubs.map((s) => (s.id === id ? newSub : s))
      : [...currentSubs, newSub];

    const nextData: DriveData = {
      ...driveData,
      subscriptions: updatedSubs,
      updatedAt: timestamp,
    };

    setDriveData(nextData);
    setIsAddingSubscription(false);
    setEditingSubscription(null);
    setSyncing(true);
    setError(null);

    try {
      const { updatedData: generatedData, generatedCount } = generateScheduledTransactions(nextData);
      const finalData = generatedCount > 0 ? generatedData : nextData;
      setDriveData(finalData);

      const response = await fetch("/api/drive-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveData: finalData }),
      });
      if (!response.ok) throw new Error("Could not save to Drive");

      await triggerBenchmarkUpdatesInternal(finalData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save subscription");
    } finally {
      setSyncing(false);
    }
  };

  const toggleSubscription = async (sub: Subscription) => {
    if (!driveData) return;
    const timestamp = new Date().toISOString();
    const updated = (driveData.subscriptions ?? []).map((s) =>
      s.id === sub.id ? { ...s, active: !s.active } : s
    );

    const nextData: DriveData = {
      ...driveData,
      subscriptions: updated,
      updatedAt: timestamp,
    };

    setDriveData(nextData);
    setSyncing(true);
    setError(null);

    try {
      let finalData = nextData;
      if (!sub.active) {
        const { updatedData, generatedCount } = generateScheduledTransactions(nextData);
        if (generatedCount > 0) finalData = updatedData;
      }
      setDriveData(finalData);

      const response = await fetch("/api/drive-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveData: finalData }),
      });
      if (!response.ok) throw new Error("Could not save toggle state to Drive");

      await triggerBenchmarkUpdatesInternal(finalData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not toggle subscription");
    } finally {
      setSyncing(false);
    }
  };

  const deleteSubscription = async (subId: string) => {
    if (!driveData) return;
    const timestamp = new Date().toISOString();
    const updated = (driveData.subscriptions ?? []).filter((s) => s.id !== subId);

    const nextData: DriveData = {
      ...driveData,
      subscriptions: updated,
      updatedAt: timestamp,
    };

    setDriveData(nextData);
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/drive-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveData: nextData }),
      });
      if (!response.ok) throw new Error("Could not delete subscription");
      await triggerBenchmarkUpdatesInternal(nextData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete subscription");
    } finally {
      setSyncing(false);
    }
  };

  // 3. Theme Toggle Override
  const toggleThemeOverride = (mode: "light" | "dark") => {
    setThemeMode(mode);
    localStorage.setItem("amazetrack_theme", mode);
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // 4. Print Parent Statement
  const printParentReport = () => {
    if (!driveData) return;
    
    let startDate: Date;
    let endDate: Date = new Date();
    const now = new Date();
    
    if (parentReportForm.dateRange === "this-month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (parentReportForm.dateRange === "last-month") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (parentReportForm.dateRange === "semester" && driveData.allowanceConfig?.cycleStart) {
      startDate = new Date(driveData.allowanceConfig.cycleStart);
      if (driveData.allowanceConfig.cycleEnd) {
        endDate = new Date(driveData.allowanceConfig.cycleEnd);
      }
    } else {
      startDate = parentReportForm.customStart ? new Date(parentReportForm.customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = parentReportForm.customEnd ? new Date(parentReportForm.customEnd) : new Date();
    }
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    const filteredTxs = transactions.filter((t) => {
      const spentAt = new Date(t.spentAt);
      if (spentAt < startDate || spentAt > endDate) return false;
      
      if (!parentReportForm.includeSplits && t.splitRequestId) return false;
      
      const matchesCategory = parentReportForm.selectedCategoryIds.some((catId) => {
        if (t.categoryId === catId) return true;
        const cat = allCategories.find((c) => c.id === t.categoryId);
        return cat?.parentId === catId;
      });
      
      return matchesCategory;
    }).sort((a, b) => new Date(a.spentAt).getTime() - new Date(b.spentAt).getTime());
    
    const totalSpent = filteredTxs.reduce((sum, t) => sum + t.amount, 0);
    const catBreakdown = parentCategories.map((p) => {
      const subIds = allCategories.filter((c) => c.parentId === p.id).map((c) => c.id);
      const amount = filteredTxs
        .filter((t) => t.categoryId === p.id || subIds.includes(t.categoryId))
        .reduce((sum, t) => sum + t.amount, 0);
      return { category: p, amount };
    }).filter((item) => item.amount > 0);
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to generate the PDF statement.");
      return;
    }
    
    const formattedStart = startDate.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
    const formattedEnd = endDate.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>AmazeTrack Expenditure Report</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1f2937;
            line-height: 1.5;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            border-bottom: 2px solid #8b5cf6;
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .title {
            margin: 0;
            color: #111827;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.5px;
          }
          .subtitle {
            margin: 5px 0 0 0;
            color: #6b7280;
            font-size: 14px;
            font-weight: 600;
          }
          .meta-info {
            text-align: right;
            font-size: 12px;
            color: #9ca3af;
          }
          .card-grid {
            display: grid;
            grid-template-columns: 1fr 1.5fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 20px;
          }
          .card-title {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #6b7280;
            font-weight: 700;
            margin: 0 0 5px 0;
          }
          .card-value {
            font-size: 32px;
            font-weight: 800;
            color: #8b5cf6;
            margin: 0;
          }
          .table-title {
            font-size: 16px;
            font-weight: 700;
            color: #111827;
            margin: 20px 0 10px 0;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th, td {
            text-align: left;
            padding: 10px 12px;
            font-size: 13px;
          }
          th {
            background: #f3f4f6;
            color: #374151;
            font-weight: 700;
            border-bottom: 1.5px solid #e5e7eb;
          }
          td {
            border-bottom: 1px solid #f3f4f6;
          }
          tr:last-child td {
            border-bottom: none;
          }
          .text-right {
            text-align: right;
          }
          .footer {
            margin-top: 50px;
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
          }
          .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
            margin-right: 6px;
          }
          @media print {
            body {
              padding: 20px;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">Expenditure Report</h1>
            <p class="subtitle">AmazeTrack Student Budgeting</p>
          </div>
          <div class="meta-info">
            <div>Student: ${session?.user?.name || "Student User"}</div>
            <div>Email: ${session?.user?.email}</div>
            <div>Period: ${formattedStart} - ${formattedEnd}</div>
          </div>
        </div>

        <div class="card-grid">
          <div class="card">
            <h3 class="card-title">Total Approved Spend</h3>
            <p class="card-value">${currency.format(totalSpent)}</p>
            <p style="margin: 5px 0 0 0; font-size: 11px; color: #9ca3af;">Logged across ${filteredTxs.length} entries</p>
          </div>
          <div class="card">
            <h3 class="card-title">Category Breakdown Summary</h3>
            <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">
              ${catBreakdown.map(({ category, amount }) => `
                <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600;">
                  <span style="display: flex; align-items: center; color: #4b5563;">
                    <span class="dot" style="background-color: ${category.color}"></span>
                    ${category.name}
                  </span>
                  <span>${currency.format(amount)} (${Math.round((amount / totalSpent) * 100)}%)</span>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <h3 class="table-title">Itemized Transaction Log</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 15%;">Date</th>
              <th style="width: 25%;">Category</th>
              <th style="width: 45%;">Description / Note</th>
              <th style="width: 15%;" class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTxs.map((t) => {
              const cat = allCategories.find((c) => c.id === t.categoryId);
              return `
                <tr>
                  <td>${new Date(t.spentAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "2-digit" })}</td>
                  <td>${cat?.name || "Other"}</td>
                  <td style="font-weight: 500; color: #374151;">${t.note || "General spend"}</td>
                  <td class="text-right" style="font-weight: 700;">${currency.format(t.amount)}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>

        <div class="footer">
          Report generated automatically on ${new Date().toLocaleDateString("en-IN", { hour: "numeric", minute: "numeric", second: "numeric", hour12: true })}. Verified secure via AmazeTrack client-side neon ledger.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  async function submitTransaction(event: FormEvent) {
    event.preventDefault();
    if (!driveData) return;

    const timestamp = new Date().toISOString();
    const spentAt = new Date(`${form.spentAt}T12:00:00`).toISOString();
    const amount = Number(form.amount);
    const id = editing?.id ?? crypto.randomUUID();
    const optimistic: Transaction = {
      id,
      amount,
      type: "expense",
      categoryId: form.categoryId,
      note: form.note.trim() || undefined,
      spentAt,
      createdAt: editing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };

    setDriveData((current) => {
      if (!current) return current;
      const exists = current.transactions.some((transaction) => transaction.id === id);
      return {
        ...current,
        transactions: exists
          ? current.transactions.map((transaction) => (transaction.id === id ? optimistic : transaction))
          : [...current.transactions, optimistic],
        updatedAt: timestamp,
      };
    });
    setActiveView("home");
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch(editing ? `/api/transactions/${id}` : "/api/transactions", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          amount,
          type: "expense",
          categoryId: form.categoryId,
          note: form.note.trim() || undefined,
          spentAt,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      const nextData: DriveData = {
        ...driveData,
        transactions: driveData.transactions.some((t) => t.id === id)
          ? driveData.transactions.map((t) => (t.id === id ? optimistic : t))
          : [...driveData.transactions, optimistic],
        updatedAt: timestamp,
      };
      await triggerBenchmarkUpdatesInternal(nextData);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save transaction");
    } finally {
      setSyncing(false);
    }
  }

  async function deleteTransaction(transaction: Transaction) {
    if (!driveData) return;
    const deletedTime = new Date().toISOString();
    const nextData: DriveData = {
      ...driveData,
      transactions: driveData.transactions.map((item) =>
        item.id === transaction.id ? { ...item, deletedAt: deletedTime, updatedAt: deletedTime } : item,
      ),
      updatedAt: deletedTime,
    };
    setDriveData(nextData);
    setSyncing(true);

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await response.text());
      await triggerBenchmarkUpdatesInternal(nextData);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete transaction");
    } finally {
      setSyncing(false);
    }
  }

  async function handleAddSubcategory(event: FormEvent, parentId: string) {
    event.preventDefault();
    if (!subName.trim()) return;
    setSyncing(true);
    setError(null);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: subName.trim(), parentId }),
      });
      if (!response.ok) throw new Error(await response.text());
      const newCategory = (await response.json()) as Category;
      setDriveData((current) => {
        if (!current) return current;
        return {
          ...current,
          categories: [...current.categories, newCategory],
          updatedAt: new Date().toISOString(),
        };
      });
      setSubName("");
      setAddingSubTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add subcategory");
    } finally {
      setSyncing(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[#080e1c] grid place-items-center">
        <div className="flex flex-col items-center gap-4 animate-fade-up">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center shadow-2xl shadow-violet-500/30 animate-pulse-glow">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:0ms]" />
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:150ms]" />
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-xs font-semibold text-zinc-500 tracking-widest uppercase">Loading AmazeTrack</p>
        </div>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return (
      <main className="min-h-screen bg-[#060b18] flex items-center justify-center px-6 relative overflow-hidden">
        {/* Ambient orbs */}
        <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-radial from-violet-600/20 to-transparent blur-3xl pointer-events-none animate-orb-drift" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-radial from-teal-500/12 to-transparent blur-3xl pointer-events-none animate-orb-drift [animation-delay:4s]" />
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-gradient-radial from-indigo-600/10 to-transparent blur-3xl pointer-events-none animate-float [animation-delay:2s]" />

        {/* Card */}
        <div className="relative w-full max-w-md animate-fade-up">
          <div className="glass-strong p-10 rounded-[2rem] shadow-2xl border border-white/[0.08]">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-violet-500/40 animate-pulse-glow">
                <Wallet className="w-6 h-6" />
              </div>
              <span className="text-xl font-extrabold bg-gradient-to-r from-violet-400 to-teal-400 bg-clip-text text-transparent tracking-tight">AmazeTrack</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-white leading-[1.15] mb-3">
              Track spending<br />
              <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-teal-400 bg-clip-text text-transparent">effortlessly.</span>
            </h1>
            <p className="text-[15px] leading-7 text-zinc-400 font-medium mb-8">
              Your data stays private in your Google Drive.<br className="hidden sm:block" /> Zero servers. Total control.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 mb-8">
              {["🔒 Google Drive Sync", "📊 Smart Analytics", "🎯 Budget Goals"].map((f) => (
                <span key={f} className="text-[11px] font-bold text-zinc-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">{f}</span>
              ))}
            </div>

            <button
              className="h-13 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-sm font-bold text-white shadow-xl shadow-violet-500/30 transition-all duration-200 hover:shadow-violet-500/50 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 border-0"
              onClick={() => signIn("google")}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff" opacity=".9"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity=".9"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" opacity=".9"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity=".9"/>
              </svg>
              Sign in with Google
            </button>

            <p className="text-center text-[11px] text-zinc-600 font-medium mt-5">
              Built for VIT Chennai hostel life 🏠
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#080e1c] text-white flex flex-col md:flex-row">
      {/* Sidebar - Desktop Only */}
      <aside className={`hidden md:flex flex-col fixed inset-y-0 bg-[#080c18] border-r border-white/[0.05] p-4 justify-between z-30 transition-all duration-300 ease-in-out ${isSidebarOpen ? "w-64" : "w-20"}`}>
        <div className="flex flex-col gap-6">
          {/* Logo & Toggle */}
          <div className={`flex items-center ${isSidebarOpen ? "justify-between" : "justify-center"} pt-2`}>
            <div className={`flex items-center gap-2.5 ${!isSidebarOpen && "hidden"}`}>
              <div className="h-9 w-9 rounded-xl shrink-0 bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-[15px] bg-gradient-to-r from-violet-400 to-teal-400 bg-clip-text text-transparent truncate tracking-tight">AmazeTrack</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="shrink-0 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl">
              <PanelLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* Desktop Nav Items */}
          <nav className="flex flex-col gap-0.5">
            {([
              { view: "home", icon: HomeIcon, label: "Home" },
              { view: "budgets", icon: Wallet, label: "Budgets" },
              { view: "splits", icon: Users, label: "Splits" },
              { view: "analytics", icon: TrendingUp, label: "Analytics" },
            ] as const).map(({ view, icon: Icon, label }) => {
              const isActive = activeView === view;
              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => setActiveView(view)}
                  title={!isSidebarOpen ? label : undefined}
                  className={`relative flex items-center w-full transition-all duration-200 rounded-xl overflow-hidden
                    ${isSidebarOpen ? "gap-3 px-4 py-3" : "justify-center px-0 py-3"}
                    ${isActive
                      ? "bg-violet-600/[0.10] text-white"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.03]"
                    }`}
                >
                  {/* Left accent bar for active */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-violet-400 to-teal-400 shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
                  )}
                  <Icon className={`w-[18px] h-[18px] shrink-0 transition-all duration-200 ${isActive ? "text-violet-400" : ""}`} />
                  {isSidebarOpen && <span className="text-sm font-semibold truncate">{label}</span>}
                  {isActive && isSidebarOpen && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(124,58,237,0.9)]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Desktop Add Expense Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAddMenu(!showAddMenu)}
              className={`w-full flex items-center justify-center gap-2 transition-all duration-200 font-bold border-0 rounded-2xl
                bg-gradient-to-r from-violet-600 to-indigo-600
                text-white text-sm
                shadow-[0_0_20px_rgba(124,58,237,0.35)]
                hover:shadow-[0_0_28px_rgba(124,58,237,0.5)]
                hover:scale-[1.02] active:scale-[0.98]
                ${isSidebarOpen ? "h-11 px-4" : "h-11 w-11 mx-auto"}`}
              title={!isSidebarOpen ? "Add Expense" : undefined}
            >
              <Plus className="w-5 h-5 shrink-0" strokeWidth={2.5} />
              {isSidebarOpen && <span>Add Expense</span>}
            </button>
            {showAddMenu && (
              <div className={`absolute ${isSidebarOpen ? "top-14 left-0 w-full" : "top-14 left-14 w-52"} bg-[#0d1526] border border-white/10 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 z-40`}>
                <button
                  type="button"
                  onClick={() => { setShowAddMenu(false); startAdd(); }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-200 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all w-full text-left"
                >
                  <span className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <Plus className="w-4 h-4 text-violet-400" />
                  </span>
                  Personal Expense
                </button>
                <button
                  type="button"
                  onClick={startAddSharedExpense}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-200 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all w-full text-left"
                >
                  <span className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-teal-400" />
                  </span>
                  Shared Expense
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Profile / Logout */}
        <div className="border-t border-white/[0.05] pt-4">
          <div className={`flex items-center ${isSidebarOpen ? "gap-3" : "justify-center"} min-w-0`}>
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none focus:ring-2 focus:ring-violet-500/50 rounded-full transition-all cursor-pointer shrink-0 group">
                <Avatar className="w-9 h-9 border border-white/10 ring-2 ring-transparent group-hover:ring-violet-500/30 transition-all bg-[#1a1c23]">
                  {session?.user?.image ? (
                    <AvatarImage src={session.user.image} alt="Profile" />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-violet-900 to-indigo-900 text-white font-bold text-sm">
                    {session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-2xl border border-white/10 bg-[#0d1526] text-white">
                <div className="px-2 py-2 mb-1">
                  <p className="text-sm font-bold truncate">{session?.user?.name || "User"}</p>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">{session?.user?.email}</p>
                </div>
                <Separator className="mb-1 bg-white/[0.06]" />
                <DropdownMenuItem onClick={() => setShowSettings(true)} className="text-zinc-300 focus:text-white focus:bg-white/[0.06] font-semibold rounded-xl cursor-pointer py-2 gap-2">
                  <Settings className="w-4 h-4 shrink-0" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()} className="text-red-400 focus:text-red-400 focus:bg-red-500/10 font-semibold rounded-xl cursor-pointer py-2 gap-2">
                  <LogOut className="w-4 h-4 shrink-0" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {isSidebarOpen && (
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="text-[13px] font-bold text-white truncate">{session?.user?.name || "User"}</p>
                <p className="text-[10px] text-zinc-500 font-medium truncate">{session?.user?.email}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className={`flex-1 flex flex-col min-h-screen relative pb-28 md:pb-8 pt-8 md:px-8 px-4 w-full overflow-x-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? "md:ml-64" : "md:ml-20"}`}>
        {/* View Header */}
        <header className="flex items-center justify-between pb-6 pt-2">
          <div className="flex flex-col">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{headerTitle}</h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5 hidden md:block">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {syncing && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                Syncing
              </span>
            )}
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl shadow-sm border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {error ? <p className="mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm font-medium text-red-400">{error}</p> : null}

      {activeView === "home" ? (
        <section className="flex flex-1 flex-col gap-5 pt-2">
          {/* Hero Spend Card */}
          <div className="relative overflow-hidden rounded-3xl p-7 bg-gradient-to-br from-[#1e1060] via-[#2d1a7a] to-[#1a1060] border border-violet-500/20 shadow-2xl shadow-violet-900/30">
            {/* Ambient glow blobs */}
            <div className="absolute -right-12 -top-12 w-52 h-52 bg-gradient-to-br from-violet-500/30 to-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-44 h-44 bg-gradient-to-tr from-teal-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />

            <p className="text-[11px] font-bold text-violet-300/70 mb-2 uppercase tracking-[0.15em]">Total this month</p>
            <p className="text-[3.5rem] font-extrabold tracking-tighter text-white leading-none animate-count-up">
              {currency.format(monthTotal)}
            </p>
            <p className="text-xs text-violet-200/50 font-medium mt-2">
              {monthTransactions.length} transaction{monthTransactions.length !== 1 ? "s" : ""} · {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </p>

            {allowanceStatus && (
              <div className="mt-5 pt-5 border-t border-white/[0.10] flex items-center justify-between text-sm font-semibold">
                <span className="text-violet-200/70">
                  <span className="text-white font-bold">{currency.format(allowanceStatus.remaining)}</span> left
                  <span className="opacity-30 mx-2">·</span>
                  runs out {allowanceStatus.runOutDateStr}
                </span>
                {allowanceStatus.isWarning && (
                  <span className="flex items-center gap-1.5 text-amber-400 bg-amber-500/15 border border-amber-500/25 px-3 py-1.5 rounded-full text-xs font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" /> Underfunded
                  </span>
                )}
              </div>
            )}

            {globalDebtSummary && (
              <div className={`mt-3 pt-3 ${allowanceStatus ? "" : "border-t border-white/[0.10]"} flex items-center gap-4 text-sm font-semibold`}>
                {globalDebtSummary.owedToMe > 0 && <span className="text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full text-xs border border-emerald-500/25">Owed ₹{globalDebtSummary.owedToMe.toFixed(0)}</span>}
                {globalDebtSummary.IOwe > 0 && <span className="text-red-400 bg-red-500/15 px-3 py-1 rounded-full text-xs border border-red-500/25">You owe ₹{globalDebtSummary.IOwe.toFixed(0)}</span>}
              </div>
            )}
          </div>

          {/* 3-Stat Cards Row */}
          <div className="grid grid-cols-3 gap-3">
            {/* Spent */}
            <div className="relative overflow-hidden rounded-2xl p-4 bg-white/[0.04] border border-white/[0.07] flex flex-col gap-2 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-base">💸</span>
              </div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Spent</p>
              <p className="text-base font-extrabold text-[#f87171] tracking-tight leading-none">{currency.format(monthTotal)}</p>
            </div>
            {/* Budget remaining */}
            <div className="relative overflow-hidden rounded-2xl p-4 bg-white/[0.04] border border-white/[0.07] flex flex-col gap-2 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-base">🎯</span>
              </div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Budget Left</p>
              <p className="text-base font-extrabold text-[#2dd4bf] tracking-tight leading-none">
                {activeBudgets.length > 0
                  ? currency.format(Math.max(0, activeBudgets.reduce((s, b) => s + b.limitAmount, 0) - activeBudgets.reduce((s, b) => s + b.spent, 0)))
                  : "—"}
              </p>
            </div>
            {/* Transactions count */}
            <div className="relative overflow-hidden rounded-2xl p-4 bg-white/[0.04] border border-white/[0.07] flex flex-col gap-2 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-base">📋</span>
              </div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Entries</p>
              <p className="text-base font-extrabold text-violet-300 tracking-tight leading-none">{monthTransactions.length}</p>
            </div>
          </div>

          {/* Smart Alerts & In-App Reminders */}
          {smartAlerts.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                  </span>
                  <h3 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-zinc-500">Smart Alerts</h3>
                </div>
                <span className="text-[10px] font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                  {smartAlerts.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {smartAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`relative flex items-start gap-3 p-4 rounded-2xl border text-xs font-semibold overflow-hidden transition-all animate-fade-up ${
                      alert.severity === "critical"
                        ? "bg-red-500/8 border-red-500/20 text-red-300"
                        : alert.severity === "warning"
                        ? "bg-amber-500/8 border-amber-500/20 text-amber-300"
                        : "bg-blue-500/8 border-blue-500/20 text-blue-300"
                    }`}
                  >
                    {/* Colored left accent bar */}
                    <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
                      alert.severity === "critical" ? "bg-red-500" : alert.severity === "warning" ? "bg-amber-500" : "bg-blue-400"
                    }`} />
                    <div className="flex-1 pl-1">
                      <p className="font-extrabold text-[13px] tracking-tight text-white">{alert.title}</p>
                      <p className="text-[11px] font-medium opacity-80 mt-1 leading-relaxed">{alert.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDismissedAlertIds([...dismissedAlertIds, alert.id])}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-200 transition-colors flex-shrink-0"
                      aria-label="Dismiss Alert"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 items-start">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-extrabold text-foreground tracking-tight">Category Breakdown</h2>
                <span className="text-[11px] font-bold text-zinc-500">{new Date().toLocaleDateString("en-IN", { month: "long" })}</span>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl p-5 flex flex-col gap-5">
                {breakdown.length ? (
                  breakdown.map(({ category, amount }) => (
                    <div key={category.id}>
                      <div className="mb-2.5 flex justify-between items-center text-sm">
                        <span className="font-semibold text-zinc-400 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: category.color }} />
                          {category.name}
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-white text-[13px]">{currency.format(amount)}</span>
                          <span className="text-[10px] font-bold text-zinc-600">{Math.round((amount / monthTotal) * 100)}%</span>
                        </div>
                      </div>
                      <div className="h-3 w-full rounded-full bg-white/[0.05] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out relative"
                          style={{
                            width: `${Math.max((amount / monthTotal) * 100, 4)}%`,
                            backgroundColor: category.color,
                            boxShadow: `0 0 10px ${category.color}60`,
                          }}
                        >
                          <div className="absolute inset-0 bg-white/20 rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 mb-3 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-zinc-600">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium text-zinc-500">No transactions this month.</p>
                  </div>
                )}
              </div>
            </section>
  
            <section className="pb-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-extrabold text-foreground tracking-tight">Recent Activity</h2>
                <span className="text-[11px] font-bold text-zinc-600">{transactions.length} total</span>
              </div>
              {loading ? (
                <div className="flex flex-col gap-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-16 rounded-2xl bg-white/[0.03] border border-white/[0.04] animate-pulse" />
                  ))}
                </div>
              ) : null}
              {!loading && transactions.length === 0 ? (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl py-16 flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 mb-4 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-zinc-600">
                    <PiggyBank className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-500">No expenses yet.</p>
                  <p className="text-xs text-zinc-700 mt-1">Tap + Add Expense to start tracking.</p>
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
                transactions.slice(0, 20).forEach((t) => {
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
                        <p className="text-[10px] font-extrabold text-zinc-600 uppercase tracking-[0.14em] mb-2 px-1">{group.label}</p>
                        <div className="flex flex-col gap-2">
                          {group.txns.map((transaction) => (
                            <TransactionRow
                              key={transaction.id}
                              transaction={transaction}
                              category={allCategories.find((category) => category.id === transaction.categoryId)}
                              onEdit={() => startEdit(transaction)}
                              onDelete={() => deleteTransaction(transaction)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </section>
          </div>
        </section>
      ) : null}

      {activeView === "add" ? (
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
                <h2 className="text-base font-extrabold text-white tracking-tight">{editing ? "Edit Expense" : "Add Expense"}</h2>
                <p className="text-[11px] text-zinc-600 font-medium">All fields marked with * are required</p>
              </div>
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
                  {parentCategories.map((parent) => {
                    const subs = allCategories.filter((c) => c.parentId === parent.id);
                    return (
                      <optgroup key={parent.id} label={parent.name} className="bg-[#1c1f2e] text-white">
                        <option value={parent.id}>{parent.name} (General)</option>
                        {subs.map((sub) => (
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

            {/* Submit */}
            <button className="mt-2 h-14 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-[15px] font-bold text-white shadow-xl shadow-violet-500/25 transition-all duration-200 hover:shadow-violet-500/45 hover:scale-[1.01] active:scale-[0.98] border-0 flex items-center justify-center gap-2">
              {editing ? (
                <><Check className="w-5 h-5" /> Save changes</>
              ) : (
                <><Plus className="w-5 h-5" strokeWidth={2.5} /> Add expense</>
              )}
            </button>

            {editing && (
              <button
                type="button"
                className="text-[13px] font-semibold text-zinc-600 hover:text-zinc-400 transition-colors text-center"
                onClick={() => setActiveView("home")}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : null}


      {activeView === "analytics" ? (
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
                        Filter: {allCategories.find((c) => c.id === selectedBreakdownCategoryId)?.name} <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Trend Period Switcher */}
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-[10px] font-bold">
                      {(["daily", "weekly", "monthly"] as const).map((p) => (
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
                  
                  const maxVal = Math.max(...points.map((p) => Math.max(p.currentAmount, p.previousAmount)), 100);

                  const getX = (idx: number) => padding + (idx / (points.length - 1)) * (width - 2 * padding);
                  const getY = (val: number) => height - padding - (val / maxVal) * (height - 2 * padding);

                  // Generate Path strings
                  let currentPath = "";
                  let previousPath = "";

                  points.forEach((p, idx) => {
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
                        {points.map((p, idx) => {
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
                    const totalLimit = (driveData?.budgets ?? []).reduce((sum, b) => sum + b.limitAmount, 0);
                    const forecast = getForecast(driveData?.transactions ?? [], totalLimit);
                    const isOverBudget = totalLimit > 0 && forecast.projectedSpend > totalLimit;

                    return (
                      <div className="flex flex-col gap-3 py-1">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Projected Spend</span>
                          <span className={`text-3xl font-extrabold tracking-tight ${isOverBudget ? "text-red-500" : "text-zinc-900"}`}>
                            {currency.format(forecast.projectedSpend)}
                          </span>
                        </div>

                        <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? "bg-red-500" : "bg-purple-600"}`}
                            style={{ width: `${Math.min(totalLimit > 0 ? (forecast.projectedSpend / totalLimit) * 100 : 50, 100)}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-xs font-semibold text-zinc-500">
                          <span>Spent so far: {currency.format(forecast.currentSpend)}</span>
                          {totalLimit > 0 && (
                            <span>Limit: {currency.format(totalLimit)}</span>
                          )}
                        </div>

                        <p className="text-[10px] text-zinc-400 font-medium leading-relaxed mt-1">
                          Based on average daily spending of {currency.format(forecast.currentSpend / Math.max(1, new Date().getDate()))} over the past {new Date().getDate()} days. 
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
                          {heatmap.map((pt) => {
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
                                title={`${pt.dateStr}: ${currency.format(pt.amount)}`}
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
                            {breakdown.map((item, idx) => {
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
                              {currency.format(breakdown.reduce((sum, item) => sum + item.amount, 0))}
                            </span>
                          </div>
                        </div>

                        {/* List */}
                        <div className="flex flex-col gap-3.5">
                          {breakdown.map((item, idx) => (
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
                                <span className="font-extrabold text-zinc-900 text-xs">{currency.format(item.amount)}</span>
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
                              title={`Mess: ${currency.format(ratioData.messSpend)}`}
                            >
                              {((ratioData.messSpend / total) * 100) >= 15 && "Mess"}
                            </div>
                          )}
                          {ratioData.outsideSpend > 0 && (
                            <div
                              className="h-full bg-pink-500 flex items-center justify-center text-[9px] font-extrabold text-white transition-all border-l border-white"
                              style={{ width: `${(ratioData.outsideSpend / total) * 100}%` }}
                              title={`Outside Eating: ${currency.format(ratioData.outsideSpend)}`}
                            >
                              {((ratioData.outsideSpend / total) * 100) >= 15 && "Outside"}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs font-semibold mt-1">
                          <div className="border-l-2 border-blue-500 pl-2">
                            <p className="text-[10px] text-zinc-400 uppercase">Mess/Canteen Spend</p>
                            <p className="font-extrabold text-foreground mt-0.5">{currency.format(ratioData.messSpend)}</p>
                          </div>
                          <div className="border-l-2 border-pink-500 pl-2">
                            <p className="text-[10px] text-zinc-400 uppercase">Swiggy/Zomato/Eating Out</p>
                            <p className="font-extrabold text-foreground mt-0.5">{currency.format(ratioData.outsideSpend)}</p>
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
                    const maxAvg = Math.max(...pattern.map((p) => p.averageAmount), 10);
                    
                    return (
                      <div className="flex flex-col gap-4 select-none">
                        <div className="h-36 flex items-end justify-between px-2 pt-2 border-b border-zinc-200">
                          {pattern.map((pt, idx) => {
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
                        {merchants.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between border-b border-zinc-50 pb-2.5 last:border-0 last:pb-0">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-foreground text-xs truncate">{item.note}</p>
                              <p className="text-[9px] text-zinc-400 font-bold uppercase">{item.count} {item.count === 1 ? "transaction" : "transactions"}</p>
                            </div>
                            <span className="font-extrabold text-zinc-900 text-sm ml-2">{currency.format(item.totalAmount)}</span>
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
                  const activeBudgets = (driveData?.budgets ?? []).filter((b) => {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    return b.periodEnd >= todayStr;
                  });

                  if (activeBudgets.length === 0) {
                    return <div className="py-12 text-center text-xs text-zinc-400 italic">No active budgets this period</div>;
                  }

                  return (
                    <div className="flex flex-col gap-6">
                      {activeBudgets.map((budget) => {
                        const points = getBudgetActualCumulative(driveData?.transactions ?? [], budget, allCategories);
                        const maxVal = Math.max(budget.limitAmount, ...points.map((p) => p.actualSpent), 100);

                        const width = 500;
                        const height = 150;
                        const padding = 35;

                        const getX = (idx: number) => padding + (idx / (points.length - 1)) * (width - 2 * padding);
                        const getY = (val: number) => height - padding - (val / maxVal) * (height - 2 * padding);

                        let actualPath = "";
                        points.forEach((p, idx) => {
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
                              <span className="text-[10px] font-bold text-zinc-400">Limit: {currency.format(budget.limitAmount)}</span>
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
                    const maxVal = Math.max(...history.map((pt) => Math.max(pt.owedToYou, pt.youOwe)), 100);

                    const width = 500;
                    const height = 150;
                    const padding = 35;

                    const getX = (idx: number) => padding + (idx / (history.length - 1)) * (width - 2 * padding);
                    const getY = (val: number) => height - padding - (val / maxVal) * (height - 2 * padding);

                    let owedPath = "";
                    let owePath = "";

                    history.forEach((pt, idx) => {
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
                          {history.map((pt, idx) => (
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
                          (t) =>
                            !t.deletedAt &&
                            (t.type === "expense" || t.type === "debt") &&
                            t.spentAt.slice(0, 7) === currentMonth
                        );
                        for (const t of localMonthTxs) {
                          localSpend[t.categoryId] = (localSpend[t.categoryId] || 0) + t.amount;
                        }

                        // Benchmark threshold floor: 5 users
                        const minUserFloor = 5;

                        const benchmarkList = parentCategories.map((cat) => {
                          const aggregate = benchmarkData.find((a) => a.categoryId === cat.id);
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

                        return (
                          <div className="flex flex-col gap-3 py-1">
                            {benchmarkList.map((item, idx) => (
                              <div key={idx} className="flex flex-col gap-1 border-b border-zinc-50 pb-2.5 last:border-0 last:pb-0">
                                <div className="flex justify-between items-baseline text-xs font-bold">
                                  <span className="text-zinc-700 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: item.cat.color }} />
                                    {item.cat.name}
                                  </span>
                                  
                                  {item.isBelowThreshold ? (
                                    <span className="text-[9px] text-zinc-400 italic font-medium">Insufficient peer data (contribs: {item.userCount}/{minUserFloor})</span>
                                  ) : (
                                    <span className={`text-[10px] font-extrabold ${item.percentDiff! > 0 ? "text-red-500" : "text-green-600"}`}>
                                      {item.percentDiff! > 0 ? `+${item.percentDiff!.toFixed(0)}% above avg` : `${item.percentDiff!.toFixed(0)}% below avg`}
                                    </span>
                                  )}
                                </div>
                                
                                {!item.isBelowThreshold && (
                                  <div className="flex justify-between text-[9px] text-zinc-400 font-bold uppercase mt-0.5">
                                    <span>You: {currency.format(item.userSpend)}</span>
                                    <span>Avg: {currency.format(item.average)}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                            
                            <div className="text-[9px] text-zinc-400 font-bold bg-zinc-50 p-2.5 rounded-xl mt-1 border border-zinc-100 flex items-center gap-1">
                              <Shield className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                              <span>Privacy locked: participation floor set to {minUserFloor} users.</span>
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
                        <span className="text-3xl font-extrabold text-zinc-950">{currency.format(comparison.currentTotal)}</span>
                        {comparison.hasPrevious && (
                          <span className={`text-[10px] font-bold mt-1 ${comparison.percentChange > 0 ? "text-red-500" : "text-green-600"}`}>
                            {comparison.percentChange > 0 ? `+${comparison.percentChange}% higher` : `${comparison.percentChange}% lower`} than previous semester
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1 pl-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Previous Cycle Spend</span>
                        <span className="text-xl font-extrabold text-zinc-500">
                          {comparison.hasPrevious ? currency.format(comparison.previousTotal) : "No logs recorded"}
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
        </section>
      ) : null}

      {activeView === "budgets" ? (
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
                    {activeBudgets.map((budget) => {
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
                                    .map((id) => allCategories.find((c) => c.id === id)?.name ?? "")
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
                              {currency.format(budget.spent)} spent
                            </span>
                            <span className="text-zinc-600">of {currency.format(budget.limitAmount)}</span>
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
                              <AlertTriangle className="w-3 h-3" /> Over by {currency.format(budget.spent - budget.limitAmount)}
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
                    {historyBudgets.map((budget) => (
                      <div key={budget.id} className="glass p-5 rounded-3xl flex flex-col gap-3 shadow-sm border border-zinc-100 opacity-60">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-zinc-700 text-base">{budget.name}</h4>
                            <p className="text-xs text-zinc-400 font-medium">
                              {budget.categoryIds.length === 0
                                ? "All Categories"
                                : budget.categoryIds
                                    .map((id) => allCategories.find((c) => c.id === id)?.name ?? "")
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
                          <span className="text-zinc-500">{currency.format(budget.spent)} spent</span>
                          <span className="text-zinc-400">limit {currency.format(budget.limitAmount)}</span>
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
                      <p className="text-2xl font-extrabold text-foreground">{currency.format(allowanceStatus.spentSoFar)}</p>
                    </div>
                    <div className="glass p-5 rounded-3xl flex flex-col gap-1 border border-zinc-100">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Remaining</p>
                      <p className={`text-2xl font-extrabold ${allowanceStatus.remaining < 0 ? "text-orange-600" : "text-foreground"}`}>
                        {currency.format(allowanceStatus.remaining)}
                      </p>
                    </div>
                    <div className="glass p-5 rounded-3xl flex flex-col gap-1 border border-zinc-100">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Avg Daily Spend</p>
                      <p className="text-2xl font-extrabold text-foreground">{currency.format(allowanceStatus.averageDailySpend)}/day</p>
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
                <h2 className="text-xl font-bold text-zinc-900">Savings Goals</h2>
                <button
                  type="button"
                  onClick={startAddGoal}
                  className="text-xs font-bold text-white bg-purple-600 px-4 py-2 rounded-xl shadow-md shadow-purple-500/20 active:scale-95 transition-all hover:bg-purple-700"
                >
                  + Add Goal
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {goalsList.length === 0 ? (
                  <p className="text-sm text-zinc-500 italic">No savings goals. Create one above!</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {goalsList.map((goal) => {
                      const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                      const isDone = goal.currentAmount >= goal.targetAmount;
                      const quickVal = quickAddFunds[goal.id] ?? "";
                      
                      return (
                        <div key={goal.id} className="glass p-5 rounded-3xl flex flex-col gap-3 shadow-sm border border-zinc-100">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold text-foreground text-base">{goal.name}</h4>
                              {goal.targetDate && (
                                <p className="text-xs text-zinc-400 font-medium">
                                  Target Date: {new Date(goal.targetDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEditGoal(goal)}
                                className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-blue-500 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteGoal(goal.id)}
                                className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-end text-xs font-bold mb-1.5">
                              <span className={isDone ? "text-purple-600" : "text-zinc-500"}>
                                {currency.format(goal.currentAmount)} saved
                              </span>
                              <span className="text-zinc-400">target {currency.format(goal.targetAmount)}</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden shadow-inner">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Quick Add Funds Inline Form */}
                          <div className="pt-2 border-t border-zinc-50 flex items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex-1">Quick Add Funds:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-zinc-400">₹</span>
                              <input
                                type="number"
                                placeholder="0"
                                className="w-16 h-8 text-center rounded-lg bg-zinc-100/70 border-0 outline-none text-xs font-bold text-foreground"
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
                                className="h-8 px-3 rounded-lg bg-purple-600 text-white text-xs font-bold shadow-sm hover:bg-purple-700 active:scale-95 transition-all"
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
                      categoryId: allCategories.find((c) => !c.parentId)?.id ?? "other",
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
                    {driveData.recurringTemplates.map((template) => {
                      const cat = allCategories.find((c) => c.id === template.categoryId);
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
                                {currency.format(template.amount)}
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
                  <h2 className="text-xl font-bold text-foreground">Active Subscriptions</h2>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">Recurring OTT & gym commitments</p>
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
                  className="text-xs font-bold text-white bg-purple-600 px-4 py-2 rounded-xl shadow-md shadow-purple-500/20 active:scale-95 transition-all hover:bg-purple-700"
                >
                  + Add Subscription
                </button>
              </div>

              {/* Subscriptions Commitment Banner Card */}
              {(() => {
                const activeSubs = (driveData?.subscriptions ?? []).filter((s) => s.active);
                const totalMonthlyCommitment = activeSubs.reduce((sum, s) => sum + s.amount, 0);

                return (
                  <div className="glass p-6 rounded-3xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-100/50 dark:border-purple-950/20 shadow-sm relative overflow-hidden">
                    <div className="absolute right-[-5%] top-[-10%] w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
                    
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-purple-600 dark:text-purple-400">Total Committed Monthly Spend</p>
                    <h3 className="text-3.5xl font-extrabold text-foreground mt-1 tracking-tight">
                      {currency.format(totalMonthlyCommitment)}
                      <span className="text-sm font-bold text-muted-foreground ml-1">/ month</span>
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-medium leading-normal mt-1">
                      Calculated across {activeSubs.length} active subscription templates. Logged on schedule on their respective billing days.
                    </p>
                  </div>
                );
              })()}

              <div className="flex flex-col gap-4">
                {!(driveData?.subscriptions) || driveData.subscriptions.length === 0 ? (
                  <div className="glass p-8 rounded-3xl text-center text-xs text-muted-foreground italic border border-dashed border-border">
                    No subscriptions added yet. Log Netflix, Spotify, or gym billing cycles to track commitments.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {driveData.subscriptions.map((sub) => {
                      const cat = allCategories.find((c) => c.id === sub.categoryId);
                      return (
                        <div
                          key={sub.id}
                          className={`glass p-5 rounded-3xl flex flex-col justify-between gap-4 border transition-all ${sub.active ? "border-border" : "opacity-60 border-zinc-200/50 dark:border-zinc-900/50"}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-card-foreground text-base">{sub.name}</h4>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-muted-foreground bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                                  Billing Day: {sub.billingDay === 1 ? "1st" : sub.billingDay === 2 ? "2nd" : sub.billingDay === 3 ? "3rd" : `${sub.billingDay}th`}
                                </span>
                                {cat && (
                                  <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                    {cat.name}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-lg font-extrabold text-foreground">
                                {currency.format(sub.amount)}
                              </span>
                              <span className="text-[10px] text-muted-foreground block font-medium">/ month</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-border/80 pt-3 mt-1">
                            <button
                              type="button"
                              onClick={() => toggleSubscription(sub)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${sub.active ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100" : "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 hover:bg-green-100"}`}
                            >
                              {sub.active ? (
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
                                  setEditingSubscription(sub);
                                  setSubscriptionForm({
                                    name: sub.name,
                                    amount: String(sub.amount),
                                    categoryId: sub.categoryId,
                                    billingDay: String(sub.billingDay),
                                  });
                                  setIsAddingSubscription(true);
                                }}
                                className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-muted-foreground hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all"
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
          
          {/* Sub-tab closures */}
        </section>
      ) : null}


      {activeView === "splits" ? (
        <section className="flex flex-1 flex-col gap-6 px-6 pt-6 pb-24 max-w-md md:max-w-5xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Hostel Splits</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreatingRoom(true)}
                className="p-2 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all flex items-center justify-center"
                title="Create Room"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setIsJoiningRoom(true)}
                className="p-2 rounded-xl bg-pink-50 text-pink-600 hover:bg-pink-100 transition-all flex items-center justify-center"
                title="Join Room"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Onboarding State: No Rooms */}
          {rooms.length === 0 ? (
            <div className="glass p-6 rounded-3xl text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base">No Split Rooms</h3>
                <p className="text-xs text-zinc-500 font-medium mt-1">
                  Create a room for your hostel room or join your roommate's room via invite code to start splitting shared costs.
                </p>
              </div>
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingRoom(true)}
                  className="flex-1 h-11 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md shadow-purple-500/20 active:scale-95 transition-all hover:bg-purple-700"
                >
                  Create Room
                </button>
                <button
                  type="button"
                  onClick={() => setIsJoiningRoom(true)}
                  className="flex-1 h-11 rounded-xl bg-zinc-100 text-zinc-600 text-xs font-bold active:scale-95 transition-all hover:bg-zinc-200"
                >
                  Join Room
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Room Select Dropdown */}
              <div className="glass p-4 rounded-3xl flex flex-col gap-3 border border-zinc-100 shadow-sm">
                <label className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Select Room</span>
                  <select
                    className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                    value={selectedRoomId || ""}
                    onChange={(e) => handleRoomSelect(e.target.value)}
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedRoomId && (
                  <>
                    <div className="flex items-center justify-between text-xs font-bold mt-1">
                      <span className="text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-lg">
                        Code: {rooms.find((r) => r.id === selectedRoomId)?.inviteCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => leaveRoom(selectedRoomId)}
                        className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100/60 px-2.5 py-1 rounded-lg transition-colors text-xs font-bold"
                      >
                        Leave Room
                      </button>
                    </div>
                    <div className="border-t border-zinc-100 pt-3 mt-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Room Members</span>
                      <div className="flex flex-wrap gap-2">
                        {rooms.find((r) => r.id === selectedRoomId)?.memberships.map((m: any) => {
                          const isMe = m.user.id === session?.user?.id;
                          return (
                            <div key={m.user.id} className="flex items-center gap-1.5 bg-zinc-100/60 px-2.5 py-1 rounded-full text-xs font-semibold text-zinc-600">
                              {m.user.image ? (
                                <img src={m.user.image} alt={m.user.name || "Member"} className="w-4 h-4 rounded-full border border-zinc-200" />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[8px] font-bold">
                                  {(m.user.name || m.user.email)[0].toUpperCase()}
                                </div>
                              )}
                              <span className="truncate max-w-[100px]">{m.user.name || m.user.email.split("@")[0]} {isMe && "(You)"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Room Net Ledger and Members */}
              {selectedRoomId && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Room Ledger Balance</h3>
                  
                  {roomLedger.length === 0 ? (
                    <div className="glass p-5 rounded-3xl text-center py-8 text-zinc-500 text-xs italic border border-zinc-100">
                      Everyone is squared away in this room!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {roomLedger.map((ledgerItem, idx) => {
                        const isMeDebtor = ledgerItem.debtor.id === session?.user?.id;
                        const isMeCreditor = ledgerItem.creditor.id === session?.user?.id;
                        
                        return (
                          <div key={idx} className="glass p-4 rounded-2xl flex items-center justify-between border border-zinc-100 shadow-sm">
                            <div className="min-w-0 flex-1 flex items-center gap-2">
                              <span className="font-bold text-zinc-700 text-xs truncate">
                                {ledgerItem.debtor.name || ledgerItem.debtor.email.split("@")[0]}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                              <span className="font-bold text-zinc-700 text-xs truncate">
                                {ledgerItem.creditor.name || ledgerItem.creditor.email.split("@")[0]}
                              </span>
                              <span className="font-extrabold text-zinc-900 text-sm ml-2">
                                {currency.format(ledgerItem.amount)}
                              </span>
                            </div>

                            {/* Settlement Confirmation State */}
                            {ledgerItem.isSettlePending ? (
                              ledgerItem.initiatorId === session?.user?.id ? (
                                <span className="text-[10px] font-bold text-zinc-400 bg-zinc-50 border border-zinc-100 px-2.5 py-1.5 rounded-xl animate-pulse">
                                  Waiting...
                                </span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => respondToSettlePending(selectedRoomId, isMeDebtor ? ledgerItem.creditor.id : ledgerItem.debtor.id, "confirm")}
                                    className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                    title="Confirm Settlement"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => respondToSettlePending(selectedRoomId, isMeDebtor ? ledgerItem.creditor.id : ledgerItem.debtor.id, "decline")}
                                    className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                    title="Reject Settlement"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )
                            ) : (
                              // Only show Settle Up if the current user is part of the pair
                              (isMeDebtor || isMeCreditor) && (
                                <button
                                  type="button"
                                  onClick={() => initiateSettleUp(selectedRoomId, isMeDebtor ? ledgerItem.creditor.id : ledgerItem.debtor.id)}
                                  className="text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-xl transition-all"
                                >
                                  Settle Up
                                </button>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pending Split Requests (Owed by User) */}
          {splits.filter((s) => s.recipientId === session?.user?.id && s.status === "pending").length > 0 && (
            <div className="flex flex-col gap-4 mt-2">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Incoming Split Requests</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {splits
                  .filter((s: any) => s.recipientId === session?.user?.id && s.status === "pending")
                  .map((split) => (
                    <div key={split.id} className="glass p-4 rounded-2xl flex flex-col gap-3 border border-zinc-100 shadow-sm bg-gradient-to-r from-purple-50/20 to-transparent">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-foreground text-sm">{split.note || "Shared Expense"}</h4>
                          <p className="text-xs text-zinc-400 font-medium">
                            Payer: {split.requester.name || split.requester.email.split("@")[0]} · Room: {split.room.name}
                          </p>
                        </div>
                        <span className="font-extrabold text-zinc-900 text-base">{currency.format(split.amount)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-zinc-50">
                        <span className="text-[10px] text-zinc-400 font-semibold">
                          {new Date(split.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => respondToSplit(split.id, "accepted")}
                            className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-xl flex items-center gap-1 active:scale-95 transition-all shadow-sm shadow-green-600/10"
                          >
                            <Check className="w-3.5 h-3.5" /> Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => respondToSplit(split.id, "disputed")}
                            className="text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl flex items-center gap-1 active:scale-95 transition-all"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" /> Dispute
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Sent Split Requests (Disputed or Pending) */}
          {splits.filter((s) => s.requesterId === session?.user?.id && s.roomId === selectedRoomId && (s.status === "pending" || s.status === "disputed")).length > 0 && (
            <div className="flex flex-col gap-4 mt-2">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Sent Split Requests</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {splits
                  .filter((s: any) => s.requesterId === session?.user?.id && s.roomId === selectedRoomId && (s.status === "pending" || s.status === "disputed"))
                  .map((split) => {
                    const isDisputed = split.status === "disputed";
                    return (
                      <div
                        key={split.id}
                        className={`glass p-4 rounded-2xl flex flex-col gap-2 border shadow-sm ${
                          isDisputed
                            ? "bg-amber-50/50 border-amber-100 text-amber-900 animate-pulse"
                            : "border-zinc-100 text-zinc-700"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-sm">{split.note || "Shared Expense"}</h4>
                            <p className="text-xs text-zinc-400 font-medium">
                              Ower: {split.recipient.name || split.recipient.email.split("@")[0]} · Room: {split.room.name}
                            </p>
                          </div>
                          <span className="font-extrabold text-base">{currency.format(split.amount)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 text-[10px] font-bold uppercase tracking-wider">
                          <span>
                            {new Date(split.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                          </span>
                          <span className={isDisputed ? "text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full" : "text-zinc-400"}>
                            {split.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </section>
      ) : null}

      {/* Floating Add Menu Overlay */}
      {showAddMenu && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40 md:hidden" onClick={() => setShowAddMenu(false)}>
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-48 bg-card text-card-foreground rounded-2xl shadow-xl border border-border p-2 flex flex-col gap-1 anim-fade-in">
            <button
              type="button"
              onClick={() => {
                setShowAddMenu(false);
                startAdd();
              }}
              className="flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:text-purple-600 dark:hover:text-purple-400 rounded-xl transition-colors text-left"
            >
              <Plus className="w-4 h-4 text-purple-600" />
              Add Personal Expense
            </button>
            <button
              type="button"
              onClick={startAddSharedExpense}
              className="flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:text-purple-600 dark:hover:text-purple-400 rounded-xl transition-colors text-left"
            >
              <Users className="w-4 h-4 text-pink-500" />
              Add Shared Expense
            </button>
          </div>
        </div>
      )}
      
      {/* Floating Plus Button (FAB) */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 md:hidden">
        <button
          type="button"
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-violet-600/50 transition-all hover:scale-110 active:scale-95 border-2 border-white/10"
          aria-label="Add Menu"
          style={{ boxShadow: "0 0 24px rgba(124,58,237,0.55), 0 4px 16px rgba(0,0,0,0.4)" }}
        >
          <Plus className={`w-6 h-6 transition-transform duration-300 ${showAddMenu ? "rotate-45" : ""}`} strokeWidth={2.5} />
        </button>
      </div>

      {/* Symmetric 5-slot bottom navbar */}
      <div className="fixed bottom-4 inset-x-0 mx-auto px-5 max-w-md w-full z-40 md:hidden">
        <nav className="glass-nav rounded-2xl h-[62px] px-2 flex items-center justify-between relative">
          {([
            { view: "home", icon: HomeIcon, label: "Home" },
            { view: "budgets", icon: Wallet, label: "Budgets" },
            { view: "splits", icon: Users, label: "Splits" },
            { view: "analytics", icon: TrendingUp, label: "Analytics" },
          ] as const).map(({ view, icon: Icon, label }, idx) => {
            const isActive = activeView === view;
            // Insert spacer before index 2 (for the FAB)
            const withSpacer = idx === 2;
            return (
              <>
                {withSpacer && <div key="spacer" className="w-14 flex-shrink-0" />}
                <button
                  key={view}
                  type="button"
                  className="relative flex-1 flex flex-col items-center justify-center h-full gap-0.5 transition-all duration-200"
                  onClick={() => {
                    setActiveView(view);
                    setShowAddMenu(false);
                  }}
                >
                  {/* Active indicator dot */}
                  <span className={`absolute top-1.5 w-1 h-1 rounded-full transition-all duration-200 ${isActive ? "bg-violet-500 shadow-[0_0_6px_rgba(124,58,237,0.9)]" : "opacity-0"}`} />
                  <Icon
                    className={`w-[19px] h-[19px] transition-all duration-200 ${isActive ? "text-violet-400 scale-110" : "text-zinc-500"}`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className={`text-[9px] font-bold transition-colors duration-200 ${isActive ? "text-violet-400" : "text-zinc-500"}`}>{label}</span>
                </button>
              </>
            );
          })}
        </nav>
      </div>


      {/* Add Shared Expense Modal */}
      {isAddingSharedExpense && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <form onSubmit={submitSharedExpense} className="glass p-6 rounded-3xl max-w-sm w-full flex flex-col gap-4 shadow-xl overflow-y-auto max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-base">Add Shared Expense</h3>
              <button
                type="button"
                onClick={() => setIsAddingSharedExpense(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="space-y-1">
              <span className="text-xs font-bold text-zinc-700">Room</span>
              <select
                className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                value={sharedExpenseForm.roomId}
                onChange={(e) => handleRoomSelect(e.target.value)}
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-zinc-700">Total Amount (₹)</span>
              <input
                type="number"
                required
                min="1"
                placeholder="0"
                className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                value={sharedExpenseForm.totalAmount}
                onChange={(e) => setSharedExpenseForm({ ...sharedExpenseForm, totalAmount: e.target.value })}
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-zinc-700">Category</span>
              <select
                className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                value={sharedExpenseForm.categoryId}
                onChange={(e) => setSharedExpenseForm({ ...sharedExpenseForm, categoryId: e.target.value })}
              >
                {parentCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-zinc-700">Description / Note</span>
              <input
                type="text"
                maxLength={100}
                placeholder="e.g. Pizza night"
                className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                value={sharedExpenseForm.note}
                onChange={(e) => setSharedExpenseForm({ ...sharedExpenseForm, note: e.target.value })}
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-zinc-700">Date</span>
              <input
                type="date"
                required
                className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                value={sharedExpenseForm.spentAt}
                onChange={(e) => setSharedExpenseForm({ ...sharedExpenseForm, spentAt: e.target.value })}
              />
            </label>

            {/* Split Method Toggle */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Split Method</span>
              <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl">
                <button
                  type="button"
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${splitMethod === "equal" ? "bg-white dark:bg-zinc-700 text-foreground shadow-sm" : "text-muted-foreground hover:text-zinc-600 dark:hover:text-zinc-300"}`}
                  onClick={() => setSplitMethod("equal")}
                >
                  Split Equally
                </button>
                <button
                  type="button"
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${splitMethod === "custom" ? "bg-white dark:bg-zinc-700 text-foreground shadow-sm" : "text-muted-foreground hover:text-zinc-600 dark:hover:text-zinc-300"}`}
                  onClick={() => setSplitMethod("custom")}
                >
                  Custom Shares
                </button>
              </div>
            </div>

            {/* Members Checklist / Custom Shares Inputs */}
            <div className="space-y-1 bg-input text-foreground border-input p-2.5 rounded-xl border border-border/80 max-h-36 overflow-y-auto">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                {splitMethod === "equal" ? "Select members included in split:" : "Enter custom amount per member:"}
              </span>
              
              {rooms.find((r) => r.id === sharedExpenseForm.roomId)?.memberships.map((m: any) => {
                const member = m.user;
                const isPayer = member.id === session?.user?.id;
                
                if (splitMethod === "equal") {
                  return (
                    <label key={member.id} className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedExpenseMembers.includes(member.id)}
                        onChange={() => {
                          const exist = selectedExpenseMembers.includes(member.id);
                          setSelectedExpenseMembers(exist 
                            ? selectedExpenseMembers.filter((id) => id !== member.id)
                            : [...selectedExpenseMembers, member.id]
                          );
                        }}
                        className="rounded border-zinc-300 dark:border-zinc-750 text-purple-600 focus:ring-purple-500 bg-white dark:bg-zinc-800"
                      />
                      <span>{member.name || member.email.split("@")[0]} {isPayer && "(You)"}</span>
                    </label>
                  );
                } else {
                  return (
                    <div key={member.id} className="flex items-center justify-between py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      <span>{member.name || member.email.split("@")[0]} {isPayer && "(You)"}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-400 text-[10px]">₹</span>
                        <input
                          type="number"
                          placeholder="0"
                          className="w-16 h-7 text-center rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none text-xs font-bold text-card-foreground"
                          value={sharedExpenseForm.splits[member.id] || ""}
                          onChange={(e) => setSharedExpenseForm({
                            ...sharedExpenseForm,
                            splits: { ...sharedExpenseForm.splits, [member.id]: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  );
                }
              })}
            </div>

            <button
              type="submit"
              className="h-12 w-full rounded-xl bg-purple-600 text-white font-bold text-sm shadow-md shadow-purple-500/20 hover:bg-purple-700 transition-colors mt-2"
            >
              Submit Shared Expense
            </button>
          </form>
        </div>
      )}

      {/* Create Room Modal */}
      {isCreatingRoom && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <form onSubmit={createRoom} className="glass p-6 rounded-3xl max-w-sm w-full flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-base">Create Room</h3>
              <button
                type="button"
                onClick={() => setIsCreatingRoom(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="space-y-1">
              <span className="text-xs font-bold text-zinc-700">Room Name</span>
              <input
                type="text"
                required
                maxLength={40}
                placeholder="e.g. Room 405 or Pondy Trip"
                className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
              />
            </label>

            <button
              type="submit"
              className="h-12 w-full rounded-xl bg-purple-600 text-white font-bold text-sm shadow-md shadow-purple-500/20 hover:bg-purple-700 transition-colors mt-2"
            >
              Create
            </button>
          </form>
        </div>
      )}

      {/* Join Room Modal */}
      {isJoiningRoom && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <form onSubmit={joinRoom} className="glass p-6 rounded-3xl max-w-sm w-full flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-base">Join Room</h3>
              <button
                type="button"
                onClick={() => setIsJoiningRoom(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="space-y-1">
              <span className="text-xs font-bold text-zinc-700">Invite Code (6 chars)</span>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="e.g. AB4CD2"
                className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-sm font-extrabold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground tracking-widest text-center uppercase"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
              />
            </label>

            <button
              type="submit"
              className="h-12 w-full rounded-xl bg-purple-600 text-white font-bold text-sm shadow-md shadow-purple-500/20 hover:bg-purple-700 transition-colors mt-2"
            >
              Join
            </button>
          </form>
        </div>
      )}

      {/* Add/Edit Budget Modal Overlay */}
      {isAddingBudget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <form onSubmit={saveBudget} className="glass p-6 rounded-3xl max-w-sm w-full flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-base">{editingBudget ? "Edit Budget" : "Create Budget"}</h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddingBudget(false);
                  setEditingBudget(null);
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="space-y-1">
              <span className="text-xs font-bold text-zinc-700">Budget Name</span>
              <input
                type="text"
                required
                maxLength={40}
                placeholder="e.g. Canteen Limit"
                className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                value={budgetForm.name}
                onChange={(e) => handleBudgetFormChange("name", e.target.value)}
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-zinc-700">Limit Amount (₹)</span>
              <input
                type="number"
                required
                min="1"
                placeholder="0"
                className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                value={budgetForm.limitAmount}
                onChange={(e) => handleBudgetFormChange("limitAmount", e.target.value)}
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-zinc-700">Period Type</span>
              <select
                className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                value={budgetForm.periodType}
                onChange={(e) => handleBudgetFormChange("periodType", e.target.value as any)}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="semester">Semester</option>
                <option value="custom">Custom</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs font-bold text-zinc-700">Start Date</span>
                <input
                  type="date"
                  required
                  className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                  value={budgetForm.periodStart}
                  onChange={(e) => handleBudgetFormChange("periodStart", e.target.value)}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-bold text-zinc-700">End Date</span>
                <input
                  type="date"
                  required
                  disabled={budgetForm.periodType !== "custom" && budgetForm.periodType !== "semester"}
                  className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground disabled:opacity-50"
                  value={budgetForm.periodEnd}
                  onChange={(e) => handleBudgetFormChange("periodEnd", e.target.value)}
                />
              </label>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Target Categories</span>
              <p className="text-[10px] text-zinc-400 font-medium">Uncheck all to target everything</p>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-input text-foreground border-input rounded-xl border border-border/80">
                {parentCategories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer bg-white dark:bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <input
                      type="checkbox"
                      checked={budgetForm.categoryIds.includes(cat.id)}
                      onChange={() => toggleBudgetCategory(cat.id)}
                      className="rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span>{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="h-12 w-full rounded-xl bg-purple-600 text-white font-bold text-sm shadow-md shadow-purple-500/20 hover:bg-purple-700 transition-colors mt-2"
            >
              Save Budget
            </button>
          </form>
        </div>
      )}

      {/* Add/Edit Goal Modal Overlay */}
      {isAddingGoal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <form onSubmit={saveGoal} className="glass p-6 rounded-3xl max-w-sm w-full flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-base">{editingGoal ? "Edit Goal" : "Create Savings Goal"}</h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddingGoal(false);
                  setEditingGoal(null);
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="space-y-1">
              <span className="text-xs font-bold text-zinc-700">Goal Name</span>
              <input
                type="text"
                required
                maxLength={40}
                placeholder="e.g. New Laptop"
                className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                value={goalForm.name}
                onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-zinc-700">Target Amount (₹)</span>
              <input
                type="number"
                required
                min="1"
                placeholder="0"
                className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                value={goalForm.targetAmount}
                onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-zinc-700">Initial Saved Amount (₹)</span>
              <input
                type="number"
                required
                min="0"
                placeholder="0"
                className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                value={goalForm.currentAmount}
                onChange={(e) => setGoalForm({ ...goalForm, currentAmount: e.target.value })}
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-zinc-700">Target Date (Optional)</span>
              <input
                type="date"
                className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-foreground"
                value={goalForm.targetDate}
                onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
              />
            </label>

            <button
              type="submit"
              className="h-12 w-full rounded-xl bg-purple-600 text-white font-bold text-sm shadow-md shadow-purple-500/20 hover:bg-purple-700 transition-colors mt-2"
            >
              Save Goal
            </button>
          </form>
        </div>
      )}

      {/* Add / Edit Repeating Template Modal */}
      {isAddingRepeating && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <form onSubmit={saveRepeatingTemplate} className="glass p-6 rounded-3xl max-w-sm w-full flex flex-col gap-4 shadow-xl border border-white/20 dark:border-zinc-800 animate-fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-base">
                {editingRepeating ? "Edit Repeating Template" : "Add Repeating Template"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddingRepeating(false);
                  setEditingRepeating(null);
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="space-y-1">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Description / Note</span>
              <input
                type="text"
                required
                maxLength={40}
                placeholder="e.g. Weekly laundry spend"
                className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 dark:bg-zinc-800 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-card-foreground"
                value={repeatingForm.note}
                onChange={(e) => setRepeatingForm({ ...repeatingForm, note: e.target.value })}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Amount (₹)</span>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="₹0"
                  className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 dark:bg-zinc-800 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-card-foreground"
                  value={repeatingForm.amount}
                  onChange={(e) => setRepeatingForm({ ...repeatingForm, amount: e.target.value })}
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Frequency</span>
                <select
                  className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 dark:bg-zinc-800 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-card-foreground"
                  value={repeatingForm.frequency}
                  onChange={(e) => setRepeatingForm({ ...repeatingForm, frequency: e.target.value as any })}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Start Date</span>
                <input
                  type="date"
                  required
                  className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 dark:bg-zinc-800 px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-card-foreground"
                  value={repeatingForm.startDate}
                  onChange={(e) => setRepeatingForm({ ...repeatingForm, startDate: e.target.value })}
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Account (Optional)</span>
                <input
                  type="text"
                  placeholder="e.g. Cash, Paytm"
                  className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 dark:bg-zinc-800 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-card-foreground"
                  value={repeatingForm.account}
                  onChange={(e) => setRepeatingForm({ ...repeatingForm, account: e.target.value })}
                />
              </label>
            </div>

            <label className="space-y-1">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Category</span>
              <select
                className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 dark:bg-zinc-800 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-card-foreground"
                value={repeatingForm.categoryId}
                onChange={(e) => setRepeatingForm({ ...repeatingForm, categoryId: e.target.value })}
              >
                {parentCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="h-12 w-full rounded-xl bg-purple-600 text-white font-bold text-sm shadow-md shadow-purple-500/20 hover:bg-purple-700 transition-colors mt-2"
            >
              Save Template
            </button>
          </form>
        </div>
      )}

      {/* Add / Edit Subscription Modal */}
      {isAddingSubscription && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <form onSubmit={saveSubscription} className="glass p-6 rounded-3xl max-w-sm w-full flex flex-col gap-4 shadow-xl border border-white/20 dark:border-zinc-800 animate-fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-base">
                {editingSubscription ? "Edit Subscription" : "Add Subscription"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddingSubscription(false);
                  setEditingSubscription(null);
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <label className="space-y-1">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Subscription Name</span>
              <input
                type="text"
                required
                maxLength={40}
                placeholder="e.g. Spotify Premium"
                className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 dark:bg-zinc-800 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-card-foreground"
                value={subscriptionForm.name}
                onChange={(e) => setSubscriptionForm({ ...subscriptionForm, name: e.target.value })}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Monthly Cost (₹)</span>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="₹0"
                  className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 dark:bg-zinc-800 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-card-foreground"
                  value={subscriptionForm.amount}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, amount: e.target.value })}
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Billing Day (1-31)</span>
                <input
                  type="number"
                  required
                  min="1"
                  max="31"
                  placeholder="15"
                  className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 dark:bg-zinc-800 px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-card-foreground"
                  value={subscriptionForm.billingDay}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, billingDay: e.target.value })}
                />
              </label>
            </div>

            <label className="space-y-1">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Category</span>
              <select
                className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 dark:bg-zinc-800 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-card-foreground"
                value={subscriptionForm.categoryId}
                onChange={(e) => setSubscriptionForm({ ...subscriptionForm, categoryId: e.target.value })}
              >
                {parentCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="h-12 w-full rounded-xl bg-purple-600 text-white font-bold text-sm shadow-md shadow-purple-500/20 hover:bg-purple-700 transition-colors mt-2"
            >
              Save Subscription
            </button>
          </form>
        </div>
      )}

      {/* Parent Statement Portal Modal */}
      {showParentReport && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="glass p-6 rounded-3xl max-w-md w-full flex flex-col gap-4 shadow-xl border border-white/20 dark:border-zinc-800 animate-fade-in overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-foreground text-base">Parent Statement Report</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">Generate clean, filtered PDF statements</p>
              </div>
              <button
                type="button"
                onClick={() => setShowParentReport(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Date Range Selection */}
              <label className="space-y-1 block">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Statement Period</span>
                <select
                  className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 dark:bg-zinc-800 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-card-foreground"
                  value={parentReportForm.dateRange}
                  onChange={(e) => setParentReportForm({ ...parentReportForm, dateRange: e.target.value as any })}
                >
                  <option value="this-month">This Month</option>
                  <option value="last-month">Last Month</option>
                  {driveData?.allowanceConfig?.cycleStart && <option value="semester">Current Allowance Semester</option>}
                  <option value="custom">Custom Date Range</option>
                </select>
              </label>

              {parentReportForm.dateRange === "custom" && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1 block">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Start Date</span>
                    <input
                      type="date"
                      required
                      className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 dark:bg-zinc-800 px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-card-foreground"
                      value={parentReportForm.customStart}
                      onChange={(e) => setParentReportForm({ ...parentReportForm, customStart: e.target.value })}
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">End Date</span>
                    <input
                      type="date"
                      required
                      className="h-11 w-full rounded-xl border-0 bg-zinc-100/50 dark:bg-zinc-800 px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-card-foreground"
                      value={parentReportForm.customEnd}
                      onChange={(e) => setParentReportForm({ ...parentReportForm, customEnd: e.target.value })}
                    />
                  </label>
                </div>
              )}

              {/* Splits Toggle */}
              <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-2xl border border-zinc-100/50 dark:border-zinc-800">
                <div>
                  <span className="font-bold text-card-foreground text-xs">Include Roommate Splits</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Toggle to hide splits from parent statement</p>
                </div>
                <input
                  type="checkbox"
                  checked={parentReportForm.includeSplits}
                  onChange={(e) => setParentReportForm({ ...parentReportForm, includeSplits: e.target.checked })}
                  className="rounded border-zinc-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Selective Category Filter list */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">Select Categories to Include</span>
                <p className="text-[10px] text-muted-foreground font-medium">Uncheck categories to hide discretionary spend (like outings/outside food) from parents.</p>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border border-border rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30">
                  {parentCategories.map((c) => {
                    const isSelected = parentReportForm.selectedCategoryIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          const current = parentReportForm.selectedCategoryIds;
                          const next = isSelected ? current.filter((id) => id !== c.id) : [...current, c.id];
                          setParentReportForm({ ...parentReportForm, selectedCategoryIds: next });
                        }}
                        className={`flex items-center gap-2 p-2 rounded-xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-white dark:bg-zinc-800 border-purple-200 dark:border-purple-900 text-card-foreground shadow-xs"
                            : "bg-transparent border-transparent text-muted-foreground hover:text-zinc-600 dark:hover:text-zinc-400"
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="text-xs font-bold truncate">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={printParentReport}
              disabled={parentReportForm.selectedCategoryIds.length === 0}
              className="h-12 w-full rounded-xl bg-purple-600 text-white font-bold text-sm shadow-md shadow-purple-500/20 hover:bg-purple-700 active:scale-95 transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Generate & Print Report (PDF)
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="glass p-6 rounded-[32px] max-w-md w-full flex flex-col gap-5 shadow-2xl overflow-y-auto max-h-[90vh] border border-white/20 dark:border-zinc-800 animate-fade-in relative">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Settings
              </h3>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer animate-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Section */}
            <div className="flex items-center gap-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xs p-4 rounded-3xl border border-border/80 shadow-xs">
              {session?.user?.image ? (
                <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 shadow-md">
                  <img src={session.user.image} alt="Profile" className="w-12 h-12 rounded-full border border-white dark:border-zinc-900" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-base shadow-inner">
                  {session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-card-foreground text-base truncate">{session?.user?.name || "Student User"}</p>
                <p className="text-xs text-muted-foreground font-semibold truncate">{session?.user?.email}</p>
              </div>
            </div>

            {/* Theme / Dark Mode toggle */}
            <div className="flex flex-col gap-2 bg-white/40 dark:bg-zinc-900/40 p-4 rounded-3xl border border-border/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-card-foreground text-xs">Theme Mode</span>
                <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl text-xs font-bold border border-zinc-200/50 dark:border-zinc-700/50">
                  <button
                    type="button"
                    className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${themeMode === "light" ? "bg-white dark:bg-zinc-700 text-foreground shadow-xs" : "text-muted-foreground hover:text-zinc-655"}`}
                    onClick={() => toggleThemeOverride("light")}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${themeMode === "dark" ? "bg-white dark:bg-zinc-700 text-foreground shadow-xs" : "text-muted-foreground hover:text-zinc-300"}`}
                    onClick={() => toggleThemeOverride("dark")}
                  >
                    Dark
                  </button>
                </div>
              </div>
            </div>

            {/* Peer Benchmarking Opt-In */}
            <div className="flex flex-col gap-3 bg-white/40 dark:bg-zinc-900/40 p-4 rounded-3xl border border-border/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-card-foreground text-xs">Peer Benchmarking</span>
                <button
                  type="button"
                  onClick={() => toggleBenchmarkOptIn(!benchmarkOptIn)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${benchmarkOptIn ? "bg-purple-600" : "bg-zinc-200 dark:bg-zinc-750"}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${benchmarkOptIn ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
                Compare monthly totals anonymously. Data is aggregated globally; individual histories remain private. Benchmarks display only when at least 5 students contribute.
              </p>
            </div>

            {/* Config Entry Point */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest px-1">Configurations</span>
              <button
                type="button"
                onClick={() => {
                  setShowSettings(false);
                  const el = document.getElementById("configure-allowance-btn");
                  if (el) {
                    el.click();
                  } else {
                    setActiveView("budgets");
                    setTimeout(() => {
                      const btn = document.getElementById("configure-allowance-btn");
                      if (btn) btn.click();
                    }, 100);
                  }
                }}
                className="w-full h-12 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-purple-200/30 dark:border-purple-900/30 cursor-pointer"
              >
                <PiggyBank className="w-4 h-4" />
                Configure Allowance Setup
              </button>
            </div>

            {/* Category Management */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest px-1">Manage Categories</span>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {parentCategories.map((parent) => {
                  const subs = allCategories.filter((c) => c.parentId === parent.id);
                  return (
                    <div key={parent.id} className="bg-white/40 dark:bg-zinc-900/40 p-3 rounded-2xl border border-border/80 flex flex-col gap-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: parent.color }} />
                          {parent.name}
                        </span>
                        {addingSubTo !== parent.id && (
                          <button
                            type="button"
                            className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/20 px-2.5 py-1 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors cursor-pointer"
                            onClick={() => {
                              setAddingSubTo(parent.id);
                              setSubName("");
                            }}
                          >
                            + Sub
                          </button>
                        )}
                      </div>
                      {subs.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {subs.map((sub) => (
                            <span key={sub.id} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-50 dark:bg-zinc-800/60 text-muted-foreground border border-zinc-200/30 dark:border-zinc-700/30 shadow-xs">
                              {sub.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {addingSubTo === parent.id && (
                        <form onSubmit={(e) => handleAddSubcategory(e, parent.id)} className="flex items-center gap-1.5 mt-1">
                          <input
                            type="text"
                            placeholder="Sub name"
                            className="h-8 flex-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 text-[10px] font-medium outline-none focus:ring-1 focus:ring-purple-500 text-card-foreground"
                            value={subName}
                            onChange={(e) => setSubName(e.target.value)}
                            required
                            maxLength={40}
                          />
                          <button type="submit" className="h-8 px-2.5 rounded-lg bg-purple-600 text-white text-[10px] font-bold cursor-pointer">Add</button>
                          <button type="button" className="h-8 px-2 rounded-lg bg-zinc-150 dark:bg-zinc-850 text-muted-foreground text-[10px] font-medium cursor-pointer" onClick={() => setAddingSubTo(null)}>Cancel</button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Imports & Exports */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest px-1">Statement Operations</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    setImportModalType("pdf");
                  }}
                  className="h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-border/60 text-zinc-655 dark:text-zinc-350 text-xs font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Upload className="w-3.5 h-3.5 text-zinc-500" />
                  Import PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    setImportModalType("csv");
                  }}
                  className="h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-border/60 text-zinc-655 dark:text-zinc-350 text-xs font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Upload className="w-3.5 h-3.5 text-zinc-500" />
                  Import CSV
                </button>
              </div>
              <button
                type="button"
                onClick={exportTransactionsToCsv}
                className="w-full h-10 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 border border-green-200/30 dark:border-green-900/30 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export Transactions (CSV)
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSettings(false);
                  setParentReportForm({
                    dateRange: "this-month",
                    customStart: "",
                    customEnd: "",
                    includeSplits: true,
                    selectedCategoryIds: parentCategories.map((c) => c.id),
                  });
                  setShowParentReport(true);
                }}
                className="w-full h-10 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 border border-purple-200/30 dark:border-purple-900/30 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Parent Statement Portal (PDF)
              </button>
            </div>

            {/* Sign Out */}
            <button
              type="button"
              onClick={() => signOut()}
              className="w-full h-11 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-red-200/20 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* PDF Statement Upload Modal */}
      {importModalType === "pdf" && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="glass p-6 rounded-3xl max-w-sm w-full flex flex-col gap-4 shadow-xl border border-white/20">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-base">Import PDF Statement</h3>
              <button type="button" onClick={() => setImportModalType(null)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
              Parse transaction logs client-side in-memory. Your sensitive bank files are never uploaded to any backend server.
            </p>
            <label className="border-2 border-dashed border-zinc-200 hover:border-purple-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-zinc-50/50">
              <Upload className="w-8 h-8 text-zinc-400" />
              <span className="text-xs font-bold text-zinc-600">Choose PDF Statement File</span>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) parsePdfFile(file);
                }}
              />
            </label>
          </div>
        </div>
      )}

      {/* CSV Statement Upload Modal */}
      {importModalType === "csv" && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="glass p-6 rounded-3xl max-w-sm w-full flex flex-col gap-4 shadow-xl border border-white/20">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-base">Import CSV Statement</h3>
              <button type="button" onClick={() => setImportModalType(null)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
              Select a CSV statement containing headers like Date, Amount, Description/Note, and optionally Category.
            </p>
            <label className="border-2 border-dashed border-zinc-200 hover:border-purple-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-zinc-50/50">
              <Upload className="w-8 h-8 text-zinc-400" />
              <span className="text-xs font-bold text-zinc-600">Choose CSV Statement File</span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const text = evt.target?.result as string;
                      if (text) processCsvFile(text);
                    };
                    reader.readAsText(file);
                  }
                }}
              />
            </label>
          </div>
        </div>
      )}

      {/* CSV Column Mapping Modal */}
      {showCsvMappingUI && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="glass p-6 rounded-3xl max-w-sm w-full flex flex-col gap-4 shadow-xl border border-white/20">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-base">Map CSV Columns</h3>
              <button type="button" onClick={() => setShowCsvMappingUI(false)} className="text-muted-foreground hover:text-zinc-600 dark:hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-450 font-medium">Match column headers to properties</p>
            
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Date Column</span>
                <select
                  className="h-10 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 text-xs font-semibold outline-none text-card-foreground border-0"
                  value={csvMapping.date}
                  onChange={(e) => setCsvMapping({ ...csvMapping, date: Number(e.target.value) })}
                >
                  {csvHeaders.map((h, idx) => (
                    <option key={idx} value={idx}>{h}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Amount Column</span>
                <select
                  className="h-10 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 text-xs font-semibold outline-none text-card-foreground border-0"
                  value={csvMapping.amount}
                  onChange={(e) => setCsvMapping({ ...csvMapping, amount: Number(e.target.value) })}
                >
                  {csvHeaders.map((h, idx) => (
                    <option key={idx} value={idx}>{h}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Description / Note Column</span>
                <select
                  className="h-10 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 text-xs font-semibold outline-none text-card-foreground border-0"
                  value={csvMapping.note}
                  onChange={(e) => setCsvMapping({ ...csvMapping, note: Number(e.target.value) })}
                >
                  {csvHeaders.map((h, idx) => (
                    <option key={idx} value={idx}>{h}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Category Column (Optional)</span>
                <select
                  className="h-10 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 px-3 text-xs font-semibold outline-none text-card-foreground border-0"
                  value={csvMapping.category}
                  onChange={(e) => setCsvMapping({ ...csvMapping, category: Number(e.target.value) })}
                >
                  {csvHeaders.map((h, idx) => (
                    <option key={idx} value={idx}>{h}</option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={confirmCsvMapping}
              className="h-11 w-full rounded-xl bg-purple-600 text-white font-bold text-xs shadow-md shadow-purple-500/20 active:scale-95 transition-all mt-2"
            >
              Parse CSV Transactions
            </button>
          </div>
        </div>
      )}

      {/* Bulk Import Review Modal */}
      {parsedTransactions.length > 0 && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass p-6 rounded-3xl max-w-2xl w-full flex flex-col gap-5 shadow-2xl overflow-hidden max-h-[90vh] border border-white/20 animate-fade-in">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 flex-shrink-0">
              <div>
                <h3 className="font-bold text-zinc-900 text-base">Review Imported Transactions</h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">
                  Parsed {parsedTransactions.length} records • Selected {selectedImportIds.length} for commit
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setParsedTransactions([]);
                  setSelectedImportIds([]);
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 py-1">
              {parsedTransactions.map((tx, idx) => {
                const isDup = possibleDuplicates[tx.id];
                const isSel = selectedImportIds.includes(tx.id);

                return (
                  <div
                    key={tx.id}
                    className={`p-3.5 rounded-2xl border flex items-center gap-4 transition-all ${isDup ? "bg-amber-50/30 border-amber-100/50" : "bg-zinc-50/50 border-zinc-100"} ${isSel ? "ring-1 ring-purple-500/30 bg-purple-50/10" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedImportIds([...selectedImportIds, tx.id]);
                        } else {
                          setSelectedImportIds(selectedImportIds.filter((id) => id !== tx.id));
                        }
                      }}
                      className="rounded border-zinc-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 flex-1 items-center">
                      <input
                        type="date"
                        value={tx.date}
                        onChange={(e) => {
                          const val = e.target.value;
                          setParsedTransactions((current) =>
                            current.map((t) => (t.id === tx.id ? { ...t, date: val } : t))
                          );
                        }}
                        className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 outline-none w-full"
                      />

                      <input
                        type="text"
                        value={tx.note}
                        onChange={(e) => {
                          const val = e.target.value;
                          setParsedTransactions((current) =>
                            current.map((t) => (t.id === tx.id ? { ...t, note: val } : t))
                          );
                        }}
                        className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 text-[11px] font-bold text-card-foreground outline-none w-full col-span-1 md:col-span-2"
                      />

                      <select
                        value={tx.categoryId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setParsedTransactions((current) =>
                            current.map((t) => (t.id === tx.id ? { ...t, categoryId: val } : t))
                          );
                        }}
                        className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 outline-none w-full"
                      >
                        {allCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0 text-right">
                      <span className="font-extrabold text-zinc-950 dark:text-white text-sm">{currency.format(tx.amount)}</span>
                      {isDup && (
                        <span className="text-[8px] font-extrabold uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md leading-none">
                          Possible Duplicate
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-zinc-100 pt-4 flex-shrink-0">
              <button
                type="button"
                className="text-xs font-bold text-zinc-500 hover:text-zinc-700 px-3 py-2 rounded-xl hover:bg-zinc-100"
                onClick={() => {
                  setParsedTransactions([]);
                  setSelectedImportIds([]);
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isImporting || selectedImportIds.length === 0}
                onClick={commitImport}
                className="h-11 px-5 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-md shadow-purple-500/20 active:scale-95 transition-all hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isImporting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Import Selected ({selectedImportIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

function TransactionRow({
  transaction,
  category,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  category?: Category;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color = category?.color ?? "#71717a";
  const initial = (category?.name ?? "?")[0].toUpperCase();
  return (
    <div className="group relative flex items-center gap-3.5 p-4 rounded-2xl bg-white/[0.035] border border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 hover:shadow-xl hover:-translate-y-[1px]">
      {/* Category color left border */}
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl transition-all duration-200"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}55` }}
      />

      {/* Category icon: colored initial */}
      <div
        className="h-11 w-11 rounded-xl flex-shrink-0 flex items-center justify-center font-extrabold text-[15px] select-none"
        style={{ backgroundColor: `${color}22`, border: `1px solid ${color}40`, color }}
      >
        {initial}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-white leading-tight">{transaction.note || category?.name || "Expense"}</p>
        <p className="text-[11px] font-medium text-zinc-500 mt-0.5 flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          {category?.name}
          <span className="opacity-30">·</span>
          {new Date(transaction.spentAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
        </p>
      </div>

      <p className="text-[15px] font-extrabold tracking-tight text-[#f87171] flex-shrink-0">−{currency.format(transaction.amount)}</p>

      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-blue-400 hover:bg-blue-500/15 transition-all cursor-pointer"
          onClick={onEdit}
          title="Edit"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-red-400 hover:bg-red-500/15 transition-all cursor-pointer"
          onClick={onDelete}
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

