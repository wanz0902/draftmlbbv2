import { useState } from "react";
import { ShieldCheck, RefreshCw, CheckCircle, AlertTriangle, XCircle, ArrowLeft, Lock, Info, Upload } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error-auth" | "error-network" | "error-validation";

export default function AdminTools() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyResult, setApplyResult] = useState<any>(null);

  const checkUpdates = async () => {
    if (!token.trim()) {
      setStatus("error-auth");
      setErrorMsg("Token is required. Enter the ADMIN_TOOLS_ACCESS_TOKEN value from your .env file.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/liquipedia/check-updates", {
        method: "POST",
        headers: { "x-admin-tools-token": token.trim() },
      });
      const data = await res.json();
      if (res.status === 403) {
        setStatus("error-auth");
        setErrorMsg(data.error?.includes("disabled")
          ? "Admin tools are disabled on the server. Set ADMIN_TOOLS_ENABLED=true in .env and restart."
          : "Invalid token. Check that your token matches ADMIN_TOOLS_ACCESS_TOKEN in .env.");
        return;
      }
      if (res.status === 429) {
        setStatus("error-network");
        setErrorMsg("Liquipedia rate limit (429). Wait a few minutes and try again.");
        return;
      }
      if (!res.ok) {
        setStatus("error-network");
        setErrorMsg(data.error || `Server error (HTTP ${res.status}). Liquipedia may be unreachable.`);
        return;
      }
      setResult(data);
      setStatus(data.validation?.errors?.length > 0 ? "error-validation" : "success");
    } catch (err: any) {
      setStatus("error-network");
      setErrorMsg(err.message === "Failed to fetch"
        ? "Cannot reach server. Is the dev server running on localhost:3001?"
        : (err.message || "Network error."));
    }
  };

  const goHome = () => {
    window.location.hash = "";
    window.location.reload();
  };

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-amber-400" />
          Admin Tools
        </h1>
        <button onClick={goHome} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Public App
        </button>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-blue-900/30 bg-blue-950/10 p-4 flex gap-3">
        <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-200/80 leading-relaxed">
          <p className="font-semibold text-blue-300 mb-1">Liquipedia Update Preview (Read-Only)</p>
          <p>This tool fetches live data from Liquipedia and compares it against your local hero stats. <strong>No public data will be modified.</strong> Apply functionality is planned for a future update.</p>
        </div>
      </div>

      {/* Setup Instructions */}
      <details className="rounded-xl border border-gray-800 bg-gray-950 overflow-hidden group">
        <summary className="cursor-pointer px-5 py-3 text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" /> Setup Instructions
        </summary>
        <div className="px-5 pb-4 text-xs text-gray-500 leading-relaxed border-t border-gray-800/50 pt-3">
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Set <code className="text-amber-400 bg-gray-900 px-1 rounded">ADMIN_TOOLS_ENABLED=true</code> in your <code>.env</code> file</li>
            <li>Set <code className="text-amber-400 bg-gray-900 px-1 rounded">ADMIN_TOOLS_ACCESS_TOKEN=your_secret_token</code> in <code>.env</code></li>
            <li>Restart the dev server (<code>npm run dev</code>)</li>
            <li>Enter the same token value below and click Check</li>
          </ol>
        </div>
      </details>

      {/* Token + Action */}
      <div className="rounded-xl border border-amber-900/30 bg-amber-950/10 p-5">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">Admin Access Token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => { setToken(e.target.value); if (status.startsWith("error")) setStatus("idle"); }}
              placeholder="Paste ADMIN_TOOLS_ACCESS_TOKEN value"
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-amber-600 focus:outline-none transition-colors"
              onKeyDown={(e) => { if (e.key === "Enter") checkUpdates(); }}
            />
          </div>
          <button
            onClick={checkUpdates}
            disabled={status === "loading"}
            className="shrink-0 flex items-center gap-2 rounded-lg bg-amber-600/20 border border-amber-500/30 px-5 py-2.5 text-sm font-bold text-amber-400 hover:bg-amber-600/30 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`} />
            {status === "loading" ? "Checking..." : "Check Updates"}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {status === "error-auth" && (
        <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4 flex items-start gap-3">
          <Lock className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-300 mb-1">Access Denied</p>
            <p className="text-xs text-red-300/80">{errorMsg}</p>
          </div>
        </div>
      )}

      {status === "error-network" && (
        <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-300 mb-1">Network / Source Error</p>
            <p className="text-xs text-amber-300/80">{errorMsg}</p>
            <p className="text-[10px] text-gray-500 mt-2 italic">No public data was modified.</p>
          </div>
        </div>
      )}

      {status === "loading" && (
        <div className="rounded-lg border border-gray-800 bg-gray-950 p-4 flex items-center gap-3">
          <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
          <span className="text-sm text-gray-300">Fetching Liquipedia and comparing against local data...</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="flex flex-col gap-4">
          {/* Summary Card */}
          <div className="rounded-xl border border-gray-800 bg-gray-950 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Preview Result</h3>
              <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded border ${result.validation?.safeToApply ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/40" : "bg-red-950/30 text-red-400 border-red-900/40"}`}>
                {result.validation?.safeToApply ? "✓ SAFE TO APPLY" : "✗ NOT SAFE"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-gray-900/60 border border-gray-800/60 p-3.5 text-center">
                <span className="text-gray-500 block text-[10px] uppercase mb-1">Current Local</span>
                <span className="text-white font-bold text-2xl">{result.local?.count}</span>
                <span className="text-gray-400 text-[11px] block">heroes</span>
                {result.local?.duplicates?.length > 0 && <span className="text-red-400 text-[10px] block mt-1">⚠ {result.local.duplicates.length} duplicates</span>}
              </div>
              <div className="rounded-lg bg-gray-900/60 border border-gray-800/60 p-3.5 text-center">
                <span className="text-gray-500 block text-[10px] uppercase mb-1">Scraped Live</span>
                <span className="text-white font-bold text-2xl">{result.scraped?.count}</span>
                <span className="text-gray-400 text-[11px] block">heroes</span>
                {result.scraped?.duplicates?.length > 0 && <span className="text-red-400 text-[10px] block mt-1">⚠ {result.scraped.duplicates.length} duplicates</span>}
              </div>
            </div>
          </div>

          {/* Diff */}
          <div className="rounded-xl border border-gray-800 bg-gray-950 p-5">
            <h3 className="text-sm font-bold text-white mb-3">Changes Detected</h3>
            <div className="flex flex-wrap gap-5 text-xs mb-3">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-emerald-400 font-bold">{result.diff?.added?.length || 0}</span>
                <span className="text-gray-400">new heroes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="text-red-400 font-bold">{result.diff?.removed?.length || 0}</span>
                <span className="text-gray-400">removed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-amber-400 font-bold">{result.diff?.changed || 0}</span>
                <span className="text-gray-400">stats changed</span>
              </div>
            </div>
            {result.diff?.added?.length > 0 && <div className="text-[11px] text-emerald-400 bg-emerald-950/20 rounded p-2 mb-2 border border-emerald-900/20">Added: {result.diff.added.join(", ")}</div>}
            {result.diff?.removed?.length > 0 && <div className="text-[11px] text-red-400 bg-red-950/20 rounded p-2 mb-2 border border-red-900/20">Removed: {result.diff.removed.join(", ")}</div>}
            {result.diff?.changedHeroes?.length > 0 && <div className="text-[11px] text-amber-400 bg-amber-950/20 rounded p-2 border border-amber-900/20">Changed: {result.diff.changedHeroes.join(", ")}</div>}
            {!result.diff?.added?.length && !result.diff?.removed?.length && !result.diff?.changed && (
              <p className="text-xs text-gray-500 italic">No differences — local data matches Liquipedia.</p>
            )}
          </div>

          {/* Identity Checks */}
          <div className="rounded-xl border border-gray-800 bg-gray-950 p-5">
            <h3 className="text-sm font-bold text-white mb-3">Hero Identity Checks</h3>
            <p className="text-[10px] text-gray-500 mb-3">Verifies known collision-prone heroes are correctly mapped.</p>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {Object.entries(result.identityChecks || {}).map(([key, val]) => {
                const labels: Record<string, string> = {
                  mathilda: "Mathilda (not merged into Hilda)",
                  yiSunShin: "Yi Sun-shin (not merged into Sun)",
                  valentina: "Valentina (not merged into Vale)",
                  luoYiSeparate: "Luo Yi separate from Yi Sun-shin",
                };
                return (
                  <div key={key} className={`flex items-center gap-2 rounded-lg p-2 border ${val ? "bg-emerald-950/10 border-emerald-900/20" : "bg-red-950/10 border-red-900/20"}`}>
                    {val ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                    <span className={val ? "text-gray-300" : "text-red-300"}>{labels[key] || key}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Validation Warnings/Errors */}
          {(result.validation?.warnings?.length > 0 || result.validation?.errors?.length > 0) && (
            <div className="rounded-xl border border-gray-800 bg-gray-950 p-5">
              <h3 className="text-sm font-bold text-white mb-3">Validation Details</h3>
              {result.validation.errors?.map((e: string, i: number) => (
                <div key={`e${i}`} className="text-xs text-red-400 mb-1.5 flex items-start gap-1.5">
                  <XCircle className="h-3 w-3 mt-0.5 shrink-0" /> {e}
                </div>
              ))}
              {result.validation.warnings?.slice(0, 10).map((w: string, i: number) => (
                <div key={`w${i}`} className="text-xs text-amber-400 mb-1.5 flex items-start gap-1.5">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {w}
                </div>
              ))}
              {result.validation.warnings?.length > 10 && (
                <p className="text-[10px] text-gray-500 mt-1">...and {result.validation.warnings.length - 10} more warnings</p>
              )}
            </div>
          )}

          {/* Apply */}
          <div className={`rounded-xl border p-5 ${result.validation?.safeToApply ? "border-emerald-900/30 bg-emerald-950/10" : "border-dashed border-gray-700 bg-gray-950/30"}`}>
            {applyResult?.success ? (
              <div className="text-center">
                <CheckCircle className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-emerald-300 mb-1">Applied Successfully</p>
                <p className="text-xs text-gray-400">Count: {applyResult.count} heroes | Backup: {applyResult.backupPath}</p>
              </div>
            ) : applyResult && !applyResult.success ? (
              <div className="text-center">
                <XCircle className="h-6 w-6 text-red-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-red-300 mb-1">Apply Failed</p>
                <p className="text-xs text-red-300/80">{applyResult.error}</p>
                {applyResult.postWriteErrors && <p className="text-[10px] text-gray-500 mt-1">Rolled back to backup.</p>}
              </div>
            ) : (
              <div className="text-center">
                <button
                  onClick={async () => {
                    if (!result.validation?.safeToApply) return;
                    if (!confirm("Apply Liquipedia hero stats to local data? A backup will be created first.")) return;
                    setApplyLoading(true); setApplyResult(null);
                    try {
                      const res = await fetch("/api/admin/liquipedia/apply-updates", {
                        method: "POST",
                        headers: { "x-admin-tools-token": token.trim() },
                      });
                      const data = await res.json();
                      setApplyResult(data);
                    } catch (err: any) {
                      setApplyResult({ success: false, error: err.message || "Network error" });
                    } finally {
                      setApplyLoading(false);
                    }
                  }}
                  disabled={!result.validation?.safeToApply || applyLoading}
                  className={`flex items-center gap-2 mx-auto px-5 py-2.5 rounded-lg text-sm font-bold transition-colors ${result.validation?.safeToApply ? "bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 cursor-pointer" : "opacity-30 cursor-not-allowed text-gray-500 border border-gray-700"}`}
                >
                  <Upload className={`h-4 w-4 ${applyLoading ? "animate-bounce" : ""}`} />
                  {applyLoading ? "Applying..." : "Apply Approved Update"}
                </button>
                <p className="text-[10px] text-gray-500 mt-2">
                  {result.validation?.safeToApply
                    ? "Creates backup, re-fetches Liquipedia, validates, then writes to local Hero Stats."
                    : "Cannot apply — preview validation has errors."}
                </p>
              </div>
            )}
          </div>

          {/* Safety note */}
          <p className="text-[10px] text-gray-500 text-center border-t border-gray-800/50 pt-3">{applyResult?.success ? "Public Hero Stats source has been updated." : (result.note || "No public data was modified.")}</p>
        </div>
      )}

      {/* Idle state — no action taken yet */}
      {status === "idle" && !result && (
        <div className="text-center py-8 text-gray-600">
          <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-20" />
          <p className="text-xs">Enter your admin token and click Check Updates to preview Liquipedia data.</p>
        </div>
      )}

    </div>
  );
}
