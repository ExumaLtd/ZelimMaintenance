// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://f624d351849b22d4fea6e608024b25b2@o4510901536620544.ingest.de.sentry.io/4510901543764048",

  // Sample 10% of requests for performance monitoring in production; 100% in dev
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,

  // Do not stream console logs to Sentry
  enableLogs: false,

  // Do not attach IP addresses or user identifiers to error reports
  sendDefaultPii: false,
});
