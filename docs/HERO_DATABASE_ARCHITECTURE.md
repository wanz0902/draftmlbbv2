# MLBB Hero Database System Architecture

## Overview
This architectural document outlines the robust "AI-powered MLBB Esports Draft Command Center" data structure designed for the project. It covers data structure, API layers, strategies for data injection and AI scaling.

## 1. Folder Structure 
The recommended folder structure isolates static data, dynamically scraped data, assets, and type definitions:

```
/data
  /heroes_advanced.json     <-- Structured JSON Database for Heroes, Stats, Skills & AI Tags
  /heroes_stats.json        <-- Statistical metadata (winrate, pick rate)
  /items.json               <-- Item/Equipment definitions
/src
  /types
    /heroSchema.ts          <-- Strict TypeScript generic definitions for the database
/public
  /assets
    /heroes                 <-- Hero avatars and splash arts
    /skills                 <-- Hero skill icons
```

## 2. API Structure
The Node.js backend serves this structured data securely, allowing the frontend to quickly hydrate state without heavy sequential filesystem polling.
`GET /api/heroes/advanced` - Returns the `data/heroes_advanced.json` file securely to the frontend.

## 3. Web Scraping & Automatic Updates
To keep the data updated automatically without manual entry:
1. **Source:** Scrape resources like Liquipedia MLBB or Official Mobile Legends Pages. Use existing `/api/scrape/liquipedia` as a template for pulling page tables.
2. **Scheduled Cron jobs:** Incorporate a lightweight task runner (e.g. `node-cron`) or rely on external triggers (via GitHub Actions) to run an update script `update_heroes.ts`.
3. **Data Merging:** Scraped patches often just update numbers (e.g., skill cooldowns). Standardize the scraper logic to do a deep partial update on `heroes_advanced.json` while retaining the `aiTags` which are manually curated by the coach. 
4. **Validation:** Use `zod` schemas on the backend to validate scraped data before saving to `heroes_advanced.json`.

## 4. Organizing Hero Assets & Images
* Structure: Assets should be organized inside `/public/assets/heroes`.
* Naming Convention: Normalize hero names heavily (lowercase, remove spaces, non-alphanumeric). e.g., `xborg.png` or `yisunshin.png`. 
* Linking: On the backend API, dynamically generate absolute URLs based on `req.get('host')` or simply provide relative standard paths: `/assets/heroes/${hero.id}.png`.

## 5. AI-Ready Data Architecture & Scaling
1. **Immediate Setup (JSON-based):** JSON files in memory (`heroes_advanced.json`) are lightweight enough for MLBB's current 125+ cast. This makes local deployments incredibly fast while ensuring rapid iteration of AI properties.
2. **LLM Context Augmentation:** When querying Gemini AI for draft coach advice, load the `aiTags` sub-object of relevant picked/banned heroes directly into the prompt context payload. This prevents the LLM from making generic assumptions, grounding its reasoning in specified `powerSpikeTiming`, `tempo`, and `deceptionValue`.
3. **Future Migration (MongoDB/PostgreSQL):** 
   - When the user scale or logging of analytics grows, you can easily ingest this JSON into MongoDB using the identical interface.
   - For PostgreSQL, use Prisma. Map the nested JSON arrays directly to `JSONB` columns while indexing the core IDs.
   
## 6. Recommended Tech Stack
**Frontend:**
- **React (Vite) + Tailwind CSS + Framer Motion:** Blazing fast rendering.

**Backend:**
- **Node.js (Express):** Standard structure, supports rapid local development.
- **Cheerio/Puppeteer:** For the automated web scraper that runs asynchronously to keep data fresh.
- **Zod:** Strict type validation for AI inputs/outputs and structured scraping merges.

**Database Evolution:**
- **Stage 1 (Current):** Flat JSON Files (Instant startup, zero configuration, highly portable for AI Studio).
- **Stage 2:** SQLite/libSQL for lightweight structured relational data without managing servers.
- **Stage 3:** Supabase (PostgreSQL) or MongoDB Atlas when scaling into multi-tenant coaches syncing custom AI strategies.
