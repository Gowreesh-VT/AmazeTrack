"use client";

import React from "react";
import { AppProvider } from "@/providers/AppProvider";
import { AppShell } from "@/components/layout/AppShell";
import { useAppContext } from "@/lib/AppContext";
import { HomeView } from "@/components/features/HomeView";
import { AddTransactionView } from "@/components/features/AddTransactionView";
import { AnalyticsView } from "@/components/features/AnalyticsView";
import { BudgetsView } from "@/components/features/BudgetsView";
import { SplitsView } from "@/components/features/SplitsView";

function AppContent() {
  const { activeView } = useAppContext();

  return (
    <AppShell>
      {activeView === "home" ? <HomeView /> : null}
      {activeView === "add" ? <AddTransactionView /> : null}
      {activeView === "analytics" ? <AnalyticsView /> : null}
      {activeView === "budgets" ? <BudgetsView /> : null}
      {activeView === "splits" ? <SplitsView /> : null}
    </AppShell>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
