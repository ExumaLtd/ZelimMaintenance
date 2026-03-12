import Head from 'next/head';
import { useState } from "react";

// ── ZELIM MAINTENANCE DESIGN SYSTEM ──────────────────────────
const Z = {
  pageBg:    "#172F36",
  cardBg:    "#27454B",
  inputBg:   "#152A31",
  hoverBg:   "#1F4450",
  hoverBg2:  "#324E54",
  cyan:      "#00FFF6",
  cyanText:  "#0D3037",
  text:      "#F7F7F7",
  textMid:   "#A0ACAF",
  textDim:   "#7D8F93",
  link:      "#579BA2",
  error:     "#FF4D4D",
  border:    "#425558",
  green:     "#00FFF6",
  amber:     "rgb(246,246,94)",
  red:       "#FF4D4D",
};

const font = "'Montserrat', sans-serif";

// ── LOGO ─────────────────────────────────────────────────────
function Logo({ height = 22 }) {
  const aspect = 135 / 28;
  const width = height * aspect;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 135 28" fill="none">
      <path d="M96.7165 5.93469H90.7372V27.9987H96.7165V5.93469Z" fill="#FFFFFF"/>
      <path d="M126.909 5.93469L117.964 22.6358L109.019 5.93469H100.896V27.9987H106.877V12.5023L115.096 27.9987H120.834L129.053 12.5023V27.9987H135V5.93469H126.909Z" fill="#FFFFFF"/>
      <path d="M54.6461 23.2941H38.3971V18.9898H53.8362V14.2853H38.3971V10.6393H54.6742V5.93469H32.2558V27.9987H54.6461V23.2941Z" fill="#FFFFFF"/>
      <path d="M28.8938 28V23.1658H11.493L28.3721 5.93469H0.837963L0.839238 10.7676H16.8689L0 28H28.8938Z" fill="#FFFFFF"/>
      <path d="M72.7063 0L56.4828 27.9987L65.759 21.6408L72.7063 9.65062V9.28589V0Z" fill="#FFFFFF"/>
      <path d="M80.5426 23.1735H72.7063H66.8215L56.4828 28H88.9299L80.5426 23.1735Z" fill="#FFFFFF"/>
    </svg>
  );
}

