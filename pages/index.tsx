import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';

export default function Home() {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  // Tick down the rate-limit countdown every second
  useEffect(() => {
    if (rateLimitCountdown <= 0) return;
    const timer = setTimeout(() => {
      setRateLimitCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [rateLimitCountdown]);

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m > 0) return `${m} minute${m !== 1 ? 's' : ''} ${s} second${s !== 1 ? 's' : ''}`;
    return `${s} second${s !== 1 ? 's' : ''}`;
  };

  const scannerRef = useRef(null);
  const hasNavigatedRef = useRef(false);
  const abortControllerRef = useRef(null);

  const isIOS = () => typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = () => typeof navigator !== "undefined" && /Android/.test(navigator.userAgent);

  const getBestRearCameraId = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return null;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === "videoinput");
    const rear = videoDevices.filter(d => /rear|back|environment/i.test(d.label));
    return (rear[0] || videoDevices[0])?.deviceId || null;
  };

  const getCameraConfig = async () => {
    if (isAndroid()) {
      const deviceId = await getBestRearCameraId();
      return deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "environment" };
    }
    return { facingMode: "environment" };
  };

  const lockZoom = useCallback(async (videoEl) => {
    if (!videoEl) return;
    const track = videoEl.srcObject?.getVideoTracks?.()?.[0];
    if (!track) return;
    const caps = track.getCapabilities?.();
    if (!caps?.zoom) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: Math.min(1, caps.zoom.max) }] });
    } catch {}
  }, []);

  const resolveAndNavigate = async (code) => {
    abortControllerRef.current = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      abortControllerRef.current.abort();
    }, 8000);

    try {
      const res = await fetch(`/api/swift-resolve-pin?pin=${encodeURIComponent(code)}`, {
        signal: abortControllerRef.current.signal
      });
      clearTimeout(timeoutId);

      if (res.status === 429) {
        const data = await res.json();
        setRateLimitCountdown(data.retryAfter ?? 300);
        return { rateLimited: true };
      }

      if (!res.ok) return { serverError: true };

      const data = await res.json();

      if (data?.publicToken && data?.accessType) {
        // Create session
        const sessionRes = await fetch('/api/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicToken: data.publicToken,
            accessType: data.accessType,
            accessPin: code
          }),
          signal: abortControllerRef.current.signal
        });

        if (sessionRes.ok) {
          return { success: true };
        }
      }

      return null;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        if (timedOut) return { serverError: true };
        return null;
      }
      console.error('PIN resolution error:', err);
      return { serverError: true };
    }
  };

  const handleFormSubmit = async (e, codeOverride = null) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const code = (codeOverride || accessCode.trim()).toUpperCase();
    if (!code) {
      setError('Please enter your access code.');
      return;
    }

    const isManualSubmit = !codeOverride;
    if (isManualSubmit) {
      setError('');
      setIsSubmitting(true);
    }

    const data = await resolveAndNavigate(code);
    
    if (data?.success) {
      window.location.href = '/portal/swift';
    } else if (data?.rateLimited) {
      setIsSubmitting(false);
    } else if (data?.serverError) {
      setError('Service unavailable. Please contact Zelim.');
      setIsSubmitting(false);
    } else if (isManualSubmit) {
      setError('Invalid access code.');
      setIsSubmitting(false);
    }
  };

