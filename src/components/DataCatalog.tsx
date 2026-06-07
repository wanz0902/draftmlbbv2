import React, { useState, useEffect } from "react";
import { ShoppingBag, Shield, Zap } from "lucide-react";
import ItemsCatalog from "./ItemsCatalog";
import { Item } from "../types";

interface DataCatalogProps {
  items: Item[];
}

export default function DataCatalog({ items }: DataCatalogProps) {
  const [tab, setTab] = useState<"items" | "emblems" | "spells">("items");
  const [emblems, setEmblems] = useState<any[]>([]);
  const [spells, setSpells] = useState<any[]>([]);

  useEffect(() => {
    if (tab === "emblems" && emblems.length === 0) {
      fetch("/api/emblems")
        .then((r) => r.json())
        .then((d) => setEmblems(Array.isArray(d) ? d : []))
        .catch(() => {});
    }
    if (tab === "spells" && spells.length === 0) {
      fetch("/api/battle-spells")
        .then((r) => r.json())
        .then((d) => setSpells(Array.isArray(d) ? d : []))
        .catch(() => {});
    }
  }, [tab]);

  return (
    <div className="flex flex-col gap-6">
      {/* Tab switcher */}
      <div className="flex items-center gap-2 bg-[#0a111f]/60 border border-blue-900/20 rounded-xl p-2">
        <button
          onClick={() => setTab("items")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === "items" ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/35" : "text-gray-400 hover:text-white border border-transparent"}`}
        >
          <ShoppingBag className="h-4 w-4" /> Items
        </button>
        <button
          onClick={() => setTab("emblems")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === "emblems" ? "bg-purple-600/20 text-purple-300 border border-purple-500/35" : "text-gray-400 hover:text-white border border-transparent"}`}
        >
          <Shield className="h-4 w-4" /> Emblems
        </button>
        <button
          onClick={() => setTab("spells")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === "spells" ? "bg-amber-600/20 text-amber-300 border border-amber-500/35" : "text-gray-400 hover:text-white border border-transparent"}`}
        >
          <Zap className="h-4 w-4" /> Battle Spells
        </button>
      </div>

      {/* Content */}
      {tab === "items" && <ItemsCatalog items={items} />}
      {tab === "emblems" && <EmblemsPanel emblems={emblems} />}
      {tab === "spells" && <SpellsPanel spells={spells} />}
    </div>
  );
}

// Emblems panel
function EmblemsPanel({ emblems }: { emblems: any[] }) {
  if (emblems.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        Loading emblems...
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {emblems.map((e) => (
        <div
          key={e.slug}
          className="rounded-xl border border-gray-800 bg-gray-950 p-5"
        >
          <h3 className="text-sm font-bold text-white mb-3">{e.name}</h3>
          <div className="space-y-2">
            {(e.talents || []).map((t: any, i: number) => (
              <div
                key={i}
                className="rounded-lg bg-gray-900/50 border border-gray-800/50 p-2.5"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-mono font-bold text-purple-400 bg-purple-950/40 px-1.5 py-0.5 rounded">
                    T{t.tier}
                  </span>
                  <span className="text-xs font-bold text-gray-200">
                    {t.name}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {t.description}
                </p>
              </div>
            ))}
          </div>
          {e.dataQuality && (
            <p className="text-[9px] text-gray-600 mt-3 font-mono">
              Source: {e.source} • {e.dataQuality}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// Battle Spells panel
function SpellsPanel({ spells }: { spells: any[] }) {
  if (spells.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        Loading battle spells...
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {spells.map((s) => (
        <div
          key={s.slug}
          className="rounded-xl border border-gray-800 bg-gray-950 p-5"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white">{s.name}</h3>
            {s.cooldown && (
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded">
                {s.cooldown}s CD
              </span>
            )}
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            {s.effect || "Effect belum tersedia"}
          </p>
          {s.dataQuality && (
            <p className="text-[9px] text-gray-600 mt-3 font-mono">
              Source: {s.source} • {s.dataQuality}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
