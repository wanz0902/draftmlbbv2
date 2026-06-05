import React from "react";
import { CloudLightning, ArrowRight, TrendingUp, Search, Database } from "lucide-react";

interface LandingPageProps {
  onChangeTab: (tab: string) => void;
  heroesCount: number;
}

export default function LandingPage({ onChangeTab, heroesCount }: LandingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] text-center page-enter space-y-12 relative overflow-hidden px-4">
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse delay-1000" />
      </div>
      
      {/* Hero Section */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-600/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-950/40 border border-red-500/40 text-red-400 text-xs font-mono font-bold uppercase tracking-widest mb-6 shadow-[0_0_20px_rgba(220,38,38,0.2)] animate-fade-in-up">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          Next-Gen MLBB Intelligence
        </div>

        <h1 className="text-5xl md:text-7xl font-display font-black text-white tracking-tighter leading-[1.1] mb-6 drop-shadow-2xl animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          DOMINASI <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-indigo-500 animate-gradient-x">DRAFT</span> <br className="hidden md:block" />
          DENGAN DATA.
        </h1>
        
        <p className="max-w-2xl text-gray-400 text-sm md:text-base leading-relaxed mb-10 border-l-2 border-red-500/50 pl-4 text-left mx-auto animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          Nexus Analytics engine memberikan Anda insting pelatih kelas dunia. Kami mengumpulkan dan memproses metaplay, performa pro-scene, dan statistik <strong>{heroesCount > 0 ? heroesCount : '120+'}</strong> hero secara real-time untuk memberikan keunggulan taktis absolut di setiap fase draft pick.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <button 
            onClick={() => onChangeTab("draft")}
            className="group relative px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-bold uppercase tracking-wider text-sm transition-all duration-300 shadow-[0_0_40px_-10px_rgba(220,38,38,0.7)] hover:shadow-[0_0_50px_-5px_rgba(220,38,38,0.8)] overflow-hidden hover:scale-105"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <span className="flex items-center gap-2 relative z-10 transition-transform group-hover:gap-3">
              <CloudLightning className="w-5 h-5 fill-current" />
              Mulai Draft Simulator <ArrowRight className="w-4 h-4 opacity-70 group-hover:opacity-100" />
            </span>
          </button>
          
          <button 
            onClick={() => onChangeTab("tier")}
            className="group px-8 py-4 bg-gray-950/80 border border-gray-800 hover:border-red-500/60 hover:bg-gray-900 text-gray-300 rounded-xl font-bold uppercase tracking-wider text-sm transition-all duration-300 flex items-center gap-2 backdrop-blur-sm hover:text-white"
          >
            <TrendingUp className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
            Cek Meta Tier List
          </button>
        </div>
      </div>

      {/* Feature Grids */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-12 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        <div 
          onClick={() => onChangeTab("intelligence")}
          className="flex flex-col items-center text-center p-8 bg-[#0a111f]/80 backdrop-blur-xl rounded-2xl border border-gray-800 hover:border-red-500/40 hover:bg-[#0d1627] transition-all cursor-pointer group hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(220,38,38,0.15)]"
        >
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-red-950/80 to-rose-900/40 border border-red-500/20 flex items-center justify-center text-red-400 mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-inner">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-white font-bold font-display tracking-tight mb-3 text-lg group-hover:text-red-400 transition-colors">Hero Intelligence</h3>
          <p className="text-xs text-gray-400 font-mono leading-relaxed">
            Menganalisis kekuatan hero, item counter, dan taktik bermain hingga ke akar-akarnya.
          </p>
        </div>

        <div 
          onClick={() => onChangeTab("counter")}
          className="flex flex-col items-center text-center p-8 bg-[#0a111f]/80 backdrop-blur-xl rounded-2xl border border-gray-800 hover:border-rose-500/40 hover:bg-[#0d1627] transition-all cursor-pointer group hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(244,63,94,0.15)]"
        >
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-rose-950/80 to-red-900/40 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 shadow-inner">
            <CloudLightning className="h-6 w-6" />
          </div>
          <h3 className="text-white font-bold font-display tracking-tight mb-3 text-lg group-hover:text-rose-400 transition-colors">Counter Matrix</h3>
          <p className="text-xs text-gray-400 font-mono leading-relaxed">
            Data spesifik siapa counter siapa, beserta rasio kemenangan untuk mematikan musuh secara taktis.
          </p>
        </div>

        <div 
          onClick={() => onChangeTab("heroes")}
          className="flex flex-col items-center text-center p-8 bg-[#0a111f]/80 backdrop-blur-xl rounded-2xl border border-indigo-800/40 hover:border-indigo-500/40 hover:bg-[#0d1627] transition-all cursor-pointer group hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(99,102,241,0.15)]"
        >
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-indigo-950/80 to-blue-900/40 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-inner">
            <Database className="h-6 w-6" />
          </div>
          <h3 className="text-white font-bold font-display tracking-tight mb-3 text-lg group-hover:text-indigo-400 transition-colors">Statistik Lengkap</h3>
          <p className="text-xs text-gray-400 font-mono leading-relaxed">
            Pick Rate, Ban Rate, Win Rate yang dipanen dan dikompilasi harian dari data in-game dunia.
          </p>
        </div>
      </div>
    </div>
  );
}
