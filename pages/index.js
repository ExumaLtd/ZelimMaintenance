// pages/index.js
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
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
    
    try {
      const res = await fetch(`/api/swift-resolve-pin?pin=${encodeURIComponent(code)}`, {
        signal: abortControllerRef.current.signal
      });
      
      if (!res.ok) return null;
      
      const data = await res.json();
      
      if (data?.publicToken && data?.accessType) {
        // Create session
        const sessionRes = await fetch('/api/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicToken: data.publicToken,
            accessType: data.accessType
          }),
          signal: abortControllerRef.current.signal
        });
        
        if (sessionRes.ok) {
          return { success: true };
        }
      }
      
      return null;
    } catch (err) {
      if (err.name === 'AbortError') return null;
      console.error('PIN resolution error:', err);
      return null;
    }
  };

  const handleFormSubmit = async (e, codeOverride = null) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const code = codeOverride || accessCode.trim();
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
    } else if (isManualSubmit) {
      setError('Invalid access code.');
      setIsSubmitting(false);
    }
  };

const handleQrCodeDetected = async (decodedText, html5QrCode) => {
  if (hasNavigatedRef.current) return;
  hasNavigatedRef.current = true;

  console.log("QR Code detected:", decodedText);
  
  if (navigator.vibrate) navigator.vibrate(100);

  try {
    await html5QrCode.stop();
    scannerRef.current = null;
  } catch (err) {
    console.error("Scanner stop error:", err);
  }

  setShowScanner(false);

  // Extract code from any format (URL or plain code)
  let code;
  if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
    // Extract code from URL path
    code = decodedText.split('/').filter(Boolean).pop();
  } else if (decodedText.includes('/')) {
    // Handle path-like strings
    code = decodedText.split('/').filter(Boolean).pop();
  } else {
    // Plain code
    code = decodedText;
  }

  console.log("Extracted code:", code);

  // Use resolveAndNavigate to properly create session
  const data = await resolveAndNavigate(code);
  
  if (data?.success) {
    window.location.href = '/portal/swift';
  } else {
    // Show error if QR code was invalid
    setError('Invalid QR code.');
  }
};

  const startScanner = async () => {
    hasNavigatedRef.current = false;
    setShowScanner(true);
    window.history.pushState({ scannerOpen: true }, '');

    setTimeout(async () => {
      try {
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
          (decodedText) => handleQrCodeDetected(decodedText, html5QrCode)
        );

        setTimeout(() => {
          lockZoom(document.querySelector("#reader video"));
        }, 400);

      } catch (err) {
        console.error("Scanner start error:", err);
        alert(`Camera access error: ${err.message || 'Unable to access camera'}`);
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
            <Image 
              src="/images/swiftmaintenanceportal-hero.png" 
              alt="Hero" 
              fill 
              priority 
              style={{ objectFit: 'cover' }}
            />
          </div>
        </div>

        <div className="landing-content">
          <div className="landing-main">
            <div className="landing-header">
              <h1 className="landing-title">
                <span>Zelim</span>
                <span>maintenance portal</span>
              </h1>
              <p className="landing-subtitle">
                For authorised persons carrying out official inspections and scheduled servicing.
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="form-stack">
              <div className={`input-wrapper ${error ? 'has-error' : ''}`}>
                <input
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

              <button type="submit" className="primary-btn" disabled={isSubmitting}>
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