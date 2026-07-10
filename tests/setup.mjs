import { vi } from "vitest";

const env = {
  MAIL_FOOTER_ADDRESS: "CharlotteEfoil · Charlotte, NC",
  TRACKING_IP_SALT: "test-salt",
  ALLOWED_ORIGIN: "https://www.charlotteefoil.com",
  SITE_URL: "https://charlotte-efoil.netlify.app",
  SES_FROM_EMAIL: "CharlotteEfoil <hello@charlotteefoil.com>",
};

globalThis.Netlify = {
  env: {
    get: vi.fn((key) => env[key] ?? null),
  },
};
