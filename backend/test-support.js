// Local check of the support email function: node backend/test-support.js
const assert = require('assert'), http = require('http');
const handler = require('../api/support-notify.js');
const { secretOk, buildEmail, handle, oneLine } = handler._test;
const TID = '3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const env = { SUPPORT_EMAIL: 'hidden-inbox@private.example', SUPPORT_FROM: 'LaunchAI Support <noreply@launchaix.com>', RESEND_API_KEY: 're_x', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc', SITE_URL: 'https://www.launchaix.com', SUPPORT_WEBHOOK_SECRET: 's3cret' };
const ticket = { id: TID, number: 1042, subject: 'Help\r\nBcc: attacker@evil.com', email: 'ana@example.com', profiles: { first_name: '<script>x</script>', business_name: 'Ana Realty' } };
(async () => {
  assert(secretOk('s3cret', 's3cret') && !secretOk('nope', 's3cret') && !secretOk('', 's3cret') && !secretOk('s3cret', ''), 'secret check');
  assert.strictEqual(oneLine('a\r\nb\u0000c'), 'a bc', 'header injection stripped');

  let m = buildEmail({ author_role: 'customer', body: '<img src=x onerror=alert(1)>' }, ticket, env);
  assert.strictEqual(m.to, env.SUPPORT_EMAIL, 'customer message goes to hidden inbox');
  assert(!/[\r\n]/.test(m.subject) && m.subject.startsWith('[Ticket #1042]'), 'safe subject');
  assert(!m.html.includes('<img') && !m.html.includes('<script>'), 'html escaped');
  assert(!('reply_to' in m), 'no reply-to exposure');
  m = buildEmail({ author_role: 'support', body: 'secret internal text' }, ticket, env);
  assert.strictEqual(m.to, 'ana@example.com', 'support reply notifies customer');
  assert(!m.html.includes(env.SUPPORT_EMAIL) && !m.html.includes('secret internal text'), 'customer email hides inbox and message body');

  const sent = []; const fake = async (url, init) => {
    if (url.includes('/rest/v1/tickets')) { assert(url.includes(`id=eq.${TID}`)); return { ok: true, json: async () => [ticket] }; }
    if (url.includes('api.resend.com')) { sent.push(JSON.parse(init.body)); return { ok: true }; }
    throw new Error('unexpected ' + url);
  };
  assert.strictEqual(await handle({ type: 'INSERT', table: 'ticket_messages', record: { ticket_id: TID, author_role: 'customer', body: 'hi' } }, env, fake), 'sent');
  assert.strictEqual(sent[0].to[0], env.SUPPORT_EMAIL);
  assert.strictEqual(await handle({ type: 'UPDATE', table: 'ticket_messages', record: {} }, env, fake), 'ignored');
  assert.strictEqual(await handle({ type: 'INSERT', table: 'ticket_messages', record: { ticket_id: "x' or 1=1", author_role: 'customer', body: 'x' } }, env, fake), 'ignored', 'bad id ignored');
  assert.strictEqual(await handle({ type: 'INSERT', table: 'ticket_messages', record: { ticket_id: TID, author_role: 'admin', body: 'x' } }, env, fake), 'ignored', 'unknown role ignored');

  Object.assign(process.env, env);
  const server = http.createServer(handler).listen(0); const port = server.address().port;
  const r1 = await fetch(`http://127.0.0.1:${port}/`, { method: 'POST', body: '{}' });
  assert.strictEqual(r1.status, 401, 'missing secret refused');
  const r2 = await fetch(`http://127.0.0.1:${port}/`, { method: 'POST', body: '{}', headers: { 'x-webhook-secret': 'wrong' } });
  assert.strictEqual(r2.status, 401, 'wrong secret refused');
  const r3 = await fetch(`http://127.0.0.1:${port}/`, { method: 'POST', body: JSON.stringify({ type: 'DELETE' }), headers: { 'x-webhook-secret': 's3cret' } });
  assert.strictEqual(r3.status, 200);
  const r4 = await fetch(`http://127.0.0.1:${port}/`, { method: 'POST', body: 'x'.repeat(70 * 1024), headers: { 'x-webhook-secret': 's3cret' } });
  assert.strictEqual(r4.status, 413, 'oversized body refused');
  server.close();
  console.log('All support-notify checks passed');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
