-- LaunchAI: table permissions (run after supabase-schema.sql). Safe to re-run.
-- Row Level Security still decides WHICH rows each user can see or change;
-- these grants only allow signed-in users to use the tables at all.
-- Visitors who are not signed in (anon) get no table access.
grant usage on schema public to authenticated, service_role;

grant select on public.profiles, public.orders, public.tickets, public.ticket_messages to authenticated;
grant insert on public.orders, public.tickets, public.ticket_messages to authenticated;
grant update on public.orders, public.tickets to authenticated;   -- admins only, enforced by policies
grant update (first_name, last_name, phone, market, business_type, business_name, website) on public.profiles to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Server functions (Stripe webhook, support emails) use the service role
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
