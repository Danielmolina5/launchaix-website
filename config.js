/* LaunchAI site settings.
   While SUPABASE_URL is empty the site runs in DEMO MODE:
   accounts and orders are saved only in this browser and no card is charged. */
window.LX_CONFIG = {
  // Supabase (accounts + orders). Project Settings → API.
  SUPABASE_URL: 'https://kqjxxkqhjrtdfkyhpfak.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_HObN5Xvs0BeOde58zC-QtQ_JnbKhbeb',

  // Stripe Payment Links, one per paid plan (https://buy.stripe.com/...)
  STRIPE_LINKS: {
    leads:  'https://buy.stripe.com/00w14o3IL8X5anHd8Sf3a05',   // $49.99/month subscription with a 7-day free trial
    video1: 'https://buy.stripe.com/fZufZi3IL2yH9jD7Oyf3a06',   // $59.99
    video2: 'https://buy.stripe.com/cNidRafrt6OX7bv3yif3a07',   // $99.99
    video3: 'https://buy.stripe.com/28EeVe0wzgpx1Rbc4Of3a08',   // $134.99
    seo:    'https://buy.stripe.com/dRm6oIcfhddl2Vf1qaf3a09',   // $349.99/month
    web:    'https://buy.stripe.com/14AaEY5QTa190N7ecWf3a0a',   // $199 website deposit (one-time)
  },

  // Stripe customer portal login link (lets subscribers cancel or update their card)
  STRIPE_PORTAL_URL: 'https://billing.stripe.com/p/login/9B66oI0wz4GPdzT4Cmf3a00',

  // Where lead / request forms are emailed
  FORMSPREE: 'https://formspree.io/f/mojraynk',
};
