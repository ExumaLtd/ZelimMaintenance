// pages/index.js
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const code = accessCode.trim();

    if (code === '') {
      setError('Please enter your access code.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      // -----------------------------------------------
      // USE ABSOLUTE URL IN PRODUCTION (IMPORTANT FIX!)
      // -----------------------------------------------
      const baseUrl =
        process.env.NODE_ENV === 'production'
          ? 'https://maintenance.exuma.co.uk'
          : '';

      const res = await fetch(
        `${baseUrl}/api/swift-resolve-pin?pin=${encodeURIComponent(code)}`
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid access code. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const redirectToken = data.publicToken;

      if (!redirectToken) {
        setError("This unit is missing a public token.");
        setIsSubmitting(false);
        return;
      }

      router.push(`/swift/${redirectToken}`);

    } catch (err) {
      console.error("PIN verification error:", err);
      setError("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>SWIFT Maintenance Portal</title>
      </Head>

      <div className="landing-root">

        <div className="landing-hero">
          <div className="landing-hero-inner">
            <Image
              src="/images/swiftmaintenanceportal-hero(3).png"
              alt="SWIFT maintenance portal hero image"
              width={1000}
              height={1000}
              quality={100}
              priority
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
                width={100}
                height={30}
                className="zelim-logo"
              />
            </Link>
          </footer>
        </div>
      </div>
    </>
  );
}
