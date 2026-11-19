// Vercel function: /api/stripe-webhook
// Stripe calls this after a payment. It verifies the call really came from Stripe,
// then saves the order in Supabase so it shows in the customer's account.
// Env vars (Vercel → Settings → Environment Variables):
//   STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
const crypto = require('crypto');
const supaAuth = env => { const k = env.SUPABASE_SERVICE_ROLE_KEY || ''; return /^eyJ/.test(k) ? { apikey: k, Authorization: `Bearer ${k}` } : { apikey: k }; };

// Expected one-time prices in cents (keep in sync with the site)
const PLANS = {
  leads:  { name: 'Daily Real Estate Leads', min: 0, mode: 'subscription' },
  video1: { name: '1 testimonial video', min: 5999, mode: 'payment' },
  video2: { name: '2 testimonial videos', min: 9999, mode: 'payment' },
  video3: { name: '3 testimonial videos', min: 13499, mode: 'payment' },
  seo:    { name: 'SEO & Online Reputation', min: 34999, mode: 'subscription' },
  web:    { name: 'Professional Website (deposit)', min: 19900, mode: 'payment' },
};
const MAX_BODY = 256 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function verify(raw, header, secret, toleranceSec = 300, now = Date.now()) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(String(header).split(',').map(p => p.split('=')).filter(p => p.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
  const sigs = String(header).split(',').filter(p => p.trim().startsWith('v1=')).map(p => p.trim().slice(3));
  if (!parts.t || !sigs.length) return false;
  if (Math.abs(now / 1000 - Number(parts.t)) > toleranceSec) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${raw}`).digest('hex');
  const eb = Buffer.from(expected);
  return sigs.some(s => { const sb = Buffer.from(s); return sb.length === eb.length && crypto.timingSafeEqual(sb, eb); });
}

function orderFromSession(s) {
  const [uid, planKey] = String(s.client_reference_id || '').split('__');
  const plan = PLANS[planKey];
  const amount = s.amount_total || 0;
  let status = s.mode === 'subscription' ? (amount === 0 ? 'trialing' : 'active') : 'paid';
  // Anything that doesn't match the plan exactly is held for a human to check
  if (!plan || s.payment_status === 'unpaid' || (plan.mode && s.mode !== plan.mode)
      || (s.currency && s.currency !== 'usd') || amount < plan.min) status = 'review';
  return {
    user_id: UUID.test(uid) ? uid : null,
    email: (s.customer_details && s.customer_details.email) || s.customer_email || null,
    plan: plan ? planKey : 'unknown',
    plan_name: plan ? plan.name : 'Unrecognized purchase',
    amount, currency: s.currency || 'usd', mode: s.mode, status,
    stripe_session_id: s.id,
    stripe_customer_id: typeof s.customer === 'string' ? s.customer : null,
    stripe_subscription_id: typeof s.subscription === 'string' ? s.subscription : null,
  };
}

async function supa(path, init, env = process.env, fetchImpl = fetch) {
  const r = await fetchImpl(`${env.SUPABASE_URL}/rest/v1/${path}`, Object.assign({}, init, {
    headers: Object.assign(supaAuth(env), { 'Content-Type': 'application/json' }, init.headers || {}),
  }));
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
}

async function handleEvent(event, env = process.env, fetchImpl = fetch) {
  const o = event.data && event.data.object;
  if (event.type === 'checkout.session.completed') {
    // on_conflict + ignore-duplicates makes Stripe retries harmless
    await supa('orders?on_conflict=stripe_session_id', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(orderFromSession(o)) }, env, fetchImpl);
    return 'order saved';
  }
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const map = { trialing: 'trialing', active: 'active', past_due: 'past_due', unpaid: 'past_due', canceled: 'canceled', incomplete_expired: 'canceled' };
    const status = event.type.endsWith('deleted') ? 'canceled' : map[o.status];
    if (!status) return 'ignored';
    await supa(`orders?stripe_subscription_id=eq.${encodeURIComponent(o.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status, updated_at: new Date().toISOString() }) }, env, fetchImpl);
    return 'subscription updated';
  }
  return 'ignored';
}

async function readRaw(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) { const b = typeof c === 'string' ? Buffer.from(c) : c; size += b.length; if (size > MAX_BODY) throw Object.assign(new Error('too large'), { status: 413 }); chunks.push(b); }
  if (chunks.length) return Buffer.concat(chunks).toString('utf8');
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  return typeof req.body === 'string' ? req.body : '';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method not allowed'); }
  try {
    const raw = await readRaw(req);
    if (!verify(raw, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)) { res.statusCode = 400; return res.end('Invalid signature'); }
    const result = await handleEvent(JSON.parse(raw));
    res.statusCode = 200; res.end(result);
  } catch (e) {
    console.error('stripe-webhook', e && e.message);
    res.statusCode = e && e.status === 413 ? 413 : 500; res.end('Webhook error'); // Stripe retries 5xx
  }
};
module.exports.config = { api: { bodyParser: false } };
module.exports._test = { verify, orderFromSession, handleEvent };
