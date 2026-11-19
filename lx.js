/* LaunchAI account layer: accounts, orders, payments (Stripe Payment Links), support tickets.
   Uses Supabase when config.js has keys. Otherwise runs a browser-only PREVIEW mode,
   which is refused on the real domain so fake accounts can never exist in production. */
(function () {
  const C = window.LX_CONFIG || {};
  const DEMO = !(C.SUPABASE_URL && C.SUPABASE_ANON_KEY);
  const LIVE_HOST = /(^|\.)launchaix\.com$/i.test(location.hostname);

  // Everything LaunchAI offers. paid:true = bought through a Stripe Payment Link.
  const PLANS = {
    leads:  { ic: '📲', name: 'Daily Real Estate Leads', price: '$49.99/mo', note: '7 days free', paid: true, sub: true, href: '/#leads', blurb: 'Expired listing leads on WhatsApp every morning' },
    video1: { ic: '🎥', name: '1 testimonial video', price: '$59.99', paid: true, href: '/#video', blurb: 'Done-for-you video' },
    video2: { ic: '🎥', name: '2 testimonial videos', price: '$99.99', note: 'Most popular', paid: true, href: '/#video', blurb: 'Save $19.99' },
    video3: { ic: '🎥', name: '3 testimonial videos', price: '$134.99', paid: true, href: '/#video', blurb: 'Save $44.98' },
    seo:    { ic: '⭐', name: 'SEO & Online Reputation', price: '$349.99/mo', paid: true, sub: true, href: '/#seo', blurb: 'Get found and trusted locally' },
    web:    { ic: '🖥️', name: 'Professional Website', price: '$199 deposit', paid: true, href: '/#websites', blurb: 'From $599.99 · deposit credited to your total' },
    ai:     { ic: '✨', name: 'AI promotional video', price: 'Custom quote', href: '/#video', blurb: 'AI presenter for your brand' },
    growth_re: { ic: '🏡', name: 'Growth Marketing for Real Estate', price: 'Custom', href: '/#growth-re', blurb: 'Complete strategy for realtors' },
    growth_sb: { ic: '🏪', name: 'Growth Marketing for Small Businesses', price: 'Custom', href: '/#growth-sb', blurb: 'Complete strategy for local businesses' },
    growth: { ic: '🚀', name: 'Custom Growth Strategy', price: 'Custom', href: '/#growth', blurb: 'Built around your goals' },
    call:   { ic: '📅', name: 'Free strategy call', price: 'Free', href: 'index.html', blurb: '30 minutes, no obligation' },
  };
  const TOPICS = { order: '📦 Order', billing: '💳 Billing', leads: '📲 Daily leads', website: '🖥️ Website', technical: '🛠️ Technical', other: '💬 Other' };
  const ORDER_STATUSES = ['requested', 'paid', 'in_progress', 'delivered', 'trialing', 'active', 'past_due', 'canceled', 'review'];

  let sb = null, _user = null;
  const listeners = [];
  const emit = () => listeners.forEach(f => { try { f(_user); } catch (e) {} });
  const E = (code, msg) => Object.assign(new Error(msg), { code });
  const clean = (v, max) => String(v == null ? '' : v).replace(/\u0000/g, '').trim().slice(0, max);
  const need = () => { if (!_user) throw E('auth', 'Please sign in.'); };

  /* ---------- preview store (this browser only) ---------- */
  const blank = () => ({ users: {}, session: null, orders: [], tickets: [], seq: 1000 });
  const db = () => { try { return Object.assign(blank(), JSON.parse(localStorage.getItem('lx-demo')) || {}); } catch (e) { return blank(); } };
  const save = d => { try { localStorage.setItem('lx-demo', JSON.stringify(d)); } catch (e) {} };
  const uid = () => 'demo-' + Math.random().toString(36).slice(2, 10);
  const now = () => new Date().toISOString();

  const mapUser = u => u ? Object.assign({}, u.user_metadata || {}, { id: u.id, email: u.email }) : null;
  const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.crossOrigin = 'anonymous'; s.onload = res; s.onerror = () => rej(E('network', 'Could not load the account service.')); document.head.appendChild(s); });

  const ready = (async () => {
    if (DEMO) {
      if (LIVE_HOST) throw E('config', 'Accounts are not set up yet. Please contact us.');
      const d = db(); _user = d.session ? d.users[d.session] || null : null; return;
    }
    await load('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js');
    sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
    const { data } = await sb.auth.getSession();
    _user = mapUser(data.session && data.session.user);
    sb.auth.onAuthStateChange((ev, s) => { _user = mapUser(s && s.user); LX.lastAuthEvent = ev; emit(); });
  })();

  // Ticket helpers shared by preview + live
  const shapeTicket = t => {
    const msgs = (t.ticket_messages || t.messages || []).slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
    const last = msgs[msgs.length - 1];
    const lastSupport = msgs.filter(m => m.author_role === 'support').pop();
    return Object.assign({}, t, {
      messages: msgs, last_message: last ? last.body : '', last_at: last ? last.created_at : t.created_at,
      unread: !!(lastSupport && (!t.customer_read_at || lastSupport.created_at > t.customer_read_at)),
      admin_unread: !!(last && last.author_role === 'customer' && t.status === 'open'),
    });
  };
  const PROFILE_FIELDS = ['first_name', 'last_name', 'phone', 'market', 'business_type', 'business_name', 'website'];

  const LX = {
    DEMO, PLANS, TOPICS, ORDER_STATUSES, config: C, lastAuthEvent: null,
    ready: () => ready,
    user: () => _user,
    onChange: f => listeners.push(f),

    /* ---------- auth ---------- */
    async signUp(f) {
      await ready;
      const email = clean(f.email, 254).toLowerCase(), password = String(f.password || '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw E('input', 'Please enter a valid email.');
      if (password.length < 8) throw E('input', 'Use at least 8 characters for your password.');
      const meta = {}; PROFILE_FIELDS.forEach(k => { meta[k] = clean(f[k], 120); });
      if (DEMO) {
        const d = db(); if (d.users[email]) throw E('exists', 'An account with this email already exists.');
        d.users[email] = Object.assign({ id: uid(), email }, meta); d.session = email; save(d); _user = d.users[email]; emit();
        return { user: _user, needsConfirm: false };
      }
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: meta, emailRedirectTo: new URL('account.html', location.href).href } });
      if (error) throw E(/registered|exists/i.test(error.message) ? 'exists' : 'auth', /registered|exists/i.test(error.message) ? 'An account with this email already exists.' : 'Could not create your account. Please try again.');
      if (data.user && data.user.identities && data.user.identities.length === 0) throw E('exists', 'An account with this email already exists.');
      if (data.session) { _user = mapUser(data.user); emit(); }
      return { user: mapUser(data.user), needsConfirm: !data.session };
    },
    async signIn(email, password) {
      await ready; email = clean(email, 254).toLowerCase();
      if (DEMO) { const d = db(); if (!d.users[email]) throw E('auth', 'Wrong email or password.'); d.session = email; save(d); _user = d.users[email]; emit(); return _user; }
      const { data, error } = await sb.auth.signInWithPassword({ email, password: String(password || '') });
      if (error) throw E('auth', /confirm/i.test(error.message) ? 'Please confirm your email first. Check your inbox.' : 'Wrong email or password.');
      _user = mapUser(data.user); emit(); return _user;
    },
    async signOut() { await ready; if (DEMO) { const d = db(); d.session = null; save(d); } else await sb.auth.signOut(); _user = null; emit(); },
    async resetPassword(email) {
      await ready; if (DEMO) return;
      // Same message whether or not the email exists (no account enumeration)
      await sb.auth.resetPasswordForEmail(clean(email, 254), { redirectTo: new URL('account.html', location.href).href }).catch(() => {});
    },
    async setPassword(password) {
      await ready; if (String(password || '').length < 8) throw E('input', 'Use at least 8 characters.');
      if (DEMO) return; const { error } = await sb.auth.updateUser({ password }); if (error) throw E('auth', 'Could not update your password. Please request a new link.');
    },
    async updateProfile(fields) {
      await ready; need(); fields = fields || {};
      const c = {}; PROFILE_FIELDS.forEach(k => { if (fields[k] != null) c[k] = clean(fields[k], 120); });
      if (DEMO) { const d = db(); Object.assign(d.users[_user.email], c); save(d); _user = d.users[_user.email]; emit(); return _user; }
      const { data, error } = await sb.auth.updateUser({ data: c }); if (error) throw E('auth', 'Could not save your details.');
      await sb.from('profiles').update(c).eq('id', _user.id);
      _user = mapUser(data.user); emit(); return _user;
    },

    /* ---------- orders + payments ---------- */
    async orders() {
      await ready; if (!_user) return [];
      if (DEMO) return db().orders.filter(o => o.user_id === _user.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
      const { data, error } = await sb.from('orders').select('*').eq('user_id', _user.id).order('created_at', { ascending: false });
      if (error) throw E('db', 'Could not load your orders.'); return data || [];
    },
    async addRequest(plan, note) {
      await ready; if (!_user || !PLANS[plan] || PLANS[plan].paid) return;
      const row = { user_id: _user.id, email: _user.email, plan, plan_name: PLANS[plan].name, amount: 0, status: 'requested', note: clean(note, 2000) || null };
      if (DEMO) { const d = db(); d.orders.push(Object.assign({ id: uid(), created_at: now() }, row)); save(d); return; }
      await sb.from('orders').insert(row);
    },
    async pay(plan, userOverride) {
      await ready; const u = userOverride || _user; const P = PLANS[plan];
      if (!u) throw E('auth', 'Please sign in first.');
      if (!P || !P.paid) throw E('plan', 'This plan is not available for online checkout.');
      if (DEMO) { LX.demoPay(plan); location.href = 'account.html?paid=1'; return; } // preview only; live goes to Stripe
      const link = (C.STRIPE_LINKS || {})[plan];
      if (!link || !/^https:\/\/(buy|checkout)\.stripe\.com\//.test(link)) throw E('config', 'Online payment for this plan is not set up yet. Please open a support request.');
      const url = new URL(link);
      url.searchParams.set('client_reference_id', u.id + '__' + plan);
      url.searchParams.set('prefilled_email', u.email);
      location.href = url.href;
    },

    /* ---------- support tickets (customer) ---------- */
    async tickets() {
      await ready; if (!_user) return [];
      if (DEMO) return db().tickets.filter(t => t.user_id === _user.id).map(shapeTicket).sort((a, b) => b.last_at.localeCompare(a.last_at));
      const { data, error } = await sb.from('tickets').select('*, ticket_messages(id,author_role,body,created_at)').eq('user_id', _user.id).order('updated_at', { ascending: false });
      if (error) throw E('db', 'Could not load your support requests.');
      return (data || []).map(shapeTicket).sort((a, b) => b.last_at.localeCompare(a.last_at));
    },
    async ticket(id) { const all = await LX.tickets(); const t = all.find(x => String(x.id) === String(id)); if (!t) throw E('notfound', 'We could not find that request.'); return t; },
    async createTicket({ topic, subject, body, order_id }) {
      await ready; need();
      topic = TOPICS[topic] ? topic : 'other'; subject = clean(subject, 120); body = clean(body, 5000);
      if (subject.length < 3) throw E('input', 'Please add a short subject.');
      if (!body) throw E('input', 'Please describe how we can help.');
      if (DEMO) {
        const d = db(); const t = { id: uid(), number: ++d.seq, user_id: _user.id, email: _user.email, topic, subject, order_id: order_id || null, status: 'open', customer_read_at: now(), created_at: now(), updated_at: now(), messages: [{ id: uid(), author_role: 'customer', body, created_at: now() }] };
        d.tickets.push(t); save(d); return shapeTicket(t);
      }
      const { data: t, error } = await sb.from('tickets').insert({ user_id: _user.id, topic, subject, order_id: order_id || null }).select().single();
      if (error) throw E('db', /too many/i.test(error.message) ? 'You have sent several requests recently. Please wait a little before opening another.' : 'Could not send your request. Please try again.');
      const { error: e2 } = await sb.from('ticket_messages').insert({ ticket_id: t.id, author_id: _user.id, author_role: 'customer', body });
      if (e2) throw E('db', 'Your request was created but the message failed. Please add it as a reply.');
      return LX.ticket(t.id);
    },
    async replyTicket(id, body) {
      await ready; need(); body = clean(body, 5000); if (!body) throw E('input', 'Please write a message.');
      if (DEMO) { const d = db(); const t = d.tickets.find(x => x.id === id && x.user_id === _user.id); if (!t) throw E('notfound', 'Request not found.'); if (t.status === 'closed') throw E('closed', 'This request is closed.'); t.messages.push({ id: uid(), author_role: 'customer', body, created_at: now() }); t.status = 'open'; t.updated_at = now(); save(d); return; }
      const { error } = await sb.from('ticket_messages').insert({ ticket_id: id, author_id: _user.id, author_role: 'customer', body });
      if (error) throw E('db', /too many/i.test(error.message) ? 'Please wait a moment before sending another message.' : 'Could not send your message. Please try again.');
    },
    async closeTicket(id) {
      await ready; need();
      if (DEMO) { const d = db(); const t = d.tickets.find(x => x.id === id && x.user_id === _user.id); if (t) { t.status = 'closed'; t.updated_at = now(); save(d); } return; }
      const { error } = await sb.rpc('close_ticket', { t: id }); if (error) throw E('db', 'Could not close this request.');
    },
    async markRead(id) {
      await ready; if (!_user) return;
      if (DEMO) { const d = db(); const t = d.tickets.find(x => x.id === id && x.user_id === _user.id); if (t) { t.customer_read_at = now(); save(d); } return; }
      await sb.rpc('mark_ticket_read', { t: id });
    },

    /* ---------- support desk (admins only; enforced by the database) ---------- */
    async isAdmin() {
      await ready; if (!_user) return false; if (DEMO) return true;
      const { data, error } = await sb.rpc('is_admin'); return !error && data === true;
    },
    async adminTickets() {
      await ready; need();
      if (DEMO) { const d = db(); return d.tickets.map(t => Object.assign(shapeTicket(t), { customer: Object.values(d.users).find(u => u.id === t.user_id) || {} })).sort((a, b) => b.last_at.localeCompare(a.last_at)); }
      const { data, error } = await sb.from('tickets').select('*, ticket_messages(id,author_role,body,created_at), profiles(first_name,last_name,phone,business_name)').order('updated_at', { ascending: false }).limit(300);
      if (error) throw E('db', 'Could not load tickets (admin access required).');
      return (data || []).map(t => Object.assign(shapeTicket(t), { customer: t.profiles || {} }));
    },
    async adminReply(id, body) {
      await ready; need(); body = clean(body, 5000); if (!body) throw E('input', 'Please write a reply.');
      if (DEMO) { const d = db(); const t = d.tickets.find(x => x.id === id); t.messages.push({ id: uid(), author_role: 'support', body, created_at: now() }); t.status = 'answered'; t.updated_at = now(); save(d); return; }
      const { error } = await sb.from('ticket_messages').insert({ ticket_id: id, author_id: _user.id, author_role: 'support', body });
      if (error) throw E('db', 'Could not send the reply.');
    },
    async adminSetTicketStatus(id, status) {
      await ready; need(); if (!['open', 'answered', 'closed'].includes(status)) return;
      if (DEMO) { const d = db(); const t = d.tickets.find(x => x.id === id); t.status = status; t.updated_at = now(); save(d); return; }
      const { error } = await sb.from('tickets').update({ status }).eq('id', id); if (error) throw E('db', 'Could not update the status.');
    },
    async adminOrders() {
      await ready; need();
      if (DEMO) return db().orders.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
      const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false }).limit(300);
      if (error) throw E('db', 'Could not load orders (admin access required).'); return data || [];
    },
    async adminSetOrderStatus(id, status) {
      await ready; need(); if (!ORDER_STATUSES.includes(status)) return;
      if (DEMO) { const d = db(); const o = d.orders.find(x => x.id === id); if (o) { o.status = status; save(d); } return; }
      const { error } = await sb.from('orders').update({ status }).eq('id', id); if (error) throw E('db', 'Could not update the order.');
    },

    /* ---------- preview-only helpers ---------- */
    demoPay(plan) {
      if (!DEMO || !_user || !PLANS[plan]) return;
      const P = PLANS[plan], d = db();
      d.orders.push({ id: uid(), user_id: _user.id, email: _user.email, plan, plan_name: P.name, amount: plan === 'leads' ? 0 : Math.round(parseFloat(P.price.replace(/[^0-9.]/g, '')) * 100), currency: 'usd', mode: P.sub ? 'subscription' : 'payment', status: P.sub ? (plan === 'leads' ? 'trialing' : 'active') : 'paid', created_at: now() });
      save(d);
    },
    demoAdvance(id) {
      if (!DEMO) return; const d = db(), o = d.orders.find(x => x.id === id); if (!o) return;
      const next = { requested: 'in_progress', paid: 'in_progress', in_progress: 'delivered', trialing: 'active', active: 'canceled' }[o.status]; if (next) { o.status = next; save(d); }
    },
    demoSupportReply(id) {
      if (!DEMO) return; const d = db(), t = d.tickets.find(x => x.id === id); if (!t) return;
      t.messages.push({ id: uid(), author_role: 'support', body: "Thanks for reaching out! We've looked into this and we're on it. We'll update you here as soon as it's done.", created_at: now() });
      t.status = 'answered'; t.updated_at = now(); save(d);
    },
    demoReset() { try { localStorage.removeItem('lx-demo'); } catch (e) {} _user = null; emit(); },
  };
  window.LX = LX;
})();
