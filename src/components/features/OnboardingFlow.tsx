"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet, ChevronRight, Check, X, Search, ArrowRight, PartyPopper } from "lucide-react";

/* ─── Currency data ─────────────────────────────────────────────────────── */
export const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee", flag: "🇮🇳", locale: "en-IN" },
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸", locale: "en-US" },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺", locale: "de-DE" },
  { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧", locale: "en-GB" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", flag: "🇯🇵", locale: "ja-JP" },
  { code: "CAD", symbol: "$", name: "Canadian Dollar", flag: "🇨🇦", locale: "en-CA" },
  { code: "AUD", symbol: "$", name: "Australian Dollar", flag: "🇦🇺", locale: "en-AU" },
  { code: "SGD", symbol: "$", name: "Singapore Dollar", flag: "🇸🇬", locale: "en-SG" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", flag: "🇦🇪", locale: "ar-AE" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal", flag: "🇸🇦", locale: "ar-SA" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira", flag: "🇳🇬", locale: "en-NG" },
  { code: "KRW", symbol: "₩", name: "South Korean Won", flag: "🇰🇷", locale: "ko-KR" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", flag: "🇨🇳", locale: "zh-CN" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka", flag: "🇧🇩", locale: "bn-BD" },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee", flag: "🇵🇰", locale: "ur-PK" },
  { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee", flag: "🇱🇰", locale: "si-LK" },
  { code: "NPR", symbol: "रू", name: "Nepalese Rupee", flag: "🇳🇵", locale: "ne-NP" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", flag: "🇲🇾", locale: "ms-MY" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", flag: "🇮🇩", locale: "id-ID" },
  { code: "THB", symbol: "฿", name: "Thai Baht", flag: "🇹🇭", locale: "th-TH" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso", flag: "🇵🇭", locale: "fil-PH" },
  { code: "MXN", symbol: "$", name: "Mexican Peso", flag: "🇲🇽", locale: "es-MX" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", flag: "🇧🇷", locale: "pt-BR" },
  { code: "ZAR", symbol: "R", name: "South African Rand", flag: "🇿🇦", locale: "en-ZA" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc", flag: "🇨🇭", locale: "de-CH" },
];

const POPULAR_CURRENCY_CODES = ["INR", "USD", "EUR", "GBP", "SGD", "AED", "AUD", "CAD"];

/* ─── Confetti particles ─────────────────────────────────────────────────── */
type Particle = {
  id: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
};

function ConfettiPiece({ x, color, size, delay, duration }: Omit<Particle, "id">) {
  return (
    <div
      className="absolute top-0 pointer-events-none"
      style={{
        left: `${x}%`,
        width: size,
        height: size * 0.6,
        backgroundColor: color,
        borderRadius: 2,
        animation: `confetti-drop ${duration}s ease-in ${delay}s forwards`,
        transform: `rotate(${Math.random() * 360}deg)`,
      }}
    />
  );
}

function Confetti() {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: ["#2D5BFF", "#00F5FF", "#C3F809", "#3b82f6", "#10b981", "#06b6d4"][
        Math.floor(Math.random() * 6)
      ],
      size: Math.random() * 8 + 6,
      delay: Math.random() * 1.5,
      duration: Math.random() * 1.5 + 2,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <ConfettiPiece key={p.id} {...p} />
      ))}
    </div>
  );
}