// ── DATA ─────────────────────────────────────────────────────
const platforms = [
  {
    id: "odoo", name: "Odoo", subtitle: "Standard / Custom Plan",
    tag: "LEAD RECOMMENDATION", accent: Z.cyan, accentText: Z.cyanText,
    withApi:    { license: "~£37–45 / user / month", annual10: "~£4,500–5,400 / yr", impl: "£8,000–20,000", year1: "£13,000–25,000", note: "Custom plan required for portal API access" },
    withoutApi: { license: "~£25–30 / user / month", annual10: "~£3,000–3,600 / yr", impl: "£4,000–12,000", year1: "£7,000–16,000", note: "Standard plan — no external API access" },
    scores: { manufacturing: 5, traceability: 5, api: 5, ease: 3, cost: 4, scalability: 5 },
    capabilities: [
      { label: "Product / Item Master Data",        has: true },
      { label: "Bills of Materials (BOMs)",          has: true },
      { label: "Purchasing & Supplier Management",   has: true },
      { label: "Inventory Management",               has: true },
      { label: "Manufacturing / Assembly Tracking",  has: true },
      { label: "Serial Number & Lot Traceability",   has: true },
      { label: "Stock Movements & Procurement",      has: true },
      { label: "REST API for Portal Integration",    has: true,      note: "Custom plan only" },
      { label: "QR Code Support",                    has: true },
      { label: "Field Service / Maintenance Module", has: true },
      { label: "CRM",                                has: true },
      { label: "Accounting Module",                  has: true },
      { label: "Self-implementation Friendly",       has: "partial", note: "Possible but complex" },
      { label: "Maritime / Compliance Specific",     has: false },
    ],
    pros: ["Most complete ERP capability on the shortlist","Mature REST API — ideal for Zelim portal integration","Modular — activate only what you need","Scales well as Zelim grows","UK partner ecosystem available","Field service & maintenance modules built in"],
    cons: ["Broadest scope — highest risk of scope creep","API requires the more expensive Custom plan","More complex to self-implement than alternatives","Partner implementation costs can be significant","Needs disciplined phased rollout to stay lean"],
    verdict: "Best overall fit for Zelim. The right choice if portal API integration is a firm requirement — which it should be. Requires a tightly scoped Phase 1 to avoid overreach.",
  },
  {
    id: "mrpeasy", name: "MRPeasy", subtitle: "Enterprise Plan (API) / Starter",
    tag: "STRONG ALTERNATIVE", accent: "#579BA2", accentText: Z.text,
    withApi:    { license: "$149 / user / month (Enterprise)", annual10: "~£14,000 / yr", impl: "£1,500–4,000", year1: "£16,000–18,000", note: "API only on top tier — cost advantage disappears" },
    withoutApi: { license: "$49 / user / month (Starter)",     annual10: "~£4,700 / yr",  impl: "£1,500–3,000", year1: "£6,000–8,000",   note: "Starter plan — no API access to portal" },
    scores: { manufacturing: 5, traceability: 5, api: 2, ease: 5, cost: 3, scalability: 3 },
    capabilities: [
      { label: "Product / Item Master Data",        has: true },
      { label: "Bills of Materials (BOMs)",          has: true },
      { label: "Purchasing & Supplier Management",   has: true },
      { label: "Inventory Management",               has: true },
      { label: "Manufacturing / Assembly Tracking",  has: true },
      { label: "Serial Number & Lot Traceability",   has: true },
      { label: "Stock Movements & Procurement",      has: true },
      { label: "REST API for Portal Integration",    has: "partial", note: "Enterprise tier only — $149/user/mo" },
      { label: "QR Code Support",                    has: true },
      { label: "Field Service / Maintenance Module", has: false },
      { label: "CRM",                                has: "partial", note: "Basic only" },
      { label: "Accounting Module",                  has: "partial", note: "Needs Xero / QuickBooks" },
      { label: "Self-implementation Friendly",       has: true },
      { label: "Maritime / Compliance Specific",     has: false },
    ],
    pros: ["Purpose-built for small manufacturers","Excellent BOM and production planning","Best-in-class serialised traceability at this scale","Fastest to implement — shortest learning curve","30-day free trial available","Very intuitive for non-technical teams"],
    cons: ["API only on $149/user/month tier","Cost case weakens significantly once API needed","No meaningful field service or maintenance module","Limited future expansion path","Accounting module weak — needs external tool","Less scalable for significant growth"],
    verdict: "Excellent manufacturing tool. Best if portal integration is not required. However the API pricing tier fundamentally changes the cost comparison with Odoo.",
  },
  {
    id: "cin7", name: "Cin7 Core", subtitle: "Formerly DEAR Systems",
    tag: "WORTH EVALUATING", accent: "#579BA2", accentText: Z.text,
    withApi:    { license: "~£35–50 / user / month", annual10: "~£4,200–6,000 / yr", impl: "£3,000–8,000", year1: "£7,000–14,000", note: "API included at standard tiers — no premium uplift" },
    withoutApi: { license: "~£35–50 / user / month", annual10: "~£4,200–6,000 / yr", impl: "£2,000–5,000", year1: "£6,000–11,000", note: "Same licensing — implementation simpler without integration" },
    scores: { manufacturing: 4, traceability: 4, api: 4, ease: 4, cost: 4, scalability: 4 },
    capabilities: [
      { label: "Product / Item Master Data",        has: true },
      { label: "Bills of Materials (BOMs)",          has: true },
      { label: "Purchasing & Supplier Management",   has: true },
      { label: "Inventory Management",               has: true },
      { label: "Manufacturing / Assembly Tracking",  has: true },
      { label: "Serial Number & Lot Traceability",   has: true },
      { label: "Stock Movements & Procurement",      has: true },
      { label: "REST API for Portal Integration",    has: true },
      { label: "QR Code Support",                    has: true },
      { label: "Field Service / Maintenance Module", has: false },
      { label: "CRM",                                has: "partial", note: "Basic" },
      { label: "Accounting Module",                  has: "partial", note: "Integrates Xero / QuickBooks" },
      { label: "Self-implementation Friendly",       has: true },
      { label: "Maritime / Compliance Specific",     has: false },
    ],
    pros: ["Cleaner implementation path than Odoo","Strong inventory and traceability capability","API available without premium pricing tier","Good balance of depth and simplicity","Easier self-implementation than Odoo","Well-reviewed by small manufacturers"],
    cons: ["Smaller UK partner / support ecosystem","Less community documentation available","No field service or maintenance module","Narrower long-term expansion path than Odoo","Less established name in UK market","Fewer native integrations than Odoo"],
    verdict: "A credible middle ground — simpler than Odoo but more depth than MRPeasy. API included without a pricing penalty. Should be properly evaluated before the final decision.",
  },
  {
    id: "erpnext", name: "ERPNext", subtitle: "Open Source",
    tag: "LOWER PRIORITY", accent: "#579BA2", accentText: Z.text,
    withApi:    { license: "£0 open source / £20–40 hosted", annual10: "£0–4,800 / yr", impl: "£8,000–15,000", year1: "£8,000–15,000", note: "Low licence cost offset by high implementation effort" },
    withoutApi: { license: "£0 open source / £20–40 hosted", annual10: "£0–4,800 / yr", impl: "£6,000–12,000", year1: "£6,000–12,000", note: "Lower scope without portal integration work" },
    scores: { manufacturing: 4, traceability: 4, api: 4, ease: 2, cost: 5, scalability: 4 },
    capabilities: [
      { label: "Product / Item Master Data",        has: true },
      { label: "Bills of Materials (BOMs)",          has: true },
      { label: "Purchasing & Supplier Management",   has: true },
      { label: "Inventory Management",               has: true },
      { label: "Manufacturing / Assembly Tracking",  has: true },
      { label: "Serial Number & Lot Traceability",   has: true },
      { label: "Stock Movements & Procurement",      has: true },
      { label: "REST API for Portal Integration",    has: true },
      { label: "QR Code Support",                    has: true },
      { label: "Field Service / Maintenance Module", has: true },
      { label: "CRM",                                has: true },
      { label: "Accounting Module",                  has: true },
      { label: "Self-implementation Friendly",       has: false },
      { label: "Maritime / Compliance Specific",     has: false },
    ],
    pros: ["No licensing cost — fully open source","Highly flexible and customisable","Full ERP scope including accounting","API built in at all levels","No vendor lock-in","Strong global community"],
    cons: ["Highest implementation complexity on shortlist","Requires internal technical ownership","Longer time to go-live","Support dependent on community or paid partners","Upgrades can break customisations","Not appropriate without dedicated technical resource"],
    verdict: "Attractive on cost but the implementation overhead is real. Only appropriate if Zelim has internal technical resource to own it. Not recommended for a quick, clean deployment.",
  },
];

