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

    if (publicTokenInput === '') {
        setError('Please enter your access code.');
        return; 
    }
    
    setError('');
    setIsSubmitting(true);

    try {
      // 🟢 FIX: Connection now works due to NEXT_PUBLIC_ variables and PAT scopes
      const base = new Airtable({
        apiKey: process.env.NEXT_PUBLIC_AIRTABLE_API_KEY,
      }).base(process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID);

      const TABLE_NAME = process.env.NEXT_PUBLIC_AIRTABLE_SWIFT_TABLE;
      
      // 🟢 FIX: Simplified formula to a direct, case-sensitive lookup on access_pin.
      // NOTE: publicTokenInput is the original user input (e.g., 'SWI010').
      // User MUST enter the code exactly as it appears in Airtable now.
      const filterFormula = `{access_pin} = '${publicTokenInput}'`;

      // If the lookup fails, we will try the public_token as a fallback
      // This is a direct copy of the original logic, but simplified to one field
      
      let records = await base(TABLE_NAME)
        .select({
          maxRecords: 1,
          filterByFormula: filterFormula,
          fields: ["public_token", "access_pin"],
        })
        .firstPage();

      // Fallback: If access_pin failed, try public_token (in case user entered the public one)
      if (!records || records.length === 0) {
        const fallbackFilterFormula = `{public_token} = '${publicTokenInput}'`;
        records = await base(TABLE_NAME)
          .select({
            maxRecords: 1,
            filterByFormula: fallbackFilterFormula,
            fields: ["public_token", "access_pin"],
          })
          .firstPage();
      }

      if (records && records.length > 0) {
        // Success: Redirect using the public_token field value
        const redirectToken = records[0].get('public_token');
        router.push(`/swift/${redirectToken}`);
      } else {
        // Failure: Show error message
        setError('Invalid access code. Please try again.');
      }
    } catch (err) {
      // This catch block should now only be hit if the Airtable service is down
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