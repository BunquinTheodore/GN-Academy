-- 0016: lets the daily upgrade pass visit anchor batches least recently
-- checked first, so a batch that stays 'submitted' cannot starve newer ones.
-- Apply with: npx tsx scripts/apply-migrations.ts   (owner only, never auto-run)
-- Apply BEFORE deploying code that orders by this column.

alter table public.anchor_batches
  add column if not exists last_checked_at timestamptz;

create index if not exists anchor_batches_submitted_check_idx
  on public.anchor_batches (last_checked_at nulls first, created_at)
  where ots_status = 'submitted';
