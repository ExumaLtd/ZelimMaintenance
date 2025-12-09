// pages/index.js

import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import Image from "next/image"; // Added Image component import

export default function IndexPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!pin.trim()) {
      setError("Please enter your SWIFT access code.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/swift-resolve-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error || "Code not recognised. Please check and try again."
        );
        return;
      }

      // Success – go to that unit’s selection page using the publicToken
      router.push(`/swift/${data.publicToken}`);

    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        {/* CORRECTED BROWSER TAB TITLE */}
        <title>Zelim | SWIFT Maintenance Portal</title> 
        <meta
          name="description"
          content="For authorised engineers completing inspections and servicing."
        />
      </Head>

      <div className="landing-root">
        {/* LEFT PANEL */}
        <div className="landing-hero">
          <div className="landing-hero-inner">
            {/* ✅ FIXED IMAGE BLOCK:
              1. Uses Next/Image component.
              2. Updated 'src' to the new logo path.
              3. New 'alt' text.
              4. Added 'className="logo-swap"' for proper display/background.
            */}
            <Image
              src="/assets/images/ZelimSWIFT(Square).png" // New image path
              alt="SWIFT Survivor Recovery System in use" // Updated alt text
              width={500} // Set appropriate dimensions for Next/Image optimization
              height={800} // Set appropriate dimensions for Next/Image optimization
              className="logo-swap" 
              priority
            />
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="landing-content">
          <main className="landing-main">
            <header className="landing-header">
              <h1 className="landing-title">
                <span>SWIFT</span>
                <span>maintenance portal</span>
              </h1>
              <p className="landing-subtitle">
                For authorised engineers completing inspections and servicing.
              </p>
            </header>

            <form className="form-stack" onSubmit={handleSubmit}>
              <div className={`input-wrapper ${error ? "has-error" : ""}`}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter your access code"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
                {error && <p className="error-text">{error}</p>}
              </div>

              <button
                type="submit"
                className="primary-btn"
                disabled={loading}
              >
                {loading ? "Checking…" : "Enter portal"}
              </button>
            </form>
          </main>

          <footer className="landing-footer">
            <a
              href="https://www.zelim.com"
              target="_blank"
              rel="noopener noreferrer"
              className="logo-link"
            >
              <img
                src="/logo/zelim-logo.svg"
                alt="Zelim"
                className="zelim-logo"
              />
            </a>
          </footer>
        </div>
      </div>
    </>
  );
}