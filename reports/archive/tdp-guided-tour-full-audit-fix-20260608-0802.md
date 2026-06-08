# TDP Guided Tour — Full Audit & Target Refactor

**Date:** 2026-06-08 08:02 WIB

## Root Cause
- tour-pick-slots wrapped entire picks section (label + 5 lane columns + backups). Too broad.
- Spotlight rectangle system inherently fragile for adjacent elements.
- No numbered markers for precise targeting.

## Fix
- Separated pick circles from lane/badge/backup columns
- Replaced spotlight rectangles with numbered marker dots
- tour-pick-slots now wraps ONLY pick circles row
- New tour-role-lanes wraps lane badges + backup grids

## All 11 Targets Verified

## Validation
- tsc: PASS
- build: PASS (6.60s)

## Localhost
`http://localhost:3001/`
