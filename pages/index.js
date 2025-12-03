import Image from "next/image";
import Link from "next/link";
import "../styles/landing.css";

export default function Home() {
  return (
    <div className="landing-container">
      
      {/* LEFT SIDE IMAGE */}
      <div className="landing-image-wrapper">
        <Image
          src="/images/swiftmaintenanceportal-hero.png"
          alt="Engineer inspecting equipment"
          fill
          className="landing-hero-image"
        />
      </div>

      {/* RIGHT SIDE CONTENT */}
      <div className="landing-content">

        <div className="landing-inner">
          <h1 className="landing-title">SWIFT<br/>maintenance portal</h1>

          <p className="landing-subtitle">
            For authorised engineers completing<br/>
            inspections and servicing.
          </p>

          <input
            type="text"
            placeholder="Enter your access code"
            className="landing-input"
          />

          <button className="landing-button">
            Enter portal
          </button>
        </div>

        {/* LOGO */}
        <Link href="https://www.zelim.com" target="_blank" className="landing-logo-wrapper">
          <Image
            src="/logo/zelim-logo.svg"
            alt="Zelim"
            width={160}
            height={48}
            className="landing-logo"
          />
        </Link>

      </div>
    </div>
  );
}
