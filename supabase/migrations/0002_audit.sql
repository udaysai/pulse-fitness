-- =============================================================================
-- Audit log — append-only event stream for sensitive table changes
-- =============================================================================

create schema if not exists audit;

create table audit.events (
  id            bigserial primary key,
  user_id       uuid,
  actor         text not null,
  action        text not null check (action in ('insert', 'update', 'delete')),
  target_table  text not null,
  target_id     text,
  diff          jsonb,
  ip            inet,
  created_at    timestamptz not null default now()
);

create index audit_events_user_idx on audit.events(user_id, created_at desc);
create index audit_events_table_idx on audit.events(target_table, created_at desc);

-- RLS: users can read their own audit trail; nothing can update/delete (append-only)
alter table audit.events enable row level security;
create policy "audit_select_own" on audit.events for select using (auth.uid() = user_id);

-- Generic audit trigger
create or replace function audit.log_change()
returns trigger
language plpgsql
security definer set search_path = audit, public
as $$
declare
  v_user_id uuid;
  v_target_id text;
  v_diff jsonb;
begin
  -- Try to extract user_id from the row
  if (tg_op = 'DELETE') then
    v_user_id := (to_jsonb(old) ->> 'user_id')::uuid;
    v_target_id := (to_jsonb(old) ->> 'id');
    v_diff := to_jsonb(old);
  else
    v_user_id := (to_jsonb(new) ->> 'user_id')::uuid;
    v_target_id := (to_jsonb(new) ->> 'id');
    v_diff := case
      when tg_op = 'UPDATE' then jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
      else to_jsonb(new)
    end;
  end if;

  insert into audit.events (user_id, actor, action, target_table, target_id, diff)
  values (
    v_user_id,
    coalesce(auth.uid()::text, 'system'),
    lower(tg_op),
    tg_table_name,
    v_target_id,
    v_diff
  );

  return coalesce(new, old);
end;
$$;

-- Attach to sensitive tables
create trigger audit_profiles
  after insert or update or delete on public.profiles
  for each row execute function audit.log_change();

create trigger audit_consents
  after insert or update or delete on public.user_consents
  for each row execute function audit.log_change();

create trigger audit_health_imports
  after insert or update or delete on public.health_imports
  for each row execute function audit.log_change();
