# TDP Guided Tour — Portal + Fixed Position Fix

**Date:** 2026-06-08 08:12 WIB

## Root Cause
Fixed overlay inside TDP component tree affected by ancestor CSS (overflow-hidden, backdrop-blur).

## Fix
- Render tour via `createPortal` to `document.body`
- All elements use `position: fixed` (not absolute)
- Double `requestAnimationFrame` after scrollIntoView
- Tighter target wrapping + reduced padding

## Validation
- tsc: PASS
- build: PASS (6.78s)

## Localhost
`http://localhost:3001/`
