# Design Document: MPL Team Selector & Draft Coach Bugfix

## Overview

Perbaikan tiga area bug utama di Draft Coach Simulator:
1. MPL Team Selector kosong — dropdown tidak menampilkan 9 tim karena silent fetch failure tanpa fallback
2. Post-draft analysis fallback terlalu pendek — saat Gemini gagal, frontend catch hanya menampilkan daftar hero tanpa analisis bermakna
3. Lane display MPL vs Ranked — MPL Mode harus menampilkan "Predicted Lane Assignment" bukan lane tracker wajib

Semua perubahan di 1 file frontend (`DraftSimulator.tsx`). Backend endpoints sudah benar.

## Glossary

- **DraftSimulator** — komponen React utama untuk simulasi draft (`src/components/DraftSimulator.tsx`)
- **MPL Mode** — mode draft berbasis tim MPL (pilih tim sebelum mulai draft)
- **Ranked Mode** — mode draft solo tanpa pemilihan tim
- **Lane Status** — display yang menunjukkan lane assignment tiap hero yang dipick
- **FALLBACK_MPL_TEAMS** — data statis 9 tim MPL untuk fallback jika API gagal

## Bug Details

### Bug 1: MPL Team Selector Dropdown Kosong
- **Lokasi:** `DraftSimulator.tsx` lines 527-542, useEffect fetch `/api/draft/teams`
- **Symptom:** Dropdown Blue Team dan Red Team hanya menampilkan "Pilih tim..." tanpa opsi
- **Impact:** MPL Mode tidak bisa digunakan sama sekali

### Bug 2: Post-Draft Analysis Fallback Terlalu Pendek
- **Lokasi:** `DraftSimulator.tsx` `evaluateDraftGame()` catch block (lines 476-485)
- **Symptom:** Saat fetch gagal, hanya tampil "Koneksi ke asisten Gemini gagal" + daftar hero
- **Impact:** User tidak mendapat analisis bermakna setelah draft selesai

### Bug 3: Lane Display Identical untuk MPL dan Ranked
- **Lokasi:** `DraftSimulator.tsx` Lane Status Display section (lines 879-980)
- **Symptom:** MPL Mode menampilkan lane tracker seolah urutan pick wajib
- **Impact:** Misleading — di MPL pro scene, first pick bisa role apapun

## Expected Behavior

1. Dropdown MPL selalu terisi (dari API atau fallback 9 tim statis)
2. Error message + retry button jika API gagal
3. Same-team validation (Blue ≠ Red)
4. Post-draft fallback analysis lengkap (lane prediction, strength/weakness, win condition, score)
5. MPL Mode lane display berlabel "Predicted" bukan tracker wajib

## Hypothesized Root Cause

### Bug 1 Root Cause
`useEffect` catch block hanya `console.error` tanpa fallback data. Dependency `[draftMode, mplTeams.length]` — setelah gagal, mplTeams tetap `[]` dan draftMode tidak berubah, jadi tidak ada re-trigger.

### Bug 2 Root Cause
Frontend catch block di `evaluateDraftGame` hanya membuat string pendek dengan hero list. Server-side `generateFallbackAnalysis()` sudah lengkap, tapi jika fetch gagal (network error), response server tidak sampai ke client.

### Bug 3 Root Cause
Lane status JSX section tidak memiliki conditional per mode — format identical untuk MPL dan Ranked.

## Correctness Properties

### Property 1: Dropdown Never Empty
Setelah useEffect untuk MPL teams selesai (loading=false), `mplTeams.length` harus selalu > 0 (dari API atau fallback).

### Property 2: Button Enable Logic
Button "Mulai Simulasi Draf" enabled iff `selectedBlueTeam !== "" && selectedRedTeam !== "" && selectedBlueTeam !== selectedRedTeam`.

### Property 3: Fallback Analysis Length
`evaluateDraftGame` catch block harus menghasilkan analysis string dengan minimal 7 sections (bukan hanya daftar hero).