const scoreLabels = {
  manufacturing: "Manufacturing",
  traceability:  "Traceability",
  api:           "API / Integration",
  ease:          "Ease of Setup",
  cost:          "Cost Efficiency",
  scalability:   "Scalability",
};

const allCaps = [
  "Product / Item Master Data",
  "Bills of Materials (BOMs)",
  "Purchasing & Supplier Management",
  "Inventory Management",
  "Manufacturing / Assembly Tracking",
  "Serial Number & Lot Traceability",
  "Stock Movements & Procurement",
  "REST API for Portal Integration",
  "QR Code Support",
  "Field Service / Maintenance Module",
  "CRM",
  "Accounting Module",
  "Self-implementation Friendly",
  "Maritime / Compliance Specific",
];

// ── SHARED COMPONENTS ─────────────────────────────────────────

function Dots({ score, accent }) {
  return (
    <div style={{ display: "flex", gap: 5 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          width: 9, height: 9, borderRadius: "50%",
          background: i <= score ? accent : Z.border,
          transition: "background 0.2s",
        }} />
      ))}
    </div>
  );
}

function Icon({ has }) {
  if (has === true)  return <span style={{ color: Z.cyan, fontSize: 15, fontWeight: 800, lineHeight: 1 }}>✓</span>;
  if (has === false) return <span style={{ color: Z.error, fontSize: 15, fontWeight: 800, lineHeight: 1 }}>✗</span>;
  return                    <span style={{ color: Z.amber, fontSize: 15, fontWeight: 800, lineHeight: 1 }}>~</span>;
}

