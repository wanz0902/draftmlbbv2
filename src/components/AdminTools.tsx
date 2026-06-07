import { useState } from "react";
import { ShieldCheck, RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

export default function AdminTools() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const checkUpdates = async () => {
    if (!token.trim()) { setError("Token required."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/admin/liquipedia/check-updates", {
        method: "POST",
        headers: { "x-admin-tools-token": token.trim() },
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || `HTTP ${res.status}`); return; }
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to reach server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-6">
      <div className="rounded-xl border border-amber-900/30 bg-amber-950/10 p-5">
        <h2 className="text-lg font-bold text-amber-300 flex items-center gap-2 mb-1">
          <ShieldCheck className="h-5 w-5" /> Admin Tools
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Liquipedia update preview. Read-only — does not modify public data.
        </p>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Admin Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="x-admin-tools-token"
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-amber-600 focus:outline-none"
            />
          </div>
          <button
            onClick={checkUpdates}
            disabled={loading}
            className="shrink-0 flex items-center gap-2 rounded-lg bg-amber-600/20 border border-amber-500/30 px-4 py-2 text-sm font-bold text-amber-400 hover:bg-amber-600/30 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Checking..." : "Check Liquipedia Updates"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-300 flex items-start gap-2">
          <XCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          {/* Summary */}
          <div className="rounded-xl border border-gray-800 bg-gray-950 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Preview Result</h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${result.validation?.safeToApply ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/40" : "bg-red-950/30 text-red-400 border-red-900/40"}`}>
                {result.validation?.safeToApply ? "SAFE TO APPLY" : "NOT SAFE"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-gray-900/60 border border-gray-800/60 p-3">
                <span className="text-gray-500 block text-[10px] uppercase">Local</span>
                <span className="text-white font-bold text-lg">{result.local?.count}</span>
                <span className="text-gray-400 ml-1">heroes</span>
              </div>
              <div className="rounded-lg bg-gray-900/60 border border-gray-800/60 p-3">
                <span className="text-gray-500 block text-[10px] uppercase">Scraped</span>
                <span className="text-white font-bold text-lg">{result.scraped?.count}</span>
                <span className="text-gray-400 ml-1">heroes</span>
              </div>
            </div>
          </div>

          {/* Diff */}
          <div className="rounded-xl border border-gray-800 bg-gray-950 p-5">
            <h3 className="text-sm font-bold text-white mb-3">Diff</h3>
            <div className="flex flex-wrap gap-4 text-xs">
              <div><span className="text-emerald-400 font-bold">+{result.diff?.added?.length || 0}</span> <span className="text-gray-400">added</span></div>
              <div><span className="text-red-400 font-bold">-{result.diff?.removed?.length || 0}</span> <span className="text-gray-400">removed</span></div>
              <div><span className="text-amber-400 font-bold">~{result.diff?.changed || 0}</span> <span className="text-gray-400">changed</span></div>
            </div>
            {result.diff?.added?.length > 0 && <div className="mt-2 text-[11px] text-emerald-400">Added: {result.diff.added.join(", ")}</div>}
            {result.diff?.removed?.length > 0 && <div className="mt-1 text-[11px] text-red-400">Removed: {result.diff.removed.join(", ")}</div>}
            {result.diff?.changedHeroes?.length > 0 && <div className="mt-1 text-[11px] text-amber-400">Changed: {result.diff.changedHeroes.join(", ")}</div>}
          </div>

          {/* Identity Checks */}
          <div className="rounded-xl border border-gray-800 bg-gray-950 p-5">
            <h3 className="text-sm font-bold text-white mb-3">Identity Checks</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(result.identityChecks || {}).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2">
                  {val ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
                  <span className="text-gray-300">{key}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings/Errors */}
          {(result.validation?.warnings?.length > 0 || result.validation?.errors?.length > 0) && (
            <div className="rounded-xl border border-gray-800 bg-gray-950 p-5">
              <h3 className="text-sm font-bold text-white mb-3">Validation</h3>
              {result.validation.errors?.map((e: string, i: number) => (
                <div key={`e${i}`} className="text-xs text-red-400 mb-1">❌ {e}</div>
              ))}
              {result.validation.warnings?.slice(0, 10).map((w: string, i: number) => (
                <div key={`w${i}`} className="text-xs text-amber-400 mb-1">⚠️ {w}</div>
              ))}
            </div>
          )}

          {/* Apply placeholder */}
          <div className="rounded-xl border border-gray-800/50 bg-gray-950/50 p-4 text-center">
            <button disabled className="opacity-40 cursor-not-allowed text-xs text-gray-500 font-bold uppercase tracking-wider">
              Apply Updates — Coming Next
            </button>
          </div>

          <p className="text-[10px] text-gray-600 text-center italic">{result.note}</p>
        </div>
      )}
    </div>
  );
}
