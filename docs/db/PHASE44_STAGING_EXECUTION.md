# Phase 44 — Staging Execution

This phase does **not** touch the mobile app. It prepares the exact SQL files to run on **Supabase STAGING only**.

## Run order
1. `supabase/sql/phase44_staging_preflight_run.sql`
2. Review results and confirm placeholder RPCs still exist or need replacement.
3. `supabase/sql/phase44_staging_apply_run.sql`
4. `supabase/sql/phase44_staging_verify_run.sql`
5. Fill `audit/.../phase44_result_capture.md`

## Important
- Do **not** run on production first.
- If apply fails, stop and record the failing statement.
- If verify still shows `todo_*` reasons, promotion is blocked.

## Goal
Restore and harden the later placeholder overrides for:
- market buy
- task claim
- weekly task claim
- weekly leaderboard
- admin week close
- weekly top reward claim