function Tag({ label, accent, accentText }) {
  return (
    <span style={{
      display: "inline-block",
      background: accent,
      color: accentText,
      borderRadius: 4,
      padding: "3px 10px",
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: 1.8,
      fontFamily: font,
      textTransform: "uppercase",
    }}>{label}</span>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 12, textTransform: "uppercase", letterSpacing: "1px",
      color: Z.text, fontFamily: font, fontWeight: 600, marginBottom: 14,
    }}>{children}</div>
  );
}

function PrimaryBtn({ children, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: "0.75rem",
        fontSize: "0.875rem", fontWeight: 400,
        fontFamily: "'Roboto Mono', monospace",
        textTransform: "uppercase", letterSpacing: "0.1em",
        color: hovered ? "#172F36" : "#ffffff",
        padding: "0.4375rem 0.75rem 0.4375rem 1.5rem",
        border: "1px solid rgb(246,246,94)",
        borderRadius: "0.5rem",
        backgroundColor: hovered ? "rgb(246,246,94)" : "transparent",
        cursor: "pointer",
        transition: "background-color 0.5s, color 0.5s",
      }}
    >
      <span>{children}</span>
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        width: "1.875rem", height: "1.875rem",
        borderRadius: "0.1875rem",
        backgroundColor: hovered ? "#172F36" : "rgb(246,246,94)",
        flexShrink: 0,
        transition: "background-color 0.5s",
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7H12M12 7L7.5 2.5M12 7L7.5 11.5" stroke={hovered ? "rgb(246,246,94)" : "#172F36"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
}

