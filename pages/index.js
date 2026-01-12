// pages/index.js
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Html5Qrcode } from "html5-qrcode";

export default function Home() {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const router = useRouter();
  const qrScannerRef = useRef(null); // To hold the scanner instance

  // 1. PIN LOGIN LOGIC
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

      router.push(`/swift/${redirectToken}`);

    } catch (err) {
      console.error('PIN verification error:', err);
      setError('A network error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  // 2. SCANNER TRIGGER (Immediate)
  const startCamera = async () => {
    setShowScanner(true);
    setError('');

    // Small delay to ensure the 'reader' div is rendered before starting
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        qrScannerRef.current = html5QrCode;

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        // Point directly to the rear camera for that 'native' feel
        await html5QrCode.start(
          { facingMode: "environment" }, 
          config,
          (decodedText) => {
            // SUCCESS: Lock on and login
            let finalCode = decodedText.includes('/') ? decodedText.split('/').pop() : decodedText;
            setAccessCode(finalCode);
            stopCamera();
            handleFormSubmit(null, finalCode);
          }
        );
      } catch (err) {
        console.error("Camera start error:", err);
        setError("Could not access camera. Please check permissions.");
        setShowScanner(false);
      }
    }, 100);
  };

  const stopCamera = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
        qrScannerRef.current = null;
      } catch (err) {
        console.error("Stop error:", err);
      }
    }
    setShowScanner(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (qrScannerRef.current) stopCamera(); };
  }, []);

  return (
    <div className="landing-scope">
      <Head>
        <title>SWIFT Maintenance Portal</title>
      </Head>

      <div className="landing-root">
        <div className="landing-hero">
          <div className="landing-hero-inner" style={{ position: "relative" }}>
            <Image
              src="/images/swiftmaintenanceportal-hero.png"
              alt="Hero image"
              fill
              priority
              quality={100}
              style={{ objectFit: "cover", objectPosition: "center" }}
            />
          </div>
        </div>

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

            {/* LIVE SCANNER VIEW */}
            {showScanner && (
              <div className="scanner-container" style={{ width: '100%', maxWidth: '360px' }}>
                <div id="reader" style={{ overflow: 'hidden', borderRadius: '12px' }}></div>
                <button 
                  type="button" 
                  className="qr-button" 
                  style={{ marginTop: '20px', width: '100%', opacity: 0.7 }}
                  onClick={stopCamera}
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

                <div className="qr-login-container">
                  <button type="button" className="qr-button" onClick={startCamera}>
                    Log in with QR code
                  </button>
                </div>
              </form>
            )}
          </div>

          <footer className="landing-footer">
            <Link href="https://www.zelim.com" target="_blank" className="logo-link">
              <Image src="/logo/zelim-logo.svg" alt="Zelim Logo" width={120} height={40} className="zelim-logo" />
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}