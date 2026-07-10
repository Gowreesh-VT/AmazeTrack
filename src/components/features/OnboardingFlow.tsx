"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet, ChevronRight, Check, X, Search, ArrowRight, PartyPopper, Bell, Sparkles } from "lucide-react";

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
      color: ["#7c3aed", "#a78bfa", "#2dd4bf", "#3b82f6", "#10b981", "#f472b6"][
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

/* ─── Custom Wavy Page-Progress Indicator ─────────────────────────────────── */
function getActiveWavyPath(progressWidth: number, wavelength = 18, amplitude = 2.5, y = 8) {
  if (progressWidth <= 0) return `M 0 ${y}`;
  let path = `M 0 ${y}`;
  let x = 0;
  let isUp = true;
  while (x + wavelength <= progressWidth) {
    const cp1x = x + wavelength / 4;
    const cp1y = isUp ? y - amplitude : y + amplitude;
    const end1x = x + wavelength / 2;
    const end1y = y;

    const cp2x = x + (3 * wavelength) / 4;
    const cp2y = isUp ? y + amplitude : y - amplitude;
    const end2x = x + wavelength;
    const end2y = y;

    path += ` Q ${cp1x} ${cp1y} ${end1x} ${end1y} Q ${cp2x} ${cp2y} ${end2x} ${end2y}`;
    x += wavelength;
    isUp = !isUp;
  }

  if (x < progressWidth) {
    path += ` L ${progressWidth} ${y}`;
  }
  return path;
}

function WavyProgress({ current, total }: { current: number; total: number }) {
  const totalWidth = 360;
  const y = 8;
  const progressPercent = total > 0 ? (current / total) * 100 : 0;
  const progressWidth = (progressPercent / 100) * totalWidth;

  // Render straight line if we are on/near the final steps
  const isLast = current >= total - 1;

  const activePath = isLast
    ? `M 0 ${y} L ${totalWidth} ${y}`
    : getActiveWavyPath(progressWidth, 18, 2.5, y);

  const inactivePath = `M ${progressWidth} ${y} L ${totalWidth} ${y}`;

  return (
    <div className="w-full relative px-2 mb-6">
      <svg
        viewBox={`0 0 ${totalWidth} 16`}
        className="w-full overflow-visible"
        style={{ height: "16px" }}
      >
        {/* Inactive Line (Muted opacity backdrop) */}
        {progressWidth < totalWidth && (
          <path
            d={inactivePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="text-white/10"
          />
        )}

        {/* Active Line */}
        <path
          d={activePath}
          fill="none"
          stroke="url(#progress-gradient)"
          strokeWidth="3.5"
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />

        {/* Floating Marker Circle */}
        {!isLast && progressWidth > 0 && (
          <circle
            cx={progressWidth}
            cy={y}
            r="3.5"
            fill="currentColor"
            className="text-purple-400 animate-pulse"
          />
        )}

        <defs>
          <linearGradient id="progress-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--primary, #7c3aed)" />
            <stop offset="100%" stopColor="color-mix(in oklab, var(--primary, #7c3aed) 70%, white)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/* ─── Back Button Component ──────────────────────────────────────────────── */
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-12 h-12 rounded-full bg-zinc-800/80 border border-white/[0.08] hover:bg-zinc-700/80 hover:text-white text-zinc-300 flex items-center justify-center transition-all cursor-pointer shadow-md"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
    </button>
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

/* ─── Step 0: Welcome / Get Started ──────────────────────────────────────── */
function WelcomeStep({
  onNext,
}: {
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-7 px-2 animate-fade-up">
      {/* Visual Logo Container with background mock pattern */}
      <div className="relative w-full h-[180px] flex items-center justify-center">
        {/* Pattern backdrop */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        {/* Animated outer ring */}
        <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-[#1b1c24] border border-white/[0.08] shadow-2xl">
          {/* Stylized custom 'C' mark representing Cashiro/Amaze design style */}
          <div className="w-16 h-16 rounded-full border-[8px] border-white border-r-transparent border-b-transparent transform -rotate-45 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full bg-purple-500 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          AmazeTrack
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-[280px] mx-auto">
          Experience a seamless way to track your money, categorize your spending, and hit your savings goals faster.
        </p>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-sm font-extrabold text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-0"
      >
        Get Started <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─── Step 1: Automatic SMS Tracking Info ────────────────────────────────── */
function AutoTrackingStep({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-7 px-2 animate-fade-up">
      {/* Mock phone viewport showing chat bubbles */}
      <div className="w-full h-[180px] rounded-3xl bg-[#111322]/80 border border-white/[0.06] p-4 flex flex-col gap-2 relative overflow-hidden">
        {/* Floating elements resembling SMS chat logs */}
        <div className="self-start max-w-[70%] bg-zinc-800/80 rounded-2xl rounded-tl-none p-2.5 text-left border border-white/[0.04]">
          <div className="h-2 w-28 bg-white/20 rounded mb-1.5" />
          <div className="h-2 w-16 bg-white/10 rounded" />
        </div>
        <div className="self-end max-w-[75%] bg-purple-950/40 rounded-2xl rounded-tr-none p-2.5 text-right border border-purple-900/30">
          <div className="h-2 w-32 bg-purple-400/40 rounded ml-auto mb-1.5" />
          <div className="h-2 w-20 bg-purple-500/30 rounded ml-auto" />
        </div>
        <div className="self-start max-w-[65%] bg-zinc-800/80 rounded-2xl rounded-tl-none p-2.5 text-left border border-white/[0.04]">
          <div className="h-2 w-24 bg-white/20 rounded" />
        </div>

        {/* Glowing floating SMS icon */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center shadow-xl text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          Automatic Tracking
        </h2>
        <p className="text-zinc-400 text-xs leading-relaxed max-w-[270px]">
          AmazeTrack can automatically scan your transaction SMS to keep your accounts up to date.
        </p>
      </div>

      {/* Skip button styled as dark-filled pill */}
      <button
        type="button"
        onClick={onSkip}
        className="px-6 py-2.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/[0.06] text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
      >
        Skip for now
      </button>

      <div className="w-full flex items-center gap-3.5 mt-2">
        <button
          type="button"
          onClick={onNext}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-sm font-extrabold text-white shadow-lg shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-0"
        >
          Enable Tracking <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Step 2: Notification Settings Info ────────────────────────────────── */
function NotificationStep({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-7 px-2 animate-fade-up">
      {/* Mock phone view showing bell notification alert */}
      <div className="w-full h-[180px] rounded-3xl bg-[#111322]/80 border border-white/[0.06] p-4 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
          <Bell className="w-5 h-5 animate-bounce" />
        </div>
        
        {/* Mock Push Notification Panel */}
        <div className="w-[85%] bg-purple-950/20 border border-purple-800/20 rounded-2xl p-3 flex items-start gap-2.5 text-left shadow-lg">
          <div className="w-7 h-7 rounded-xl bg-purple-600 flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black">
            C
          </div>
          <div>
            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Notification</span>
            <p className="text-[11px] font-bold text-white leading-snug mt-0.5">Your salary has been credited!</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          Stay Updated
        </h2>
        <p className="text-zinc-400 text-xs leading-relaxed max-w-[270px]">
          Allow notifications to receive bill reminders and daily summaries.
        </p>
      </div>

      <div className="w-full flex items-center gap-3.5 mt-2">
        <BackButton onClick={onBack} />
        <button
          type="button"
          onClick={onNext}
          className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-sm font-extrabold text-white shadow-lg shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-0"
        >
          Stay Informed <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Step 3: Message Scanning Simulation ────────────────────────────────── */
function ScanningStep({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 3168) {
          clearInterval(interval);
          setTimeout(onComplete, 800);
          return 3168;
        }
        // Accelerate simulation
        return Math.min(prev + Math.floor(Math.random() * 200) + 100, 3168);
      });
    }, 120);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center text-center gap-7 px-2 animate-fade-up">
      {/* Mock scan viewport */}
      <div className="w-full h-[180px] rounded-3xl bg-[#111322]/80 border border-white/[0.06] p-5 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Progress box */}
        <div className="w-[80%] space-y-3.5 z-10 text-center">
          <p className="text-sm font-black text-white tracking-wide">
            Scanning SMS:
          </p>
          <p className="text-xl font-extrabold text-purple-400 tabular-nums">
            {progress} / 3,168
          </p>
          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-zinc-800/80 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-150"
              style={{ width: `${(progress / 3168) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          Scanning Messages
        </h2>
        <p className="text-zinc-400 text-xs leading-relaxed max-w-[270px]">
          This will only take a moment...
        </p>
      </div>

      <button
        type="button"
        disabled
        className="w-full h-14 rounded-2xl bg-zinc-800/50 text-sm font-extrabold text-zinc-500 flex items-center justify-center gap-2 border-0 cursor-not-allowed"
      >
        Scanning... <ArrowRight className="w-4 h-4 text-zinc-600" />
      </button>
    </div>
  );
}

/* ─── Step 4: Verify Found Accounts ──────────────────────────────────────── */
function VerifyAccountsStep({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState(0);

  const mockAccounts = [
    { name: "Canara Bank", balance: "₹7,401.96", number: "**** **** **** 2316", active: true },
    { name: "Canara Bank", balance: "₹67,16,217", number: "**** **** **** 8882", active: false }
  ];

  return (
    <div className="flex flex-col items-center text-center gap-6 px-2 animate-fade-up">
      <div className="w-full text-left">
        <h2 className="text-2xl font-extrabold text-white tracking-tight text-center">
          Verify Accounts
        </h2>
      </div>

      {/* Account Cards list */}
      <div className="w-full space-y-3 max-h-[220px] overflow-y-auto pr-1">
        {mockAccounts.map((acct, idx) => (
          <div
            key={idx}
            onClick={() => setSelected(idx)}
            className={`w-full text-left rounded-3xl p-5 border transition-all duration-200 cursor-pointer relative overflow-hidden ${
              selected === idx
                ? "border-purple-500 bg-purple-950/20 shadow-lg shadow-purple-500/10"
                : "border-white/[0.05] bg-zinc-900/50 hover:bg-zinc-900/80"
            }`}
          >
            {/* Split branch watermark */}
            <div className="absolute right-4 top-4 text-zinc-600 opacity-20">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="6" y1="3" x2="6" y2="15"></line>
                <circle cx="18" cy="6" r="3"></circle>
                <circle cx="6" cy="18" r="3"></circle>
                <path d="M18 9a9 9 0 0 1-9 9"></path>
              </svg>
            </div>

            <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">Balance</span>
            <p className="text-2xl font-black text-white tracking-tight mt-0.5">{acct.balance}</p>
            
            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="text-xs font-bold text-zinc-300">{acct.name}</p>
                <p className="text-[10px] text-zinc-500 font-semibold tracking-wider mt-0.5">{acct.number}</p>
              </div>
              
              {/* Canara styled logo (Cyan/Yellow geometric triangle) */}
              <div className="w-7 h-7 rounded-full bg-sky-600/30 border border-sky-400/30 flex items-center justify-center text-sky-400 font-black text-[10px]">
                ▲
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-zinc-500 text-[11px] font-bold tracking-wide">
        We found 2 accounts. Select your primary one.
      </p>

      <div className="w-full flex items-center gap-3.5">
        <BackButton onClick={onBack} />
        <button
          type="button"
          onClick={onNext}
          className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-sm font-extrabold text-white shadow-lg shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-0"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Step 5: Profile & Avatar Setup ─────────────────────────────────────── */
function ProfileSetupStep({
  userName,
  onCompleteSetup,
  onBack,
}: {
  userName?: string | null;
  onCompleteSetup: (name: string, avatar: string, color: string) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(userName || "User");
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [selectedColor, setSelectedColor] = useState(4);

  const avatars = ["🧑‍💼", "🧑‍🎨", "🕶️", "👅", "🧑‍🚀"];
  const colors = ["#0ea5e9", "#f97316", "#ec4899", "#d946ef", "#a855f7"];

  return (
    <div className="flex flex-col gap-5 animate-fade-up">
      {/* Banner landscape layout */}
      <div className="w-full h-32 rounded-3xl bg-gradient-to-b from-indigo-950 via-purple-950 to-zinc-950 border border-white/[0.06] relative flex items-center justify-center overflow-hidden">
        {/* Star elements */}
        <div className="absolute top-4 left-6 w-1 h-1 bg-white rounded-full opacity-65" />
        <div className="absolute top-10 right-12 w-0.5 h-0.5 bg-white rounded-full opacity-40" />
        <div className="absolute top-6 right-24 w-1.5 h-1.5 bg-white rounded-full opacity-50 blur-[0.5px]" />
        
        {/* Moon */}
        <div className="absolute top-4 right-6 w-7 h-7 rounded-full bg-amber-100 shadow-[0_0_12px_rgba(251,243,219,0.4)]" />
        
        {/* Mountain vectors */}
        <div className="absolute bottom-0 inset-x-0 h-8 bg-zinc-950/90 pointer-events-none" 
          style={{ clipPath: "polygon(0% 100%, 25% 40%, 45% 85%, 65% 30%, 85% 70%, 100% 100%)" }} />

        {/* Selected avatar float */}
        <div className="absolute bottom-[-16px] w-16 h-16 rounded-full bg-zinc-900 border-2 border-purple-500 flex items-center justify-center text-3xl shadow-xl">
          {avatars[selectedAvatar]}
        </div>
      </div>

      <div className="space-y-4 mt-2">
        {/* Name input */}
        <div className="flex flex-col gap-1.5 text-left">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">What should we call you?</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-12 px-5 rounded-2xl bg-zinc-900 border border-white/[0.07] text-white text-sm font-bold placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 focus:bg-zinc-900/80 transition-all"
          />
        </div>

        {/* Avatars */}
        <div className="flex flex-col gap-1.5 text-left">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Avatars</label>
          <div className="flex items-center gap-3">
            {avatars.map((av, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedAvatar(idx)}
                className={`w-11 h-11 rounded-full bg-zinc-900 border text-xl flex items-center justify-center transition-all cursor-pointer ${
                  selectedAvatar === idx ? "border-purple-500 bg-purple-950/30 scale-105" : "border-white/[0.06] hover:bg-zinc-800"
                }`}
              >
                {av}
              </button>
            ))}
          </div>
        </div>

        {/* Colors selector */}
        <div className="flex flex-col gap-1.5 text-left">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Colors</label>
          <div className="flex items-center gap-2.5">
            {/* Color wheel placeholder representing Custom picker */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 via-pink-500 to-yellow-300 border border-white/20 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform" />
            <div className="h-6 w-px bg-white/10 mx-1" />
            {colors.map((c, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedColor(idx)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:scale-105 transition-all cursor-pointer relative"
                style={{ backgroundColor: c }}
              >
                {selectedColor === idx && (
                  <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full flex items-center gap-3.5 mt-3">
        <BackButton onClick={onBack} />
        <button
          type="button"
          onClick={() => onCompleteSetup(name, avatars[selectedAvatar], colors[selectedColor])}
          className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-sm font-extrabold text-white shadow-lg shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-0"
        >
          Finish Setup <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Step 6: Currency Picker (Standard functional step) ─────────────────── */
function CurrencyStep({
  selected,
  onSelect,
  onNext,
  onBack,
}: {
  selected: string;
  onSelect: (code: string) => void;
  onNext: () => void;
  onBack: () => void;
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
              type="button"
              onClick={() => onSelect(c.code)}
              className={`flex flex-col items-center gap-1 py-3 px-1 rounded-2xl border transition-all duration-200 cursor-pointer text-center ${
                selected === c.code
                  ? "border-purple-500 bg-purple-950/20 shadow-lg shadow-purple-500/10"
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
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search currencies…"
          className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-white text-[13px] font-medium placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.08] transition-all"
        />
      </div>

      {/* Scrollable list */}
      <div className="max-h-[140px] overflow-y-auto space-y-1 custom-scrollbar -mx-1 px-1">
        {filtered.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => onSelect(c.code)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-150 cursor-pointer text-left ${
              selected === c.code
                ? "border-purple-500 bg-purple-950/15"
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
              <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
            )}
          </button>
        ))}
      </div>

      <div className="w-full flex items-center gap-3.5">
        <BackButton onClick={onBack} />
        <button
          type="button"
          onClick={onNext}
          disabled={!selected}
          className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-sm font-extrabold text-white shadow-lg shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue with {selectedCurrency?.symbol} {selectedCurrency?.code} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Step 7: Monthly Budget (Standard functional step) ─────────────────── */
function BudgetStep({
  currencySymbol,
  budget,
  onBudgetChange,
  onNext,
  onSkip,
  onBack,
}: {
  currencySymbol: string;
  budget: string;
  onBudgetChange: (v: string) => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
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
            type="button"
            onClick={() => onBudgetChange(amount)}
            className={`px-4 py-2.5 rounded-2xl text-[12px] font-bold border transition-all cursor-pointer ${
              budget === amount
                ? "border-purple-500 bg-purple-950/20 text-purple-300"
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
          type="number"
          inputMode="numeric"
          min="0"
          value={budget}
          onChange={(e) => onBudgetChange(e.target.value)}
          placeholder="Enter amount"
          className="w-full h-14 pl-9 pr-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-white text-lg font-bold placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.08] transition-all"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3.5">
          <BackButton onClick={onBack} />
          <button
            type="button"
            onClick={onNext}
            disabled={!budget || Number(budget) <= 0}
            className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-sm font-extrabold text-white shadow-lg shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Set Budget <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="w-full h-11 rounded-2xl text-[13px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

/* ─── Step 8: Done Step ──────────────────────────────────────────────────── */
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
        <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center shadow-2xl shadow-purple-500/40">
          <PartyPopper className="w-10 h-10 text-white" />
        </div>
      </div>

      <div className="relative z-10 space-y-1.5">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          You&apos;re all set! 🎉
        </h2>
        <p className="text-zinc-400 text-[13px] leading-relaxed max-w-xs mx-auto">
          AmazeTrack is configured. Next, we&apos;ll secure your account and database:
        </p>
      </div>

      {/* Summary cards */}
      <div className="w-full flex flex-col gap-2 relative z-10 text-left">
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
        type="button"
        onClick={onStart}
        disabled={isSaving}
        className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-sm font-extrabold text-white shadow-lg shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-0 disabled:opacity-60 relative z-10"
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
  const TOTAL_STEPS = 8;
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    currencyCode: "INR",
    currencySymbol: "₹",
    locale: "en-IN",
    monthlyBudget: "",
  });
  const [profileName, setProfileName] = useState(userName || "User");
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
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        style={{ backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
      />

      {/* Ambient Orbs */}
      <div
        className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full pointer-events-none animate-orb-drift"
        style={{
          background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] w-[350px] h-[350px] rounded-full pointer-events-none animate-orb-drift [animation-delay:4s]"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Modal Container */}
      <div
        className="relative w-full max-w-[400px] rounded-[2rem] p-8 border border-white/[0.08] shadow-2xl animate-scale-in"
        style={{
          background: "rgba(8, 12, 24, 0.92)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          boxShadow: "0 32px 80px -16px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05) inset",
        }}
      >
        {/* Top bar: title + Custom Wavy Page Indicator */}
        <div className="mb-6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-extrabold text-zinc-400">AmazeTrack</span>
            </div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Step {step} / {TOTAL_STEPS}
            </span>
          </div>
          
          {/* Custom Wavy Progress Bar */}
          <WavyProgress current={step} total={TOTAL_STEPS} />
        </div>

        {/* Step Content */}
        <div className="min-h-[380px] flex flex-col justify-center">
          {step === 0 && (
            <WelcomeStep onNext={() => setStep(1)} />
          )}
          {step === 1 && (
            <AutoTrackingStep onNext={() => setStep(2)} onSkip={() => setStep(2)} />
          )}
          {step === 2 && (
            <NotificationStep onNext={() => setStep(3)} onBack={() => setStep(1)} />
          )}
          {step === 3 && (
            <ScanningStep onComplete={() => setStep(4)} />
          )}
          {step === 4 && (
            <VerifyAccountsStep onNext={() => setStep(5)} onBack={() => setStep(2)} />
          )}
          {step === 5 && (
            <ProfileSetupStep
              userName={profileName}
              onCompleteSetup={(name) => {
                setProfileName(name);
                setStep(6);
              }}
              onBack={() => setStep(4)}
            />
          )}
          {step === 6 && (
            <CurrencyStep
              selected={data.currencyCode}
              onSelect={handleCurrencySelect}
              onNext={() => setStep(7)}
              onBack={() => setStep(5)}
            />
          )}
          {step === 7 && (
            <BudgetStep
              currencySymbol={data.currencySymbol}
              budget={data.monthlyBudget}
              onBudgetChange={(v) => setData((d) => ({ ...d, monthlyBudget: v }))}
              onNext={() => setStep(8)}
              onSkip={() => {
                setData((d) => ({ ...d, monthlyBudget: "" }));
                setStep(8);
              }}
              onBack={() => setStep(6)}
            />
          )}
          {step === 8 && (
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
      </div>
    </div>
  );
}
