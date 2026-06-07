import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Search,
  ShoppingBag,
  Coins,
  Flame,
  Star,
} from "lucide-react";
import { Item } from "../types";
import FallbackImage from "./FallbackImage";

interface ItemsCatalogProps {
  items: Item[];
}

export default function ItemsCatalog({ items }: ItemsCatalogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const categories = [
    "ALL",
    "Attack",
    "Defense",
    "Magic",
    "Movement",
    "Jungling",
    "Roaming",
  ];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = String(item.name || "")
        .toLowerCase()
        .includes(String(searchTerm || "").toLowerCase());
      const matchesCat =
        selectedCategory === "ALL" || item.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [items, searchTerm, selectedCategory]);

  // Default selected item when list changes
  React.useEffect(() => {
    if (filteredItems.length > 0 && !selectedItem) {
      setSelectedItem(filteredItems[0]);
    }
  }, [filteredItems, selectedItem]);

  const getCategoryColor = (cat: string) => {
    const c = String(cat || "").toLowerCase();
    if (c.includes("attack"))
      return "border-orange-500 bg-orange-500/10 text-orange-400";
    if (c.includes("magic"))
      return "border-purple-500 bg-purple-500/10 text-purple-400";
    if (c.includes("defense"))
      return "border-yellow-500 bg-yellow-500/10 text-yellow-400";
    if (c.includes("movement"))
      return "border-teal-500 bg-teal-500/10 text-teal-400";
    return "border-emerald-500 bg-emerald-500/10 text-emerald-400";
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex items-center justify-between gap-3 lg:col-span-3 sm:hidden">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="btn-ghost justify-start text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
        <div className="ui-badge border-white/10 bg-white/[0.04] text-slate-300">
          Items Catalog
        </div>
      </div>
      {/* Items List Grid */}
      <div className="lg:col-span-2 flex flex-col gap-4 rounded-xl border border-gray-900 bg-gray-950 p-4 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-900 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-indigo-400" />
              Katalog Item Mobile Legends
            </h2>
            <p className="text-xs text-gray-400">
              Analisis gear pertarungan untuk draf simulator dan analisis draf
              AI.
            </p>
          </div>
          <div className="font-mono text-[10px] rounded px-2.5 py-1 bg-indigo-900/20 text-indigo-400 font-semibold border border-indigo-500/10">
            TOTAL ITEM: {filteredItems.length}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Cari nama item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 py-1.5 pl-9 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition"
            />
          </div>

          {/* Catalog selector */}
          <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0 transition ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid List */}
        <div className="max-h-[480px] overflow-y-auto pr-1 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 scrollbar-thin">
          {filteredItems.map((item, index) => {
            const isSelected = selectedItem?.name === item.name;
            return (
              <button
                key={`${item.name}-${item.category}-${index}`}
                onClick={() => setSelectedItem(item)}
                className={`group flex flex-col gap-3 rounded-xl border p-3 text-left transition ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-950/20 shadow-md"
                    : "border-gray-800 bg-gray-900/40 hover:border-gray-700 hover:bg-gray-900/80"
                }`}
              >
                <div className="flex justify-between items-start">
                  <FallbackImage
                    src={item.image}
                    fallbackText={item.name}
                    alt={item.name}
                    className="h-11 w-11 rounded-lg bg-gray-950 p-1 border border-gray-800 object-contain group-hover:scale-105 transition duration-155"
                    containerClassName="h-11 w-11 rounded-lg text-[8px] bg-gray-950 border border-gray-800"
                  />
                  <span className="font-mono text-[9px] font-bold flex items-center gap-0.5">
                    {item.gold != null ? (
                      <span className="text-yellow-500 flex items-center gap-0.5">
                        <Coins className="h-3 w-3 inline text-yellow-500" />
                        {item.gold}
                      </span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </span>
                </div>

                <div>
                  <h4 className="font-sans text-xs font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                    {item.name}
                  </h4>
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-[8px] font-bold uppercase mt-1.5 border ${getCategoryColor(item.category)}`}
                  >
                    {item.category}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Item Details Panel */}
      <div className="flex flex-col gap-5 rounded-xl border border-gray-900 bg-gray-950 p-5 shadow-xl">
        {selectedItem ? (
          <>
            {/* Not enriched warning badge */}
            {!selectedItem.isEnriched && (
              <div className="rounded-lg bg-amber-950/30 border border-amber-500/20 px-3 py-1.5 text-[11px] text-amber-400 font-medium">
                ⚠ Data belum lengkap
              </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-4 border-b border-gray-900 pb-4">
              <FallbackImage
                src={selectedItem.image}
                fallbackText={selectedItem.name}
                alt={selectedItem.name}
                className="h-16 w-16 rounded-xl bg-gray-900 border border-gray-800 p-2 object-contain"
                containerClassName="h-16 w-16 rounded-xl text-[10px] bg-gray-900 border border-gray-800"
              />
              <div>
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase border mb-1.5 ${getCategoryColor(selectedItem.category)}`}
                >
                  {selectedItem.category}
                </span>
                <h3 className="font-sans text-lg font-bold tracking-tight text-white line-clamp-1">
                  {selectedItem.name}
                </h3>
                <div className="font-mono text-[10px] font-bold flex items-center gap-1.5 mt-0.5">
                  {selectedItem.gold != null ? (
                    <span className="text-yellow-500 flex items-center gap-1.5">
                      <Coins className="h-3.5 w-3.5" />
                      Cost: {selectedItem.gold} Gold
                    </span>
                  ) : (
                    <span className="text-gray-500 italic">Harga belum tersedia</span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Block */}
            <div>
              <h4 className="font-sans text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                Atribut Dasar (Stats)
              </h4>
              <div className="flex flex-col gap-2">
                {selectedItem.stats != null ? (
                  selectedItem.stats.map((stat, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded bg-gray-900/40 p-2 border border-gray-950 text-xs font-mono font-medium text-indigo-400"
                    >
                      <Flame className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                      {stat}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 italic">Stats belum tersedia</p>
                )}
              </div>
            </div>

            {/* Passive / Abilities details */}
            <div className="border-t border-gray-900 pt-3">
              <h4 className="font-sans text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-yellow-500" />
                Pasif Unik (Passive)
              </h4>
              {selectedItem.abilities && selectedItem.abilities.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {selectedItem.abilities.map((ability, i) => (
                    <div key={i} className="rounded-lg bg-gray-900/30 p-3 border border-gray-900">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${ability.type === 'passive' ? 'text-yellow-400 bg-yellow-950/40' : 'text-cyan-400 bg-cyan-950/40'}`}>
                          {ability.type.toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-white">{ability.name}</span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed font-sans">{ability.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg bg-gray-900/30 p-3 border border-gray-900">
                  {selectedItem.passive != null ? (
                    <div className="text-xs font-bold text-white mb-1">
                      {selectedItem.passive}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic mb-1">Passive belum tersedia</p>
                  )}
                  {selectedItem.description != null ? (
                    <p className="text-xs text-gray-400 leading-relaxed font-sans">
                      {selectedItem.description}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 italic leading-relaxed font-sans">
                      Detail item belum disinkronkan
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Build Recipe */}
            {selectedItem.buildFrom && selectedItem.buildFrom.length > 0 && (
              <div className="border-t border-gray-900 pt-3">
                <h4 className="font-sans text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                  Recipe
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedItem.buildFrom.map((comp, i) => (
                    <span key={i} className="rounded-md bg-gray-900/60 border border-gray-800 px-2 py-1 text-[11px] text-gray-300 font-medium">
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Strategy tip */}
            <div className="rounded-lg bg-indigo-950/20 border border-indigo-500/10 p-3 text-[11px] text-gray-400 mt-auto leading-relaxed">
              Tingkatkan status draf simulasi Anda dengan melengkapi hero draf
              pick dengan item {selectedItem.name} untuk mengimbangi strategi
              tim lawan.
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center py-20 text-gray-600">
            <ShoppingBag className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm font-sans">
              Pilih item untuk melihat detail keunggulan parameter gear.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
