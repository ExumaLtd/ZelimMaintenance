import "/styles/globals.css";
import "/styles/landing.css";
import "/styles/dashboard.css";
import "/styles/form.css";

import Head from "next/head";
import Script from "next/script"; // Import this

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

      {/* Use Next.js Script component for the Font Awesome Kit */}
      <Script 
        src="https://kit.fontawesome.com/7d09bbd1e9.js" 
        crossOrigin="anonymous"
        strategy="afterInteractive" 
      />

      <Component {...pageProps} />
    </>
  );
}