const handleQrCodeDetected = async (decodedText, html5QrCode) => {
  if (hasNavigatedRef.current) return;
  hasNavigatedRef.current = true;

  if (navigator.vibrate) navigator.vibrate(100);

  try {
    await html5QrCode.stop();
    scannerRef.current = null;
  } catch (err) {
    console.error("Scanner stop error:", err);
  }

  setShowScanner(false);

  // Extract code from any format (URL or plain code)
  const code = decodedText.includes('/') ? decodedText.split('/').filter(Boolean).pop() : decodedText;

  // Use resolveAndNavigate to properly create session
  const data = await resolveAndNavigate(code);
  
  if (data?.success) {
    window.location.href = '/portal/swift';
  } else if (data?.serverError) {
    setError('Service unavailable. Please contact Zelim.');
  } else {
    setError('Invalid QR code.');
  }
};

  const startScanner = async () => {
    hasNavigatedRef.current = false;
    setShowScanner(true);
    window.history.pushState({ scannerOpen: true }, '');

    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const cameraConfig = await getCameraConfig();
        const scanConfig = { 
          fps: isIOS() ? 10 : 15, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        await html5QrCode.start(
          cameraConfig,
          scanConfig,
          (decodedText) => handleQrCodeDetected(decodedText, html5QrCode),
          undefined
        );

        setTimeout(() => {
          lockZoom(document.querySelector("#reader video"));
        }, 400);

      } catch (err) {
        console.error("Scanner start error:", err);
        setError(`Camera access error: ${err.message || 'Unable to access camera'}`);
        setShowScanner(false);
      }
    }, 50);
  };

  const stopScanner = async () => {
    // Abort any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error("Scanner cleanup error:", err);
      }
    }
    setShowScanner(false);
    if (window.history.state?.scannerOpen) {
      window.history.back();
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (showScanner && scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
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
        <title>Zelim Maintenance Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>{`
          #reader__status_span,
          #reader__dashboard,
          #reader__dashboard_section,
          #reader__scan_region__dashboard_section_csr,
          #reader__scan_region__dashboard_section_swaplink {
            display: none !important;
          }
        `}</style>
      </Head>

      <div className="landing-root">
        <div className="landing-hero">
          <div className="landing-hero-inner">
            <video
              src="/videos/zelim-hero-small.mp4"
              autoPlay
              muted
              loop
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div className="hero-tagline">
              <h2 className="heading heading--one heading--beacon heroBanner__title">
                <span>Find</span>
                <span>Recover</span>
                <span>Protect</span>
              </h2>
            </div>
          </div>
        </div>

        <div className="landing-content">
          <img
            src="/patterns/pattern-left.svg"
            alt=""
            aria-hidden="true"
            className="landing-pattern"
          />
          <div className="landing-main">
            <div className="landing-header">
              <h1 className="landing-title">
                <span>Maintenance</span>
                <span>portal</span>
              </h1>
              <p className="landing-subtitle">
                For authorised persons carrying out official inspections and maintenance.
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="landing-form">
              <div className="form-area">
                <div className="form-stack">
                  <div className={`input-wrapper ${error || rateLimitCountdown > 0 ? 'has-error' : ''}`}>
                    <input
                      className="input-field"
                      placeholder="Access code"
                      value={accessCode}
                      onChange={(e) => {
                        setAccessCode(e.target.value);
                        setError('');
                      }}
                      disabled={isSubmitting}
                    />
                  </div>

                  <button type="submit" className="arrowLink" disabled={isSubmitting}>
                    <span className="left">
                      <span aria-hidden="true" className="left-sizer">Enter portal</span>
                      {isSubmitting ? 'Verifying' : 'Enter portal'}
                    </span>
                    <span className="right">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M10.1458 7.5L0 7.5L0 5.83333L10.1458 5.83333L5.47917 1.16667L6.66667 0L13.3333 6.66667L6.66667 13.3333L5.47917 12.1667L10.1458 7.5Z" fill="#172F36"/>
                      </svg>
                    </span>
                  </button>
                </div>

                <p className="error-text">
                  {rateLimitCountdown > 0
                    ? `Too many failed attempts. Try again in ${formatCountdown(rateLimitCountdown)}.`
                    : error || ''}
                </p>
              </div>

              <div className="qr-login-container">
                <button type="button" className="qr-button" onClick={startScanner}>
                  Log in with QR code
                </button>
              </div>
            </form>
          </div>

          <footer className="landing-footer">
            <Link href="/erp" className="logo-link">
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

      {showScanner && (
        <div className="scanner-overlay landing-scope">
          <div className="scanner-container">
            <div className="scanner-main">
              <div id="reader" />
            </div>
            <footer className="scanner-footer">
              <div className="logo-link">
                <Image 
                  src="/logo/zelim-logo.svg" 
                  alt="Zelim Logo" 
                  width={120} 
                  height={40} 
                  className="zelim-logo" 
                />
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}