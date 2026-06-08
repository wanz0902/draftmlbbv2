# TDP Guided Tour — Target Audit & Fix

**Date:** 2026-06-08 07:50 WIB

## Root Cause
`tour-draft-header` was on entire `<header>` wrapping title + Bans/Picks/Complete. Step 4 highlight covered too much area.

## Fix
Moved `tour-draft-header` to breadcrumb/title `<div>` only.

## Full Audit
All 11 targets verified correct after fix.

## Validation
- tsc: PASS
- build: PASS (7.49s)

## Localhost
`http://localhost:3001/`
