"""Generates the SEO service pages. Run: python3 backend/build-service-pages.py
Edit the PAGES list below, then re-run and commit."""
import json, html, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
SITE = 'https://www.launchaix.com'
PIXEL = '2270715980511348'

PAGES = [
  dict(
    slug='real-estate-marketing-miami', plan='growth_re', nav='Real estate',
    title='Real Estate Marketing Agency in Miami | LaunchAI',
    desc='Real estate marketing in Miami for agents, teams and brokerages: seller leads, Instagram & TikTok growth, testimonial videos, websites and AI follow-up.',
    kw='Real estate marketing · Miami',
    h1='Real estate marketing in Miami that turns attention into <span class="serif gt">listings.</span>',
    sub='LaunchAI is a South Florida marketing agency for realtors, teams and brokerages. We grow your personal brand, bring you seller and buyer opportunities, and follow up with every lead so more conversations become appointments.',
    price='Custom growth plans · from $49.99/mo',
    cta='Get my real estate growth plan',
    features=[('🤳','Personal brand & social media','Instagram and TikTok strategy, listing reels, market updates and branded covers in English and Spanish.'),
              ('📲','Seller lead generation','Daily expired-listing and price-cut leads on WhatsApp for your ZIP codes, ready to call.'),
              ('🎥','Video content','Testimonial videos from your real clients and promotional property videos.'),
              ('🖥️','Agent & team websites','Mobile-first sites with home search, valuations, lead forms and booking.'),
              ('🤖','AI follow-up & appointment setting','Every new lead gets a fast response by call or text, so you only talk to people ready to move.'),
              ('⭐','Reputation & reviews','A simple process that invites happy clients to leave genuine Google reviews.')],
    steps=[('Strategy call','We review your market, brand and current marketing.'),('Growth plan','You get a clear plan with deliverables and pricing.'),('Launch','We build and run your content, campaigns and follow-up.'),('Report & refine','Monthly reporting and ongoing improvements.')],
    body='''<p>Miami is one of the most competitive real estate markets in the country. Buyers and sellers scroll past dozens of agents every day, so the agents who win are the ones people recognize, trust and can reach instantly.</p>
<p>We combine the pieces most agents try to manage on their own (content, social media, lead generation, a website that converts and fast follow-up) into one system run by one team.</p>
<p>A recent example: we rebranded Miami realtor Nümy Peña with a new professional username, branded story covers and AI apartment-tour videos. Her rebranded Instagram profile, @realtor_numy_, grew to 11K followers. Individual results vary.</p>''',
    faq=[('Do you only work with agents in Miami?','No. We are based in South Florida and work with agents, teams and brokerages across the US. Many of our services are delivered remotely.'),
         ('Can you create content in Spanish?','Yes. We create content, captions and lead scripts in English and Spanish.'),
         ('How much does real estate marketing cost?','Single services start at $49.99/month for daily leads and $59.99 for a testimonial video. Complete growth plans are custom quoted around your goals and budget.')]),
  dict(
    slug='expired-listing-leads', plan='leads', nav='Seller leads',
    title='Expired Listing Leads Delivered Daily on WhatsApp | LaunchAI',
    desc='Get expired listing leads with owner contact info, price-cut sellers and market stats for up to 3 ZIP codes, delivered on WhatsApp every morning. 7 days free.',
    kw='Expired listing leads · Daily on WhatsApp',
    h1='Expired listing leads on your WhatsApp <span class="serif gt">every morning.</span>',
    sub='Stop spending hours searching for sellers. Every morning you get a PDF with expired listings and owner contact information, sellers with recent price cuts, and market stats for your ZIP codes, plus ready-to-send scripts in English and Spanish.',
    price='$49.99/month · 7 days free · cancel anytime',
    cta='Start my 7-day free trial',
    features=[('🏚️','Expired listings with owner info','Properties that came off the market, with owner name and phone number where available.'),
              ('📉','Sellers with price cuts','Motivated sellers who recently lowered their price.'),
              ('📊','Market stats for your ZIPs','A quick view of your market for up to 3 ZIP codes.'),
              ('🗣️','EN & ES scripts','Ready-to-send call and text scripts in English and Spanish.'),
              ('📲','Delivered on WhatsApp','Open it on your phone, review and start calling.'),
              ('🔓','Cancel anytime','Monthly plan with no contract.')],
    steps=[('Subscribe','Start your 7-day free trial.'),('Activate on WhatsApp','Message us from your account and tell us your ZIP codes.'),('Get your PDF','Your report arrives every morning.'),('Call sellers','Use the scripts to start conversations.')],
    body='''<p>Expired listings are one of the best sources of motivated sellers. The owner wanted to sell, the listing did not work, and many are open to a new agent with a new plan.</p>
<p>The challenge is finding them every day before other agents do. Our daily report does the searching for you and organizes the opportunities so you can review them in minutes.</p>
<p><b>Important:</b> lead data comes from third-party sources and is usually updated daily, though some sources update every other day. The number of new leads depends on market activity, and some days may have few or none. You are responsible for following Do Not Call, TCPA and telemarketing rules when contacting anyone in the report.</p>''',
    faq=[('How many leads will I get?','It varies day to day with market activity. We never guarantee a specific number of leads, appointments or sales.'),
         ('Which areas do you cover?','You choose up to 3 ZIP codes in your market when you activate on WhatsApp.'),
         ('Is there a free trial?','Yes. You get 7 days free, then $49.99/month until you cancel.')]),
  dict(
    slug='testimonial-videos', plan='video2', nav='Videos',
    title='Testimonial Videos for Small Business & Realtors | LaunchAI',
    desc='Done-for-you testimonial videos from $59.99. We script, produce and edit videos based on genuine customer feedback, formatted for Reels, TikTok, ads and your website.',
    kw='Testimonial videos · Done for you',
    h1='Testimonial videos that help your business <span class="serif gt">earn trust.</span>',
    sub='People trust people. We turn your real customers’ feedback into polished, captioned videos for Instagram Reels, TikTok, ads and your website. We write, produce and edit; you approve and post.',
    price='1 video $59.99 · 2 videos $99.99 · 3 videos $134.99',
    cta='Get 2 videos for $99.99',
    features=[('🔎','Brand & feedback review','We study your brand, website and approved customer feedback.'),
              ('✍️','Script & creative direction','Written around your brand and your customers’ real words.'),
              ('🎬','Professional editing','Captions, branding and music, ready to post.'),
              ('📱','Every format','Vertical for Reels and TikTok, plus versions for ads and your website.'),
              ('🔁','2 revisions included','Per video, so it feels exactly right.'),
              ('✨','AI promotional videos','Also available: clearly labeled AI presenter videos, custom quote.')],
    steps=[('Choose a package','1, 2 or 3 videos.'),('Send your materials','Your logo, website and the customer feedback you want to feature.'),('We produce','Script, edit and captions.'),('Approve & post','Up to 2 revisions per video.')],
    body='''<p>A strong testimonial does what an ad cannot: it shows a real person explaining why they chose you. That is why testimonial videos often outperform polished brand ads on social media.</p>
<p>Testimonials are based only on genuine, approved customer feedback. If we create illustrative or AI-generated promotional content, it is always clearly labeled and never presented as a real customer review.</p>''',
    faq=[('How much do testimonial videos cost?','$59.99 for 1 video, $99.99 for 2 videos ($50 each) and $134.99 for 3 videos ($45 each).'),
         ('What do I need to provide?','Your brand assets and the genuine customer feedback or approved testimonials you want to feature.'),
         ('How many revisions are included?','2 revisions per video.')]),
  dict(
    slug='seo-services', plan='seo', nav='SEO',
    title='Local SEO & Online Reputation Management | LaunchAI',
    desc='Local SEO, Google Business Profile optimization and genuine review campaigns for $349.99/month. Be easy to find and easy to trust. Cancel anytime.',
    kw='Local SEO · Online reputation',
    h1='Be easy to find. <span class="serif gt">Easy to trust.</span>',
    sub='When customers search for what you do, they compare. We improve your visibility in local search and on Google Maps, and help you build a reputation that makes choosing you the obvious decision.',
    price='$349.99/month · cancel anytime',
    cta='Get SEO & Reputation',
    features=[('📍','Local SEO','On-page and technical improvements to help you rank in local searches.'),
              ('🏪','Google Business Profile','Categories, services, photos, posts and accurate business details.'),
              ('📈','Search visibility','Ongoing improvements based on what your customers search for.'),
              ('🌱','Organic review campaigns','A friendly process that invites real customers to share honest reviews.'),
              ('💬','Review monitoring & replies','Alerts and professional response support.'),
              ('🏆','Brand credibility','Consistent, trustworthy presence across Google, Yelp and Trustpilot.')],
    steps=[('Audit','We review your profile, website and reviews.'),('Optimize','Profile, listings and on-page fixes.'),('Grow reviews','Organic review requests to your real customers.'),('Monthly reporting','What we did and what changed.')],
    body='''<p>Most local customers start with a search. If your Google Business Profile is incomplete or your reviews are thin, they choose the business that looks more established.</p>
<p>We never buy, write or filter reviews. Every review comes from a real customer in their own words. Search rankings and review volume depend on many factors and are not guaranteed.</p>''',
    faq=[('Is the SEO plan monthly?','Yes. $349.99/month, billed monthly, cancel anytime.'),
         ('Do you guarantee first place on Google?','No one honestly can. We focus on proven local SEO work and a stronger reputation, and report what changes each month.'),
         ('Do you buy reviews?','Never. We help you invite real customers to leave honest reviews.')]),
  dict(
    slug='website-design', plan='web', nav='Websites',
    title='Website Design for Realtors & Small Businesses | LaunchAI',
    desc='Professional, mobile-first websites from $599.99 with lead forms, WhatsApp, online booking, SEO setup and analytics. Reserve your project with a $199 deposit.',
    kw='Website design · Built to get customers',
    h1='Your website should help you <span class="serif gt">get customers.</span>',
    sub='Not just a website that looks good. We design fast, mobile-first websites with lead forms, WhatsApp, online booking and analytics built in, ready to connect to AI callers and automated follow-up.',
    price='From $599.99 · reserve with a $199 deposit',
    cta='Reserve with a $199 deposit',
    features=[('🎨','Custom design','A premium design built around your brand.'),
              ('📱','Mobile-first','Fast and easy to use on the phones your customers use.'),
              ('🎯','Landing page','A focused page for your ads and offers.'),
              ('📝','Lead capture & WhatsApp','Forms and one-tap WhatsApp so visitors become inquiries.'),
              ('📅','Online booking','Customers book straight into your calendar.'),
              ('🔎','SEO setup & analytics','A search-friendly structure and visitor tracking from day one.')],
    steps=[('Reserve','$199 deposit, credited toward your total.'),('Plan','We confirm pages, features and final price in writing.'),('Design & build','You review and request changes.'),('Launch','We publish and connect your forms and booking.')],
    body='''<p>Most small business websites lose visitors every day: there is no clear way to book, messages go unanswered and new leads are forgotten. We build websites around one goal: turning visitors into customers.</p>
<p>Packages start at $599.99. Extra pages, online stores, real estate home search and custom integrations are quoted separately. Your final price is confirmed in writing before work begins, and if we cannot agree on a quote, your deposit is refunded in full.</p>''',
    faq=[('How much does a website cost?','Packages start at $599.99. Your final price depends on pages and features and is confirmed in writing before we start.'),
         ('What is the $199 deposit?','It reserves your project and is credited toward your final price.'),
         ('Can my website connect to an AI caller?','Yes. Lead forms and booking can connect to AI calls and text follow-up (custom quote).')]),
]

