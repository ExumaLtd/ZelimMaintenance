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
  const scannerRef = useRef(null);
  const hasNavigatedRef = useRef(false);

  // -----------------------------
  // DEVICE HELPERS
  // -----------------------------
  const isIOS = () =>
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  const isAndroid = () =>
    typeof navigator !== "undefined" &&
    /Android/.test(navigator.userAgent);

  // -----------------------------
  // CAMERA HELPERS
  // -----------------------------
  const getBestRearCameraId = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return null;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === "videoinput");
    const rear = videoDevices.filter(d => /rear|back|environment/i.test(d.label));
    return (rear[0] || videoDevices[0])?.deviceId || null;
  };

  const lockZoomIfSupported = async (videoEl) => {
    if (!videoEl) return;
    const track = videoEl.srcObject?.getVideoTracks?.()[0];
    if (!track) return;
    const caps = track.getCapabilities?.();
    if (!caps?.zoom) return;
    try {
      await track.applyConstraints({
        advanced: [{ zoom: Math.min(1, caps.zoom.max) }]
      });
    } catch {}
  };

  // -----------------------------
  // FORM SUBMIT / REDIRECT LOGIC
  // -----------------------------
  const handleFormSubmit = async (e, codeOverride = null) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const code = codeOverride || accessCode.trim();
    if (!code) {
      setError('Please enter your access code.');
      return;
    }

    // Only show "Verifying..." on the portal button, not the scanner
    if (!codeOverride) {
      setError('');
      setIsSubmitting(true);
    }

    try {
      const res = await fetch(`/api/swift-resolve-pin?pin=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok) {
        if (!codeOverride) {
          setError(data.error || 'Invalid access code.');
          setIsSubmitting(false);
        }
        return;
      }

      // REDIRECT: Use window.location for scanner to ensure clean tab transition
      if (codeOverride) {
        window.location.href = `/swift/${data.publicToken}`;
      } else {
        router.push(`/swift/${data.publicToken}`);
      }

    } catch (err) {
      console.error('Submission error:', err);
      if (!codeOverride) {
        setError('A network error occurred.');
        setIsSubmitting(false);
      }
    }
  };

  // -----------------------------
  // QR SCANNER
  // -----------------------------
  const startScanner = async () => {
    hasNavigatedRef.current = false;
    setShowScanner(true);
    window.history.pushState({ scannerOpen: true }, '');

    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        let cameraConfig = { facingMode: "environment" };
        if (isAndroid()) {
          const deviceId = await getBestRearCameraId();
          if (deviceId) cameraConfig = { deviceId: { exact: deviceId } };
        }

        await html5QrCode.start(
          cameraConfig,
          { fps: isIOS() ? 10 : 15, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            // Prevent double-firing
            if (hasNavigatedRef.current) return;
            hasNavigatedRef.current = true;

            // Haptic Feedback
            if (navigator.vibrate) navigator.vibrate(100);
            
            // UI Feedback
            document.querySelector(".focus-reticle")?.classList.add("locked");

            let finalCode = decodedText.includes('/')
              ? decodedText.split('/').pop()
              : decodedText;

            // Immediate redirect attempt
            handleFormSubmit(null, finalCode);
            
            // Close UI
            stopScanner();
          }
        );

        setTimeout(() => {
          lockZoomIfSupported(document.querySelector("#reader video"));
        }, 400);

      } catch (err) {
        console.error("Scanner failed to start", err);
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
        console.error("Scanner cleanup error", err);
      }
    }
    setShowScanner(false);
    if (window.history.state?.scannerOpen) {
      window.history.back();
    }
  };

  useEffect(() => {
    const onPop = () => {
      if (showScanner) {
        if (scannerRef.current) {
          scannerRef.current.stop().catch(() => {});
          scannerRef.current = null;
        }
        setShowScanner(false);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [showScanner]);

  return (
    <div className="landing-scope">
      <Head>
        <title>SWIFT Maintenance Portal</title>
        <style>{`
          #reader__status_span,
          #reader__dashboard,
          #reader__dashboard_section {
            display: none !important;
          }
        `}</style>
      </Head>

      <div className="landing-root">
        {/* LEFT HERO */}
        <div className="landing-hero">
          <div className="landing-hero-inner">
            <Image 
                src="/images/swiftmaintenanceportal-hero.png" 
                alt="Hero" 
                fill 
                priority 
                style={{ objectFit: 'cover' }}
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
                  className="input-field"
                  placeholder="Enter your access code"
                  value={accessCode}
                  onChange={(e) => { setAccessCode(e.target.value); setError(''); }}
                  disabled={isSubmitting}
                />
                {error && <p className="error-text">{error}</p>}
              </div>

              <button type="submit" className="primary-btn">
                {isSubmitting ? 'Verifying…' : 'Enter portal'}
              </button>

              <div className="qr-login-container">
                <button type="button" className="qr-button" onClick={startScanner}>
                  Log in with QR code
                </button>
              </div>
            </form>
          </div>

          <footer className="landing-footer">
            <Link href="https://www.zelim.com" target="_blank" className="logo-link">
              <Image src="/logo/zelim-logo.svg" alt="Zelim Logo" width={120} height={40} className="zelim-logo" />
            </Link>
          </footer>
        </div>
      </div>

      {/* FULL-SCREEN SCANNER OVERLAY */}
      {showScanner && (
        <div className="scanner-overlay landing-scope">
          {/* We use landing-content here so the footer and logo position matches perfectly */}
          <div className="landing-content" style={{ position: 'relative', height: '100vh', width: '100vw' }}>
            <div className="scanner-main" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <div className="focus-reticle"><span /></div>
              <div id="reader" style={{ width: '100%' }} />
            </div>

            <footer className="landing-footer" style={{ marginTop: '0' }}>
              <div className="logo-link">
                <Image src="/logo/zelim-logo.svg" alt="Zelim Logo" width={120} height={40} className="zelim-logo" />
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}