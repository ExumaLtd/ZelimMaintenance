// pages/_app.js

import "../styles/globals.css";
import "../styles/landing.css";
import "../styles/maintenance.css";
import "../styles/checklist.css";

import Head from "next/head";

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        {/* Google Font — VALIDATED */}
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Favicon — ensure the file exists */}
        <link rel="icon" href="/favicon/ZelimFavicon_192x192.png" />
      </Head>

      <Component {...pageProps} />
    </>
  );
}
