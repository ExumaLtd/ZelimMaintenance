import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://f624d351849b22d4fea6e608024b25b2@o4510901536620544.ingest.de.sentry.io/4510901543764048",
  tracesSampleRate: 1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  enableLogs: true,
  integrations: [
    Sentry.replayIntegration(),
  ],
});