/* ─── Step indicator ─────────────────────────────────────────────────────── */
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i < current
              ? "w-2 h-2 bg-blue-400"
              : i === current
              ? "w-5 h-2 bg-gradient-to-r from-blue-600 to-cyan-500"
              : "w-2 h-2 bg-white/15"
          }`}
        />
      ))}
    </div>
  );
}

/* ─── Types ─────────────────────────────────────────────────────────────── */
type OnboardingData = {
  currencyCode: string;
  currencySymbol: string;
  locale: string;
  monthlyBudget: string;
};

type OnboardingFlowProps = {
  userName?: string | null;
  onComplete: (data: OnboardingData) => Promise<void>;
};

/* ─── Step 1: Welcome ────────────────────────────────────────────────────── */
function WelcomeStep({
  userName,
  onNext,
}: {
  userName?: string | null;
  onNext: () => void;
}) {
  const firstName = userName?.split(" ")[0] || "Friend";
  return (
    <div className="flex flex-col items-center text-center gap-6 px-2 animate-fade-up">
      {/* Animated logo */}
      <div className="relative">
        <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 animate-pulse-glow">
          <Wallet className="w-10 h-10" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/40">
          <span className="text-sm">👋</span>
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          Welcome, {firstName}!
        </h2>
        <p className="text-zinc-400 text-[15px] leading-relaxed max-w-xs">
          Let&apos;s get AmazeTrack set up for you. It only takes 30 seconds.
        </p>
      </div>

      {/* What you'll get */}
      <div className="w-full flex flex-col gap-3 text-left">
        {[
          { emoji: "💱", text: "Set your preferred currency" },
          { emoji: "💰", text: "Optionally set a monthly budget" },
          { emoji: "✅", text: "Start tracking right away" },
        ].map((item) => (
          <div
            key={item.text}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]"
          >
            <span className="text-xl flex-shrink-0">{item.emoji}</span>
            <span className="text-[13px] font-semibold text-zinc-300">{item.text}</span>
          </div>
        ))}
      </div>

      <button
        id="onboarding-welcome-next"
        onClick={onNext}
        className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-sm font-bold text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-0"
      >
        Let&apos;s go <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─── Step 2: Currency picker ────────────────────────────────────────────── */
function CurrencyStep({
  selected,
  onSelect,
  onNext,
}: {
  selected: string;
  onSelect: (code: string) => void;
  onNext: () => void;
}) {
  const [query, setQuery] = useState("");

  const popular = CURRENCIES.filter((c) => POPULAR_CURRENCY_CODES.includes(c.code));
  const filtered = query.trim()
    ? CURRENCIES.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.code.toLowerCase().includes(query.toLowerCase()) ||
          c.symbol.includes(query)
      )
    : CURRENCIES;

  const selectedCurrency = CURRENCIES.find((c) => c.code === selected);

  return (
    <div className="flex flex-col gap-5 animate-fade-up">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight mb-1">
          Choose your currency
        </h2>
        <p className="text-[13px] text-zinc-400">
          You can change this anytime in Settings.
        </p>
      </div>

      {/* Popular quick picks */}
      <div>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Popular</p>
        <div className="grid grid-cols-4 gap-2">
          {popular.map((c) => (
            <button
              key={c.code}
              id={`currency-pick-${c.code}`}
              onClick={() => onSelect(c.code)}
              className={`flex flex-col items-center gap-1 py-3 px-1 rounded-2xl border transition-all duration-200 cursor-pointer text-center ${
                selected === c.code
                  ? "border-blue-500/60 bg-blue-500/15 shadow-lg shadow-blue-500/20"
                  : "border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12] hover:bg-white/[0.06]"
              }`}
            >
              <span className="text-xl">{c.flag}</span>
              <span className="text-[11px] font-bold text-white">{c.symbol}</span>
              <span className="text-[9px] text-zinc-500 font-semibold">{c.code}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input
          id="onboarding-currency-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search currencies…"
          className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] font-medium placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all"
        />
      </div>

      {/* Scrollable list */}
      <div className="max-h-[200px] overflow-y-auto space-y-1 custom-scrollbar -mx-1 px-1">
        {filtered.map((c) => (
          <button
            key={c.code}
            id={`currency-list-${c.code}`}
            onClick={() => onSelect(c.code)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-150 cursor-pointer text-left ${
              selected === c.code
                ? "border-blue-500/50 bg-blue-500/12"
                : "border-transparent hover:bg-white/[0.05] hover:border-white/[0.06]"
            }`}
          >
            <span className="text-lg flex-shrink-0">{c.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">{c.name}</p>
              <p className="text-[10px] text-zinc-500">{c.code}</p>
            </div>
            <span className="text-base font-bold text-zinc-300 flex-shrink-0">{c.symbol}</span>
            {selected === c.code && (
              <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
            )}
          </button>
        ))}
      </div>

      <button
        id="onboarding-currency-next"
        onClick={onNext}
        disabled={!selected}
        className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-sm font-bold text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
      >
        Continue with {selectedCurrency?.symbol} {selectedCurrency?.code} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─── Step 3: Monthly budget ─────────────────────────────────────────────── */
