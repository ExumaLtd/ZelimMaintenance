// pages/index.js
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Html5QrcodeScanner } from "html5-qrcode";

export default function Home() {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const router = useRouter();

  // -----------------------------
  // FORM SUBMIT LOGIC
  // -----------------------------
  const handleFormSubmit = async (e, codeOverride = null) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const code = codeOverride || accessCode.trim();
    if (!code) {
      setError('Please enter your access code.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/swift-resolve-pin?pin=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid access code.');
        setIsSubmitting(false);
        return;
      }

      const redirectToken = data.publicToken;

      if (!redirectToken) {
        setError('This unit is missing a public token.');
        setIsSubmitting(false);
        return;
      }

      return router.push(`/swift/${redirectToken}`);

    } catch (err) {
      console.error('PIN verification error:', err);
      setError('A network error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  // -----------------------------
  // LIVE QR SCANNER LOGIC
  // -----------------------------
  useEffect(() => {
    let scanner = null;
    if (showScanner) {
      // Initialize scanner inside the 'reader' div
      scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        aspectRatio: 1.0
      });

      scanner.render((decodedText) => {
        // SUCCESS: The camera "locked on" to a code
        let finalCode = decodedText;
        
        // If the QR contains a full URL, extract just the token/code at the end
        if (decodedText.includes('/')) {
            finalCode = decodedText.split('/').pop();
        }

        setAccessCode(finalCode);
        setShowScanner(false);
        scanner.clear(); 
        
        // Auto-submit the code immediately
        handleFormSubmit(null, finalCode);
      }, (err) => {
        // Continuous scanning - no need to log errors for every frame
      });
    }

    // Cleanup: Turn off camera if user navigates away or closes scanner
    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error("Scanner cleanup error:", e));
      }
    };
  }, [showScanner]);

  return (
    <div className="landing-scope">
      <Head>
        <title>SWIFT Maintenance Portal</title>
      </Head>

      <div className="landing-root">

        {/* LEFT HERO */}
        <div className="landing-hero">
          <div className="landing-hero-inner" style={{ position: "relative" }}>
            <Image
              src="/images/swiftmaintenanceportal-hero.png"
              alt="SWIFT maintenance portal hero image"
              fill
              priority
              quality={100}
              sizes="50vw"
              style={{ objectFit: "cover", objectPosition: "center" }}
            />
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="landing-content">
          <div className="landing-main">

            <div className="landing-header">
              <h1 className="landing-title">
                <span>SWIFT</span>
                <span>maintenance portal</span>
              </h1>
              <p className="landing-subtitle">
                For authorised engineers carrying out official inspections and scheduled servicing.
              </p>
            </div>

            {/* LIVE SCANNER VIEW - Only shows when button is clicked */}
            {showScanner && (
              <div className="scanner-wrapper" style={{ width: '100%', maxWidth: '360px', marginBottom: '20px' }}>
                <div id="reader"></div>
                <button 
                  type="button" 
                  className="qr-button" 
                  style={{ marginTop: '10px', width: '100%', opacity: 0.6 }}
                  onClick={() => setShowScanner(false)}
                >
                  Cancel Scan
                </button>
              </div>
            )}

            {!showScanner && (
              <form onSubmit={handleFormSubmit} className="form-stack">
                <div className={`input-wrapper ${error ? 'has-error' : ''}`}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter your access code"
                    value={accessCode}
                    onChange={(e) => {
                      setAccessCode(e.target.value);
                      setError('');
                    }}
                    disabled={isSubmitting}
                  />
                  {error && <p className="error-text">{error}</p>}
                </div>

                <button type="submit" className="primary-btn">
                  {isSubmitting ? 'Verifying...' : 'Enter portal'}
                </button>

                {/* QR CODE LOGIN SECTION */}
                <div className="qr-login-container">
                  <button 
                    type="button" 
                    className="qr-button"
                    onClick={() => setShowScanner(true)}
                  >
                    Log in with QR code
                  </button>
                </div>
              </form>
            )}
          </div>

          <footer className="landing-footer">
            <Link
              href="https://www.zelim.com"
              target="_blank"
              rel="noopener noreferrer"
              className="logo-link"
            >
              <Image
                src="/logo/zelim-logo.svg"
                alt="Zelim Logo"
                width={120}
                height={40}
                className="zelim-logo"
              />
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}