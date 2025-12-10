/* =========================================
   CHECKLIST PAGE — HERO + FORM
========================================= */

.swift-checklist-container {
  width: 100%;
  max-width: 900px;
  margin: 60px auto 100px;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* -----------------------------
   HERO HEADER (matches landing)
----------------------------- */

.checklist-hero {
  width: 100%;
  text-align: center;
  margin-top: 60px;
  margin-bottom: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

/* Logo container (copied from maintenance.css) */
.checklist-logo {
  position: relative;
  max-width: 250px;
  max-height: 40px;
  width: 250px;
  height: 40px;
  display: block;
  margin: 0 auto 10px auto;
}

.checklist-logo img {
  position: absolute !important;
  left: 0 !important;
  right: auto !important;
  width: auto !important;
  height: 100% !important;
  object-fit: contain !important;
  top: 0 !important;
  bottom: 0 !important;

  display: block;
  max-width: 100%;
  max-height: 100%;
  margin: 0;
}

/* Title (matches .portal-title exactly) */
.checklist-hero-title {
  color: #FFFFFF;
  font-family: Montserrat, sans-serif;
  font-size: 30px;
  font-weight: 600;
  line-height: 38px;
  text-align: center;
  margin: 0;
}

.checklist-hero-title .break-point {
  display: block; /* always force a new line */
}

/* -----------------------------
   FORM EMBED AREA
----------------------------- */

.form-embed-area {
  width: 100%;
  background: #0f262b;
  padding: 20px 20px 20px 20px; /* your requested padding */
  border-radius: 20px;
}

.form-embed-area > div {
  margin: 0 !important;
  padding: 0 !important;
}

[data-fillout-id] {
  width: 100% !important;
  min-height: 900px;
  display: block;
  border-radius: 12px;
}

/* -----------------------------
   FOOTER
----------------------------- */

.checklist-footer {
  text-align: center;
}

.back-link {
  color: #01FFF6;
  font-weight: 600;
  font-size: 16px;
}

.back-link:hover {
  opacity: 0.8;
}

/* -----------------------------
   RESPONSIVE
----------------------------- */

@media (max-width: 600px) {
  .checklist-logo {
    max-width: 200px;
    height: 36px;
  }
}
