import React, { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./lib/firebase";
import Navbar from "./components/Navbar";
import DraftSimulator from "./components/DraftSimulator";
import HeroIntelligenceDashboard from "./components/HeroIntelligenceDashboard";
import StatsDashboard from "./components/StatsDashboard";
import TeamAnalytics from "./components/TeamAnalytics";
import DataCatalog from "./components/DataCatalog";
import AdminTools from "./components/AdminTools";
import TierListPanel from "./components/TierListPanel";
// Counter Matrix hidden temporarily — data coverage too low (3/132 heroes).
// Component preserved at src/components/CounterMatrixPanel.tsx for future rebuild.
// import CounterMatrixPanel from "./components/CounterMatrixPanel";
import LandingPage from "./components/LandingPage";
import { HeroStats, Item, TeamStats } from "./types";
import { ArrowLeft, CloudLightning, ShieldCheck } from "lucide-react";

export default function App() {
  const [currentTab, setCurrentTab] = useState("home");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [draftInProgress, setDraftInProgress] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  // Global Loaded States
  const [heroes, setHeroes] = useState<HeroStats[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [teamsData, setTeamsData] = useState<TeamStats[]>([]);
  const [heroAssets, setHeroAssets] = useState<Record<string, string>>({});
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [intelligenceTarget, setIntelligenceTarget] = useState<string | null>(null);

  const tabLabels: Record<string, string> = {
    home: "Home",
    draft: "Draft Simulator",
    intelligence: "Hero Intelligence",
    tier: "Tier List",
    heroes: "Hero Stats",
    teams: "Team Analytics",
    items: "Data Catalog",
    admin: "Admin Tools",
  };

  // Fetch initial analytical data
  const loadAllData = async () => {
    try {
      const [heroesRes, assetsRes, teamsRes, itemsRes, historyRes] = await Promise.all([
        fetch("/api/hero-stats"),
        fetch("/api/assets"),
        fetch("/api/team-stats"),
        fetch("/api/items"),
        fetch("/api/history"),
      ]);

      const [heroesData, assetsData, teamsDataRaw, itemsData, historyDataRaw] =
        await Promise.all([
          heroesRes.json(),
          assetsRes.json(),
          teamsRes.json(),
          itemsRes.json(),
          historyRes.json(),
        ]);

      setHeroes(Array.isArray(heroesData) ? heroesData : []);
      setHeroAssets(assetsData?.heroes || {});
      setTeamsData(Array.isArray(teamsDataRaw) ? teamsDataRaw : []);
      setItems(Array.isArray(itemsData) ? itemsData : []);
      setHistoryData(Array.isArray(historyDataRaw) ? historyDataRaw : []);
    } catch (error) {
      console.error("Failed to fetch initial application data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Setup Firebase Auth Listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Hidden admin access via URL hash #admin-tools
    if (window.location.hash === '#admin-tools') {
      setCurrentTab('admin');
    }
    const hashHandler = () => {
      if (window.location.hash === '#admin-tools') setCurrentTab('admin');
    };
    window.addEventListener('hashchange', hashHandler);

    return () => { unsubscribe(); window.removeEventListener('hashchange', hashHandler); };
  }, []);

  const handleTabChange = (newTab: string) => {
    if (currentTab === "draft" && draftInProgress && newTab !== "draft") {
      setShowExitModal(true);
      setPendingTab(newTab);
      return;
    }
    // Clear intelligence target when navigating to non-intelligence tabs
    if (newTab !== "intelligence") {
      setIntelligenceTarget(null);
    }
    setCurrentTab(newTab);
  };

  const handleOpenHeroIntelligence = (heroName: string) => {
    setIntelligenceTarget(heroName);
    setCurrentTab("intelligence");
  };

  return (
    <div className="min-h-screen bg-[#02050a] font-sans text-gray-100 flex flex-col">
      {/* Navbar header */}
      <Navbar
        currentTab={currentTab}
        onChangeTab={handleTabChange}
        user={user}
      />

      {/* Main Container */}
      <main className={`flex-1 w-full ${currentTab === "home" ? "" : "mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8"}`}>
        {loading ? (
          /* High-end loading template */
          <div className="flex h-[60vh] flex-col items-center justify-center text-center gap-4 animate-pulse">
            <div className="relative flex h-16 w-16">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-20"></span>
              <div className="relative rounded-full h-16 w-16 bg-[#0a111f] border border-blue-500/35 flex items-center justify-center shadow-lg shadow-blue-500/15">
                <CloudLightning className="h-7 w-7 text-blue-400 animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="font-sans text-md font-bold text-white tracking-tight">
                Menghubungkan Database MPL ID
              </h3>
              <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mt-1">
                Mengunduh aset visual & statistik...
              </p>
            </div>
          </div>
        ) : (
          /* Dynamic Component Rendering based on tab */
          <div className="animate-fade-in">
            {currentTab !== "home" && currentTab !== "draft" && (
              <div className="mb-5 flex items-center justify-between gap-3">
                <button
                  onClick={() => handleTabChange("home")}
                  className="btn-ghost justify-start text-xs"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </button>
                <div className="ui-badge border-white/10 bg-white/[0.04] text-slate-300">
                  {tabLabels[currentTab] || "Page"}
                </div>
              </div>
            )}
            {currentTab === "home" && (
              <LandingPage onChangeTab={handleTabChange} heroesCount={heroes.length} />
            )}

            {currentTab === "draft" && (
              <DraftSimulator
                heroes={heroes}
                heroAssets={heroAssets}
                teamsData={teamsData}
                user={user}
                setDraftInProgress={setDraftInProgress}
              />
            )}

            {currentTab === "intelligence" && (
              <HeroIntelligenceDashboard heroAssets={heroAssets} initialHeroName={intelligenceTarget} />
            )}

            {currentTab === "tier" && (
              <TierListPanel heroes={heroes} heroAssets={heroAssets} />
            )}

            {currentTab === "heroes" && (
              <StatsDashboard heroes={heroes} heroAssets={heroAssets} onOpenHeroIntelligence={handleOpenHeroIntelligence} />
            )}

            {currentTab === "teams" && (
              <TeamAnalytics
                teamsData={teamsData}
                heroAssets={heroAssets}
                heroes={heroes}
              />
            )}

            {currentTab === "items" && <DataCatalog items={items} heroAssets={heroAssets} heroes={heroes} />}

            {currentTab === "admin" && <AdminTools />}
          </div>
        )}
      </main>

      {/* Humble professional esports footer */}
      <footer className="mt-auto border-t border-gray-900 bg-gray-950/40 py-4 text-center">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between px-4 text-xs text-gray-500 gap-2">
          <p className="font-sans">
            © 2026 MPL ID S17 Draft Simulator. Disusun asisten digital
            professional.
          </p>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-gray-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>MLBB Draft Analytics Engine v1.0</span>
          </div>
        </div>
      </footer>

      {/* Custom confirm modal for draft exit */}
      {showExitModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">Keluar dari Draft?</h3>
            <p className="text-gray-400 text-sm mb-6">
              Progress draft akan hilang jika anda keluar dari halaman ini.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowExitModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setShowExitModal(false);
                  setDraftInProgress(false);
                  setCurrentTab(pendingTab!);
                  setPendingTab(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
              >
                Lanjut Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
