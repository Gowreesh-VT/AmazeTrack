"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { 
  ArrowRight, 
  Check, 
  Mail, 
  FileText, 
  Sparkles, 
  Mic, 
  Menu, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Star,
  ChevronRight,
  TrendingUp,
  Inbox,
  Camera,
  Layers,
  Smile,
  ShieldCheck,
  Zap,
  Shield,
  Wallet,
  Users,
  Calendar,
  BarChart3
} from "lucide-react";

/* ─── Exact Figma Logo Icon Component ─── */
function AmazeTrackLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={`relative rounded-full bg-[#C3F809] flex items-center justify-center flex-shrink-0 ${className}`}>
      {/* Exact replica of the brackets logo inside the lime circle */}
      <svg viewBox="0 0 32 32" className="w-6 h-6 text-black" fill="currentColor">
        {/* Left bracket shape */}
        <path d="M10 8c-2.2 0-4 1.8-4 4v8c0 2.2 1.8 4 4 4h1v-3h-1c-.6 0-1-.4-1-1v-8c0-.6.4-1 1-1h1V8h-1z" />
        {/* Middle vertical divider */}
        <rect x="15" y="8" width="2" height="16" rx="0.5" />
        {/* Right bracket shape */}
        <path d="M22 8c2.2 0 4 1.8 4 4v8c0 2.2-1.8 4-4 4h-1v-3h-1c.6 0 1-.4 1-1v-8c0-.6-.4-1-1-1h-1V8h1z" />
      </svg>
    </div>
  );
}

/* ─── App Store Badges ─── */
function AppStoreBadge() {
  return (
    <a 
      href="#download" 
      className="flex items-center gap-3 px-5 py-3 rounded-xl bg-black border border-white/20 hover:border-white/40 transition-all text-white font-medium text-sm hover:scale-[1.02] active:scale-[0.98]"
    >
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.56 2.95-1.39z" />
      </svg>
      <div className="text-left leading-none">
        <div className="text-[10px] opacity-60 font-semibold uppercase tracking-wider">Download on the</div>
        <div className="text-[15px] font-bold mt-0.5">App Store</div>
      </div>
    </a>
  );
}

function GooglePlayBadge() {
  return (
    <a 
      href="#download" 
      className="flex items-center gap-3 px-5 py-3 rounded-xl bg-black border border-white/20 hover:border-white/40 transition-all text-white font-medium text-sm hover:scale-[1.02] active:scale-[0.98]"
    >
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 5.27v13.46c0 .92.86 1.63 1.76 1.34l12.04-6.73c.72-.4 1.1-1.17 1.1-2 .01-.84-.37-1.61-1.09-2L4.77 2.6C3.86 2.3 3 3.02 3 3.93v1.34zm2 2.21l8.52 4.52L5 16.53V7.48z" />
      </svg>
      <div className="text-left leading-none">
        <div className="text-[10px] opacity-60 font-semibold uppercase tracking-wider">Get it on</div>
        <div className="text-[15px] font-bold mt-0.5">Google Play</div>
      </div>
    </a>
  );
}

// Review model
type Review = {
  name: string;
  role: string;
  text: string;
  rating: number;
  initial: string;
};

// Testimonials data
const row1Reviews: Review[] = [
  { name: "Usama Khalid", role: "Founder, Contentdrips", text: "AmazeTrack automatically syncs everything perfectly with my Drive. I don't worry about third-party servers keeping my spending data.", rating: 5, initial: "UK" },
  { name: "Sarah", role: "Food Blogger", text: "I love the Spread Expense toggle. It makes laptop purchases or semester fee bills not completely crash my monthly charts.", rating: 5, initial: "S" },
  { name: "Rohan", role: "VIT Vellore Student", text: "Split bills with flatmates is seamless. No more awkward spreadsheets after weekend outings.", rating: 5, initial: "R" },
  { name: "Priya", role: "IIT Delhi", text: "The categorization is spot on. It correctly labels most of my canteen expenditures without any manual input.", rating: 5, initial: "P" },
];

