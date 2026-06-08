# TDP Guided Tour — Rectangle Spotlight Fix

**Date:** 2026-06-08 08:05 WIB

## Before
Circle markers that didn't wrap target elements.

## After
Rectangular spotlight from `getBoundingClientRect()` + per-step padding (8-14px).

## All 11 targets use rectangular highlights with correct element wrapping.

## Validation
- tsc: PASS
- build: PASS (7.04s)

## Localhost
`http://localhost:3001/`
