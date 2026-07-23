import "../styles/tailwind.css";
import "../styles/globals.css";
import "../styles/scanner.css";
import "../styles/dashboard.css";
import "../styles/form.css";
import "../styles/voice-input.css";

import Head from "next/head";
import { Montserrat, Roboto_Mono } from "next/font/google";
import { useEffect } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-montserrat",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-roboto-mono",
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
    <div className={`${montserrat.className} ${montserrat.variable} ${robotoMono.variable}`}>
      <Head>
        <title>Zelim Maintenance Portal</title>
        <link rel="icon" href="/favicon/ZelimFavicon_192x192.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#172F36" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Zelim Portal" />
        <link rel="apple-touch-icon" href="/favicon/ZelimFavicon_192x192.png" />
      </Head>

      <Component {...pageProps} />
      <SpeedInsights />
      <Analytics />
    </div>
  );
}