### Property 4: Lane Label Differentiation
Lane display label text harus berbeda berdasarkan `draftMode` value ("PREDICTED" untuk MPL, "BLUE LANES"/"RED LANES" untuk Ranked).

## Fix Implementation

### 1. MPL Team Selector Fix (Bug 1)

**File:** `src/components/DraftSimulator.tsx`

**Root Cause:** The `useEffect` fetching `/api/draft/teams` catches errors with only `console.error` and no fallback data. If fetch fails, `mplTeams` stays `[]` permanently.

**Fix Strategy:**
- Add a static `FALLBACK_MPL_TEAMS` constant with 9 teams
- In the catch block, call `setMplTeams(FALLBACK_MPL_TEAMS)` to ensure dropdown is never empty
- Add `teamsError` state to show error message + retry button
- Add validation that blueTeam !== redTeam with warning text

**Implementation:**

```typescript
// Static fallback data — used if API fetch fails
const FALLBACK_MPL_TEAMS: Array<{ key: string; name: string; logo: string }> = [
  { key: "RRQ", name: "Rex Regum Qeon", logo: "" },
  { key: "EVOS", name: "EVOS Esports", logo: "" },
  { key: "ONIC", name: "ONIC Esports", logo: "" },
  { key: "TLID", name: "Team Liquid", logo: "" },
  { key: "GEEK", name: "Geek Fam", logo: "" },
  { key: "BTR", name: "Bigetron", logo: "" },
  { key: "AE", name: "Alter Ego", logo: "" },
  { key: "DEWA", name: "Dewa United Esports", logo: "" },
  { key: "NAVI", name: "Natus Vincere", logo: "" },
];
```

**Modified useEffect:**
```typescript
const [teamsError, setTeamsError] = useState<string>("");
const [retryCount, setRetryCount] = useState(0);

useEffect(() => {
  if (draftMode === "mpl" && mplTeams.length === 0) {
    setTeamsLoading(true);
    setTeamsError("");
    fetch("/api/draft/teams")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.teams && Array.isArray(data.teams) && data.teams.length > 0) {
          setMplTeams(data.teams);
        } else {
          throw new Error("Empty teams response");
        }
      })
      .catch((err) => {
        console.error("Failed to fetch MPL teams:", err);
        setTeamsError("Gagal memuat data tim MPL — menggunakan data lokal");
        setMplTeams(FALLBACK_MPL_TEAMS);
      })
      .finally(() => setTeamsLoading(false));
  }
}, [draftMode, retryCount]);
```

**Retry handler:**
```typescript
const handleRetryTeams = () => {
  setMplTeams([]);
  setRetryCount((c) => c + 1);
};
```

**Same-team validation:**
```typescript
// In the button disabled logic:
disabled={!selectedBlueTeam || !selectedRedTeam || selectedBlueTeam === selectedRedTeam}

// Warning text when same team selected:
{selectedBlueTeam && selectedRedTeam && selectedBlueTeam === selectedRedTeam && (
  <p className="text-xs text-amber-400 mt-1">⚠️ Blue Team dan Red Team tidak boleh sama.</p>
)}
```

### 2. Post-Draft Analysis Fallback Improvement (Bug 2)

**File:** `src/components/DraftSimulator.tsx`

**Root Cause:** The `evaluateDraftGame()` catch block generates an extremely minimal fallback that only lists hero names without any analysis. The server's `generateFallbackAnalysis()` already provides good metadata-based analysis, but when the frontend fetch itself fails (network error), the server fallback never reaches the client.

**Fix Strategy:** Enhance the frontend catch block to generate a comprehensive local fallback analysis using `heroes` prop data (which includes role, lanes, tournament_presence) and any available metadata.

