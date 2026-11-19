// Local check of the Stripe webhook logic: node backend/test-webhook.js
const assert = require('assert'), crypto = require('crypto'), http = require('http');
const handler = require('../api/stripe-webhook.js');
const { verify, orderFromSession, handleEvent } = handler._test;
const secret = 'whsec_test', uid = '3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const sign = (body, t = Math.floor(Date.now() / 1000), s = secret) => `t=${t},v1=${crypto.createHmac('sha256', s).update(`${t}.${body}`).digest('hex')}`;
(async () => {
  const body = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: 'cs_1', client_reference_id: `${uid}__video2`, amount_total: 9999, currency: 'usd', mode: 'payment', payment_status: 'paid', customer: 'cus_1', customer_details: { email: 'a@b.co' } } } });
  assert(verify(body, sign(body), secret), 'valid signature accepted');
  assert(!verify(body + ' ', sign(body), secret), 'tampered body rejected');
  assert(!verify(body, sign(body, undefined, 'wrong'), secret), 'wrong secret rejected');
  assert(!verify(body, sign(body, Math.floor(Date.now() / 1000) - 3600), secret), 'old timestamp rejected');
  assert(!verify(body, '', secret) && !verify(body, sign(body), ''), 'missing header/secret rejected');

  let o = orderFromSession(JSON.parse(body).data.object);
  assert.deepStrictEqual([o.user_id, o.plan, o.status, o.amount], [uid, 'video2', 'paid', 9999]);
  o = orderFromSession({ id: 'cs_2', client_reference_id: `${uid}__seo`, amount_total: 5999, mode: 'payment', payment_status: 'paid' });
  assert.strictEqual(o.status, 'review', 'underpaid plan flagged');
  o = orderFromSession({ id: 'cs_3', client_reference_id: `${uid}__leads`, amount_total: 0, mode: 'subscription', subscription: 'sub_1' });
  assert.deepStrictEqual([o.status, o.stripe_subscription_id], ['trialing', 'sub_1']);
  o = orderFromSession({ id: 'cs_4', amount_total: 9999, mode: 'payment' });
  assert.deepStrictEqual([o.user_id, o.plan, o.status], [null, 'unknown', 'review'], 'no reference handled');
  o = orderFromSession({ id: 'cs_6', client_reference_id: `${uid}__leads`, amount_total: 5999, mode: 'payment', payment_status: 'paid' });
  assert.strictEqual(o.status, 'review', 'one-time payment tagged as subscription plan flagged');
  o = orderFromSession({ id: 'cs_7', client_reference_id: `${uid}__video1`, amount_total: 5999, currency: 'eur', mode: 'payment', payment_status: 'paid' });
  assert.strictEqual(o.status, 'review', 'wrong currency flagged');
  o = orderFromSession({ id: 'cs_8', client_reference_id: `${uid}__video3`, amount_total: 0, mode: 'subscription', payment_status: 'paid' });
  assert.strictEqual(o.status, 'review', 'video plan via subscription link flagged');
  o = orderFromSession({ id: 'cs_9', client_reference_id: `${uid}__seo`, amount_total: 34999, mode: 'subscription', subscription: 'sub_9', payment_status: 'paid' });
  assert.strictEqual(o.status, 'active', 'SEO monthly subscription accepted');
  o = orderFromSession({ id: 'cs_10', client_reference_id: `${uid}__seo`, amount_total: 34999, mode: 'payment', payment_status: 'paid' });
  assert.strictEqual(o.status, 'review', 'SEO paid one-time flagged');
  o = orderFromSession({ id: 'cs_11', client_reference_id: `${uid}__web`, amount_total: 19900, mode: 'payment', payment_status: 'paid' });
  assert.strictEqual(o.status, 'paid', 'website deposit accepted');
  o = orderFromSession({ id: 'cs_5', client_reference_id: "x'; drop table--__video1", amount_total: 5999, mode: 'payment' });
  assert.strictEqual(o.user_id, null, 'bad user id not trusted');

  const calls = []; const fake = async (url, init) => { calls.push({ url, init }); return { ok: true, text: async () => '' }; };
  const env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc' };
  assert.strictEqual(await handleEvent(JSON.parse(body), env, fake), 'order saved');
  assert(calls[0].url.endsWith('/rest/v1/orders?on_conflict=stripe_session_id') && /ignore-duplicates/.test(calls[0].init.headers.Prefer));
  assert.strictEqual(await handleEvent({ type: 'customer.subscription.deleted', data: { object: { id: 'sub_1', status: 'canceled' } } }, env, fake), 'subscription updated');
  assert(calls[1].init.method === 'PATCH' && JSON.parse(calls[1].init.body).status === 'canceled');
  assert.strictEqual(await handleEvent({ type: 'invoice.paid', data: { object: {} } }, env, fake), 'ignored');

  // Full HTTP round trip through the real handler
  process.env.STRIPE_WEBHOOK_SECRET = secret; process.env.SUPABASE_URL = env.SUPABASE_URL; process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
  const realFetch = global.fetch; const seen = [];
  const server = http.createServer(handler).listen(0); const port = server.address().port;
  global.fetch = async (url, init) => { if (String(url).includes('supabase.co')) { seen.push(url); return { ok: true, text: async () => '' }; } return realFetch(url, init); };
  const post = (b, sig) => realFetch(`http://127.0.0.1:${port}/`, { method: 'POST', body: b, headers: { 'stripe-signature': sig } });
  let r = await post(body, sign(body)); assert.strictEqual(r.status, 200, 'signed request accepted');
  r = await post(body, 't=1,v1=bad'); assert.strictEqual(r.status, 400, 'unsigned request refused');
  r = await realFetch(`http://127.0.0.1:${port}/`); assert.strictEqual(r.status, 405);
  assert.strictEqual(seen.length, 1, 'only the valid request reached the database');
  server.close(); console.log('All webhook checks passed');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
