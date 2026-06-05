# Bugfix Requirements Document

## Introduction

Multiple bugs di Draft Coach Simulator yang mencegah penggunaan normal: (1) MPL Mode dropdown tim kosong, (2) post-draft analysis fallback terlalu pendek, (3) MPL Mode tidak boleh memaksa urutan lane seperti Ranked Mode. Endpoint backend sudah ada dan berfungsi, masalah utama ada di frontend error handling dan fallback logic.

**File Terlibat:**
- `src/components/DraftSimulator.tsx` — komponen frontend MPL team selector + post-draft analysis fallback + lane display
- `server.ts` — endpoint `GET /api/draft/teams` (sudah ada, return 9 tim), `POST /api/draft/final-analysis` (sudah ada, fallback analysis sudah ada)

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN user memilih MPL Mode dan fetch `/api/draft/teams` gagal (network error, response bukan JSON, atau server belum ready) THEN dropdown Blue Team dan Red Team tetap kosong tanpa notifikasi error apapun ke user karena catch block hanya console.error tanpa fallback data

1.2 WHEN fetch `/api/draft/teams` gagal sekali THEN useEffect tidak mencoba ulang fetch karena dependency `[draftMode, mplTeams.length]` tidak berubah setelah gagal, sehingga user harus refresh halaman secara manual

1.3 WHEN dropdown Blue Team dan Red Team kosong (tidak ada opsi tim) THEN tombol "Mulai Simulasi Draf" tetap disabled dan tidak bisa diklik karena state `selectedBlueTeam` dan `selectedRedTeam` tetap string kosong

1.4 WHEN fetch gagal THEN tidak ada feedback visual yang memberitahu user bahwa terjadi kegagalan memuat data tim MPL — hanya loading spinner lalu hilang

1.5 WHEN draft selesai dan `evaluateDraftGame()` fetch ke `/api/draft/final-analysis` gagal (network error) THEN frontend catch block hanya menampilkan fallback sangat pendek: "Koneksi ke asisten Gemini gagal. Menghasilkan analisis statistik dasar:" diikuti hanya daftar hero picks tanpa analisis bermakna (tidak ada lane assignment, win condition, strength/weakness, scoring)

1.6 WHEN mode MPL aktif THEN lane status display di draft board menampilkan format yang sama persis dengan Ranked Mode (Gold-EXP-Mid-Jungle-Roam sebagai tracker wajib) padahal di MPL Mode urutan pick tidak harus mengikuti lane order

### Expected Behavior (Correct)

2.1 WHEN fetch `/api/draft/teams` gagal (network error, non-JSON response, atau server error) THEN sistem SHALL menggunakan fallback data lokal berisi 9 tim MPL (RRQ, EVOS, ONIC, Team Liquid ID, Geek Fam, Bigetron, Alter Ego, Dewa United, NAVI) sehingga dropdown tetap terisi dan dapat digunakan

2.2 WHEN fetch `/api/draft/teams` gagal THEN sistem SHALL menampilkan pesan error "Gagal memuat data tim MPL — menggunakan data lokal" dengan tombol retry yang memungkinkan user mencoba ulang fetch tanpa harus refresh halaman

2.3 WHEN dropdown berisi daftar tim (baik dari API maupun fallback) THEN user SHALL dapat memilih tim Blue dan Red, dan tombol "Mulai Simulasi Draf" SHALL aktif (enabled) setelah kedua tim dipilih DAN kedua tim berbeda

2.4 WHEN data tim sedang dimuat (loading state) THEN sistem SHALL menampilkan indikator loading "Memuat data tim MPL..." dan WHEN gagal SHALL menampilkan pesan error beserta opsi retry sambil tetap mengisi dropdown dari fallback

2.5 WHEN user memilih Blue Team dan Red Team yang sama THEN sistem SHALL menampilkan warning "Blue Team dan Red Team tidak boleh sama" dan tombol Mulai Simulasi Draft tetap disabled

2.6 WHEN draft selesai dan evaluateDraftGame fetch gagal THEN frontend SHALL menampilkan comprehensive local fallback analysis yang mencakup: Lane Assignment Prediction, Tim Strength/Weakness, Damage Profile, CC Profile, Frontline Quality, Power Spike Comparison, Win Condition, dan Draft Score — berdasarkan data hero metadata lokal (role, lanes, draftTags, counterTags, synergyTags, macroTags, powerSpikeTags, mechanicCategory)

2.7 WHEN mode MPL aktif THEN lane status display SHALL menampilkan label "Predicted Lane Assignment" (bukan lane tracker wajib) dan tidak menunjukkan urutan pick yang harus diikuti — karena di MPL first pick bisa role apapun

2.8 WHEN mode Ranked aktif THEN lane status display SHALL tetap menampilkan lane tracker dengan format existing (Gold-EXP-Mid-Jungle-Roam) sebagai bantuan komposisi

### Unchanged Behavior (Regression Prevention)

3.1 WHEN fetch `/api/draft/teams` berhasil dan mengembalikan data valid THEN sistem SHALL CONTINUE TO menggunakan data dari API response untuk mengisi dropdown (bukan fallback)

3.2 WHEN user memilih Ranked Mode (bukan MPL Mode) THEN sistem SHALL CONTINUE TO langsung memulai draft tanpa menampilkan dropdown tim

3.3 WHEN user sudah memilih kedua tim dan klik "Mulai Simulasi Draf" THEN sistem SHALL CONTINUE TO memulai simulasi draft dengan benar menggunakan nama tim yang dipilih

3.4 WHEN endpoint `GET /api/draft/teams` dipanggil secara normal THEN endpoint SHALL CONTINUE TO mengembalikan response `{ teams: [...] }` dengan 9 tim MPL lengkap beserta key, name, dan logo

3.5 WHEN server-side `POST /api/draft/final-analysis` berhasil (Gemini connected) THEN server SHALL CONTINUE TO mengembalikan analisis Gemini AI yang lengkap

3.6 WHEN server-side Gemini gagal THEN server `generateFallbackAnalysis()` yang sudah ada di server.ts SHALL CONTINUE TO bekerja dan mengembalikan analisis berbasis metadata

3.7 Hero count wajib tetap 132 — JANGAN ubah data hero

3.8 Hero Intelligence data JANGAN dihapus

3.9 Recommendation engine availability filter (hero banned/picked tidak muncul di rekomendasi) SHALL CONTINUE TO bekerja seperti existing

3.10 Confirm hero selection SHALL CONTINUE TO menggunakan heroName (bukan array index) untuk mencegah mismatch