**Implementation — new `generateLocalFallbackAnalysis` function:**
```typescript
const generateLocalFallbackAnalysis = (): string => {
  // Build analysis from heroes prop data
  const getHeroData = (name: string) => heroes.find(h => h.hero_name === name);
  
  const blueHeroData = bluePicks.map(name => ({ name, data: getHeroData(name) }));
  const redHeroData = redPicks.map(name => ({ name, data: getHeroData(name) }));
  
  // Lane assignment prediction
  const predictLane = (heroData: any) => {
    if (!heroData) return "Flex";
    const role = getHeroRole(heroData.hero_name);
    // Basic role-to-lane mapping
    if (role === "Marksman") return "Gold Lane";
    if (role === "Fighter") return "EXP Lane";
    if (role === "Mage") return "Mid Lane";
    if (role === "Assassin") return "Jungle";
    if (role === "Support" || role === "Tank") return "Roam";
    return "Flex";
  };

  // Team composition analysis
  const analyzeTeam = (heroDataArr: typeof blueHeroData) => {
    const roles = heroDataArr.map(h => getHeroRole(h.name));
    const hasMarksman = roles.includes("Marksman");
    const hasTank = roles.includes("Tank");
    const hasAssassin = roles.includes("Assassin");
    const hasMage = roles.includes("Mage");
    const hasFighter = roles.includes("Fighter");
    const hasSupport = roles.includes("Support");
    
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    if (hasTank && hasSupport) strengths.push("Frontline dan peel kuat");
    if (hasAssassin && hasMage) strengths.push("Burst damage tinggi");
    if (hasMarksman) strengths.push("Late game DPS dari Gold Lane");
    if (hasFighter) strengths.push("Sustain dan pressure EXP Lane");
    
    if (!hasTank && !hasSupport) weaknesses.push("Tidak ada frontline/peel");
    if (!hasMarksman) weaknesses.push("Kurang sustained DPS late game");
    if (!hasAssassin) weaknesses.push("Kurang burst dan dive potential");
    if (roles.filter(r => r === roles[0]).length >= 3) weaknesses.push("Terlalu banyak role yang sama");
    
    return { roles, strengths, weaknesses };
  };

  const blue = analyzeTeam(blueHeroData);
  const red = analyzeTeam(redHeroData);

  let analysis = `## Analisis Pasca-Draft (Lokal)\n\n`;
  analysis += `> *Analisis ini dibuat secara lokal berdasarkan data hero. Untuk analisis AI mendalam, pastikan koneksi server aktif.*\n\n`;
  
  analysis += `## Predicted Lane Assignment\n`;
  analysis += `**Tim Biru:**\n`;
  blueHeroData.forEach(h => {
    analysis += `- ${h.name} → ${predictLane(h.data)} (${getHeroRole(h.name)})\n`;
  });
  analysis += `\n**Tim Merah:**\n`;
  redHeroData.forEach(h => {
    analysis += `- ${h.name} → ${predictLane(h.data)} (${getHeroRole(h.name)})\n`;
  });
  
  analysis += `\n## Kekuatan Tim Biru\n`;
  analysis += blue.strengths.length > 0 ? blue.strengths.map(s => `- ${s}`).join("\n") : "- Komposisi standar";
  
  analysis += `\n\n## Kelemahan Tim Biru\n`;
  analysis += blue.weaknesses.length > 0 ? blue.weaknesses.map(w => `- ${w}`).join("\n") : "- Tidak ada kelemahan signifikan terdeteksi";
  
  analysis += `\n\n## Kekuatan Tim Merah\n`;
  analysis += red.strengths.length > 0 ? red.strengths.map(s => `- ${s}`).join("\n") : "- Komposisi standar";
  
  analysis += `\n\n## Kelemahan Tim Merah\n`;
  analysis += red.weaknesses.length > 0 ? red.weaknesses.map(w => `- ${w}`).join("\n") : "- Tidak ada kelemahan signifikan terdeteksi";
  
  analysis += `\n\n## Win Condition\n`;
  analysis += `**Tim Biru:** ${blue.strengths[0] || "Mainkan sesuai timing komposisi"}\n`;
  analysis += `**Tim Merah:** ${red.strengths[0] || "Mainkan sesuai timing komposisi"}\n`;
  
  analysis += `\n## Draft Score\n`;
  const blueScore = 50 + (blue.strengths.length * 5) - (blue.weaknesses.length * 5);
  const redScore = 50 + (red.strengths.length * 5) - (red.weaknesses.length * 5);
  analysis += `- Tim Biru: ${blueScore}/100\n`;
  analysis += `- Tim Merah: ${redScore}/100\n`;
  
  analysis += `\n## Bans Impact\n`;
  analysis += `- Tim Biru Banned: ${blueBans.join(", ") || "Tidak ada"}\n`;
  analysis += `- Tim Merah Banned: ${redBans.join(", ") || "Tidak ada"}\n`;
  
  analysis += `\n---\n*Gemini AI tidak terhubung. Analisis berbasis database lokal.*`;
  
  return analysis;
};
```

**Modified catch block in evaluateDraftGame:**
```typescript
} catch (err: any) {
  console.error("Evaluation fetch failed:", err);
  setEvaluationResult(generateLocalFallbackAnalysis());
}
```

### 3. Lane Display Mode Differentiation (Bug 3)

**File:** `src/components/DraftSimulator.tsx`

**Root Cause:** Lane status display uses identical format for both modes. In MPL Mode, professional drafts don't follow fixed lane order (first pick can be any role).

**Fix Strategy:** Add conditional label text based on `draftMode`:
- Ranked: keep existing "BLUE LANES" / "RED LANES" labels  
- MPL: change to "PREDICTED" label and add a small tooltip/subtitle "Prediksi lane, bukan urutan pick wajib"

**Implementation:**
```tsx
{/* Lane Status Display */}
<div className="grid grid-cols-2 gap-4 bg-gray-900/20 p-2 rounded-xl border border-gray-900/50">
  {/* Label changes based on mode */}
  {draftMode === "mpl" && (
    <p className="col-span-2 text-[9px] text-gray-600 text-center italic">
      Prediksi lane assignment — bukan urutan pick wajib
    </p>
  )}
  {/* ... existing lane display code ... */}
