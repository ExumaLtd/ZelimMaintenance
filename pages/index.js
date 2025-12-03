import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="landing-container">

      {/* LEFT SIDE – HERO IMAGE */}
      <div className="hero-section">
        <Image
          src="/images/swiftmaintenanceportal-hero.png"
          alt="Engineer performing maintenance"
          fill
          className="hero-image"
          priority
        />
      </div>

      {/* RIGHT SIDE – LOGIN PANEL */}
      <div className="login-section">

        <div className="login-wrapper">
          <h1 className="portal-title">SWIFT<br />maintenance portal</h1>

          <p className="portal-subtitle">
            For authorised engineers completing<br />inspections and servicing.
          </p>

          <div className="login-box">

            {/* INPUT */}
            <input
              type="text"
              placeholder="Enter your access code"
              className="access-input"
            />

            {/* BUTTON */}
            <button className="portal-button">
              Enter portal
            </button>
          </div>
        </div>

        {/* BOTTOM LOGO */}
        <div className="bottom-logo">
          <Link href="https://www.zelim.com" target="_blank">
            <Image
              src="/logo/zelim-logo.svg"
              alt="Zelim"
              width={150}
              height={50}
            />
          </Link>
        </div>

      </div>
    </div>
  );
}
