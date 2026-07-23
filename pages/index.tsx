import Head from 'next/head';
import { errorMessage } from '@/utils/errors';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import ArrowButton from '@/components/ui/arrow-button';

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

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m > 0) return `${m} minute${m !== 1 ? 's' : ''} ${s} second${s !== 1 ? 's' : ''}`;
    return `${s} second${s !== 1 ? 's' : ''}`;
  };

  const scannerRef = useRef<any>(null);
  const hasNavigatedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const lockZoom = useCallback(async (videoEl: any) => {
    if (!videoEl) return;
    const track = videoEl.srcObject?.getVideoTracks?.()?.[0];
    if (!track) return;
    const caps = track.getCapabilities?.();
    if (!caps?.zoom) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: Math.min(1, caps.zoom.max) }] });
    } catch {}
  }, []);

  const resolveAndNavigate = async (code: string) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 8000);

    try {
      const res = await fetch(`/api/swift-resolve-pin?pin=${encodeURIComponent(code)}`, {
        signal: controller.signal
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
          signal: controller.signal
        });

        if (sessionRes.ok) {
          return { success: true };
        }
      }

      return null;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        if (timedOut) return { serverError: true };
        return null;
      }
      console.error('PIN resolution error:', err);
      return { serverError: true };
    }
  };

  const handleFormSubmit = async (e: React.FormEvent | null, codeOverride: string | null = null) => {
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

const handleQrCodeDetected = async (decodedText: string, html5QrCode: any) => {
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
  const data = await resolveAndNavigate(code ?? '');
  
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
        setError(`Camera access error: ${errorMessage(err) || 'Unable to access camera'}`);
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

  const hasError = Boolean(error) || rateLimitCountdown > 0;

  return (
    <div>
      <Head>
        <title>Zelim Maintenance Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>

      <div className="flex h-full min-h-screen items-stretch max-[900px]:flex-col">
        <div className="flex min-h-screen flex-[1_1_50%] items-center justify-center p-6 max-[900px]:hidden">
          <div className="relative h-full w-full overflow-hidden rounded-[20px] after:pointer-events-none after:absolute after:inset-0 after:bg-black/60 after:content-['']">
            <video
              src="/videos/zelim-hero-small.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="block h-full w-full object-cover"
            />
            <div className="absolute inset-0 z-1 flex items-center justify-start px-16 py-8">
              <h2 className="m-0 flex flex-col font-sans text-[clamp(2.5rem,4.5vw,7.5rem)] font-light uppercase leading-normal tracking-[0.28em] text-warn">
                <span>Find</span>
                <span>Recover</span>
                <span>Protect</span>
              </h2>
            </div>
          </div>
        </div>

        <div className="relative flex flex-[50%] flex-col items-center justify-between overflow-hidden px-14 pt-8 pb-[60px] max-[1024px]:px-10 max-[900px]:px-6">
          <img
            src="/patterns/pattern-left.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute top-[13px] -right-5 z-0 h-auto w-[max(10rem,20vw)] -scale-x-100"
          />
          <div className="relative z-1 flex w-full flex-1 flex-col items-center justify-center">
            <div className="mx-auto mb-8 w-full max-w-[380px] text-center">
              <h1 className="m-0 flex flex-col items-center font-mono text-[2.2rem] font-normal leading-[2.6rem] tracking-[0.1em] text-ink">
                <span>Maintenance</span>
                <span>portal</span>
              </h1>
              <p className="mx-0 mt-6 mb-0 text-center font-sans text-[15px] font-light leading-[22px] tracking-[0.05em] text-white">
                For authorised persons carrying out official inspections and maintenance.
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="w-full max-w-[380px]">
              <div className="relative w-full">
                <div className="flex w-full flex-row items-stretch gap-4 max-[900px]:flex-col">
                  <div className="flex flex-1 max-[900px]:w-full">
                    <input
                      className={`w-full rounded-lg border bg-card px-5 py-[7px] text-center font-mono text-sm font-normal uppercase leading-normal tracking-[0.1em] text-[#e9ebec] transition-[border-color] duration-500 placeholder:text-ink-dim placeholder:opacity-100 focus:border-accent focus:outline-none max-[900px]:h-11 ${hasError ? 'border-danger' : 'border-card'}`}
                      placeholder="Access code"
                      value={accessCode}
                      onChange={(e) => {
                        setAccessCode(e.target.value);
                        setError('');
                      }}
                      disabled={isSubmitting}
                    />
                  </div>

                  <ArrowButton
                    type="submit"
                    disabled={isSubmitting}
                    reserveLabel="Enter portal"
                    className="max-[900px]:justify-center max-[900px]:self-stretch"
                  >
                    {isSubmitting ? 'Verifying' : 'Enter portal'}
                  </ArrowButton>
                </div>

                <p className="absolute top-full left-0 m-0 mt-2.5 text-left text-sm leading-5 text-danger max-[900px]:static max-[900px]:mt-2">
                  {rateLimitCountdown > 0
                    ? `Too many failed attempts. Try again in ${formatCountdown(rateLimitCountdown)}.`
                    : error || ''}
                </p>
              </div>

              <div className="mt-5 hidden text-center max-[900px]:block">
                <button
                  type="button"
                  className="cursor-pointer border-none bg-transparent p-2 font-sans text-[15px] font-light leading-[22px] tracking-[0.05em] text-white"
                  onClick={startScanner}
                >
                  Log in with QR code
                </button>
              </div>
            </form>
          </div>

          <footer className="relative z-1">
            <Link href="/erp" className="inline-flex items-center no-underline">
              <Image
                src="/logo/zelim-logo.svg"
                alt="Zelim Logo"
                width={120}
                height={40}
                className="h-10 w-[120px] object-contain"
              />
            </Link>
          </footer>
        </div>
      </div>

      {showScanner && (
        <div className="fixed inset-0 z-[9999] overflow-hidden bg-accent-ink">
          <div className="relative flex h-dvh w-full flex-col">
            <div className="relative flex min-h-0 flex-1 items-center justify-center p-5 max-[400px]:p-3 landscape-short:p-2.5">
              <div
                id="reader"
                className="relative aspect-square w-full max-w-[min(90vw,500px)] overflow-hidden rounded-2xl bg-transparent min-[768px]:max-[1024px]:max-w-[min(70vw,450px)] max-[400px]:max-w-[95vw] landscape-short:max-h-[80vh] landscape-short:max-w-[min(40vh,400px)]"
              />
            </div>
            <footer className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-transparent pt-6 pb-[max(24px,env(safe-area-inset-bottom))] landscape-short:pt-3 landscape-short:pb-3">
              <div className="flex items-center justify-center">
                <Image
                  src="/logo/zelim-logo.svg"
                  alt="Zelim Logo"
                  width={120}
                  height={40}
                  className="h-10 w-[120px] object-contain"
                />
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}