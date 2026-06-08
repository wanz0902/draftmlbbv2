# TDP Guided Tour — Scroll Reset Fix

**Date:** 2026-06-08 07:41 WIB

## Root Cause
scrollIntoView called on every scroll event created feedback loop causing step reset.

## Fix
- stepRef for stable step reading
- scrollToAndMeasure only on step change
- measureOnly on scroll (no scrollInsideView)
- didScrollRef to prevent double-measure

## Validation
- tsc: PASS
- build: PASS (6.74s)

## Localhost
`http://localhost:3001/`