function BudgetStep({
  currencySymbol,
  budget,
  onBudgetChange,
  onNext,
  onSkip,
}: {
  currencySymbol: string;
  budget: string;
  onBudgetChange: (v: string) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 animate-fade-up">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight mb-1">
          Monthly budget?
        </h2>
        <p className="text-[13px] text-zinc-400 leading-relaxed">
          We&apos;ll track your spending against this. You can always update it later.
        </p>
      </div>

      {/* Budget presets */}
      <div className="flex flex-wrap gap-2">
        {["5000", "10000", "15000", "20000"].map((amount) => (
          <button
            key={amount}
            id={`budget-preset-${amount}`}
            onClick={() => onBudgetChange(amount)}
            className={`px-4 py-2 rounded-xl text-[12px] font-bold border transition-all cursor-pointer ${
              budget === amount
                ? "border-blue-500/60 bg-blue-500/15 text-blue-300"
                : "border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:border-white/[0.15] hover:text-zinc-200"
            }`}
          >
            {currencySymbol}{Number(amount).toLocaleString()}
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-base pointer-events-none">
          {currencySymbol}
        </span>
        <input
          id="onboarding-budget-input"
          type="number"
          inputMode="numeric"
          min="0"
          value={budget}
          onChange={(e) => onBudgetChange(e.target.value)}
          placeholder="Enter amount"
          className="w-full h-14 pl-9 pr-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-white text-lg font-bold placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all"
        />
      </div>

      <p className="text-[11px] text-zinc-600 text-center">
        This sets a monthly spending limit across all categories.
      </p>

      <div className="flex flex-col gap-2">
        <button
          id="onboarding-budget-next"
          onClick={onNext}
          disabled={!budget || Number(budget) <= 0}
          className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-sm font-bold text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
        >
          Set Budget <ArrowRight className="w-4 h-4" />
        </button>
        <button
          id="onboarding-budget-skip"
          onClick={onSkip}
          className="w-full h-11 rounded-2xl text-[13px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

/* ─── Step 4: Done ────────────────────────────────────────────────────────── */
function DoneStep({
  currencyCode,
  currencySymbol,
  currencyFlag,
  budget,
  onStart,
  isSaving,
}: {
  currencyCode: string;
  currencySymbol: string;
  currencyFlag: string;
  budget: string;
  onStart: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-6 px-2 animate-fade-up relative overflow-hidden">
      <Confetti />

      {/* Icon */}
      <div className="relative z-10">
        <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-2xl shadow-teal-500/40">
          <PartyPopper className="w-10 h-10 text-white" />
        </div>
      </div>

      <div className="relative z-10">
        <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          You&apos;re all set! 🎉
        </h2>
        <p className="text-zinc-400 text-[14px] leading-relaxed max-w-xs">
          AmazeTrack is configured. Next, we&apos;ll secure your account and database:
        </p>
      </div>

      {/* Summary cards */}
      <div className="w-full flex flex-col gap-2 relative z-10">
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
          <span className="text-[12px] font-semibold text-zinc-400">Currency</span>
          <span className="text-[13px] font-bold text-white">
            {currencyFlag} {currencySymbol} · {currencyCode}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
          <span className="text-[12px] font-semibold text-zinc-400">Monthly Budget</span>
          <span className="text-[13px] font-bold text-white">
            {budget && Number(budget) > 0
              ? `${currencySymbol}${Number(budget).toLocaleString()}`
              : "Not set"}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
          <span className="text-[12px] font-semibold text-zinc-400">Data storage</span>
          <span className="text-[13px] font-bold text-white">🔒 Your Google Drive</span>
        </div>
      </div>

      <button
        id="onboarding-done-btn"
        onClick={onStart}
        disabled={isSaving}
        className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-sm font-bold text-white shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-0 disabled:opacity-60 disabled:scale-100 relative z-10"
      >
        {isSaving ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Saving…
          </>
        ) : (
          <>
            Next: Sign In <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}

/* ─── Main OnboardingFlow ─────────────────────────────────────────────────── */
export function OnboardingFlow({ userName, onComplete }: OnboardingFlowProps) {
  const TOTAL_STEPS = 4;
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    currencyCode: "INR",
    currencySymbol: "₹",
    locale: "en-IN",
    monthlyBudget: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const selectedCurrency = CURRENCIES.find((c) => c.code === data.currencyCode);

  const handleCurrencySelect = useCallback((code: string) => {
    const c = CURRENCIES.find((cur) => cur.code === code);
    if (c) {
      setData((d) => ({
        ...d,
        currencyCode: c.code,
        currencySymbol: c.symbol,
        locale: c.locale,
      }));
    }
  }, []);

  const handleFinish = useCallback(async () => {
    setIsSaving(true);
    try {
      await onComplete(data);
    } finally {
      setIsSaving(false);
    }
  }, [data, onComplete]);

  // Trap scroll on body while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
      />

      {/* Ambient orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full pointer-events-none animate-orb-drift"
        style={{ background: "radial-gradient(circle, rgba(0,102,255,0.22) 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[350px] h-[350px] rounded-full pointer-events-none animate-orb-drift [animation-delay:4s]"
        style={{ background: "radial-gradient(circle, rgba(0,245,255,0.16) 0%, transparent 70%)", filter: "blur(60px)" }} />

      {/* Modal panel */}
      <div
        className="relative w-full max-w-[400px] rounded-[2rem] p-8 border border-white/[0.08] shadow-2xl animate-scale-in"
        style={{
          background: "rgba(8, 12, 24, 0.92)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          boxShadow: "0 32px 80px -16px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05) inset",
        }}
      >
        {/* Top bar: logo + step dots */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-extrabold text-zinc-400">AmazeTrack</span>
          </div>
          <StepDots current={step} total={TOTAL_STEPS} />
        </div>

        {/* Step content */}
        <div className="min-h-[380px] flex flex-col justify-center">
          {step === 0 && (
            <WelcomeStep userName={userName} onNext={() => setStep(1)} />
          )}
          {step === 1 && (
            <CurrencyStep
              selected={data.currencyCode}
              onSelect={handleCurrencySelect}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <BudgetStep
              currencySymbol={data.currencySymbol}
              budget={data.monthlyBudget}
              onBudgetChange={(v) => setData((d) => ({ ...d, monthlyBudget: v }))}
              onNext={() => setStep(3)}
              onSkip={() => {
                setData((d) => ({ ...d, monthlyBudget: "" }));
                setStep(3);
              }}
            />
          )}
          {step === 3 && (
            <DoneStep
              currencyCode={data.currencyCode}
              currencySymbol={data.currencySymbol}
              currencyFlag={selectedCurrency?.flag ?? "🌍"}
              budget={data.monthlyBudget}
              onStart={handleFinish}
              isSaving={isSaving}
            />
          )}
        </div>

        {/* Back button */}
        {step > 0 && step < 3 && (
          <button
            id="onboarding-back-btn"
            onClick={() => setStep((s) => s - 1)}
            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.1] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
