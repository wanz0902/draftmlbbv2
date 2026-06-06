import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CloudLightning,
  Database,
  Home,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  Trophy,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import { User, signInWithPopup, signOut, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../lib/firebase";

interface NavbarProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
  scrapingStatus?: string;
  user?: User | null;
}

const directLinks = [
  { id: "home", label: "Home", icon: Home },
  { id: "draft", label: "Draft", icon: CloudLightning },
  { id: "teams", label: "Teams", icon: Users },
  { id: "tier", label: "Meta", icon: Trophy },
];

const groupedLinks = [
  {
    id: "heroes-group",
    label: "Heroes",
    icon: Sparkles,
    items: [
      { id: "intelligence", label: "Hero Intelligence" },
      { id: "heroes", label: "Hero Stats" },
      { id: "counter", label: "Counter Matrix" },
      { id: "tier", label: "Tier List" },
    ],
  },
  {
    id: "data-group",
    label: "Data",
    icon: Database,
    items: [
      { id: "items", label: "Items Catalog" },
    ],
  },
];

const mobileSections = [
  { title: "Primary", items: directLinks },
  {
    title: "Heroes",
    items: [
      { id: "intelligence", label: "Hero Intelligence", icon: Sparkles },
      { id: "heroes", label: "Hero Stats", icon: BarChart3 },
      { id: "counter", label: "Counter Matrix", icon: ShieldCheck },
      { id: "tier", label: "Tier List", icon: Trophy },
    ],
  },
  {
    title: "Data",
    items: [
      { id: "items", label: "Items Catalog", icon: Database },
    ],
  },
];

export default function Navbar({
  currentTab,
  onChangeTab,
  scrapingStatus,
  user,
}: NavbarProps) {
  const [authLoading, setAuthLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOpenDropdown(null);
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

  const groupedActiveState = useMemo(() => {
    const state = new Set<string>();
    for (const group of groupedLinks) {
      if (group.items.some((item) => item.id === currentTab)) {
        state.add(group.id);
      }
    }
    return state;
  }, [currentTab]);

  const renderAuthButton = () => {
    if (user) {
      return (
        <div className="flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/10 px-2 py-1.5">
          <img
            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=0D8ABC&color=fff`}
            alt="Profile"
            className="h-7 w-7 rounded-full border border-cyan-300/30"
            referrerPolicy="no-referrer"
          />
          <button
            onClick={handleLogout}
            className="rounded-full p-1 text-slate-300 transition hover:bg-white/8 hover:text-white"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={handleLogin}
        disabled={authLoading}
        className="btn-primary rounded-full px-4 py-2 text-sm tracking-[0.08em] disabled:opacity-60"
      >
        <UserIcon className="h-4 w-4" />
        {authLoading ? "Loading..." : "Sign In"}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#050b14]/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 overflow-x-clip px-3 py-3 sm:gap-3 sm:px-6 lg:px-8">
        <button
          onClick={() => onChangeTab("home")}
          className="flex min-w-0 max-w-[240px] shrink items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-2.5 py-2 text-left transition hover:border-cyan-400/20 hover:bg-white/[0.05] sm:max-w-[280px] sm:gap-3 sm:px-3"
          aria-label="Go to Home"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 font-mono text-sm font-black text-slate-950 shadow-[0_16px_40px_-18px_rgba(56,189,248,0.9)] sm:h-11 sm:w-11 sm:text-base">
            ML
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-bold tracking-tight text-white sm:text-lg">
              Draft Analyst MLBB
            </div>
            <div className="truncate font-mono text-[8px] uppercase tracking-[0.18em] text-cyan-300 sm:text-[10px] sm:tracking-[0.24em]">
              MPL ID Control Desk
            </div>
          </div>
        </button>

        <div
          ref={dropdownRef}
          className="hidden min-w-0 flex-1 items-center justify-center gap-1.5 xl:flex"
        >
          {directLinks.slice(0, 2).map((link) => {
            const Icon = link.icon;
            const active = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onChangeTab(link.id)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-cyan-400/12 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.22)]"
                    : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </button>
            );
          })}

          {groupedLinks.map((group) => {
            const Icon = group.icon;
            const active = groupedActiveState.has(group.id);
            const open = openDropdown === group.id;

            return (
              <div key={group.id} className="relative">
                <button
                  onClick={() => setOpenDropdown(open ? null : group.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${
                    active || open
                      ? "bg-cyan-400/12 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.22)]"
                      : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {group.label}
                </button>

                {open && (
                  <div className="absolute left-1/2 top-full z-50 mt-3 w-60 -translate-x-1/2 overflow-hidden rounded-3xl border border-white/10 bg-[#081120]/95 p-2 shadow-[0_28px_80px_-28px_rgba(2,12,27,0.95)] backdrop-blur-xl">
                    {group.items.map((item) => {
                      const activeItem = currentTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onChangeTab(item.id);
                            setOpenDropdown(null);
                          }}
                          className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
                            activeItem
                              ? "bg-cyan-400/10 text-cyan-300"
                              : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                          }`}
                        >
                          <span>{item.label}</span>
                          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                            Open
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {directLinks.slice(2).map((link) => {
            const Icon = link.icon;
            const active = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onChangeTab(link.id)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-cyan-400/12 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.22)]"
                    : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </button>
            );
          })}
        </div>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/8 px-3 py-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-300">
              {scrapingStatus || "Live data"}
            </span>
          </div>
          {renderAuthButton()}
        </div>

        <div className="ml-auto flex items-center gap-2 xl:hidden">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/8 px-3 py-2 sm:inline-flex">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">
              Live
            </span>
          </div>
          <button
            onClick={() => setMobileOpen((value) => !value)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-200 transition hover:border-cyan-400/25 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/8 bg-[#060d17]/96 px-4 py-4 backdrop-blur-xl xl:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <button
              onClick={() => {
                onChangeTab("home");
                setMobileOpen(false);
              }}
              className="btn-ghost w-full justify-start text-xs"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </button>
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 lg:hidden">
              <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-300">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
                {scrapingStatus || "Live data"}
              </div>
              {renderAuthButton()}
            </div>

            {mobileSections.map((section) => (
              <div
                key={section.title}
                className="rounded-[24px] border border-white/8 bg-white/[0.03] p-3"
              >
                <div className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
                  {section.title}
                </div>
                <div className="grid gap-2">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onChangeTab(item.id)}
                        className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                          active
                            ? "bg-cyan-400/10 text-cyan-300 shadow-[0_0_0_1px_rgba(34,211,238,0.2)]"
                            : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                        }`}
                      >
                        <span className="inline-flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                          Open
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}