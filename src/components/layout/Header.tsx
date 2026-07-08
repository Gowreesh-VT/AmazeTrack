import React, { useMemo } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/lib/AppContext';

export function Header() {
  const { activeView, setShowSettings, isDriveSyncing } = useAppContext();

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

  return (
    <header className="flex items-center justify-between pb-6 pt-2">
      <div className="flex flex-col">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{headerTitle}</h1>
        <p className="text-xs text-muted-foreground font-medium mt-0.5 hidden md:block">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {isDriveSyncing && (
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
  );
}
