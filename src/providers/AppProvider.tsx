"use client";

import { AppContext } from "@/lib/AppContext";
import { HomeView } from "@/components/features/HomeView";
import { AddTransactionView } from "@/components/features/AddTransactionView";
import { AnalyticsView } from "@/components/features/AnalyticsView";
import { BudgetsView } from "@/components/features/BudgetsView";
import { SplitsView } from "@/components/features/SplitsView";
import { SettingsModal } from "@/components/features/SettingsModal";
import { LandingPage } from "@/components/features/LandingPage";
import { OnboardingFlow } from "@/components/features/OnboardingFlow";

import { signIn, signOut, useSession } from "next-auth/react";
import { FormEvent, Fragment, useEffect, useMemo, useState } from "react";
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
  flattenAmortizedTransactions,
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
  type: "expense" | "income";
  categoryId: string;
  note: string;
  spentAt: string;
  isAmortized?: boolean;
  amortizeMonths?: string;
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

function visibleTransactions(data: DriveData | null): Transaction[] {
  return (data?.transactions ?? [])
    .filter((transaction) => !transaction.deletedAt)
    .sort((a, b) => new Date(b.spentAt).getTime() - new Date(a.spentAt).getTime());
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [driveData, setDriveData] = useState<DriveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"home" | "budgets" | "splits" | "analytics" | "add">("home");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TransactionForm>({
    amount: "",
    type: "expense",
    categoryId: "",
    note: "",
    spentAt: todayInputValue(),
    isAmortized: false,
    amortizeMonths: "12",
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
  const [settingsTab, setSettingsTab] = useState("general");
  const [benchmarkOptIn, setBenchmarkOptIn] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState<any[]>([]);

  // Analytics
  const [analyticsTab, setAnalyticsTab] = useState<"overview" | "categories" | "budgets" | "map">("overview");
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

  // Onboarding overlay (first-time users)
  const [showOnboarding, setShowOnboarding] = useState(false);

  // ─── PWA PROGRESSIVE USER FLOW STATE MACHINE ───
  const [pwaStep, setPwaStep] = useState<"splash" | "onboarding" | "signin" | "lock_setup" | "lock_verify" | "app">("splash");
  const [pinInput, setPinInput] = useState("");
  const [pinSetupStep, setPinSetupStep] = useState<"enter" | "confirm">("enter");
  const [setupPin, setSetupPin] = useState("");
  const [biometricRegistering, setBiometricRegistering] = useState(false);
  const [biometricVerifying, setBiometricVerifying] = useState(false);
  const [lockChoicePrompt, setLockChoicePrompt] = useState<"ask" | "pin" | "biometric" | "completed">("ask");
  const [lockStatusText, setLockStatusText] = useState("");
  const [isBiometricActive, setIsBiometricActive] = useState(false);

  const [isPwaMode, setIsPwaMode] = useState(false);
  const [minimumSplashPassed, setMinimumSplashPassed] = useState(false);
  const [authTimeout, setAuthTimeout] = useState(false);

  // Client-side hydration checks for storage values
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsBiometricActive(localStorage.getItem("amazetrack_biometric") === "true");
      const standalone = window.matchMedia("(display-mode: standalone)").matches
        || (window.navigator as any).standalone
        || document.referrer.includes("android-app://")
        || window.location.search.includes("pwa=true");
      setIsPwaMode(standalone);
    }
  }, [pwaStep, biometricRegistering]);

  // Minimum splash screen timer
  useEffect(() => {
    if (!isPwaMode) return;
    const timer = setTimeout(() => {
      setMinimumSplashPassed(true);
    }, 1800);
    return () => clearTimeout(timer);
  }, [isPwaMode]);

  // NextAuth auth load timeout fallback (3.5 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthTimeout(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  // Coordinate PWA screen transitions
  useEffect(() => {
    if (!isPwaMode) return;

    // Only transition if we are in splash (and minimum splash time passed) or if we are in signin and status is authenticated
    if (pwaStep === "splash") {
      if (!minimumSplashPassed) return;
    } else if (pwaStep === "signin") {
      if (status !== "authenticated") return;
    } else {
      return;
    }

    const onboarded = localStorage.getItem("amazetrack_onboarded") === "true";
    if (!onboarded) {
      setPwaStep("onboarding");
      return;
    }

    if (status === "loading") {
      if (authTimeout) {
        setPwaStep("signin");
      }
      return;
    }

    if (status === "unauthenticated") {
      setPwaStep("signin");
      return;
    }

    if (status === "authenticated") {
      const lockChoice = localStorage.getItem("amazetrack_lock_choice") === "completed";
      if (!lockChoice) {
        setPwaStep("lock_setup");
        return;
      }

      const lockEnabled = localStorage.getItem("amazetrack_lock_enabled") === "true";
      if (lockEnabled) {
        setPwaStep("lock_verify");
        if (localStorage.getItem("amazetrack_biometric") === "true") {
          setTimeout(() => {
            triggerBiometricVerify();
          }, 600);
        }
        return;
      }

      setPwaStep("app");
    }
  }, [isPwaMode, minimumSplashPassed, status, authTimeout, pwaStep]);

  // Synchronize local settings to Drive database upon Google auth
  useEffect(() => {
    if (status === "authenticated" && driveData) {
      const savedCurrency = localStorage.getItem("amazetrack_currency");
      if (savedCurrency && !driveData.preferences?.onboardingComplete) {
        const onboardingData = {
          currencyCode: savedCurrency,
          currencySymbol: localStorage.getItem("amazetrack_symbol") || "₹",
          locale: localStorage.getItem("amazetrack_locale") || "en-IN",
          monthlyBudget: localStorage.getItem("amazetrack_budget") || "",
        };
        handleOnboardingComplete(onboardingData);
      }
    }
  }, [status, driveData]);

  // Numeric keyboard input helper
  const handlePinKeyPress = (val: string) => {
    if (pinInput.length >= 4) return;
    const nextInput = pinInput + val;
    setPinInput(nextInput);

    if (pwaStep === "lock_verify" && nextInput.length === 4) {
      // Auto verify PIN once 4 digits are typed
      const savedPin = localStorage.getItem("amazetrack_pin");
      if (nextInput === savedPin) {
        setLockStatusText("Unlocked successfully!");
        setTimeout(() => {
          setPwaStep("app");
          setPinInput("");
        }, 300);
      } else {
        setLockStatusText("Incorrect PIN. Please try again.");
        setTimeout(() => {
          setPinInput("");
          setLockStatusText("");
        }, 1000);
      }
    }
  };

  const handlePinBackspace = () => {
    setPinInput(pinInput.slice(0, -1));
  };

  const handlePinSetupNext = () => {
    if (pinInput.length < 4) return;

    if (pinSetupStep === "enter") {
      setSetupPin(pinInput);
      setPinInput("");
      setPinSetupStep("confirm");
    } else {
      if (pinInput === setupPin) {
        localStorage.setItem("amazetrack_pin", pinInput);
        setPinInput("");
        setLockChoicePrompt("biometric");
      } else {
        setLockStatusText("PINs do not match. Restarting...");
        setPinInput("");
        setPinSetupStep("enter");
        setSetupPin("");
        setTimeout(() => setLockStatusText(""), 2000);
      }
    }
  };

  const triggerBiometricSetup = () => {
    setBiometricRegistering(true);
    // Simulate high-fidelity native biometrics register
    setTimeout(() => {
      setBiometricRegistering(false);
      localStorage.setItem("amazetrack_lock_enabled", "true");
      localStorage.setItem("amazetrack_biometric", "true");
      localStorage.setItem("amazetrack_lock_choice", "completed");
      setPwaStep("app");
    }, 1500);
  };

  const triggerBiometricVerify = () => {
    if (localStorage.getItem("amazetrack_biometric") !== "true") return;
    setBiometricVerifying(true);
    // Simulate biometric check
    setTimeout(() => {
      setBiometricVerifying(false);
      setPwaStep("app");
    }, 1500);
  };

  const skipBiometricSetup = () => {
    localStorage.setItem("amazetrack_lock_enabled", "true");
    localStorage.setItem("amazetrack_biometric", "false");
    localStorage.setItem("amazetrack_lock_choice", "completed");
    setPwaStep("app");
  };

  const disableLockChoice = () => {
    localStorage.setItem("amazetrack_lock_enabled", "false");
    localStorage.setItem("amazetrack_biometric", "false");
    localStorage.setItem("amazetrack_lock_choice", "completed");
    setPwaStep("app");
  };


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

        // Show onboarding for first-time users (no transactions AND onboarding not completed)
        if (
          !data.preferences?.onboardingComplete &&
          (data.transactions?.length ?? 0) === 0
        ) {
          setShowOnboarding(true);
        }

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
  // Flatten amortized transactions so every derived calculation sees the correct
  // per-month split amounts rather than the raw lump-sum amount.
  const flatTransactions = useMemo(() => flattenAmortizedTransactions(transactions), [transactions]);
  const monthTransactions = useMemo(() => {
    const now = new Date();
    return flatTransactions.filter((transaction) => {
      const spentAt = new Date(transaction.spentAt);
      return spentAt.getMonth() === now.getMonth() && spentAt.getFullYear() === now.getFullYear();
    });
  }, [flatTransactions]);

  const monthExpenses = useMemo(() => {
    return monthTransactions.filter((t) => t.type === "expense" || t.type === "debt");
  }, [monthTransactions]);

  const monthIncomeTransactions = useMemo(() => {
    return monthTransactions.filter((t) => t.type === "income");
  }, [monthTransactions]);

  const monthTotal = useMemo(() => {
    return monthExpenses.reduce((sum, transaction) => sum + transaction.amount, 0);
  }, [monthExpenses]);

  const monthIncome = useMemo(() => {
    return monthIncomeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  }, [monthIncomeTransactions]);

  const netSavingsRate = useMemo(() => {
    if (monthIncome <= 0) return 0;
    return Math.max(-100, Math.min(100, ((monthIncome - monthTotal) / monthIncome) * 100));
  }, [monthIncome, monthTotal]);

  const breakdown = parentCategories
    .map((parent) => {
      const subcategoryIds = allCategories
        .filter((c) => c.parentId === parent.id)
        .map((c) => c.id);
      const amount = monthExpenses
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
      // Use flattened transactions so amortized expenses only count their
      // monthly share against each budget period.
      const budgetExpenses = flatTransactions.filter((t) => {
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
  }, [driveData?.budgets, flatTransactions, allCategories]);

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
    
    // Use flattened transactions so amortized expenses only contribute
    // their monthly share to the allowance cycle calculation.
    const cycleExpenses = flatTransactions.filter((t) => {
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

    // 3. Recurring Template Bill Reminders (2-day advance warning)
    const recurringTemplates = driveData?.recurringTemplates ?? [];
    recurringTemplates.forEach((tmpl) => {
      if (!tmpl.active) return;

      const startDate = new Date(tmpl.startDate);
      const todayMs = today.getTime();

      if (tmpl.frequency === "monthly") {
        // Next occurrence: same day-of-month as startDate, in current or next month
        let nextDue = new Date(today.getFullYear(), today.getMonth(), startDate.getDate());
        if (nextDue.getTime() < todayMs) {
          nextDue = new Date(today.getFullYear(), today.getMonth() + 1, startDate.getDate());
        }
        const diffDays = Math.ceil((nextDue.getTime() - todayMs) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 2) {
          alerts.push({
            id: `tmpl-warn-${tmpl.id}-${nextDue.toISOString().slice(0, 10)}`,
            type: "subscription_upcoming",
            severity: diffDays === 0 ? "critical" : "warning",
            title: `Bill Due${diffDays === 0 ? " Today" : diffDays === 1 ? " Tomorrow" : " in 2 Days"}: ${tmpl.note}`,
            message: `Recurring ${currency.format(tmpl.amount)} charge is due ${diffDays === 0 ? "today" : diffDays === 1 ? "tomorrow" : "in 2 days"} (${nextDue.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}).`,
          });
        }
      } else if (tmpl.frequency === "weekly") {
        // Next occurrence: next matching day-of-week
        const startDay = startDate.getDay();
        const todayDay = today.getDay();
        let daysUntil = (startDay - todayDay + 7) % 7;
        if (daysUntil === 0) daysUntil = 0; // today counts
        const nextDue = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntil);
        const diffDays = daysUntil;
        if (diffDays >= 0 && diffDays <= 2) {
          alerts.push({
            id: `tmpl-weekly-${tmpl.id}-${nextDue.toISOString().slice(0, 10)}`,
            type: "subscription_upcoming",
            severity: diffDays === 0 ? "critical" : "warning",
            title: `Weekly Bill Due${diffDays === 0 ? " Today" : diffDays === 1 ? " Tomorrow" : " in 2 Days"}: ${tmpl.note}`,
            message: `Weekly ${currency.format(tmpl.amount)} recurring charge is due ${diffDays === 0 ? "today" : diffDays === 1 ? "tomorrow" : "in 2 days"} (${nextDue.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}).`,
          });
        }
      }
    });

    // 4. Allowance Warn
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
  }, [activeBudgets, driveData?.subscriptions, driveData?.recurringTemplates, allowanceStatus, dismissedAlertIds]);

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
      type: "expense",
      categoryId: parentCategories[0]?.id ?? "",
      note: "",
      spentAt: todayInputValue(),
      isAmortized: false,
      amortizeMonths: "12",
    });
    setActiveView("add");
  }

  function startEdit(transaction: Transaction) {
    setEditing(transaction);
    setForm({
      id: transaction.id,
      amount: String(transaction.amount),
      type: transaction.type === "income" ? "income" : "expense",
      categoryId: transaction.categoryId,
      note: transaction.note ?? "",
      spentAt: transaction.spentAt.slice(0, 10),
      isAmortized: transaction.isAmortized ?? false,
      amortizeMonths: String(transaction.amortizeMonths ?? 12),
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
      type: form.type || "expense",
      categoryId: form.categoryId,
      note: form.note.trim() || undefined,
      spentAt,
      createdAt: editing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      isAmortized: form.isAmortized ?? false,
      amortizeMonths: form.isAmortized ? Number(form.amortizeMonths ?? 12) : undefined,
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
          type: form.type || "expense",
          categoryId: form.categoryId,
          note: form.note.trim() || undefined,
          spentAt,
          isAmortized: form.isAmortized ?? false,
          amortizeMonths: form.isAmortized ? Number(form.amortizeMonths ?? 12) : undefined,
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

  // ─── PWA MULTI-SCREEN LAYOUTS ───
  if (isPwaMode) {
    if (pwaStep === "splash") {
    return (
      <main className="min-h-screen bg-black grid place-items-center">
        <div className="flex flex-col items-center gap-6 animate-fade-up">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-[#C3F809] flex items-center justify-center text-black shadow-[0_0_50px_rgba(195,248,9,0.3)] animate-pulse">
              <svg viewBox="0 0 32 32" className="w-14 h-14 text-black" fill="currentColor">
                <path d="M10 8c-2.2 0-4 1.8-4 4v8c0 2.2 1.8 4 4 4h1v-3h-1c-.6 0-1-.4-1-1v-8c0-.6.4-1 1-1h1V8h-1z" />
                <rect x="15" y="8" width="2" height="16" rx="0.5" />
                <path d="M22 8c2.2 0 4 1.8 4 4v8c0 2.2-1.8 4-4 4h-1v-3h-1c.6 0 1-.4 1-1v-8c0-.6-.4-1-1-1h-1V8h1z" />
              </svg>
            </div>
          </div>
          <div className="space-y-1.5 text-center">
            <h1 className="text-3xl font-black text-white tracking-wider">AmazeTrack</h1>
            <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Smart Campus Tracker</p>
          </div>
          <div className="flex items-center gap-1.5 pt-4">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0ms]" />
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </main>
    );
  }

  if (pwaStep === "onboarding") {
    return (
      <OnboardingFlow
        userName=""
        onComplete={async (onboardingData) => {
          localStorage.setItem("amazetrack_onboarded", "true");
          localStorage.setItem("amazetrack_currency", onboardingData.currencyCode);
          localStorage.setItem("amazetrack_symbol", onboardingData.currencySymbol);
          localStorage.setItem("amazetrack_locale", onboardingData.locale);
          localStorage.setItem("amazetrack_budget", onboardingData.monthlyBudget);
          setPwaStep("signin");
        }}
      />
    );
  }

  if (pwaStep === "signin") {
    return (
      <main className="min-h-screen bg-black flex flex-col justify-between p-8 relative overflow-hidden text-white">
        {/* Glow Effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#C3F809] flex items-center justify-center text-black flex-shrink-0 shadow-[0_0_15px_rgba(195,248,9,0.3)]">
            <svg viewBox="0 0 32 32" className="w-6 h-6 text-black" fill="currentColor">
              <path d="M10 8c-2.2 0-4 1.8-4 4v8c0 2.2 1.8 4 4 4h1v-3h-1c-.6 0-1-.4-1-1v-8c0-.6.4-1 1-1h1V8h-1z" />
              <rect x="15" y="8" width="2" height="16" rx="0.5" />
              <path d="M22 8c2.2 0 4 1.8 4 4v8c0 2.2-1.8 4-4 4h-1v-3h-1c.6 0 1-.4 1-1v-8c0-.6-.4-1-1-1h-1V8h1z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">AmazeTrack</span>
        </div>

        {/* Hero Copy */}
        <div className="max-w-md my-auto space-y-6 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Active Standalone Mode
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
            Take Control of <br />
            Your Spending
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Secure, lightweight expense logging. Set allowance limits, split flatmate dues, and back up everything privately in your own Google Drive.
          </p>

          <button
            onClick={() => signIn("google")}
            className="w-full h-14 rounded-2xl bg-white text-black hover:bg-neutral-200 font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.85 3C6.18 7.55 8.84 5.04 12 5.04z"/>
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.27H12v4.51h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.75-4.87 3.75-8.63z"/>
              <path fill="#FBBC05" d="M5.24 14.56c-.24-.72-.38-1.5-.38-2.31s.14-1.59.38-2.31L1.39 6.94C.5 8.74 0 10.74 0 12.8s.5 4.06 1.39 5.86l3.85-3.1z"/>
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.66-2.84c-1.01.68-2.3 1.09-4.3 1.09-3.16 0-5.82-2.51-6.76-5.52L1.39 15.9C3.37 19.83 7.35 23 12 23z"/>
            </svg>
            <span>Sign In with Google</span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-zinc-600 text-center">
          By signing in, you agree to secure your local environment splits and logs.
        </p>
      </main>
    );
  }

  if (pwaStep === "lock_setup") {
    return (
      <main className="min-h-screen bg-black flex flex-col justify-between p-8 relative overflow-hidden text-white">
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-blue-600/5 blur-[100px] pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[#C3F809] flex items-center justify-center text-black flex-shrink-0 shadow-[0_0_10px_rgba(195,248,9,0.3)]">
            <svg viewBox="0 0 32 32" className="w-5 h-5 text-black" fill="currentColor">
              <path d="M10 8c-2.2 0-4 1.8-4 4v8c0 2.2 1.8 4 4 4h1v-3h-1c-.6 0-1-.4-1-1v-8c0-.6.4-1 1-1h1V8h-1z" />
              <rect x="15" y="8" width="2" height="16" rx="0.5" />
              <path d="M22 8c2.2 0 4 1.8 4 4v8c0 2.2-1.8 4-4 4h-1v-3h-1c.6 0 1-.4 1-1v-8c0-.6-.4-1-1-1h-1V8h1z" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight text-zinc-400">Lock Configuration</span>
        </div>

        <div className="max-w-md mx-auto my-auto w-full text-center space-y-8 animate-fade-up">
          {lockChoicePrompt === "ask" && (
            <div className="space-y-6">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold">Secure Your App</h3>
                <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">
                  Protect your budget logs and split reports from unauthorized viewers.
                </p>
              </div>

              <div className="space-y-3 pt-4">
                <button
                  onClick={() => setLockChoicePrompt("pin")}
                  className="w-full h-12 rounded-xl bg-white text-black hover:bg-neutral-200 font-bold text-sm transition-all"
                >
                  Configure PIN Protection
                </button>
                <button
                  onClick={disableLockChoice}
                  className="w-full h-12 rounded-xl text-zinc-500 hover:text-zinc-300 font-bold text-sm transition-colors bg-transparent border-0"
                >
                  Skip for Now
                </button>
              </div>
            </div>
          )}

          {lockChoicePrompt === "pin" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold">
                  {pinSetupStep === "enter" ? "Enter a 4-Digit PIN" : "Confirm your PIN"}
                </h3>
                <p className="text-zinc-500 text-xs">
                  {pinSetupStep === "enter" ? "Choose a code you will remember." : "Re-enter the 4-digit code to verify."}
                </p>
              </div>

              {/* Dot Indicators */}
              <div className="flex justify-center gap-4 py-4">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border transition-all duration-200 ${
                      idx < pinInput.length
                        ? "bg-[#C3F809] border-[#C3F809] shadow-[0_0_10px_#C3F809]"
                        : "border-zinc-700 bg-transparent"
                    }`}
                  />
                ))}
              </div>

              {lockStatusText && (
                <p className="text-rose-400 text-xs font-semibold animate-pulse">{lockStatusText}</p>
              )}

              {/* Keypad Grid */}
              <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto pt-4">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((key) => (
                  <button
                    key={key}
                    onClick={() => handlePinKeyPress(key)}
                    className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] active:bg-white/[0.12] text-white font-bold text-lg flex items-center justify-center transition-all cursor-pointer"
                  >
                    {key}
                  </button>
                ))}
                <button
                  onClick={handlePinBackspace}
                  className="w-14 h-14 rounded-full text-zinc-500 hover:text-white text-xs font-bold flex items-center justify-center transition-all cursor-pointer"
                >
                  Clear
                </button>
                <button
                  onClick={() => handlePinKeyPress("0")}
                  className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] active:bg-white/[0.12] text-white font-bold text-lg flex items-center justify-center transition-all cursor-pointer"
                >
                  0
                </button>
                <button
                  onClick={handlePinSetupNext}
                  disabled={pinInput.length < 4}
                  className="w-14 h-14 rounded-full bg-blue-600 text-white hover:bg-blue-500 font-bold text-xs flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer"
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {lockChoicePrompt === "biometric" && (
            <div className="space-y-6">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 10a2 2 0 0 0-2 2v3" />
                  <path d="M14 10a4 4 0 0 0-8 0v4" />
                  <path d="M8 10a6 6 0 0 1 12-2v4" />
                  <path d="M12 2a10 10 0 0 1 10 10v1a3 3 0 0 1-6 0v-1a4 4 0 0 0-4-4" />
                  <path d="M6 18a6 6 0 0 1-2-5v-1" />
                  <path d="M18 18a8 8 0 0 0 2-5" />
                </svg>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold">Biometric Locking</h3>
                <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">
                  Would you also like to enable Touch ID / Face ID access for instant unlocking?
                </p>
              </div>

              {biometricRegistering ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                  <span className="text-xs text-cyan-400 font-bold">Scanning Fingerprint...</span>
                </div>
              ) : (
                <div className="space-y-3 pt-4">
                  <button
                    onClick={triggerBiometricSetup}
                    className="w-full h-12 rounded-xl bg-white text-black hover:bg-neutral-200 font-bold text-sm transition-all"
                  >
                    Enable Fingerprint Login
                  </button>
                  <button
                    onClick={skipBiometricSetup}
                    className="w-full h-12 rounded-xl text-zinc-500 hover:text-zinc-300 font-bold text-sm transition-colors bg-transparent border-0"
                  >
                    Use PIN Only
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom footer indicator */}
        <p className="text-[10px] text-zinc-700 text-center">
          Security configurations are saved locally on-device.
        </p>
      </main>
    );
  }

  if (pwaStep === "lock_verify") {
    return (
      <main className="min-h-screen bg-black flex flex-col justify-between p-8 relative overflow-hidden text-white">
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-blue-600/5 blur-[100px] pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[#C3F809] flex items-center justify-center text-black flex-shrink-0 shadow-[0_0_10px_rgba(195,248,9,0.3)]">
            <svg viewBox="0 0 32 32" className="w-5 h-5 text-black" fill="currentColor">
              <path d="M10 8c-2.2 0-4 1.8-4 4v8c0 2.2 1.8 4 4 4h1v-3h-1c-.6 0-1-.4-1-1v-8c0-.6.4-1 1-1h1V8h-1z" />
              <rect x="15" y="8" width="2" height="16" rx="0.5" />
              <path d="M22 8c2.2 0 4 1.8 4 4v8c0 2.2-1.8 4-4 4h-1v-3h-1c.6 0 1-.4 1-1v-8c0-.6-.4-1-1-1h-1V8h1z" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight text-zinc-500">App Locked</span>
        </div>

        <div className="max-w-md mx-auto my-auto w-full text-center space-y-6 animate-fade-up">
          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold">Enter Lock PIN</h3>
            <p className="text-zinc-500 text-xs">Unlock your financial logs.</p>
          </div>

          {/* Dot Indicators */}
          <div className="flex justify-center gap-4 py-4">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border transition-all duration-200 ${
                  idx < pinInput.length
                    ? "bg-[#C3F809] border-[#C3F809] shadow-[0_0_10px_#C3F809]"
                    : "border-zinc-700 bg-transparent"
                }`}
              />
            ))}
          </div>

          {lockStatusText && (
            <p className={`text-xs font-semibold animate-pulse ${lockStatusText.includes("Incorrect") ? "text-rose-400" : "text-emerald-400"}`}>
              {lockStatusText}
            </p>
          )}

          {biometricVerifying ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mb-2" />
              <span className="text-xs text-cyan-400 font-bold animate-pulse">Authenticating Fingerprint...</span>
            </div>
          ) : (
            /* Keypad Grid with Biometric Icon */
            <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto pt-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((key) => (
                <button
                  key={key}
                  onClick={() => handlePinKeyPress(key)}
                  className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] active:bg-white/[0.12] text-white font-bold text-lg flex items-center justify-center transition-all cursor-pointer"
                >
                  {key}
                </button>
              ))}
              
              {/* Left Button - Fingerprint if enabled */}
              {isBiometricActive ? (
                <button
                  onClick={triggerBiometricVerify}
                  className="w-14 h-14 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 flex items-center justify-center transition-all cursor-pointer border border-cyan-500/20"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 10a2 2 0 0 0-2 2v3" />
                    <path d="M14 10a4 4 0 0 0-8 0v4" />
                    <path d="M8 10a6 6 0 0 1 12-2v4" />
                    <path d="M12 2a10 10 0 0 1 10 10v1a3 3 0 0 1-6 0v-1a4 4 0 0 0-4-4" />
                  </svg>
                </button>
              ) : (
                <div className="w-14 h-14" />
              )}

              <button
                onClick={() => handlePinKeyPress("0")}
                className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] active:bg-white/[0.12] text-white font-bold text-lg flex items-center justify-center transition-all cursor-pointer"
              >
                0
              </button>

              <button
                onClick={handlePinBackspace}
                className="w-14 h-14 rounded-full text-zinc-500 hover:text-white text-xs font-bold flex items-center justify-center transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-[10px] text-zinc-700 text-center">
          Secure biometric locks require device authorization credentials.
        </p>
      </main>
    );
  }
  } else {
    // ─── NORMAL WEB APP FLOW ───
    if (status === "loading" && !authTimeout) {
      return (
        <main className="min-h-screen bg-[#080e1c] grid place-items-center">
          <div className="flex flex-col items-center gap-4 animate-fade-up">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-2xl shadow-blue-500/30 animate-pulse-glow">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:300ms]" />
            </div>
            <p className="text-xs font-semibold text-zinc-500 tracking-widest uppercase">Loading AmazeTrack</p>
          </div>
        </main>
      );
    }

    if (status === "unauthenticated" || (status === "loading" && authTimeout)) {
      return <LandingPage />;
    }
  }


  // ── Onboarding completion handler ─────────────────────────────────────
  async function handleOnboardingComplete(onboardingData: {
    currencyCode: string;
    currencySymbol: string;
    locale: string;
    monthlyBudget: string;
  }) {
    if (!driveData) return;
    const updatedPreferences = {
      ...(driveData.preferences ?? { currency: onboardingData.currencyCode, currencySymbol: onboardingData.currencySymbol }),
      currency: onboardingData.currencyCode,
      currencySymbol: onboardingData.currencySymbol,
      locale: onboardingData.locale,
      onboardingComplete: true,
      ...(onboardingData.monthlyBudget && Number(onboardingData.monthlyBudget) > 0
        ? { monthlyBudget: Number(onboardingData.monthlyBudget) }
        : {}),
    };
    const updatedDrive = { ...driveData, preferences: updatedPreferences };
    setDriveData(updatedDrive);
    setShowOnboarding(false);
    try {
      await fetch("/api/drive-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driveData: updatedDrive }),
      });
    } catch {
      // non-critical: preferences will be saved on next sync
    }
  }

  const currencySymbol = driveData?.preferences?.currencySymbol || "₹";
  const budgetProgress = activeBudgets.map((b) => ({
    ...b,
    spent: transactions.filter((t) => b.categoryIds.includes(t.categoryId) && t.spentAt >= b.periodStart && t.spentAt <= b.periodEnd).reduce((sum, t) => sum + t.amount, 0)
  }));
  
  const contextValue = {
    showOnboarding, handleOnboardingComplete, setDriveData, setShowOnboarding,
    activeView, setActiveView,
    showSettings, setShowSettings,
    settingsTab, setSettingsTab,
    importModalType, setImportModalType,
    addingSubTo, setAddingSubTo,
    subName, setSubName,
    parentReportForm, setParentReportForm,
    showParentReport, setShowParentReport,
    loading,
    transactions,
    breakdown,
    smartAlerts,
    dismissedAlertIds, setDismissedAlertIds,
    analyticsTab, setAnalyticsTab,
    monthTotal,
    monthIncome,
    netSavingsRate,
    budgetProgress,
    trendPeriod, setTrendPeriod,
    trendDays, setTrendDays,
    selectedBreakdownCategoryId, setSelectedBreakdownCategoryId,
    splits,
    session,
    benchmarkOptIn, setBenchmarkOptIn,
    benchmarkData,
    parentCategories,
    allCategories,
    currencySymbol,
    budgetsSubTab, setBudgetsSubTab,
    editingGoal, isAddingGoal, setIsAddingGoal,
    allowanceForm, setAllowanceForm,
    isEditingAllowance, setIsEditingAllowance,
    allowanceConfig,
    allowanceStatus,
    goalsList,
    quickAddFunds, setQuickAddFunds,
    isSidebarOpen, setIsSidebarOpen,
    driveData,
    isDriveSyncing: syncing,
    toggleThemeOverride,
    signOut,
    toggleBenchmarkOptIn,
    handleAddSubcategory,
    exportTransactionsToCsv,
    startEdit,
    deleteTransaction,
    saveBudget,
    deleteBudget,
    startAddBudget,
    startEditBudget,
    handleBudgetFormChange,
    toggleBudgetCategory,
    saveGoal,
    addGoalFunds,
    deleteGoal,
    startAddGoal,
    startEditGoal,
    setEditingRepeating,
    setRepeatingForm,
    setIsAddingRepeating,
    toggleRepeatingTemplate,
    deleteRepeatingTemplate,
    saveRepeatingTemplate,
    setEditingSubscription,
    setSubscriptionForm,
    setIsAddingSubscription,
    toggleSubscription,
    deleteSubscription,
    saveSubscription,
    todayInputValue,
    themeMode,
    isImporting,
    csvHeaders, setCsvHeaders,
    csvRawRows, setCsvRawRows,
    csvMapping, setCsvMapping,
    showCsvMappingUI, setShowCsvMappingUI,
    submitTransaction,
    editing,
    form, setForm,
    activeBudgets,
    monthTransactions,
    globalDebtSummary,
    historyBudgets,
    rooms, selectedRoomId, setSelectedRoomId, handleRoomSelect, roomLedger,
    respondToSplit, initiateSettleUp, respondToSettlePending, leaveRoom,
    isCreatingRoom, setIsCreatingRoom, isJoiningRoom, setIsJoiningRoom, startAddSharedExpense,
    submitSharedExpense, isAddingSharedExpense, setIsAddingSharedExpense, sharedExpenseForm, setSharedExpenseForm,
    selectedExpenseMembers, setSelectedExpenseMembers,
    inviteCodeInput, setInviteCodeInput, newRoomName, setNewRoomName,
    saveAllowance, deleteAllowance, startEditAllowance
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
