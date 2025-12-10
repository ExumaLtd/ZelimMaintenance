// pages/_app.js

import "../styles/globals.css";
import "../styles/landing.css";      // Login portal styles
import "../styles/maintenance.css"; // Client portal styles
import "../styles/checklist.css";   // <--- ADDED: Styles for the dedicated form pages
import Head from "next/head";

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon/ZelimFavicon_192x192.png" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}