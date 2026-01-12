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
        if (!codeOverride) setError(data.error || 'Invalid access code.');
        setIsSubmitting(false);
        return;
      }

      const redirectToken = data.publicToken;
      if (!redirectToken) {
        if (!codeOverride) setError('This unit is missing a public token.');
        setIsSubmitting(false);
        return;
      }

      if (codeOverride) {
        window.location.href = `/swift/${redirectToken}`;
      } else {
        router.push(`/swift/${redirectToken}`);
      }

    } catch (err) {
      console.error(err);
      if (!codeOverride) setError('A network error occurred.');
      setIsSubmitting(false);
    }
  };

  // -----------------------------
  // LIVE QR SCANNER
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

        const config = {
          fps: isIOS() ? 6 : 10,
          disableFlip: false
        };

        await html5QrCode.start(
          cameraConfig,
          config,
          async (decodedText) => {
            if (lastScanRef.current === decodedText) {
              scanCountRef.current += 1;
            } else {
              lastScanRef.current = decodedText;
              scanCountRef.current = 1;
            }

            if (scanCountRef.current >= 2) {
              if (hasNavigatedRef.current) return;
              hasNavigatedRef.current = true;

              document.querySelector(".focus-reticle")?.classList.add("locked");
              navigator.vibrate?.([50, 30, 50]);

              let finalCode = decodedText;
              if (decodedText.includes('/')) {
                finalCode = decodedText.split('/').pop();
              }

              await sleep(120);
              handleFormSubmit(null, finalCode);
            }
          }
        );

        setTimeout(() => {
          const video = document.querySelector("#reader video");
          lockZoomIfSupported(video);
        }, 300);

      } catch (err) {
        console.error("Unable to start scanner", err);
        setShowScanner(false);
      }
    }, 50);
  };

  useEffect(() => {
    const handlePopState = () => {
      if (showScanner) {
        scannerRef.current?.stop().catch(() => {});
        scannerRef.current = null;
        setShowScanner(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
          .scanner-overlay #reader video {
            height: auto !important;
            display: block !important;
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
              <h1 className="landing-title"><span>SWIFT</span><span>maintenance portal</span></h1>
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
                  onChange={(e) => { setAccessCode(e.target.value); setError(''); }}
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
              <Image src="/logo/zelim-logo.svg" alt="Zelim Logo" width={120} height={40} />
            </Link>
          </footer>
        </div>
      </div>

      {/* SCANNER OVERLAY — SAME LAYOUT AS LOGIN */}
      {showScanner && (
        <div className="landing-content scanner-overlay">
          <div className="landing-main scanner-main">
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
