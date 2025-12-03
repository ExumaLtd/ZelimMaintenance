// pages/index.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';

export default function HomePage() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!pin.trim()) {
      setError('Please enter your SWIFT access code.');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch('/api/swift-resolve-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Code not recognised. Please check and try again.');
        return;
      }

      const { publicToken } = data;

      if (!publicToken) {
        setError('Something went wrong resolving this code.');
        return;
      }

      // Go to the unit page
      router.push(`/swift/${publicToken}`);
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="inner">
        {/* LEFT: hero image (desktop only) */}
        <div className="hero">
          <div className="heroFrame">
            <Image
              src="/images/swiftmaintenanceportal-hero.png"
              alt="Engineer carrying out maintenance"
              fill
              priority
              style={{ objectFit: 'cover' }}
            />
            <div className="heroOverlay" />
          </div>
        </div>

        {/* RIGHT: portal content */}
        <div className="panel">
          <div className="panelInner">
            <div className="headingBlock">
              <div className="eyebrow">SWIFT</div>
              <h1 className="title">maintenance portal</h1>
              <p className="subtitle">
                For authorised engineers completing
                <br />
                inspections and servicing.
              </p>
            </div>

            <form className="form" onSubmit={handleSubmit}>
              <label className="label" htmlFor="accessCode">
                Enter your access code
              </label>
              <input
                id="accessCode"
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="input"
                placeholder="Enter your access code"
                autoComplete="off"
              />
              {error && <p className="error">{error}</p>}

              <button type="submit" className="button" disabled={loading}>
                {loading ? 'Checking...' : 'Enter portal'}
              </button>
            </form>
          </div>

          <div className="logoRow">
            <Image
              src="/logo/zelim-logo.svg"
              alt="Zelim"
              width={140}
              height={40}
              priority
            />
          </div>
        </div>
      </div>

      {/* Page-specific styles */}
      <style jsx>{`
        .page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #172f36;
          padding: 24px;
        }

        .inner {
          width: 100%;
          max-width: 1200px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        /* HERO IMAGE */

        .hero {
          display: none;
        }

        .heroFrame {
          position: relative;
          width: 100%;
          height: 560px;
          border-radius: 20px;
          overflow: hidden;
        }

        .heroOverlay {
          position: absolute;
          inset: 0;
          background: #172f36;
          mix-blend-mode: soft-light;
          opacity: 0.9;
          pointer-events: none;
        }

        /* PANEL */

        .panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
        }

        .panelInner {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          text-align: center;
        }

        .headingBlock {
          margin-bottom: 32px;
        }

        .eyebrow {
          font-size: 18px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .title {
          margin: 8px 0;
          font-size: 32px;
          line-height: 1.2;
          font-weight: 600;
        }

        .subtitle {
          margin: 8px 0 0;
          font-size: 16px;
          line-height: 1.5;
          color: #e0ecef;
        }

        .form {
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .label {
          font-size: 14px;
          text-align: left;
          color: #d4e0e4;
        }

        .input {
          width: 100%;
          border-radius: 8px;
          border: 1px solid #334e55;
          background: #4a6268;
          padding: 14px 16px;
          font-size: 16px;
          color: #ffffff;
          outline: none;
        }

        .input::placeholder {
          color: #c1d0d4;
        }

        .input:focus {
          border-color: #00fff7;
          box-shadow: 0 0 0 1px rgba(0, 255, 247, 0.4);
        }

        .error {
          margin: 0;
          font-size: 14px;
          color: #ffb3b3;
          text-align: left;
        }

        .button {
          margin-top: 4px;
          width: 100%;
          border-radius: 8px;
          border: 2px solid rgba(255, 255, 255, 0.12);
          background: #00fff7;
          padding: 12px 16px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          color: #05252a;
          transition: transform 0.08s ease, box-shadow 0.08s ease, background 0.08s ease;
        }

        .button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
        }

        .button:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }

        .button:disabled {
          opacity: 0.7;
          cursor: default;
        }

        .logoRow {
          margin-top: 64px;
          display: flex;
          justify-content: center;
        }

        /* DESKTOP layout: show hero side-by-side */

        @media (min-width: 900px) {
          .inner {
            flex-direction: row;
            align-items: center;
          }

          .hero {
            display: block;
            flex: 1;
          }

          .panel {
            flex: 1;
          }

          .panelInner {
            max-width: 420px;
          }
        }
      `}</style>
    </div>
  );
}
