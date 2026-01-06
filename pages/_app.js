import "/styles/globals.css";
import "/styles/landing.css";
import "/styles/dashboard.css";
import "/styles/form.css";

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
        
        {/* Font Awesome Kit */}
        <script 
          src="https://kit.fontawesome.com/7d09bbd1e9.js" 
          crossOrigin="anonymous" 
          async
        ></script>
      </Head>

      <Component {...pageProps} />
    </>
  );
}