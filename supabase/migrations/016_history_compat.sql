-- 015_history_compat.sql
create or replace view public.dkd_chest_logs as
select
  ch.id,
  ch.user_id,
  ch.drop_id,
  ch.card_def_id,
  ch.drop_type,
  ch.gained_token,
  ch.gained_shards,
  ch.token_mult,
  ch.source,
  ch.created_at
from public.dkd_chest_history ch;
