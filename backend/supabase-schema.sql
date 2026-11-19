-- LaunchAI: accounts, orders and support tickets.
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- Security model: every table has Row Level Security. Customers can only read their own
-- rows; status changes, paid orders and support replies can only come from an admin
-- (checked in the database) or the server (service role key, never sent to browsers).

-------------------------------------------------------------------------------
-- Admins: add your team here. There are no client policies, so only the
-- service role / SQL editor can change this table.
--   insert into public.admins (user_id) select id from auth.users where email = 'you@yourdomain.com';
-------------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-------------------------------------------------------------------------------
-- Profiles
-------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  first_name text, last_name text, phone text, market text, business_type text,
  business_name text, website text,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists business_name text;
alter table public.profiles add column if not exists website text;
alter table public.profiles enable row level security;
drop policy if exists "profiles: read own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: read own"   on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
-- Customers may edit contact details only, never their id or email
revoke update on public.profiles from authenticated;
grant update (first_name, last_name, phone, market, business_type, business_name, website) on public.profiles to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, first_name, last_name, phone, market, business_type, business_name, website)
  values (new.id, new.email,
          left(new.raw_user_meta_data->>'first_name', 120), left(new.raw_user_meta_data->>'last_name', 120),
          left(new.raw_user_meta_data->>'phone', 120), left(new.raw_user_meta_data->>'market', 120),
          left(new.raw_user_meta_data->>'business_type', 120), left(new.raw_user_meta_data->>'business_name', 120),
          left(new.raw_user_meta_data->>'website', 120))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-------------------------------------------------------------------------------
-- Orders
-------------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  email text,
  plan text not null,
  plan_name text,
  amount integer not null default 0,           -- cents actually charged at checkout
  currency text not null default 'usd',
  mode text,                                    -- 'payment' or 'subscription'
  status text not null default 'requested'
    check (status in ('requested','paid','trialing','active','in_progress','delivered','canceled','past_due','review')),
  note text check (note is null or char_length(note) <= 2000),
  stripe_session_id text unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_sub_idx on public.orders (stripe_subscription_id);
alter table public.orders enable row level security;
drop policy if exists "orders: read own" on public.orders;
drop policy if exists "orders: request own" on public.orders;
drop policy if exists "orders: admin update" on public.orders;
create policy "orders: read own" on public.orders for select using (auth.uid() = user_id or public.is_admin());
-- Customers can only add free quote/call requests. Paid orders come from the Stripe webhook.
create policy "orders: request own" on public.orders for insert with check (
  auth.uid() = user_id and status = 'requested' and amount = 0
  and stripe_session_id is null and stripe_customer_id is null and stripe_subscription_id is null
  and plan in ('ai','growth_re','growth_sb','growth','call'));
create policy "orders: admin update" on public.orders for update using (public.is_admin()) with check (public.is_admin());

-------------------------------------------------------------------------------
-- Support tickets
-------------------------------------------------------------------------------
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001),
  user_id uuid not null references public.profiles (id) on delete cascade,
  email text,
  topic text not null default 'other' check (topic in ('order','billing','leads','website','technical','other')),
  subject text not null check (char_length(subject) between 3 and 120),
  order_id uuid references public.orders on delete set null,
  status text not null default 'open' check (status in ('open','answered','closed')),
  customer_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tickets_user_idx on public.tickets (user_id, updated_at desc);
create index if not exists tickets_status_idx on public.tickets (status, updated_at desc);

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets on delete cascade,
  author_id uuid references auth.users on delete set null,
  author_role text not null check (author_role in ('customer','support')),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists ticket_messages_ticket_idx on public.ticket_messages (ticket_id, created_at);

alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;

drop policy if exists "tickets: read own" on public.tickets;
drop policy if exists "tickets: open own" on public.tickets;
drop policy if exists "tickets: admin update" on public.tickets;
create policy "tickets: read own" on public.tickets for select using (auth.uid() = user_id or public.is_admin());
create policy "tickets: open own" on public.tickets for insert with check (
  auth.uid() = user_id and status = 'open'
  and (order_id is null or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())));
create policy "tickets: admin update" on public.tickets for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "messages: read own" on public.ticket_messages;
drop policy if exists "messages: write" on public.ticket_messages;
create policy "messages: read own" on public.ticket_messages for select using (
  public.is_admin() or exists (select 1 from public.tickets t where t.id = ticket_id and t.user_id = auth.uid()));
-- Customers write only as 'customer' on their own open tickets; only admins write as 'support'
create policy "messages: write" on public.ticket_messages for insert with check (
  author_id = auth.uid() and (
    (author_role = 'customer' and exists (select 1 from public.tickets t where t.id = ticket_id and t.user_id = auth.uid() and t.status <> 'closed'))
    or (author_role = 'support' and public.is_admin())));

-- Fill email from the account (never trust the browser) + basic anti-spam limits
create or replace function public.ticket_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.email := (select email from auth.users where id = new.user_id);
  new.customer_read_at := now();
  if not public.is_admin() and (select count(*) from public.tickets where user_id = new.user_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many requests. Please wait before opening another.';
  end if;
  return new;
end $$;
drop trigger if exists tickets_before_insert on public.tickets;
create trigger tickets_before_insert before insert on public.tickets for each row execute function public.ticket_before_insert();

create or replace function public.message_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.author_role = 'customer' and (select count(*) from public.ticket_messages where author_id = new.author_id and created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'Too many messages. Please wait a moment.';
  end if;
  return new;
end $$;
drop trigger if exists messages_before_insert on public.ticket_messages;
create trigger messages_before_insert before insert on public.ticket_messages for each row execute function public.message_before_insert();

-- A new message reopens or answers the ticket automatically
create or replace function public.message_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.tickets
     set status = case when new.author_role = 'support' then 'answered' else 'open' end,
         updated_at = now()
   where id = new.ticket_id;
  return new;
end $$;
drop trigger if exists messages_after_insert on public.ticket_messages;
create trigger messages_after_insert after insert on public.ticket_messages for each row execute function public.message_after_insert();

-- Customer actions that change a ticket go through these checked functions
create or replace function public.mark_ticket_read(t uuid) returns void
language sql security definer set search_path = public as $$
  update public.tickets set customer_read_at = now() where id = t and user_id = auth.uid();
$$;
create or replace function public.close_ticket(t uuid) returns void
language sql security definer set search_path = public as $$
  update public.tickets set status = 'closed', updated_at = now() where id = t and user_id = auth.uid();
$$;
revoke all on function public.mark_ticket_read(uuid) from public;
revoke all on function public.close_ticket(uuid) from public;
grant execute on function public.mark_ticket_read(uuid) to authenticated;
grant execute on function public.close_ticket(uuid) to authenticated;

-------------------------------------------------------------------------------
-- Email alerts: Database → Webhooks → create a webhook on table
-- public.ticket_messages, event INSERT, type HTTP request, POST to
-- https://www.launchaix.com/api/support-notify with header
-- x-webhook-secret: <the SUPPORT_WEBHOOK_SECRET you set in Vercel>.
-------------------------------------------------------------------------------
