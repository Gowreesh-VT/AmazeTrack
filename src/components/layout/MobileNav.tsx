import React, { useState } from 'react';
import { Home as HomeIcon, Wallet, Users, TrendingUp, Plus } from 'lucide-react';
import { useAppContext } from '@/lib/AppContext';

export function MobileNav() {
  const { activeView, setActiveView, startAdd, startAddSharedExpense } = useAppContext();
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <>
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
              onClick={() => {
                setShowAddMenu(false);
                startAddSharedExpense();
              }}
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
            { view: "budgets", icon: Wallet, label: "Budgets & Subs" },
            { view: "splits", icon: Users, label: "Splits" },
            { view: "analytics", icon: TrendingUp, label: "Analytics" },
          ] as const).map(({ view, icon: Icon, label }, idx) => {
            const isActive = activeView === view;
            
            return (
              <React.Fragment key={view}>
                {idx === 2 && <div className="w-16 flex-shrink-0" />} 
                <button
                  type="button"
                  onClick={() => setActiveView(view)}
                  className={`flex flex-col items-center justify-center w-12 h-12 transition-all duration-300 relative
                    ${isActive ? "text-purple-600 dark:text-purple-400 scale-110" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
                >
                  <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-purple-600 shadow-[0_0_8px_rgba(124,58,237,1)]" />
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>
      </div>
    </>
  );
}