PIXEL_CODE = f'''<script>!function(f,b,e,v,n,t,s){{if(f.fbq)return;n=f.fbq=function(){{n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)}};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','{PIXEL}');fbq('track','PageView');</script>
<noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id={PIXEL}&ev=PageView&noscript=1"></noscript>'''


def page(p):
    url = f"{SITE}/{p['slug']}"
    esc = html.escape
    ld = [
        {'@context': 'https://schema.org', '@type': 'Service', 'name': p['title'].split(' | ')[0], 'description': p['desc'], 'url': url,
         'provider': {'@id': f'{SITE}/#org', '@type': 'ProfessionalService', 'name': 'LaunchAI', 'url': SITE},
         'areaServed': [{'@type': 'City', 'name': 'Miami'}, {'@type': 'Country', 'name': 'United States'}]},
        {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in p['faq']]},
        {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': p['nav'], 'item': url}]},
    ]
    feats = ''.join(f'<div class="card"><div class="e">{e}</div><h3>{esc(t)}</h3><p>{esc(d)}</p></div>' for e, t, d in p['features'])
    steps = ''.join(f'<li><div><b>{esc(t)}</b><span>{esc(d)}</span></div></li>' for t, d in p['steps'])
    faqs = ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in p['faq'])
    rel = ''.join(f'<a href="/{o["slug"]}">{esc(o["title"].split(" | ")[0])}<span>→</span></a>' for o in PAGES if o['slug'] != p['slug'])
    navl = ''.join(f'<a class="lk" href="/{o["slug"]}">{esc(o["nav"])}</a>' for o in PAGES if o['slug'] != p['slug'])
    buy = f'/?buy={p["plan"]}'
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>{esc(p['title'])}</title>
<meta name="description" content="{esc(p['desc'])}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website"><meta property="og:url" content="{url}">
<meta property="og:title" content="{esc(p['title'])}"><meta property="og:description" content="{esc(p['desc'])}">
<meta property="og:image" content="{SITE}/og-image.png"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#FAF7FC">
<link rel="icon" href="/symbol.png">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/services.css?v=1">
{''.join('<script type="application/ld+json">' + json.dumps(x, ensure_ascii=False) + '</script>' for x in ld)}
{PIXEL_CODE}
</head>
<body>
<header class="nav"><div class="wrap"><a href="/"><img src="/logo-ink.png" alt="LaunchAI"></a><nav>{navl}<a class="btn btn-ink" href="/?buy=call">Book a call</a></nav></div></header>
<main class="wrap">
  <p class="crumb"><a href="/">Home</a> › {esc(p['nav'])}</p>
  <section class="hero">
    <span class="kw">{esc(p['kw'])}</span>
    <h1>{p['h1']}</h1>
    <p class="sub">{esc(p['sub'])}</p>
    <span class="pricepill">{esc(p['price'])}</span>
    <div class="ctas"><a class="btn btn-main" href="{buy}">{esc(p['cta'])} →</a><a class="btn btn-soft" href="/?buy=call">Book a free call</a></div>
  </section>
  <section><h2>What you get</h2><div class="grid">{feats}</div></section>
  <section><h2>How it works</h2><ol class="steps">{steps}</ol></section>
  <section class="prose"><h2>Why it works</h2>{p['body']}</section>
  <section><div class="buy"><div><h2>{esc(p['cta'])}</h2><p>{esc(p['price'])}</p></div><div><a class="btn btn-main" href="{buy}" style="width:100%">{esc(p['cta'])} →</a><p class="fine">Secure checkout by Stripe. See our <a href="/terms-of-service">terms</a>.</p></div></div></section>
  <section><h2>Questions</h2><div class="faqs">{faqs}</div></section>
  <section><h2>More from LaunchAI</h2><div class="related">{rel}</div></section>
</main>
<footer><div class="wrap"><nav><a href="/">Home</a>{''.join(f'<a href="/{o["slug"]}">{esc(o["nav"])}</a>' for o in PAGES)}<a href="/privacy">Privacy</a><a href="/terms-of-service">Terms</a></nav><span>© 2026 LaunchAI, a brand of SENDAI LLC · Sunrise, FL 33351 · contact@launchaix.com</span></div></footer>
<script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
'''


for p in PAGES:
    open(ROOT + p['slug'] + '.html', 'w').write(page(p))

# sitemap
urls = [('/', '1.0')] + [('/' + p['slug'], '0.8') for p in PAGES] + [('/terms-of-service', '0.3'), ('/privacy', '0.3')]
open(ROOT + 'sitemap.xml', 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    ''.join(f'  <url><loc>{SITE}{u}</loc><lastmod>2026-11-20</lastmod><priority>{pr}</priority></url>\n' for u, pr in urls) + '</urlset>\n')
print('built', [p['slug'] for p in PAGES])
