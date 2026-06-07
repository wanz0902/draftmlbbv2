import React from "react";
import { useVisitorStats } from "../hooks/useVisitorStats";

function formatNumber(n: number): string {
  if (n <= 0) return "0";
  return n.toLocaleString("en-US");
}

export default function VisitorStatsBadge() {
  const { online, totalUsers } = useVisitorStats();

  return (
    <div className="flex items-center gap-2">
      {/* Online badge */}
      <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-300">
          {formatNumber(online)} <span className="hidden sm:inline">Online</span>
        </span>
      </div>

      {/* Total users badge */}
      <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">
          {formatNumber(totalUsers)} <span className="hidden sm:inline">Users</span>
        </span>
      </div>
    </div>
  );
}
