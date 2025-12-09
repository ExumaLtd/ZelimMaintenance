// pages/index.js

import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link'; // <--- THIS WAS ADDED
import { useState } from 'react';
import { useRouter } from 'next/router';
import Airtable from 'airtable';

export default function Home() {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const base = new Airtable({
        apiKey: process.env.NEXT_PUBLIC_AIRTABLE_API_KEY,
      }).base(process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID);

      const TABLE_NAME = process.env.NEXT_PUBLIC_AIRTABLE_SWIFT_TABLE;
      const publicToken = accessCode.trim().toLowerCase();

      // Look up the record by the public_token (which is the access code)
      const records = await base(TABLE_NAME)
        .select({
          maxRecords: 1,
          filterByFormula: `{public_token} = "${publicToken}"`,
          fields: ["public_token"],
        })
        .firstPage();

      if (records && records.length > 0) {
        // Match found, redirect to the maintenance portal for this unit
        router.push(`/swift/${publicToken}`);
      } else {
        // No match found
        setError('Invalid access code. Please try again.');
      }
    } catch (err) {
      console.error("Airtable lookup failed:", err);
      setError('An error occurred during verification. Please try again later.');
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
        {/* LEFT HERO (IMAGE) - UPDATED SOURCE */}
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

        {/* RIGHT PANEL (CONTENT) */}
        <div className="landing-content">
          <div className="landing-main">
            
            {/* HEADER TEXT */}
            <div className="landing-header">
              <h1 className="landing-title">
                <span>SWIFT</span>
                <span>maintenance portal</span>
              </h1>
              <p className="landing-subtitle">
                For authorised engineers carrying out official inspections and scheduled servicing.
              </p>
            </div>

            {/* FORM STACK */}
            <form onSubmit={handleFormSubmit} className="form-stack">
              <div className={`input-wrapper ${error ? 'has-error' : ''}`}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter your access code"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value);
                    setError(''); // Clear error on change
                  }}
                  disabled={isSubmitting}
                />
                {error && <p className="error-text">{error}</p>}
              </div>

              <button
                type="submit"
                className="primary-btn"
                disabled={isSubmitting || accessCode.trim() === ''}
              >
                {isSubmitting ? 'Verifying...' : 'ENTER PORTAL'}
              </button>
            </form>
          </div>

          {/* FOOTER LOGO */}
          <footer className="landing-footer">
            <Link href="https://www.zelim.com" target="_blank" rel="noopener noreferrer" className="logo-link">
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