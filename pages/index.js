// pages/index.js
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Html5Qrcode } from "html5-qrcode"; // Switched to low-level class

export default function Home() {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const router = useRouter();
  const scannerRef = useRef(null); // Keep track of the scanner instance

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
        // If it was a QR scan, we don't want to show an error on the main form
        if (!codeOverride) {
          setError(data.error || 'Invalid access code.');
        }
        setIsSubmitting(false);
        return;
      }

      const redirectToken = data.publicToken;

      if (!redirectToken) {
        if (!codeOverride) setError('This unit is missing a public token.');
        setIsSubmitting(false);
        return;
      }

      // If this came from a QR scan, we bypass the login by redirecting the page.
      // window.open is often blocked by Safari in async callbacks, so we use assign 
      // to ensure the engineer actually gets into the portal immediately.
      if (codeOverride) {
        window.location.assign(`/swift/${redirectToken}`);
      } else {
        return router.push(`/swift/${redirectToken}`);
      }

    } catch (err) {
      console.error('PIN verification error:', err);
      if (!codeOverride) setError('A network error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  // -----------------------------
  // LIVE QR SCANNER LOGIC
  // -----------------------------
  const startScanner = async () => {
    setShowScanner(true);
    
    // Push a state into browser history so the hardware/gesture "Back" 
    // button on mobile triggers popstate to close the scanner instead of exiting the site.
    window.history.pushState({ scannerOpen: true }, '');

    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const config = { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0 
        };

        await html5QrCode.start(
          { facingMode: "environment" }, 
          config,
          async (decodedText) => {
            let finalCode = decodedText;
            // Clean the URL if it's a full link
            if (decodedText.includes('/')) {
                finalCode = decodedText.split('/').pop();
            }

            // Execute the redirect logic directly
            handleFormSubmit(null, finalCode);
            
            // Close scanner UI immediately
            stopScanner();
          },
          (errorMessage) => {
            // Scanning active
          }
        );
      } catch (err) {
        console.error("Unable to start scanner", err);
        setShowScanner(false);
      }
    }, 50);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error("Unable to stop scanner", err);
      }
    }
    setShowScanner(false);
    // If the scanner was closed via "Back" button, the popstate handles it.
    // If it was closed via scan success, we should clear the history state.
    if (window.history.state?.scannerOpen) {
      window.history.back();
    }
  };

  // Listen for Universal Mobile Back Button / Gestures
  useEffect(() => {
    const handlePopState = (event) => {
      if (showScanner) {
        // We use the low-level stop logic directly here
        if (scannerRef.current) {
          scannerRef.current.stop().catch(() => {});
          scannerRef.current = null;
        }
        setShowScanner(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showScanner]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

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

              <div className="qr-login-container">
                <button 
                  type="button" 
                  className="qr-button"
                  onClick={startScanner}
                >
                  Log in with QR code
                </button>
              </div>
            </form>
          </div>

          <footer className="landing-footer">
            <Link
              href="https://www.zelim.com"
              target="_blank"
              rel="noopener noreferrer"
              className="logo-link"
              style={{ opacity: 1 }}
            >
              <Image
                src="/logo/zelim-logo.svg"
                alt="Zelim Logo"
                width={120}
                height={40}
                className="zelim-logo"
                style={{ opacity: 1, display: 'block' }}
              />
            </Link>
          </footer>
        </div>
      </div>

      {/* POPUP SCANNER OVERLAY */}
      {showScanner && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgb(13, 48, 55)', // SWIFT brand dark teal
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          {/* Main content area to keep camera centered and logo at bottom */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <div id="reader" style={{ 
              width: '90%', 
              maxWidth: '360px', 
              borderRadius: '16px', 
              overflow: 'hidden',
              backgroundColor: '#000'
            }}></div>
          </div>

          {/* Footer - Positioned exactly like the main landing page footer */}
          <footer className="landing-footer" style={{ width: '100%', position: 'relative' }}>
            <div className="logo-link" style={{ opacity: 1 }}>
              <Image
                src="/logo/zelim-logo.svg"
                alt="Zelim Logo"
                width={120}
                height={40}
                style={{ opacity: 1, display: 'block' }}
              />
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}