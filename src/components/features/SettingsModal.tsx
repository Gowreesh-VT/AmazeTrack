import React, { useEffect, useState } from 'react';
import { Settings, X, LogOut, Download, Upload, ArrowRight, PiggyBank, FileSpreadsheet, Palette, BarChart3, ChevronRight, Check } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useAppContext } from '@/lib/AppContext';
import { ColorPalettePicker } from '@amazecontinuityprojects/amazeui';

export function SettingsModal() {
  const {
    showSettings, setShowSettings, session, themeMode, toggleThemeOverride,
    benchmarkOptIn, toggleBenchmarkOptIn, setActiveView, parentCategories, allCategories,
    addingSubTo, setAddingSubTo, subName, setSubName, handleAddSubcategory,
    setImportModalType, exportTransactionsToCsv, setParentReportForm, setShowParentReport
  } = useAppContext();

  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (showSettings) {
      setTimeout(() => setIsRendered(true), 10);
    } else {
      setIsRendered(false);
    }
  }, [showSettings]);

  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Dimmed Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ease-in-out ${isRendered ? 'opacity-100' : 'opacity-0'}`} 
        onClick={() => setShowSettings(false)}
      />

      {/* Modal Container - Native App Style (Minimalist) */}
      <div 
        className={`relative w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col bg-zinc-50 dark:bg-zinc-950 rounded-3xl shadow-2xl transition-all duration-300 ease-out transform ${isRendered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 relative z-20">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">Settings</h2>
          <button
            type="button"
            onClick={() => setShowSettings(false)}
            className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 relative z-10 custom-scrollbar">
          
          {/* Profile Section */}
          <div className="flex flex-col items-center gap-3">
            {session?.user?.image ? (
              <img src={session.user.image} alt="Profile" className="w-20 h-20 rounded-full shadow-sm" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center font-medium text-3xl shadow-sm">
                {session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div className="text-center">
              <h3 className="font-semibold text-zinc-900 dark:text-white text-xl">{session?.user?.name || "Student User"}</h3>
              <p className="text-sm text-zinc-500">{session?.user?.email}</p>
            </div>
          </div>

          {/* Settings Groups */}
          <div className="space-y-6">
            
            {/* Appearance Group */}
            <div className="space-y-2">
              <h4 className="text-[13px] font-medium text-zinc-500 px-4 uppercase tracking-wider">Appearance</h4>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800/60 shadow-sm">
                
                {/* Theme Toggle */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800/60">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                      <Palette className="w-4 h-4" />
                    </div>
                    <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">Theme</span>
                  </div>
                  <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                    <button
                      onClick={() => toggleThemeOverride("light")}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-all cursor-pointer ${themeMode === "light" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
                    >
                      Light
                    </button>
                    <button
                      onClick={() => toggleThemeOverride("dark")}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-all cursor-pointer ${themeMode === "dark" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
                    >
                      Dark
                    </button>
                  </div>
                </div>

                {/* Accent Color */}
                <div className="flex flex-col p-4 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-pink-500 flex items-center justify-center text-white">
                      <Palette className="w-4 h-4" />
                    </div>
                    <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">Accent Color</span>
                  </div>
                  <div className="pl-10">
                    <ColorPalettePicker />
                  </div>
                </div>
              </div>
            </div>

            {/* Features Group */}
            <div className="space-y-2">
              <h4 className="text-[13px] font-medium text-zinc-500 px-4 uppercase tracking-wider">Features</h4>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800/60 shadow-sm">
                
                {/* Benchmarking */}
                <div className="flex flex-col p-4 border-b border-zinc-200 dark:border-zinc-800/60 gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">Peer Benchmarking</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleBenchmarkOptIn(!benchmarkOptIn)}
                      className={`relative inline-flex h-[28px] w-[50px] flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out outline-none ${benchmarkOptIn ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"}`}
                    >
                      <span className={`pointer-events-none mt-[2px] ml-[2px] inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${benchmarkOptIn ? "translate-x-[22px]" : "translate-x-0"}`} />
                    </button>
                  </div>
                  <p className="text-[13px] text-zinc-500 pl-10 mt-1">
                    Compare totals anonymously with other students globally.
                  </p>
                </div>

                {/* Allowance Setup */}
                <button
                  onClick={() => {
                    setShowSettings(false);
                    const el = document.getElementById("configure-allowance-btn");
                    if (el) { el.click(); } else {
                      setActiveView("budgets");
                      setTimeout(() => { document.getElementById("configure-allowance-btn")?.click(); }, 100);
                    }
                  }}
                  className="w-full flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white">
                      <PiggyBank className="w-4 h-4" />
                    </div>
                    <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">Allowance Setup</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-400" />
                </button>

                {/* Parent Statement */}
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setParentReportForm({
                      dateRange: "this-month", customStart: "", customEnd: "", includeSplits: true,
                      selectedCategoryIds: parentCategories.map((c: any) => c.id),
                    });
                    setShowParentReport(true);
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <span className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">Parent Statement Portal</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Data Operations Group */}
            <div className="space-y-2">
              <h4 className="text-[13px] font-medium text-zinc-500 px-4 uppercase tracking-wider">Data</h4>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800/60 shadow-sm">
                
                <button
                  onClick={() => { setShowSettings(false); setImportModalType("pdf"); }}
                  className="w-full flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 text-zinc-900 dark:text-zinc-100 font-medium">
                    <Upload className="w-5 h-5 text-zinc-500" />
                    Import PDF Statement
                  </div>
                </button>
                
                <button
                  onClick={() => { setShowSettings(false); setImportModalType("csv"); }}
                  className="w-full flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 text-zinc-900 dark:text-zinc-100 font-medium">
                    <Upload className="w-5 h-5 text-zinc-500" />
                    Import CSV Statement
                  </div>
                </button>

                <button
                  onClick={exportTransactionsToCsv}
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer text-left text-zinc-900 dark:text-zinc-100 font-medium"
                >
                  <div className="flex items-center gap-3">
                    <Download className="w-5 h-5 text-zinc-500" />
                    Export Transactions (CSV)
                  </div>
                </button>
              </div>
            </div>

            {/* Categories Management */}
            <div className="space-y-2">
              <h4 className="text-[13px] font-medium text-zinc-500 px-4 uppercase tracking-wider">Categories</h4>
              <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800/60 shadow-sm p-2 flex flex-col gap-2">
                 {parentCategories.map((parent: any) => {
                    const subs = allCategories.filter((c: any) => c.parentId === parent.id);
                    return (
                      <div key={parent.id} className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[15px] font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full inline-block shadow-sm" style={{ backgroundColor: parent.color }} />
                            {parent.name}
                          </span>
                          {addingSubTo !== parent.id && (
                            <button
                              type="button"
                              className="text-[13px] font-medium text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity cursor-pointer"
                              onClick={() => {
                                setAddingSubTo(parent.id);
                                setSubName("");
                              }}
                            >
                              Add Subcategory
                            </button>
                          )}
                        </div>
                        {subs.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {subs.map((sub: any) => (
                              <span key={sub.id} className="text-[13px] px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                {sub.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {addingSubTo === parent.id && (
                          <form onSubmit={(e) => handleAddSubcategory(e, parent.id)} className="flex items-center gap-2 mt-3">
                            <input
                              type="text"
                              placeholder="Name..."
                              className="h-9 flex-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 px-3 text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-zinc-900 dark:text-white"
                              value={subName}
                              onChange={(e) => setSubName(e.target.value)}
                              required
                              maxLength={40}
                            />
                            <button type="submit" className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium cursor-pointer transition-colors shadow-sm">Save</button>
                            <button type="button" className="h-9 px-3 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[13px] font-medium cursor-pointer transition-colors" onClick={() => setAddingSubTo(null)}>Cancel</button>
                          </form>
                        )}
                      </div>
                    );
                 })}
              </div>
            </div>
            
            {/* Sign Out */}
            <button
              onClick={() => signOut()}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/60 rounded-2xl p-4 text-center text-[15px] font-semibold text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer shadow-sm"
            >
              Sign Out
            </button>

            {/* Spacer for bottom padding */}
            <div className="h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
