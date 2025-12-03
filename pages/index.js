import { useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";

export default function Home() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [placeholder, setPlaceholder] = useState("Enter your access code");
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

      router.push(`/swift/${data.publicToken}`);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="landing-root">
      {/* LEFT: HERO IMAGE */}
      <div className="landing-hero">
        <div className="hero-image-wrapper">
          <Image
            src="/images/swiftmaintenanceportal-hero.png"
            alt="Engineer using tablet on-site"
            fill
            priority
            className="hero-image"
          />
        </div>
      </div>

      {/* RIGHT: PORTAL CONTENT */}
      <div className="landing-content">
        <div className="landing-panel">
          <header className="landing-header">
            <h1 className="landing-title">SWIFT<br />maintenance portal</h1>
            <p className="landing-subtitle">
              For authorised engineers completing<br />
              inspections and servicing.
            </p>
          </header>

          <form className="landing-form" onSubmit={handleSubmit}>
            <div className="input-wrapper">
              <input
                id="pin"
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={placeholder}
                onFocus={() => setPlaceholder("")}
                onBlur={() => {
                  if (!pin) setPlaceholder("Enter your access code");
                }}
                className="pin-input"
                autoComplete="off"
              />
            </div>

            {error && <p className="error-message">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="submit-button"
            >
              {loading ? "Checking…" : "Enter portal"}
            </button>
          </form>

          <a
            href="https://www.zelim.com"
            target="_blank"
            rel="noopener noreferrer"
            className="logo-link"
          >
            <Image
              src="/logo/zelim-logo.svg"
              alt="Zelim"
              width={160}
              height={40}
              className="logo"
            />
          </a>
        </div>
      </div>
    </div>
  );
}
