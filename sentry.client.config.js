import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://f624d351849b22d4fea6e608024b25b2@o4510901536620544.ingest.de.sentry.io/4510901543764048",

  // Sample 10% of requests for performance monitoring in production; 100% in dev
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,

  // Only record replays when an error occurs, not for normal sessions
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,

  // Do not stream console logs or attach PII to error reports
  enableLogs: false,
  sendDefaultPii: false,

  integrations: [
    Sentry.replayIntegration(),
  ],
});
