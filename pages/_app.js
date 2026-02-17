import "../styles/globals.css";
import "../styles/landing.css";
import "../styles/dashboard.css";
import "../styles/form.css";
import "../styles/form-complete.css";
import "../styles/voice-input.css";

import Head from "next/head";
import { Montserrat } from "next/font/google";
import { useEffect } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function MyApp({ Component, pageProps }) {

  useEffect(() => {
    // Standard fix to ensure mobile doesn't "jump" down on load
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className={montserrat.className}>
      <Head>
        <link rel="icon" href="/favicon/ZelimFavicon_192x192.png" />
      </Head>

      <Component {...pageProps} />
      <SpeedInsights />
      <Analytics />
    </div>
  );
}