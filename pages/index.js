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

  // NEW — scan confidence + navigation guards
  const lastScanRef = useRef(null);
  const lastScanTimeRef = useRef(0);
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
    } catch {
      // silent
    }
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

      if (codeOverride) {
        window.location.href = `/swift/${redirectToken}`;
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
    window.history.pushState({ scannerOpen: true }, '');

    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        let cameraConfig = { facingMode: "environment" };

        if (isAndroid()) {
          const deviceId = await getBestRearCameraId();
          if (deviceId) {
            cameraConfig = { deviceId: { exact: deviceId } };
          }
        }

        const config = {
          fps: isIOS() ? 6 : 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        await html5QrCode.start(
          cameraConfig,
          config,
          async (decodedText) => {
            const now = Date.now();

            if (
              lastScanRef.current === decodedText &&
              now - lastScanTimeRef.current < 500
            ) {
              if (hasNavigatedRef.current) return;
              hasNavigatedRef.current = true;

              document.querySelector(".focus-reticle")?.classList.add("locked");

              if (navigator.vibrate) {
                navigator.vibrate([50, 30, 50]);
              }

              let finalCode = decodedText;
              if (decodedText.includes('/')) {
                finalCode = decodedText.split('/').pop();
              }

              await sleep(120);
              handleFormSubmit(null, finalCode);
              return;
            }

            lastScanRef.current = decodedText;
            lastScanTimeRef.current = now;
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

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch {}
    }
    setShowScanner(false);
    if (window.history.state?.scannerOpen) {
      window.history.back();
    }
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
          #reader__status_span, #reader__dashboard { display: none !important; }
          #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
        `}</style>
      </Head>

      <div className="landing-root">
        {/* LEFT HERO */}
        <div className="landing-hero">
          <div className="landing-hero-inner">
            <Image
              src="/images/swiftmaintenanceportal-hero.png"
              alt="SWIFT maintenance portal hero image"
              fill
              priority
              quality={100}
              sizes="50vw"
              style={{ objectFit: "cover" }}
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
                <button type="button" className="qr-button" onClick={startScanner}>
                  Log in with QR code
                </button>
              </div>
            </form>
          </div>

          <footer className="landing-footer">
            <Link href="https://www.zelim.com" target="_blank" rel="noopener noreferrer" className="logo-link">
              <Image src="/logo/zelim-logo.svg" alt="Zelim Logo" width={120} height={40} className="zelim-logo" />
            </Link>
          </footer>
        </div>
      </div>

      {/* SCANNER OVERLAY */}
      {showScanner && (
        <div className="scanner-overlay">
          <div className="scanner-main">
            <div className="focus-reticle"><span /></div>
            <div id="reader" />
          </div>
          <footer className="landing-footer">
            <Image src="/logo/zelim-logo.svg" alt="Zelim Logo" width={120} height={40} className="zelim-logo" />
          </footer>
        </div>
      )}
    </div>
  );
}
