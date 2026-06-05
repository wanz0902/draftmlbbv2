import React, { useState, useRef, useEffect } from "react";
import {
  Award,
  ShieldAlert,
  BarChart3,
  CloudLightning,
  Home,
  ShoppingBag,
  Eye,
  Trophy,
  Flame,
  LogOut,
  User as UserIcon
} from "lucide-react";
import { User, signInWithPopup, signOut, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../lib/firebase";

interface NavbarProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
  scrapingStatus?: string;
  user?: User | null;
}

export default function Navbar({
  currentTab,
  onChangeTab,
  scrapingStatus,
  user
}: NavbarProps) {
  const [authLoading, setAuthLoading] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeBtn = mobileNavRef.current?.querySelector('[data-active="true"]');
    activeBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [currentTab]);

  const handleLogin = async () => {
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  const links = [
    { id: "home", label: "Home", icon: Home },
    { id: "draft", label: "Draft Simulator", icon: CloudLightning },
    { id: "intelligence", label: "Hero Intelligence", icon: Eye },
    { id: "tier", label: "Tier List", icon: Trophy },
    { id: "counter", label: "Counter Matrix", icon: Flame },
    { id: "heroes", label: "Hero Stats", icon: BarChart3 },
    { id: "teams", label: "Team Analytics", icon: Award },
    { id: "items", label: "Items Catalog", icon: ShoppingBag },
    { id: "scraper", label: "Liquipedia Updates", icon: ShieldAlert },
  ];

  return (
    <header
      id="app-navbar"
      className="sticky top-0 z-50 w-full border-b border-blue-900/35 bg-[#0a111f]/90 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <button
          onClick={() => onChangeTab("home")}
          className="flex items-center gap-3 cursor-pointer bg-transparent border-none p-0"
          aria-label="Go to Home"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 font-mono text-xl font-bold text-white shadow-lg shadow-blue-550/25">
            ML
          </div>
          <div className="text-left">
            <h1 className="font-sans text-md font-bold tracking-tight text-white sm:text-lg">
              MLBB Draft Simulator
            </h1>
            <p className="font-mono text-[10px] text-blue-400 font-bold uppercase tracking-widest">
              MPL ID SEASONS COACH
            </p>
          </div>
        </button>

        {/* Links */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active = currentTab === link.id;
            return (
              <button
                key={link.id}
                id={`nav-${link.id}`}
                onClick={() => onChangeTab(link.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                  active
                    ? "bg-blue-600/15 text-blue-400 font-semibold shadow-sm border border-blue-550/20"
                    : "text-gray-400 hover:bg-[#0a111f]/60 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Right Corner (Status & Auth) */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-xs text-gray-400">
              {scrapingStatus || "Scraped: MLBB API active"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-3 bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-800/30">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=0D8ABC&color=fff`} 
                  alt="Profile" 
                  className="w-6 h-6 rounded-full border border-blue-500/50"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={handleLogout}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                disabled={authLoading}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                <UserIcon className="h-3.5 w-3.5" />
                {authLoading ? "..." : "Sign In"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nav Links */}
      <div ref={mobileNavRef} className="md:hidden flex overflow-x-auto border-t border-gray-900 bg-gray-950 px-2 py-1 scrollbar-none gap-1">
        {links.map((link) => {
          const Icon = link.icon;
          const active = currentTab === link.id;
          return (
            <button
              key={link.id}
              data-active={active ? "true" : "false"}
              onClick={() => onChangeTab(link.id)}
              className={`flex items-center gap-1.5 shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                active
                  ? "bg-blue-600/30 text-blue-300 border-b-2 border-blue-500 font-semibold"
                  : "text-gray-400 hover:bg-gray-900 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {link.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
