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
  const startScanner = async () => {
    setShowScanner(true);
    
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const config = { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0 
        };

        // Triggers native browser "Allow" prompt.
        // Layout stays frozen because #reader is 'fixed' outside the flow.
        await html5QrCode.start(
          { facingMode: "environment" }, 
          config,
          (decodedText) => {
            let finalCode = decodedText;
            if (decodedText.includes('/')) {
                finalCode = decodedText.split('/').pop();
            }

            setAccessCode(finalCode);
            stopScanner();
            handleFormSubmit(null, finalCode);
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
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) stopScanner();
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

      {/* SCANNER ELEMENT MOVED HERE:
          By placing it outside landing-root with 'fixed', it cannot affect 
          the layout or padding of the form-stack.
      */}
      <div 
        id="reader" 
        style={{ 
          display: showScanner ? 'block' : 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '0px',
          height: '0px',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1
        }}
      ></div>
    </div>
  );
}