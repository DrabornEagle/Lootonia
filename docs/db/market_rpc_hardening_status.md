# Market RPC Hardening Status

Updated: 20260314_111216

## Finalized repo-side files
- supabase/migrations/023_market_rpc_hardening.sql
- docs/db/market_rpc_hardening_status.md

## Canonical decisions
- 
dkd_market_listings_view must derive 
dcard_def_id from public.dkd_user_cards.card_def_id via user_card_id join.
- Live market listings table is richer than the view; the view is the compatibility layer.
- Active listing uniqueness should be enforced by user_card_id, not by card_def_id.
- list_card / cancel / buy RPCs must return a frontend-friendly 
data.ok contract.

## Still needs live-side verification before apply
- Exact live body of dkd_market_list_card
- Exact live body of dkd_market_cancel
- Exact live body of dkd_market_buy
- Any existing unique index names on public.dkd_market_listings
- Any trigger side effects on ownership / token transfer

## Recommendation
Do not apply this SQL blindly to live DB yet.
Use it as the canonical final draft, then compare against live RPC bodies before execution.
