# Archive — Legacy/Manual/Debug/Reference Materials

These files are **archived** and are **NOT part of the active runtime**.

They were moved here during project cleanup (Step 7E) to keep the project root clean.

## Contents

| Folder | Contents |
|--------|----------|
| `raw-scrapes/` | Scraped Liquipedia HTML pages (raw dumps, ~5MB total). Data was already extracted into `data/mpl_id_s17_regular_season.json`. |
| `scripts/` | One-off manual scrape, sync, update, and generation scripts. Not referenced by `package.json` or active source. |
| `tests/` | Ad-hoc test scripts for API endpoints, scraper, teams, tiers, draft replay. Not part of a test framework. |
| `reference/` | Hero name text lists used during initial data collection. |
| `backups/` | Old data snapshots from before hero rename/cleanup operations. Contains duplicate hero data under old naming (`juliandd`, `wuzetian`) and old `server.ts`/`mlbb_master.db` copies. Not active runtime data. |

## Rules

- **Do NOT use these files as source of truth.**
  Current source of truth is documented in `docs/DATA_ARCHITECTURE.md`.
- **Do NOT import these scripts into active source code.**
- **Do NOT restore from backups without manual validation.**
  Active data may have been renamed, restructured, or enriched since backup was taken.
- **Safe to delete entirely** if archive is no longer needed.
- **To restore a scraper script:** copy it back to root and verify it still works
  with current data/service structure before running.

## When to keep vs delete

- Keep if you might need to re-run a manual scrape or reference old parsing logic.
- Delete if the normalized JSON pipeline fully replaces the need for manual scripts.
