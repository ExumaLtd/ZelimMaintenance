// pages/index.js

import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
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

    const publicTokenInput = accessCode.trim();

    // Show error message if input is empty
    if (publicTokenInput === '') {
        setError('Please enter your access code.');
        return; 
    }
    
    setError('');
    setIsSubmitting(true);

    try {
      const base = new Airtable({
        apiKey: process.env.NEXT_PUBLIC_AIRTABLE_API_KEY,
      }).base(process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID);

      const TABLE_NAME = process.env.NEXT_PUBLIC_AIRTABLE_SWIFT_TABLE;
      
      // Prepare user input for case-insensitive comparison
      const lowerCaseInput = publicTokenInput.toLowerCase();
      
      // FIX APPLIED HERE: Changed inner quotes to single quotes (') for dynamic variable
      const filterFormula = `OR(LOWER({public_token}) = '${lowerCaseInput}', LOWER({access_pin}) = '${lowerCaseInput}')`;

      // Look up the record by either public_token or access_pin
      const records = await base(TABLE_NAME)
        .select({
          maxRecords: 1,
          filterByFormula: filterFormula,
          // Fetch both tokens as we need the public_token for the URL redirect
          fields: ["public_token", "access_pin"],
        })
        .firstPage();

      if (records && records.length > 0) {
        // Get the public_token for the redirect URL, regardless of which code was entered
        const redirectToken = records[0].get('public_token');

        // Match found, redirect to the maintenance portal for this unit
        router.push(`/swift/${redirectToken}`);
      } else {
        // No match found
        setError('Invalid access code. Please try again.');
      }
    } catch (err) {
      // If the API key/ID is wrong, or the formula fails, this is the error you see
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
        {/* LEFT HERO (IMAGE) */}
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
              >
                {isSubmitting ? 'Verifying...' : 'Enter portal'}
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