-- LaunchAI: send every new support message to /api/support-notify (email alerts).
-- Run in Supabase → SQL Editor. Safe to re-run. The secret is stored encrypted in Supabase Vault.
create extension if not exists pg_net;

do $$
declare sid uuid;
begin
  select id into sid from vault.secrets where name = 'support_webhook_secret';
  if sid is null then
    perform vault.create_secret('__SECRET__', 'support_webhook_secret', 'Header for /api/support-notify');
  else
    perform vault.update_secret(sid, '__SECRET__');
  end if;
end $$;

create or replace function public.notify_support_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://www.launchaix.com/api/support-notify',
    body := jsonb_build_object('type', 'INSERT', 'table', 'ticket_messages', 'schema', 'public', 'record', to_jsonb(new)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'support_webhook_secret')
    ),
    timeout_milliseconds := 5000
  );
  return new;
end $$;
revoke all on function public.notify_support_message() from public, anon, authenticated;

drop trigger if exists support_notify on public.ticket_messages;
create trigger support_notify after insert on public.ticket_messages
  for each row execute function public.notify_support_message();
