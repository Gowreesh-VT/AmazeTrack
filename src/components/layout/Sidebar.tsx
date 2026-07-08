import React, { useState } from 'react';
import { Home as HomeIcon, Wallet, Users, TrendingUp, Plus, PanelLeft, Settings, LogOut } from 'lucide-react';
import { useAppContext } from '@/lib/AppContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

export function Sidebar() {
  const {
    isSidebarOpen, setIsSidebarOpen,
    activeView, setActiveView,
    startAdd, startAddSharedExpense,
    session, setShowSettings, signOut
  } = useAppContext();
  
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <aside className={`hidden md:flex flex-col fixed inset-y-0 bg-card border-r border-border p-4 justify-between z-30 transition-all duration-300 ease-in-out ${isSidebarOpen ? "w-64" : "w-20"}`}>
      <div className="flex flex-col gap-6">
        {/* Logo & Toggle */}
        <div className={`flex items-center ${isSidebarOpen ? "justify-between" : "justify-center"} pt-2`}>
          <div className={`flex items-center gap-2.5 ${!isSidebarOpen && "hidden"}`}>
            <div className="h-9 w-9 rounded-xl shrink-0 bg-purple-600 flex items-center justify-center text-white shadow-lg">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-[15px] text-foreground truncate tracking-tight">AmazeTrack</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl">
            <PanelLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Desktop Nav Items */}
        <nav className="flex flex-col gap-0.5">
          {([
            { view: "home", icon: HomeIcon, label: "Home" },
            { view: "budgets", icon: Wallet, label: "Budgets & Subs" },
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
                    ? "bg-purple-600/10 text-purple-600 dark:text-purple-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
              >
                {/* Left accent bar for active */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-purple-600 shadow-[0_0_8px_var(--primary)]" />
                )}
                <Icon className={`w-[18px] h-[18px] shrink-0 transition-all duration-200 ${isActive ? "text-purple-600 dark:text-purple-400" : ""}`} />
                {isSidebarOpen && <span className="text-sm font-semibold truncate">{label}</span>}
                {isActive && isSidebarOpen && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-600 shadow-[0_0_6px_var(--primary)]" />
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
              bg-purple-600 hover:bg-purple-700
              text-white text-sm
              shadow-md hover:scale-[1.02] active:scale-[0.98]
              ${isSidebarOpen ? "h-11 px-4" : "h-11 w-11 mx-auto"}`}
            title={!isSidebarOpen ? "Add Expense" : undefined}
          >
            <Plus className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            {isSidebarOpen && <span>Add Expense</span>}
          </button>
          {showAddMenu && (
            <div className={`absolute ${isSidebarOpen ? "top-14 left-0 w-full" : "top-14 left-14 w-52"} bg-popover border border-border text-popover-foreground rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 z-40`}>
              <button
                type="button"
                onClick={() => { setShowAddMenu(false); startAdd(); }}
                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-muted rounded-xl transition-all w-full text-left"
              >
                <span className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-4 h-4 text-purple-600" />
                </span>
                Personal Expense
              </button>
              <button
                type="button"
                onClick={() => { setShowAddMenu(false); startAddSharedExpense(); }}
                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-muted rounded-xl transition-all w-full text-left"
              >
                <span className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-teal-500" />
                </span>
                Shared Expense
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Profile / Logout */}
      <div className="border-t border-border pt-4">
        <div className={`flex items-center ${isSidebarOpen ? "gap-3" : "justify-center"} min-w-0`}>
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none focus:ring-2 focus:ring-purple-600/50 rounded-full transition-all cursor-pointer shrink-0 group">
              <Avatar className="w-9 h-9 border border-border ring-2 ring-transparent group-hover:ring-purple-600/30 transition-all bg-muted">
                {session?.user?.image ? (
                  <AvatarImage src={session.user.image} alt="Profile" />
                ) : null}
                <AvatarFallback className="bg-purple-600 text-white font-bold text-sm">
                  {session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-2xl border border-border bg-popover text-popover-foreground">
              <div className="px-2 py-2 mb-1">
                <p className="text-sm font-bold truncate">{session?.user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{session?.user?.email}</p>
              </div>
              <Separator className="mb-1 bg-border/60" />
              <DropdownMenuItem onClick={() => setShowSettings(true)} className="text-muted-foreground focus:text-foreground focus:bg-muted font-semibold rounded-xl cursor-pointer py-2 gap-2">
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
              <p className="text-[13px] font-bold text-foreground truncate">{session?.user?.name || "User"}</p>
              <p className="text-[10px] text-muted-foreground font-medium truncate">{session?.user?.email}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
