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

  // Scan confidence
  const lastScanRef = useRef(null);
  const scanCountRef = useRef(0);
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

    const rear = videoDevices.filter(d =>
      /rear|back|environment/i.test(d.label)
    );

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

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // -----------------------------
  // FORM SUBMIT
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
        if (!codeOverride) setError(data.error || 'Invalid access code.');
        setIsSubmitting(false);
        return;
      }

      if (codeOverride) {
        window.location.href = `/swift/${data.publicToken}`;
      } else {
        router.push(`/swift/${data.publicToken}`);
      }

    } catch {
      if (!codeOverride) setError('A network error occurred.');
      setIsSubmitting(false);
    }
  };

  // -----------------------------
  // QR SCANNER
  // -----------------------------
  const startScanner = async () => {
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
          { fps: isIOS() ? 6 : 10 },
          async (decodedText) => {
            if (lastScanRef.current === decodedText) {
              scanCountRef.current += 1;
            } else {
              lastScanRef.current = decodedText;
              scanCountRef.current = 1;
            }

            if (scanCountRef.current >= 2 && !hasNavigatedRef.current) {
              hasNavigatedRef.current = true;

              document.querySelector(".focus-reticle")?.classList.add("locked");
              navigator.vibrate?.([50, 30, 50]);

              let finalCode = decodedText.includes('/')
                ? decodedText.split('/').pop()
                : decodedText;

              await sleep(120);
              handleFormSubmit(null, finalCode);
            }
          }
        );

        setTimeout(() => {
          lockZoomIfSupported(document.querySelector("#reader video"));
        }, 300);

      } catch {
        setShowScanner(false);
      }
    }, 50);
  };

  useEffect(() => {
    const onPop = () => {
      if (showScanner) {
        scannerRef.current?.stop().catch(() => {});
        scannerRef.current = null;
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
        <div className="landing-hero">
          <div className="landing-hero-inner">
            <Image src="/images/swiftmaintenanceportal-hero.png" alt="" fill priority />
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

            <form onSubmit={handleFormSubmit} className="form-stack">
              <div className={`input-wrapper ${error ? 'has-error' : ''}`}>
                <input
                  className="input-field"
                  placeholder="Enter your access code"
                  value={accessCode}
                  onChange={(e) => { setAccessCode(e.target.value); setError(''); }}
                />
                {error && <p className="error-text">{error}</p>}
              </div>

              <button className="primary-btn">
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
              <Image src="/logo/zelim-logo.svg" alt="Zelim Logo" width={120} height={40} />
            </Link>
          </footer>
        </div>
      </div>

      {/* FULL-SCREEN SCANNER */}
      {showScanner && (
        <div className="scanner-overlay">
          <div className="scanner-main">
            <div className="focus-reticle"><span /></div>
            <div id="reader" />
          </div>

          <footer className="landing-footer">
            <Image src="/logo/zelim-logo.svg" alt="Zelim Logo" width={120} height={40} />
          </footer>
        </div>
      )}
    </div>
  );
}
