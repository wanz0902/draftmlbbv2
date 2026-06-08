# TDP Guided Tour — Positioning & Scroll Fix

**Date:** 2026-06-08 07:31 WIB

## Root Cause
- No scrollIntoView before measurement
- No re-measure on scroll/resize
- 150ms setTimeout unreliable

## Fixes
- scrollIntoView + requestAnimationFrame before getBoundingClientRect
- Re-measure on scroll and resize
- Edge-clamped tooltip placement
- Simplified copywriting

## Validation
- tsc: PASS
- build: PASS (7.61s)

## Localhost
`http://localhost:3001/`
