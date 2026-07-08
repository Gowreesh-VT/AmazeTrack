import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { useAppContext } from '@/lib/AppContext';
import { OnboardingFlow } from '@/components/features/OnboardingFlow';
import { SettingsModal } from '@/components/features/SettingsModal';
import { AddTransactionView } from '@/components/features/AddTransactionView';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { 
    isSidebarOpen, 
    session,
    showOnboarding,
    handleOnboardingComplete,
    isAddExpenseOpen
  } = useAppContext();

  return (
    <>
      {showOnboarding && (
        <OnboardingFlow
          userName={session?.user?.name}
          onComplete={handleOnboardingComplete}
        />
      )}
      <div className="min-h-screen w-full bg-background text-foreground flex flex-col md:flex-row">
        {/* Sidebar - Desktop Only */}
        <Sidebar />

        {/* Main Container */}
        <main className={`flex-1 flex flex-col min-h-screen relative pb-28 md:pb-8 pt-8 md:px-8 px-4 w-full overflow-x-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? "md:ml-64" : "md:ml-20"}`}>
          {/* View Header */}
          <Header />

          {/* Dynamic Page Content */}
          <div className="flex-1 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
        
        {/* Mobile Nav */}
        <MobileNav />
      </div>
      <SettingsModal />
      {isAddExpenseOpen && <AddTransactionView />}
    </>
  );
}