// ── MAIN ─────────────────────────────────────────────────────
export default function ErpPage() {
  const [view, setView] = useState("cards");
  const [sel,  setSel]  = useState(null);
  const [api,  setApi]  = useState(true);

  const p  = sel ? platforms.find(x => x.id === sel) : null;
  const pr = (pl) => api ? pl.withApi : pl.withoutApi;

  return (
    <>
      <Head>
        <title>ERP / MRP Evaluation — Zelim</title>
      </Head>
      <div style={{ background: "#172F36", minHeight: "100vh", color: Z.text, fontFamily: font, position: "relative" }}>

        {/* Zelim pattern — absolute top-right */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 418 887"
          fill="none"
          style={{
            position: "absolute",
            top: "0.8125rem",
            right: -20,
            transform: "scaleX(-1)",
            width: "max(10rem, 20vw)",
            height: "auto",
            zIndex: 0,
            pointerEvents: "none",
          }}
        >
          <g opacity="0.5">
            <path d="M85.9195 886.289L83.9849 885.257L315.824 509.257H3.69834C3.28724 509.257 2.9245 509.055 2.73103 508.741C2.53757 508.427 2.53757 508.023 2.73103 507.709L81.2522 381.5C81.4457 381.186 81.8084 380.984 82.2196 380.984H237.303L160.088 256.862H3.69834C3.28724 256.862 2.9245 256.66 2.73103 256.346C2.53757 256.032 2.53757 255.628 2.73103 255.314L159.749 2.91925C160.136 2.26845 161.273 2.26845 161.684 2.91925L239.867 128.589H396.256V129.621L397.223 130.138L318.702 256.324C318.702 256.324 318.702 256.369 318.678 256.369L241.172 380.961H396.256C396.667 380.961 397.03 381.163 397.223 381.478L554.242 633.872C554.435 634.186 554.435 634.59 554.242 634.905C554.048 635.219 553.685 635.421 553.274 635.421H396.256C395.845 635.421 395.482 635.219 395.289 634.905L317.735 510.267L85.8953 886.267L85.9195 886.289ZM398.191 633.378H551.34L474.753 510.289L398.166 633.378H398.191ZM319.694 509.257L396.28 632.346L472.867 509.257H319.718H319.694ZM319.694 507.192H472.843L396.256 384.103L319.669 507.192H319.694ZM162.651 507.192H315.8L239.214 384.103L162.627 507.192H162.651ZM5.63296 507.192H158.782L82.1954 384.103L5.63296 507.192ZM241.172 383.048L317.759 506.138L394.346 383.048H241.197H241.172ZM84.1542 383.048L160.741 506.138L237.327 383.048H84.1784H84.1542ZM162.651 256.862L239.238 379.952L315.824 256.862H162.675H162.651ZM162.651 254.798H315.8L239.214 131.708L162.627 254.798H162.651ZM5.63296 254.798H158.782L82.1954 131.708L5.63296 254.798ZM241.172 130.654L317.759 253.743L394.346 130.654H241.197H241.172ZM84.1542 130.654L160.741 253.743L237.327 130.654H84.1784H84.1542ZM84.1542 128.589H237.303L160.717 5.49997L84.13 128.589H84.1542Z" fill="url(#patternGrad)"/>
            <circle cx="160.719" cy="3.43348" r="3.43348" fill="#00FFF2"/>
            <circle cx="396.259" cy="129.621" r="3.43348" fill="#00FFF2"/>
            <circle cx="239.747" cy="129.621" r="3.43348" fill="#00FFF2"/>
            <circle cx="82.1492" cy="129.621" r="3.43348" fill="#00FFF2"/>
            <circle cx="3.69995" cy="255.827" r="3.43348" fill="#00FFF2"/>
            <circle cx="160.719" cy="255.827" r="3.43348" fill="#00FFF2"/>
            <circle cx="317.762" cy="255.827" r="3.43348" fill="#00FFF2"/>
            <circle cx="239.747" cy="381.362" r="3.43348" fill="#00FFF2"/>
            <circle cx="82.7273" cy="381.362" r="3.43348" fill="#00FFF2"/>
            <circle cx="396.79" cy="381.362" r="3.43348" fill="#00FFF2"/>
            <circle cx="161.251" cy="507.572" r="3.43348" fill="#00FFF2"/>
            <circle cx="4.20776" cy="507.572" r="3.43348" fill="#00FFF2"/>
            <circle cx="318.27" cy="507.572" r="3.43348" fill="#00FFF2"/>
            <circle cx="396.259" cy="634.408" r="3.43348" fill="#00FFF2"/>
          </g>
          <defs>
            <linearGradient id="patternGrad" x1="2.58594" y1="444.357" x2="554.411" y2="444.357" gradientUnits="userSpaceOnUse">
              <stop offset="0.21" stopColor="#005268"/>
              <stop offset="0.32" stopColor="#00566B"/>
              <stop offset="0.44" stopColor="#016476"/>
              <stop offset="0.57" stopColor="#027A89"/>
              <stop offset="0.7" stopColor="#049AA3"/>
              <stop offset="0.84" stopColor="#06C3C4"/>
              <stop offset="0.98" stopColor="#09F4EC"/>
              <stop offset="1" stopColor="#0AFDF4"/>
            </linearGradient>
          </defs>
        </svg>

        <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>

          {/* ── HEADER ── */}
          <div style={{ background: "#172F36", padding: "60px 40px 20px", position: "relative", overflow: "hidden" }}>

            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
              <Logo height={22} />
              <div style={{ width: 1, height: 20, background: Z.border }} />
              <span style={{ color: Z.text, fontSize: 9, letterSpacing: "3px", fontFamily: font, fontWeight: 600, textTransform: "uppercase" }}>
                ERP / MRP Evaluation
              </span>
            </div>

            <h1 style={{ margin: "0 0 4px", fontSize: 30, fontWeight: 600, color: Z.text, letterSpacing: "0.5px", fontFamily: font }}>
              Platform Comparison
            </h1>
            <p style={{ margin: "0 0 20px", color: Z.text, fontSize: 16, fontWeight: 400, fontFamily: font }}>
              Four shortlisted systems evaluated against Zelim&apos;s operational requirements
            </p>

            {/* Controls */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", background: Z.inputBg, border: `1px solid rgb(246,246,94)`, borderRadius: "0.6rem", padding: 3, gap: 3 }}>
                {[["cards","Overview"],["grid","Capability Grid"],["pricing","Pricing"]].map(([id, lbl]) => (
                  <button key={id} onClick={() => { setView(id); setSel(null); }} style={{
                    fontFamily: "'Roboto Mono', monospace", fontSize: "0.875rem", fontWeight: 400,
                    textTransform: "uppercase", letterSpacing: "0.1em",
                    cursor: "pointer", borderRadius: "0.4rem",
                    padding: "0.4375rem 0.9rem",
                    border: "none",
                    background: view === id ? "rgb(246,246,94)" : "transparent",
                    color: view === id ? Z.inputBg : Z.text,
                    transition: "all 0.15s",
                  }}>{lbl}</button>
                ))}
              </div>

              <div style={{ display: "flex", background: Z.inputBg, border: `1px solid rgb(246,246,94)`, borderRadius: "0.6rem", padding: 3, gap: 3 }}>
                {[[true,"With Portal API"],[false,"Without Portal API"]].map(([val, lbl]) => (
                  <button key={String(val)} onClick={() => setApi(val)} style={{
                    fontFamily: "'Roboto Mono', monospace", fontSize: "0.875rem", fontWeight: 400,
                    textTransform: "uppercase", letterSpacing: "0.1em",
                    cursor: "pointer", borderRadius: "0.4rem",
                    padding: "0.4375rem 0.9rem",
                    border: "none",
                    background: api === val ? "rgb(246,246,94)" : "transparent",
                    color: api === val ? Z.inputBg : Z.text,
                    transition: "all 0.15s",
                  }}>{lbl}</button>
                ))}
              </div>
            </div>
          </div>

          {/* API banner */}
          <div style={{ padding: "8px 40px", fontFamily: font, fontSize: 14, fontWeight: 400, color: Z.text, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ letterSpacing: "1px", fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{api ? "API INTEGRATION MODE" : "STANDALONE MODE"}</span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span style={{ fontWeight: 400, opacity: 0.85 }}>
              {api
                ? "Costs shown include ERP ↔ Zelim portal REST API. This is the recommended architecture."
                : "Costs shown for standalone ERP only. Portal integration not included. Not the recommended approach."}
            </span>
          </div>

          <div style={{ padding: "24px 40px 60px" }}>

            {/* ══ CARDS VIEW ══ */}
            {view === "cards" && !sel && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                {platforms.map(pl => (
                  <div key={pl.id} style={{ background: Z.cardBg, border: "none", borderTop: `2px solid ${pl.accent}`, borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "24px 30px", flex: 1 }}>
                      <Tag label={pl.tag} accent={pl.accent} accentText={pl.accentText} />
                      <div style={{ fontSize: 20, fontWeight: 600, color: Z.text, marginTop: 10, letterSpacing: "0.3px", fontFamily: font }}>{pl.name}</div>
                      <div style={{ fontSize: 14, color: Z.text, fontWeight: 400, marginTop: 2, marginBottom: 16, fontFamily: font }}>{pl.subtitle}</div>
                      {Object.entries(scoreLabels).map(([k, lbl]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
                          <span style={{ fontSize: 14, color: Z.text, fontWeight: 400, fontFamily: font }}>{lbl}</span>
                          <Dots score={pl.scores[k]} accent={pl.accent} />
                        </div>
                      ))}
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${Z.border}` }}>
                        <div style={{ fontSize: 12, color: Z.text, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4, fontFamily: font }}>
                          Year 1 Est. {api ? "(With API)" : "(Without API)"}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 600, color: pl.accent, fontFamily: font }}>{pr(pl).year1}</div>
                      </div>
                      <div style={{ marginTop: 10, padding: "9px 11px", background: `${pl.accent}0c`, borderLeft: `2px solid ${pl.accent}`, fontSize: 14, color: Z.text, fontWeight: 400, lineHeight: 1.6, borderRadius: "0 4px 4px 0", fontFamily: font }}>
                        {pl.verdict.split(".")[0]}.
                      </div>
                    </div>
                    <div style={{ padding: "0 30px 24px" }}>
                      <PrimaryBtn onClick={() => setSel(pl.id)}>View Full Details</PrimaryBtn>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ══ DETAIL VIEW ══ */}
            {view === "cards" && sel && p && (
              <div>
                <div style={{ marginBottom: 18 }}>
                  <PrimaryBtn onClick={() => setSel(null)}>← Back</PrimaryBtn>
                </div>
                <div style={{ background: Z.cardBg, borderTop: `3px solid ${p.accent}`, borderRadius: 20, overflow: "hidden" }}>
                  <div style={{ padding: "24px 30px", borderBottom: `1px solid ${Z.border}`, position: "relative", overflow: "hidden", background: "#172F36" }}>
                    <Tag label={p.tag} accent={p.accent} accentText={p.accentText} />
                    <div style={{ fontSize: 28, fontWeight: 600, color: Z.text, marginTop: 8, fontFamily: font }}>{p.name}</div>
                    <div style={{ fontSize: 16, color: Z.text, fontWeight: 400, marginTop: 3, fontFamily: font }}>{p.subtitle}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
                    {[
                      { heading: "Scores", content: (
                        Object.entries(scoreLabels).map(([k, lbl]) => (
                          <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <span style={{ fontSize: 14, color: Z.text, fontWeight: 400, fontFamily: font }}>{lbl}</span>
                            <Dots score={p.scores[k]} accent={p.accent} />
                          </div>
                        ))
                      )},
                      { heading: "Strengths", content: (
                        p.pros.map((pro, i) => (
                          <div key={i} style={{ display: "flex", gap: 9, marginBottom: 10, alignItems: "flex-start" }}>
                            <span style={{ color: Z.cyan, fontSize: 13, fontWeight: 900, marginTop: 1, flexShrink: 0 }}>✓</span>
                            <span style={{ fontSize: 14, color: Z.text, fontWeight: 400, lineHeight: 1.55, fontFamily: font }}>{pro}</span>
                          </div>
                        ))
                      )},
                      { heading: "Risks", content: (
                        p.cons.map((con, i) => (
                          <div key={i} style={{ display: "flex", gap: 9, marginBottom: 10, alignItems: "flex-start" }}>
                            <span style={{ color: Z.error, fontSize: 13, fontWeight: 900, marginTop: 1, flexShrink: 0 }}>✗</span>
                            <span style={{ fontSize: 14, color: Z.text, fontWeight: 400, lineHeight: 1.55, fontFamily: font }}>{con}</span>
                          </div>
                        ))
                      )},
                    ].map(({ heading, content }) => (
                      <div key={heading} style={{ padding: "24px 30px" }}>
                        <SectionLabel>{heading}</SectionLabel>
                        {content}
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: "24px 30px", background: "#172F36" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <SectionLabel>Pricing</SectionLabel>
                      <div style={{ marginTop: -14 }}>
                        <Tag
                          label={api ? "With Portal API" : "Without Portal API"}
                          accent={api ? `${Z.cyan}20` : `${Z.amber}20`}
                          accentText={api ? Z.cyan : Z.amber}
                        />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
                      {[["Licensing",pr(p).license],["Annual (10 users)",pr(p).annual10],["Implementation",pr(p).impl],["Year 1 Total",pr(p).year1]].map(([lbl,val]) => (
                        <div key={lbl}>
                          <div style={{ fontSize: 12, color: Z.text, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 5, fontFamily: font }}>{lbl}</div>
                          <div style={{ fontSize: 16, fontWeight: 400, color: Z.text, lineHeight: 1.4, fontFamily: font }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 12, fontSize: 13, color: Z.text, fontStyle: "italic", fontWeight: 400, fontFamily: font }}>⚠ {pr(p).note}</div>
                  </div>
                  <div style={{ padding: "24px 30px" }}>
                    <SectionLabel>Capability Checklist</SectionLabel>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 16px" }}>
                      {p.capabilities.map((cap, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                          <Icon has={cap.has} />
                          <div>
                            <div style={{ fontSize: 14, color: Z.text, fontWeight: 400, lineHeight: 1.4, fontFamily: font }}>{cap.label}</div>
                            {cap.note && <div style={{ fontSize: 13, color: Z.text, fontWeight: 400, marginTop: 1, fontFamily: font }}>{cap.note}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ padding: "24px 30px" }}>
                    <SectionLabel>Assessment</SectionLabel>
                    <div style={{ borderLeft: `3px solid ${p.accent}`, paddingLeft: 14, fontSize: 14, color: Z.text, fontWeight: 400, lineHeight: 1.75, fontFamily: font }}>{p.verdict}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ GRID VIEW ══ */}
            {view === "grid" && (
              <div>
                <div style={{ display: "flex", gap: 24, marginBottom: 14, fontSize: 14, color: Z.text, fontWeight: 400, fontFamily: font }}>
                  <span><span style={{ color: Z.cyan }}>✓</span>  Supported</span>
                  <span><span style={{ color: Z.amber }}>~</span>  Partial / Limited</span>
                  <span><span style={{ color: Z.error }}>✗</span>  Not supported</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", background: Z.cardBg, borderRadius: 8, overflow: "hidden" }}>
                    <thead>
                      <tr style={{ background: "#172F36" }}>
                        <th style={{ padding: "13px 18px", textAlign: "left", color: Z.text, fontWeight: 600, fontSize: 12, letterSpacing: "1px", textTransform: "uppercase", width: "28%", fontFamily: font }}>Capability</th>
                        {platforms.map(pl => (
                          <th key={pl.id} style={{ padding: "13px 14px", textAlign: "center", color: Z.text, fontWeight: 600, fontSize: 14, borderTop: `3px solid ${pl.accent}`, fontFamily: font }}>
                            {pl.name}
                            <div style={{ fontSize: 12, color: pl.accent, fontWeight: 600, marginTop: 3, letterSpacing: "1px", textTransform: "uppercase" }}>{pl.tag}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allCaps.map((lbl, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? Z.cardBg : "#172F36" }}>
                          <td style={{ padding: "11px 18px", color: Z.text, fontWeight: 400, fontSize: 14, fontFamily: font }}>{lbl}</td>
                          {platforms.map(pl => {
                            const cap = pl.capabilities.find(c => c.label === lbl);
                            return (
                              <td key={pl.id} style={{ padding: "11px 14px", textAlign: "center" }}>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                                  <Icon has={cap ? cap.has : false} />
                                  {cap?.note && <div style={{ fontSize: 13, color: Z.text, maxWidth: 110, textAlign: "center", lineHeight: 1.3, fontFamily: font }}>{cap.note}</div>}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══ PRICING VIEW ══ */}
            {view === "pricing" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 14 }}>
                  {platforms.map(pl => (
                    <div key={pl.id} style={{ background: Z.cardBg, borderTop: `3px solid ${pl.accent}`, borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      <div style={{ padding: "24px 30px", flex: 1 }}>
                        <Tag label={pl.tag} accent={pl.accent} accentText={pl.accentText} />
                        <div style={{ fontSize: 20, fontWeight: 600, color: Z.text, marginTop: 10, letterSpacing: "0.3px", fontFamily: font }}>{pl.name}</div>
                        <div style={{ fontSize: 14, color: Z.text, fontWeight: 400, marginTop: 2, marginBottom: 16, fontFamily: font }}>{pl.subtitle}</div>
                        {[["Licensing",pr(pl).license],["Annual (10 users)",pr(pl).annual10],["Implementation",pr(pl).impl]].map(([lbl,val]) => (
                          <div key={lbl} style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "1px", color: Z.text, fontWeight: 600, marginBottom: 4, fontFamily: font }}>{lbl}</div>
                            <div style={{ fontSize: 16, fontWeight: 400, color: Z.text, lineHeight: 1.45, fontFamily: font }}>{val}</div>
                          </div>
                        ))}
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${Z.border}` }}>
                          <div style={{ fontSize: 12, color: Z.text, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, marginBottom: 4, fontFamily: font }}>Year 1 Total</div>
                          <div style={{ fontSize: 20, fontWeight: 600, color: pl.accent, fontFamily: font }}>{pr(pl).year1}</div>
                        </div>
                        <div style={{ marginTop: 10, padding: "9px 11px", background: `${pl.accent}0c`, borderLeft: `2px solid ${pl.accent}`, fontSize: 13, color: Z.text, fontWeight: 400, lineHeight: 1.6, borderRadius: "0 4px 4px 0", fontFamily: font }}>
                          ⚠ {pr(pl).note}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: `rgba(246,246,94,0.06)`, border: `1px solid rgba(246,246,94,0.25)`, borderRadius: 20, padding: "20px 24px", fontSize: 14, color: "rgb(246,246,94)", lineHeight: 1.75, fontWeight: 400, fontFamily: font }}>
                  <strong style={{ fontWeight: 700 }}>Note:</strong> All figures are estimates based on published rates and market research, early 2026. Portal API integration (£2,000–6,000 development cost) should be budgeted separately on top of all figures shown. Validate with direct vendor or partner quotes before any decision is made.
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