const row2Reviews: Review[] = [
  { name: "Abhinav", role: "BITS Pilani", text: "I setup my monthly budget and tracking it is very satisfying. Zero ads, zero bloat, just pure utility.", rating: 5, initial: "A" },
  { name: "Megan", role: "College Sophomore", text: "Multi-currency support is amazing since I split subscriptions in different currencies. Best tracker I've used.", rating: 5, initial: "M" },
  { name: "Devansh", role: "SRM Student", text: "Private Google Drive backup is what made me switch. Secure, fast, and simple to use.", rating: 5, initial: "D" },
  { name: "Ananya", role: "Delhi University", text: "Very lightweight app. The UI is clean, and the budget widgets keep me from going broke by week three.", rating: 5, initial: "AN" },
];

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="w-[380px] rounded-2xl bg-neutral-50 p-6 border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all duration-300 whitespace-normal shrink-0">
      <div className="space-y-4">
        <div className="flex items-center gap-0.5 text-[#FFD700]">
          {[...Array(review.rating)].map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-current" />
          ))}
        </div>
        <p className="text-sm font-semibold text-gray-800 leading-relaxed">
          "{review.text}"
        </p>
      </div>

      <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-200/50">
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
          {review.initial}
        </div>
        <div>
          <h4 className="text-xs font-bold text-black">{review.name}</h4>
          <p className="text-[10px] text-gray-500">{review.role}</p>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<number>(1);

  // Smooth scroll handler for anchor links
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-500 selection:text-white scroll-smooth">
      
      {/* ─── CUSTOM STYLE TAG FOR MARQUEE ANIMATION ─── */}
      <style jsx global>{`
        @keyframes marquee-left {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }
        .animate-marquee-left {
          display: flex;
          width: max-content;
          animation: marquee-left 35s linear infinite;
        }
        .animate-marquee-right {
          display: flex;
          width: max-content;
          animation: marquee-right 35s linear infinite;
        }
        .marquee-container:hover .animate-marquee-left,
        .marquee-container:hover .animate-marquee-right {
          animation-play-state: paused;
        }
      `}</style>

      {/* ─── FLOATING FIGMA CAPSULE HEADER ─── */}
      <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 w-[90%] md:w-[560px] h-[56px] bg-white border border-[#E5E5E5] rounded-full shadow-lg flex items-center justify-between px-3 md:px-4">
        
        {/* Left Logo - Rounded Lime Circle */}
        <a href="#" className="flex items-center">
          <AmazeTrackLogo className="w-10 h-10" />
        </a>

        {/* Center Nav Links - Matches exact Figma layout fonts and weights */}
        <nav className="hidden md:flex items-center gap-6 text-[#666666] font-medium text-[14px]">
          <a href="#" className="hover:text-black transition-colors">Home</a>
          <a href="#features" onClick={(e) => handleAnchorClick(e, "features")} className="hover:text-black transition-colors">Features</a>
          <a href="#how-it-works" onClick={(e) => handleAnchorClick(e, "how-it-works")} className="hover:text-black transition-colors">How it Works</a>
          <a href="#testimonials" onClick={(e) => handleAnchorClick(e, "testimonials")} className="hover:text-black transition-colors">Testimonials</a>
        </nav>

        {/* Right CTA Button - Black capsule matching Download App style (Hidden on mobile for visual breathing room) */}
        <button 
          onClick={() => signIn("google")}
          className="hidden md:block h-[42px] px-6 rounded-full bg-black text-white hover:bg-neutral-800 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Sign In
        </button>

        {/* Mobile Menu Icon (Only visible on small devices inside the capsule) */}
        <button 
          className="md:hidden p-1.5 text-gray-600 hover:text-black"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Mobile Nav overlay drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-[68px] left-0 right-0 bg-white border border-[#E5E5E5] rounded-3xl shadow-xl p-6 flex flex-col gap-4 animate-fade-in z-50">
            <a href="#" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); }} className="text-sm font-semibold text-gray-700 hover:text-black">Home</a>
            <a href="#features" onClick={(e) => handleAnchorClick(e, "features")} className="text-sm font-semibold text-gray-700 hover:text-black">Features</a>
            <a href="#how-it-works" onClick={(e) => handleAnchorClick(e, "how-it-works")} className="text-sm font-semibold text-gray-700 hover:text-black">How it Works</a>
            <a href="#testimonials" onClick={(e) => handleAnchorClick(e, "testimonials")} className="text-sm font-semibold text-gray-700 hover:text-black">Testimonials</a>
            <a href="#download" onClick={(e) => handleAnchorClick(e, "download")} className="text-sm font-semibold text-gray-700 hover:text-black">Download App</a>
            <button 
              onClick={() => {
                setMobileMenuOpen(false);
                signIn("google");
              }}
              className="w-full py-2.5 rounded-full bg-black text-white text-xs font-bold text-center"
            >
              Sign In
            </button>
          </div>
        )}
      </div>

      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-36 pb-24 md:pt-48 md:pb-36 bg-black overflow-hidden">
        {/* Ambient Waves background glows (Swapped to AI generated Electric Blue & Cyan) */}
        <div className="absolute top-[-30%] left-[-10%] w-[80%] h-[120%] rounded-full bg-gradient-to-tr from-[#0066FF]/20 via-transparent to-[#00F5FF]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[100%] rounded-full bg-gradient-to-bl from-blue-600/15 via-transparent to-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Diagonal light wave */}
        <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900 via-transparent to-transparent" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 grid md:grid-cols-12 gap-12 items-center">
          {/* Left Text Column */}
          <div className="md:col-span-7 text-left space-y-8 animate-fade-up">

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.06]">
              Let AI Effortlessly <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2D5BFF] via-[#00F5FF] to-[#C3F809]">
                Track Your Expenses
              </span>
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-neutral-400 leading-relaxed max-w-xl">
              Stop guessing where your money went. AmazeTrack gives you a beautiful, private space to log hostel expenses, divide shared bills with roommates, and manage budgets — all synced directly to your own Google Drive.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <button 
                onClick={() => signIn("google")}
                className="group h-[52px] rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-8 text-sm font-bold text-white shadow-xl shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/55 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 border-0 cursor-pointer"
              >
                <span>Get Started with Google</span>
                <ArrowRight className="w-4 h-4 ml-auto opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="pt-4 flex items-center gap-6">
              <div className="flex -space-x-3">
                {["👨‍🎓", "👩‍🎓", "🧑‍🎓", "👩‍💻"].map((avatar, i) => (
                  <div key={i} className="w-9 h-9 rounded-full border-2 border-black bg-neutral-800 flex items-center justify-center text-sm shadow-md">
                    {avatar}
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <div className="font-bold text-white">Built for students worldwide</div>
                <div className="text-neutral-500">100% Free · Private Google Drive sync · Multi-currency support</div>
              </div>
            </div>
          </div>

          {/* Right Visual Column (Mockup Image) */}
          <div className="md:col-span-5 relative h-[500px] md:h-[600px] flex items-center justify-center animate-fade-up [animation-delay:200ms]">
            
            {/* Ambient behind-phone circle glow */}
            <div className="absolute w-80 h-80 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
            <div className="absolute w-72 h-72 rounded-full bg-teal-500/10 blur-3xl pointer-events-none -translate-x-12 translate-y-12" />

            {/* Premium iPhone mockup image holding */}
            <img 
              src="/hero-phone.png" 
              alt="AmazeTrack App Mockup" 
              className="max-h-[480px] md:max-h-[580px] object-contain drop-shadow-2xl z-20 relative hover:scale-[1.03] transition-transform duration-500 cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* ─── SECTION 2: KEY PLATFORM FEATURES ─── */}
      <section id="features" className="py-24 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Header Block */}
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-20">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Secure & Flexible</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-black leading-tight tracking-tight">
              Expense Tracking That <br />Respects Your Privacy
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              No central databases. No corporate tracking. AmazeTrack stores everything on your own Google Drive and guides you with smart local tools.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Card 1: Google Drive Sync */}
            <div className="rounded-3xl bg-neutral-50 border border-gray-100 p-8 md:p-12 flex flex-col justify-between overflow-hidden relative shadow-sm hover:shadow-xl transition-all duration-300 group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full translate-x-12 -translate-y-12" />

              <div className="space-y-6 max-w-lg z-10">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold text-black">Private Google Drive Sync</h3>
                <p className="text-gray-600 font-medium text-base md:text-lg">
                  Keep your financial logs 100% private. Save and load transactions directly to your personal Google Drive account.
                </p>
              </div>

              {/* Graphical mockup showing file save to drive */}
              <div className="mt-12 bg-white rounded-2xl p-6 border border-gray-200 shadow-lg relative transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-400">Data Store</div>
                    <div className="text-sm font-bold text-gray-800">My Drive / AmazeTrack / data.json</div>
                  </div>
                  <span className="ml-auto text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">Encrypted</span>
                </div>
                <div className="space-y-2">
                  <div className="w-full bg-gray-50 h-3 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-emerald-500 rounded-full" />
                  </div>
                  <span className="text-[10px] text-gray-500">Auto-saved 15 seconds ago. Zero servers stored your file.</span>
                </div>
              </div>
            </div>

            {/* Card 2: Shared Room Splits */}
            <div className="rounded-3xl bg-neutral-900 p-8 md:p-12 flex flex-col justify-between overflow-hidden relative shadow-sm hover:shadow-xl transition-all duration-300 group text-white">
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full -translate-x-24 translate-y-24" />

              <div className="space-y-6 max-w-lg z-10">
                <div className="w-12 h-12 rounded-xl bg-[#C3F809] flex items-center justify-center text-black">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold text-white">Bill Splits & Roommate Tracking</h3>
                <p className="text-zinc-400 text-base md:text-lg">
                  Share bills with hostel roommates and flatmates. Keep tabs on shared expenditures and settle debts smoothly.
                </p>
              </div>

              {/* Graphical mockup showing split screen */}
              <div className="mt-12 bg-neutral-950 rounded-2xl p-6 border border-white/10 shadow-lg relative transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Active Split Group</div>
                    <div className="text-sm font-bold text-white">Flat 4B Outings</div>
                  </div>
                  <span className="text-xs font-bold text-[#C3F809] bg-[#C3F809]/15 px-2.5 py-1 rounded-full">Settle up</span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs text-zinc-300">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      Rohan owes you
                    </span>
                    <span className="font-bold text-emerald-400">₹850.00</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-zinc-300">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                      You owe Abhinav
                    </span>
                    <span className="font-bold text-rose-400">-₹400.00</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── SECTION 3: REVOLUTIONIZING PERSONAL FINANCE (ACCORDION) ─── */}
      <section id="how-it-works" className="py-24 md:py-32 bg-gray-50/50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-20">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Built-in Features</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-black leading-tight tracking-tight">
              Powerful Tools Built <br />For Campus Life
            </h2>
            <p className="text-lg text-gray-600">
              AmazeTrack organizes everything from category budgets to monthly bills in one simplified panel.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            
            {/* Left Accordion Column */}
            <div className="space-y-4">
              {[
                { 
                  id: 1, 
                  title: "Smart Analytics & Forecasting", 
                  content: "Understand where every rupee goes. Visualize your spending behavior with animated donut charts, track cumulative budget trajectories, and predict end-of-semester trends with smart analytics."
                },
                { 
                  id: 2, 
                  title: "Shared Expense Splits", 
                  content: "Easily track splits with roommates or hostel mates. Record bills, split evenly or unevenly, calculate balances, and settle balances instantly with built-in reports."
                },
                { 
                  id: 3, 
                  title: "Category Budgets & Alerts", 
                  content: "Set maximum spending boundaries for categories like Dining, Entertainment, and Rent. AmazeTrack gives visual indicators to keep you from overspending before the month ends."
                },
                { 
                  id: 4, 
                  title: "Amortize & Spread Expenses", 
                  content: "Large costs like laptops, semester fees, or annual bills can distort monthly averages. Use the Spread Expense option to break down high expenses over multiple months virtually."
                }
              ].map((item) => {
                const isOpen = activeAccordion === item.id;
                return (
                  <div 
                    key={item.id}
                    className={`rounded-2xl border transition-all duration-300 bg-white ${isOpen ? "border-blue-600 shadow-lg shadow-blue-600/5" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <button
                      onClick={() => setActiveAccordion(item.id)}
                      className="w-full flex items-center justify-between p-6 text-left"
                    >
                      <span className="text-lg font-bold text-gray-900">{item.title}</span>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isOpen ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-6 pt-1 space-y-4 animate-fade-up">
                        <p className="text-gray-600 text-sm leading-relaxed">{item.content}</p>
                        {item.id === 1 && (
                          <button 
                            onClick={() => signIn("google")}
                            className="px-5 py-2.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold flex items-center gap-2 hover:scale-[1.02] transition-all"
                          >
                            <span>Open Analytics Dashboard</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right Interactive Mockup Display Column */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 min-h-[460px] flex flex-col justify-between relative overflow-hidden transition-all duration-500">
              
              {/* Decorative graphic backdrop */}
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-neutral-50/80 via-transparent to-transparent" />

              {/* Dynamically render state depending on accordion selection */}
              {activeAccordion === 1 && (
                <div className="flex-1 flex flex-col justify-center space-y-6 animate-fade-up">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold">Analytics Engine</span>
                    <span className="text-xs text-gray-400">Interactive charts</span>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Spend Distribution Breakdown</h4>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        <span className="text-xs font-bold text-gray-700">Food & Eating Out</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">₹4,850.00 (45%)</span>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="w-5 h-5 text-cyan-500" />
                        <span className="text-xs font-bold text-gray-700">Hostel Rent & Dues</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">₹4,500.00 (42%)</span>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="w-5 h-5 text-teal-500" />
                        <span className="text-xs font-bold text-gray-700">Transport & Cabs</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">₹1,200.00 (13%)</span>
                    </div>
                  </div>
                </div>
              )}

              {activeAccordion === 2 && (
                <div className="flex-1 flex flex-col justify-center space-y-6 animate-fade-up">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">Split Calculator</span>
                    <span className="text-xs text-gray-400">Peer tracking</span>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Bill Division System</h4>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                      <div className="flex justify-between items-center text-xs font-bold text-gray-800">
                        <span>Total Dinner Bill</span>
                        <span>₹1,600</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1">
                        <span>Paid by You</span>
                        <span>Split among 4</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-emerald-800">Owed to You</div>
                        <div className="text-xs text-zinc-500">₹400 each from 3 roommates</div>
                      </div>
                      <span className="text-base font-black text-emerald-700">₹1,200</span>
                    </div>
                  </div>
                </div>
              )}

              {activeAccordion === 3 && (
                <div className="flex-1 flex flex-col justify-center space-y-6 animate-fade-up">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-600 text-xs font-bold">Budgets</span>
                    <span className="text-xs text-gray-400">Monthly caps</span>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Monthly Spending Limits</h4>
                  <div className="space-y-3">
                    {[
                      { name: "Fast Food Budget", spent: 3400, limit: 5000, color: "bg-amber-500" },
                      { name: "Cabs & Travel Budget", spent: 1800, limit: 2000, color: "bg-rose-500" },
                      { name: "Books & Stationeries", spent: 450, limit: 1500, color: "bg-emerald-500" },
                    ].map((item, i) => {
                      const percentage = Math.min((item.spent / item.limit) * 100, 100);
                      return (
                        <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5">
                          <div className="flex justify-between text-xs font-bold text-gray-700">
                            <span>{item.name}</span>
                            <span>₹{item.spent} / ₹{item.limit}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full ${item.color} rounded-full`} style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeAccordion === 4 && (
                <div className="flex-1 flex flex-col justify-center space-y-6 animate-fade-up">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-600 text-xs font-bold">Amortization</span>
                    <span className="text-xs text-gray-400">Virtual splitting</span>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">Spread Out Big Expenses</h4>
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <div>
                      <div className="text-xs text-gray-500">Spread transaction: Laptop Purchase</div>
                      <div className="text-lg font-bold text-gray-800">₹36,000 spread over 6 months</div>
                    </div>
                    <div className="grid grid-cols-6 gap-2 text-center">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="p-1.5 rounded bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold">
                          <div>Mo {i+1}</div>
                          <div className="mt-1 font-mono text-[9px]">₹6K</div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-400 leading-tight">
                      Instead of showing ₹36K spent in June, your analytics virtually accounts ₹6K each month from June to November.
                    </p>
                  </div>
                </div>
              )}

              {/* Info security label */}
              <div className="flex items-center gap-2 mt-6 text-xs text-gray-400">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Encrypted on-device sync</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── SECTION 4: SIMPLE STEPS TO START ─── */}
      <section id="how-it-works" className="py-24 md:py-32 bg-neutral-900 text-white">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Block */}
          <div className="md:col-span-6 space-y-10 animate-fade-up">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Get Started in Seconds</span>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight">
                Connect and Control <br />Your Finances
              </h2>
            </div>

            <div className="space-y-6">
              {[
                { step: "01", text: "Sign in with your Google Account to establish your database" },
                { step: "02", text: "Choose your preferred currency and monthly budget cap during setup" },
                { step: "03", text: "Add custom splits, recurring templates, and analyze trends" }
              ].map((stepItem, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full border border-blue-500/30 text-blue-400 flex items-center justify-center text-xs font-bold font-mono">
                    {stepItem.step}
                  </div>
                  <p className="text-base sm:text-lg text-neutral-300 leading-relaxed pt-0.5">
                    {stepItem.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button 
                onClick={() => signIn("google")}
                className="px-8 py-3.5 rounded-full bg-blue-600 text-white hover:bg-blue-500 font-bold transition-all hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-2"
              >
                <span>Continue with Google</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Right Mockup Block */}
          <div className="md:col-span-6 flex justify-center items-center relative animate-fade-up [animation-delay:200ms]">
            {/* Background elements */}
            <div className="absolute w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

            <div className="w-[280px] h-[540px] rounded-[48px] bg-neutral-950 border-[10px] border-neutral-800 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-6 bg-black flex justify-center items-center z-30">
                <div className="w-24 h-4 bg-black rounded-b-2xl" />
              </div>

              {/* Inside phone screen */}
              <div className="w-full h-full bg-neutral-900 p-6 flex flex-col justify-between">
                
                {/* Onboarding setup mock screen */}
                <div className="mt-8 space-y-4">
                  <div className="p-3.5 rounded-2xl bg-black/80 backdrop-blur border border-white/10 text-white space-y-2">
                    <div className="text-xs font-bold text-blue-400 flex items-center gap-1">
                      <AmazeTrackLogo className="w-4 h-4" /> Welcome to AmazeTrack
                    </div>
                    <p className="text-[11px] leading-relaxed text-zinc-300">Set up your local campus expense profile in two simple configurations.</p>
                  </div>

                  {/* Currency Picker Card Mockup */}
                  <div className="p-3.5 rounded-2xl bg-neutral-950 border border-white/5 space-y-2">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold">Select Default Currency</span>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="p-1 rounded bg-blue-600 border border-blue-500 text-xs font-bold text-white">₹ INR</div>
                      <div className="p-1 rounded bg-neutral-900 border border-white/5 text-xs text-zinc-400 font-bold">$ USD</div>
                      <div className="p-1 rounded bg-neutral-900 border border-white/5 text-xs text-zinc-400 font-bold">€ EUR</div>
                    </div>
                  </div>

                  {/* Budget input card mockup */}
                  <div className="p-3.5 rounded-2xl bg-[#C3F809] text-black space-y-1">
                    <div className="text-[9px] font-bold text-black/60 uppercase">Establish Monthly Budget</div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold font-mono">₹12,000</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/10">Recommended</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-600 text-white text-center text-xs font-bold cursor-pointer">
                  Start Tracking →
                </div>

                <div className="h-1.5 w-28 bg-neutral-800 rounded-full mx-auto" />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── SECTION 5: TESTIMONIALS (MARQUEE SCROLL) ─── */}
      <section id="testimonials" className="py-24 md:py-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-16">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">User Reviews</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-black leading-tight tracking-tight">
              What Students Are Saying
            </h2>
            <p className="text-lg text-gray-600">
              See how hostel students worldwide leverage AmazeTrack to stay on budget.
            </p>
          </div>
        </div>

        {/* Double Row Marquee Wrapper */}
        <div className="marquee-container space-y-6 select-none cursor-default">
          {/* Row 1 - Moves Left */}
          <div className="relative flex w-full overflow-hidden py-1">
            <div className="animate-marquee-left flex gap-6">
              {row1Reviews.map((review, i) => (
                <ReviewCard key={`r1-${i}`} review={review} />
              ))}
              {/* Duplicate track to create infinite scroll */}
              {row1Reviews.map((review, i) => (
                <ReviewCard key={`r1-dup-${i}`} review={review} />
              ))}
            </div>
            {/* Soft shadow gradients on edges */}
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
          </div>

          {/* Row 2 - Moves Right */}
          <div className="relative flex w-full overflow-hidden py-1">
            <div className="animate-marquee-right flex gap-6">
              {row2Reviews.map((review, i) => (
                <ReviewCard key={`r2-${i}`} review={review} />
              ))}
              {/* Duplicate track to create infinite scroll */}
              {row2Reviews.map((review, i) => (
                <ReviewCard key={`r2-dup-${i}`} review={review} />
              ))}
            </div>
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
          </div>
        </div>
      </section>

      {/* ─── SECTION 6: BOTTOM DOWNLOAD / CTA SECTION ─── */}
      <section id="download" className="max-w-7xl mx-auto px-6 mb-24">
        <div className="rounded-3xl bg-black text-white p-8 md:p-16 relative overflow-hidden grid md:grid-cols-12 gap-8 items-center">
          
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-[50%] h-[100%] rounded-full bg-gradient-to-l from-blue-500/20 to-transparent blur-3xl pointer-events-none" />

          {/* Left Text */}
          <div className="md:col-span-7 space-y-6 relative z-10">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Ready to Simplify <br />Your Expenses?
            </h2>
            <p className="text-neutral-400 text-base sm:text-lg max-w-md leading-relaxed">
              Log into AmazeTrack in seconds with Google. Get private, automated syncing on Drive without subscription fees.
            </p>
            
            <div className="flex flex-wrap gap-4 pt-4">
              <button 
                onClick={() => signIn("google")}
                className="px-8 py-3.5 rounded-full bg-white text-black hover:bg-neutral-200 font-bold transition-all hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-2"
              >
                <span>Sign In and Connect Google Drive</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Right Image Mockup representation */}
          <div className="md:col-span-5 relative flex justify-center items-center h-[300px] md:h-[400px]">
            <div className="absolute w-64 h-64 rounded-full bg-blue-600/10 blur-2xl" />
            
            {/* Visual presentation card instead of a raw image */}
            <div className="w-72 p-6 rounded-2xl bg-neutral-900 border border-white/10 shadow-2xl space-y-4 transform hover:scale-105 transition-all">
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Semester Outing Budget</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">On Track</span>
              </div>
              <div className="space-y-1">
                <h4 className="text-2xl font-black">₹3,450 spent</h4>
                <p className="text-xs text-neutral-400">of ₹10,000 budget cap</p>
              </div>
              <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div className="w-[35%] h-full bg-blue-500 rounded-full" />
              </div>
              
              {/* Fake transaction alert card */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-white font-bold text-[10px]">✓</div>
                  <span className="font-medium text-neutral-300">Roommate Wifi Reimburse</span>
                </div>
                <span className="font-bold text-white">+₹250</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-black text-white pt-20 pb-12 border-t border-neutral-900">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-neutral-900">
          
          {/* Logo & Description */}
          <div className="md:col-span-4 space-y-6">
            <div className="flex items-center gap-3">
              <AmazeTrackLogo className="w-8 h-8" />
              <span className="text-xl font-bold tracking-tight">AmazeTrack</span>
            </div>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-sm">
              Smart expense tracking built for campus life. 100% private Google Drive sync.
            </p>
          </div>

          {/* Quick Links Column */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-300">Quick Links</h4>
            <div className="flex flex-col gap-2.5">
              <a href="#" className="text-sm text-neutral-400 hover:text-white transition-colors">Home</a>
              <a href="#features" onClick={(e) => handleAnchorClick(e, "features")} className="text-sm text-neutral-400 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" onClick={(e) => handleAnchorClick(e, "how-it-works")} className="text-sm text-neutral-400 hover:text-white transition-colors">How it Works</a>
              <a href="#download" onClick={(e) => handleAnchorClick(e, "download")} className="text-sm text-neutral-400 hover:text-white transition-colors">Download</a>
            </div>
          </div>

          {/* Features Column */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-300">Features</h4>
            <div className="flex flex-col gap-2.5">
              <a href="#how-it-works" onClick={(e) => handleAnchorClick(e, "how-it-works")} className="text-sm text-neutral-400 hover:text-white transition-colors">Google Drive Sync</a>
              <a href="#how-it-works" onClick={(e) => handleAnchorClick(e, "how-it-works")} className="text-sm text-neutral-400 hover:text-white transition-colors">Shared Splits</a>
              <a href="#how-it-works" onClick={(e) => handleAnchorClick(e, "how-it-works")} className="text-sm text-neutral-400 hover:text-white transition-colors">Category Budgets</a>
              <a href="#how-it-works" onClick={(e) => handleAnchorClick(e, "how-it-works")} className="text-sm text-neutral-400 hover:text-white transition-colors">Expense Amortization</a>
            </div>
          </div>

          {/* Contact Column */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-300">Contact</h4>
            <div className="flex flex-col gap-2.5">
              <a href="mailto:support@amazetrack.com" className="text-sm text-blue-400 hover:underline">support@amazetrack.com</a>
            </div>
          </div>

        </div>

        {/* Bottom Legal bar */}
        <div className="max-w-7xl mx-auto px-6 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-neutral-500">
          <div>© {new Date().getFullYear()} AmazeTrack. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#privacy" className="hover:underline">Privacy Policy</a>
            <a href="#terms" className="hover:underline">Terms of Service</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