</div>
```

The label `BLUE LANES` changes to `PREDICTED` when mode is MPL.

## Data Models

No new data models. Uses existing:
- `DraftMode` type (`"mpl" | "ranked"`)
- Team array: `{ key: string; name: string; logo: string }[]`
- `HeroStats` from props (has `hero_name`, `tournament_presence`, etc.)
- `LaneStatus` type for lane assignments

## Error Handling

### MPL Teams Fetch
- On network error or non-ok response → use `FALLBACK_MPL_TEAMS`, show warning
- On empty/invalid response → same fallback behavior
- Retry button re-triggers fetch by incrementing `retryCount`
- Dropdown is NEVER empty thanks to fallback

### Post-Draft Analysis
- Server Gemini failure → server returns its own `generateFallbackAnalysis()` (metadata-based) — this already works
- Frontend fetch failure (network) → frontend generates comprehensive `generateLocalFallbackAnalysis()` from hero props data
- Both paths produce meaningful multi-section analysis, never just a hero list

## Testing Strategy

PBT is **not applicable** — these are UI bugfixes with fetch error handling and conditional rendering.

**Verification:**
1. `npx tsc --noEmit` — type check passes
2. `npm run build` — build succeeds
3. Manual test: open MPL mode → dropdown shows 9 teams
4. Manual test: select RRQ vs EVOS → button enabled → start draft
5. Manual test: disconnect network → fallback teams appear
6. Manual test: complete draft → analysis shows (from server or local fallback)
7. Grep: hero count in heroes_master.json still 132
8. Lane display shows "Predicted" label in MPL mode
