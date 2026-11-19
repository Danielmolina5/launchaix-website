// Vercel function: /api/support-notify
// Called by a Supabase Database Webhook whenever a support message is added.
//  - Customer wrote  → email alert to the private support inbox (SUPPORT_EMAIL).
//  - Support replied → email the customer that a reply is waiting in their account.
// The support inbox address exists only in Vercel env vars. It is never sent to
// browsers, never used as Reply-To, and never shown to customers.
// Env: SUPPORT_WEBHOOK_SECRET, SUPPORT_EMAIL, SUPPORT_FROM, RESEND_API_KEY,
//      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL (e.g. https://www.launchaix.com)
const crypto = require('crypto');
const MAX_BODY = 64 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const html = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const oneLine = (s, n = 120) => String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, n);

function secretOk(given, expected) {
  if (!given || !expected) return false;
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

async function getTicket(id, env, fetchImpl) {
  const r = await fetchImpl(`${env.SUPABASE_URL}/rest/v1/tickets?id=eq.${encodeURIComponent(id)}&select=id,number,subject,topic,email,user_id,profiles(first_name,last_name,business_name)`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  const rows = await r.json();
  return rows[0] || null;
}

function buildEmail(msg, t, env) {
  const site = (env.SITE_URL || 'https://www.launchaix.com').replace(/\/+$/, '');
  const num = `#${Number(t.number) || ''}`;
  const subject = oneLine(t.subject);
  const box = b => `<div style="margin:16px 0;padding:14px 16px;border-radius:12px;background:#F6F3F9;white-space:pre-wrap;font:15px/1.5 -apple-system,Segoe UI,Arial,sans-serif;color:#15101D">${html(b)}</div>`;
  const btn = (href, label) => `<a href="${html(href)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#C65BD0;color:#fff;text-decoration:none;font:600 15px -apple-system,Segoe UI,Arial,sans-serif">${html(label)}</a>`;
  if (msg.author_role === 'customer') {
    const p = t.profiles || {};
    const who = oneLine([p.first_name, p.last_name].filter(Boolean).join(' ') || 'A customer', 80);
    return {
      to: env.SUPPORT_EMAIL,
      subject: `[Ticket ${num}] ${subject}`,
      html: `<p style="font:15px -apple-system,Segoe UI,Arial,sans-serif"><b>${html(who)}</b>${p.business_name ? ' · ' + html(oneLine(p.business_name, 80)) : ''} (${html(t.email || '')}) wrote:</p>${box(msg.body)}${btn(`${site}/admin.html#t=${t.id}`, 'Reply in the support desk')}<p style="font:12px -apple-system,Arial,sans-serif;color:#888">Please reply in the support desk so the customer sees it in their account.</p>`,
    };
  }
  if (!t.email) return null;
  return {
    to: t.email,
    subject: `New reply to your request ${num}: ${subject}`,
    html: `<p style="font:15px -apple-system,Segoe UI,Arial,sans-serif">LaunchAI Support replied to your request <b>${html(subject)}</b>.</p>${btn(`${site}/account.html#support/${t.id}`, 'View the reply')}<p style="font:12px -apple-system,Arial,sans-serif;color:#888">For your security, replies are only shown in your LaunchAI account. Please don't reply to this email.</p>`,
  };
}

async function sendEmail(mail, env, fetchImpl) {
  const r = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.SUPPORT_FROM, to: [mail.to], subject: mail.subject, html: mail.html }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}`);
}

async function handle(payload, env = process.env, fetchImpl = fetch) {
  if (!payload || payload.type !== 'INSERT' || payload.table !== 'ticket_messages' || !payload.record) return 'ignored';
  const msg = payload.record;
  if (!UUID.test(String(msg.ticket_id)) || !['customer', 'support'].includes(msg.author_role)) return 'ignored';
  const t = await getTicket(msg.ticket_id, env, fetchImpl);
  if (!t) return 'ticket not found';
  const mail = buildEmail(msg, t, env);
  if (!mail || !mail.to) return 'no recipient';
  await sendEmail(mail, env, fetchImpl);
  return 'sent';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.statusCode = 405; return res.end('Method not allowed'); }
  if (!secretOk(req.headers['x-webhook-secret'], process.env.SUPPORT_WEBHOOK_SECRET)) { res.statusCode = 401; return res.end('Unauthorized'); }
  try {
    const chunks = []; let size = 0;
    for await (const c of req) { const b = typeof c === 'string' ? Buffer.from(c) : c; size += b.length; if (size > MAX_BODY) { res.statusCode = 413; return res.end('Too large'); } chunks.push(b); }
    const raw = chunks.length ? Buffer.concat(chunks).toString('utf8') : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));
    const result = await handle(JSON.parse(raw));
    res.statusCode = 200; res.end(result);
  } catch (e) {
    console.error('support-notify', e && e.message);
    res.statusCode = 500; res.end('Error');
  }
};
module.exports.config = { api: { bodyParser: false } };
module.exports._test = { secretOk, buildEmail, handle, oneLine, html };
