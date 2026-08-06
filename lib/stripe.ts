import Stripe from "stripe";

// Real Stripe when a test secret key is configured; otherwise null → the
// checkout falls back to a mock "always succeeds" payment (build/test with no
// account). Add STRIPE_SECRET_KEY (sk_test_…) to .env to enable real test-mode
// processing — no rework needed.
const key = process.env.STRIPE_SECRET_KEY;

export const stripe = key ? new Stripe(key) : null;
export const stripeEnabled = !!stripe;
