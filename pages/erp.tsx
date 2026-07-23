import Head from "next/head";
import { useState } from "react";
import { Check, X, Minus } from "lucide-react";
import clsx from "clsx";
import ArrowButton from "@/components/ui/arrow-button";

// Per-platform accent styling. "lead" is the cyan recommendation accent,
// "alt" the muted teal used by the rest of the shortlist.
type Accent = "lead" | "alt";

const accents: Record<Accent, { tag: string; text: string; borderTop: string; borderLeft: string; bg: string }> = {
  lead: {
    tag: "bg-accent text-accent-ink",
    text: "text-accent",
    borderTop: "border-t-accent",
    borderLeft: "border-l-accent",
    bg: "bg-accent/5",
  },
  alt: {
    tag: "bg-link text-ink",
    text: "text-link",
    borderTop: "border-t-link",
    borderLeft: "border-l-link",
    bg: "bg-link/5",
  },
};

function Logo({ height = 22 }: { height?: number }) {
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
    tag: "LEAD RECOMMENDATION", accent: "lead" as Accent,
    withApi:    { license: "~£37–45 / user / month", annual10: "~£4,500–5,400 / yr", impl: "£8,000–20,000", year1: "£13,000–25,000", note: "Custom plan required for portal API access" },
    withoutApi: { license: "~£25–30 / user / month", annual10: "~£3,000–3,600 / yr", impl: "£4,000–12,000", year1: "£7,000–16,000", note: "Standard plan — no external API access" },
    scoresWithoutApi: { manufacturing: 5, traceability: 5, crm: 5, accounting: 5, scalability: 5, api: 5, cost: 4, fieldService: 5, ease: 3 },
    scoresWithApi:    { manufacturing: 5, traceability: 5, crm: 5, accounting: 5, scalability: 5, api: 5, cost: 3, fieldService: 5, ease: 3 },
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
      { label: "Self-implementation Friendly",       has: "partial", note: "Achievable — best with a phased plan" },
      { label: "Maritime / Compliance Specific",     has: false },
    ],
    pros: ["Full product and BOM management — the right foundation for Zelim's parts and equipment","Strong procurement and supplier management built in from day one","Best-in-class serial number and lot traceability across the shortlist","Full CRM for client and contract management","Native accounting removes the need for a separate finance tool","REST API available when Zelim is ready to connect the maintenance portal — no platform switch needed"],
    cons: ["Broadest scope — highest risk of scope creep without a disciplined rollout","API requires the more expensive Custom plan — relevant for Phase 2","More complex to self-implement than alternatives","Partner implementation costs can be significant","Needs a tightly scoped Phase 1 to stay lean and on budget"],
    verdict: "Best overall fit for Zelim. Start with products, BOMs, procurement and traceability to build the operational foundation. The maintenance portal connects directly via REST API — creating a single source of truth across the whole business. No platform switch needed at any stage.",
  },
  {
    id: "mrpeasy", name: "MRPeasy", subtitle: "Enterprise Plan (API) / Starter",
    tag: "STRONG ALTERNATIVE", accent: "alt" as Accent,
    withApi:    { license: "$149 / user / month (Enterprise)", annual10: "~£14,000 / yr", impl: "£1,500–4,000", year1: "£16,000–18,000", note: "API only on top tier — cost advantage disappears" },
    withoutApi: { license: "$49 / user / month (Starter)",     annual10: "~£4,700 / yr",  impl: "£1,500–3,000", year1: "£6,000–8,000",   note: "Starter plan — no API access to portal" },
    scoresWithoutApi: { manufacturing: 5, traceability: 5, crm: 2, accounting: 2, scalability: 3, api: 2, cost: 3, fieldService: 1, ease: 5 },
    scoresWithApi:    { manufacturing: 5, traceability: 5, crm: 2, accounting: 2, scalability: 3, api: 2, cost: 1, fieldService: 1, ease: 3 },
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
    pros: ["Purpose-built for small manufacturers — excellent BOM and production planning","Best-in-class serialised traceability at this scale","Fastest to implement — shortest learning curve on the shortlist","30-day free trial available","Very intuitive for non-technical teams"],
    cons: ["No field service or maintenance module — a significant gap for Zelim","No CRM — client and contract management requires a separate tool","Accounting weak — needs Xero or QuickBooks alongside it","API only on $149/user/month tier — cost advantage disappears entirely","Limited expansion path as Zelim grows beyond manufacturing"],
    verdict: "Strong on manufacturing and traceability, but built for the workshop not the full business. No field service module, no CRM, and weak accounting mean Zelim would need multiple additional tools — eroding the cost advantage and adding integration complexity.",
  },
  {
    id: "cin7", name: "Cin7 Core", subtitle: "Formerly DEAR Systems",
    tag: "WORTH EVALUATING", accent: "alt" as Accent,
    withApi:    { license: "~£35–50 / user / month", annual10: "~£4,200–6,000 / yr", impl: "£3,000–8,000", year1: "£7,000–14,000", note: "API included at standard tiers — no premium uplift" },
    withoutApi: { license: "~£35–50 / user / month", annual10: "~£4,200–6,000 / yr", impl: "£2,000–5,000", year1: "£6,000–11,000", note: "Same licensing — implementation simpler without integration" },
    scoresWithoutApi: { manufacturing: 4, traceability: 4, crm: 2, accounting: 2, scalability: 4, api: 4, cost: 4, fieldService: 1, ease: 4 },
    scoresWithApi:    { manufacturing: 4, traceability: 4, crm: 2, accounting: 2, scalability: 4, api: 4, cost: 4, fieldService: 1, ease: 4 },
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
    pros: ["Cleaner implementation path than Odoo","Strong inventory and traceability capability","API available without premium pricing tier — no uplift","Good balance of depth and simplicity","Easier self-implementation than Odoo"],
    cons: ["No field service or maintenance module — a critical gap for Zelim","No meaningful CRM — client management needs a separate tool","Accounting requires Xero or QuickBooks integration","Narrower long-term expansion path than Odoo","Smaller UK partner and support ecosystem"],
    verdict: "A credible option for inventory and manufacturing, but the absence of field service and CRM is a meaningful gap for a maintenance company. Would require bolt-on tools for the parts of the business Odoo covers natively.",
  },
  {
    id: "erpnext", name: "ERPNext", subtitle: "Open Source",
    tag: "LOWER PRIORITY", accent: "alt" as Accent,
    withApi:    { license: "£0 open source / £20–40 hosted", annual10: "£0–4,800 / yr", impl: "£8,000–15,000", year1: "£8,000–15,000", note: "Low licence cost offset by high implementation effort" },
    withoutApi: { license: "£0 open source / £20–40 hosted", annual10: "£0–4,800 / yr", impl: "£6,000–12,000", year1: "£6,000–12,000", note: "Lower scope without portal integration work" },
    scoresWithoutApi: { manufacturing: 4, traceability: 4, crm: 4, accounting: 5, scalability: 4, api: 4, cost: 5, fieldService: 4, ease: 2 },
    scoresWithApi:    { manufacturing: 4, traceability: 4, crm: 4, accounting: 5, scalability: 4, api: 4, cost: 5, fieldService: 4, ease: 2 },
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
    pros: ["No licensing cost — fully open source","Full ERP scope: field service, CRM, accounting, manufacturing all included","API built in at all tiers — no premium uplift","Highly flexible and customisable","No vendor lock-in"],
    cons: ["Highest implementation complexity on the shortlist by some margin","Requires internal technical ownership to build and maintain","Longest time to go-live — not suitable for a quick deployment","Upgrades can break customisations without careful management","Support dependent on community or paid partners — no guaranteed SLA"],
    verdict: "Covers the full business scope as well as Odoo, and at lower licence cost. The implementation overhead is the blocker — only viable if Zelim has or plans to hire internal technical resource. Not the right choice for a quick, clean deployment.",
  },
];

const scoreLabels = {
  manufacturing: "Manufacturing",
  traceability:  "Traceability",
  crm:           "CRM & clients",
  accounting:    "Accounting",
  scalability:   "Scalability",
  api:           "API / Integration",
  cost:          "Cost efficiency",
  fieldService:  "Field service",
  ease:          "Ease of setup",
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

function Dots({ score }: { score: number }) {
  return (
    <div className="flex gap-[5px]">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className={clsx("h-[9px] w-[9px] rounded-full", i <= score ? "bg-warn" : "bg-line")} />
      ))}
    </div>
  );
}

function Icon({ has }: { has: boolean | string }) {
  if (has === true)  return <Check size={15} strokeWidth={2.5} className="shrink-0 text-accent" />;
  if (has === false) return <X size={15} strokeWidth={2.5} className="shrink-0 text-danger" />;
  return                    <Minus size={15} strokeWidth={2.5} className="shrink-0 text-warn" />;
}

function Tag({ label, accent }: { label: string; accent: Accent }) {
  return (
    <span className={clsx("inline-block rounded px-2.5 py-[3px] text-[9px] font-bold uppercase tracking-[1.8px]", accents[accent].tag)}>
      {label}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-3.5 text-xs font-semibold tracking-[0.4px] text-ink">{children}</div>;
}

function PillToggle<T extends string | boolean>({
  options,
  value,
  onChange,
}: {
  options: [T, string][];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-[3px] rounded-[0.6rem] border border-warn bg-field p-[3px]">
      {options.map(([val, label]) => (
        <button
          key={String(val)}
          onClick={() => onChange(val)}
          className={clsx(
            "cursor-pointer rounded-[0.4rem] border-none px-[0.9rem] py-[7px] font-mono text-[0.7rem] font-normal uppercase tracking-[0.1em] transition-all duration-150",
            value === val ? "bg-warn text-field" : "bg-transparent text-ink",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────
export default function ErpPage() {
  const [view, setView] = useState("cards");
  const [sel,  setSel]  = useState(null);
  const [api,  setApi]  = useState(false);

  const p  = sel ? platforms.find(x => x.id === sel) : null;
  const pr = (pl) => api ? pl.withApi       : pl.withoutApi;
  const sc = (pl) => api ? pl.scoresWithApi : pl.scoresWithoutApi;

  const sectionPad = "p-[24px_30px] max-[600px]:p-5";

  return (
    <>
      <Head>
        <title>ERP Evaluation — Zelim</title>
      </Head>
      <div className="relative min-h-screen bg-page font-sans text-ink">

        {/* Zelim pattern */}
        <img
          src="/patterns/pattern-left.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute top-[13px] -right-5 z-0 h-auto w-[max(10rem,20vw)] -scale-x-100 max-[600px]:hidden"
        />

        <div className="relative z-1 mx-auto max-w-[1280px]">

          {/* ── HEADER ── */}
          <div className="relative overflow-hidden bg-page px-10 pt-[60px] pb-5 max-[768px]:px-5 max-[768px]:pt-10 max-[768px]:pb-4 max-[600px]:px-4 max-[600px]:pt-[30px] max-[600px]:pb-3.5">

            <div className="mb-10 flex items-center gap-4">
              <Logo height={22} />
              <div className="h-5 w-px bg-line" />
              <span className="text-[9px] font-semibold uppercase tracking-[3px] text-ink">
                ERP Evaluation
              </span>
            </div>

            {/* mt-0 needed while preflight is off: UA heading margins still apply */}
            <h1 className="mt-0 mb-1 text-[30px] font-semibold tracking-[0.5px] text-ink max-[600px]:text-[22px] max-[600px]:leading-[1.3]">
              ERP platform comparison
            </h1>
            <p className="mt-0 mb-5 text-[15px] text-ink">
              Four shortlisted systems evaluated against Zelim&apos;s operational requirements
            </p>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 max-[768px]:flex-col max-[768px]:items-start max-[600px]:gap-2">
              <PillToggle<string>
                options={[["cards", "Overview"], ["grid", "Capability Grid"]]}
                value={view}
                onChange={(v) => { setView(v); setSel(null); }}
              />
              <PillToggle<boolean>
                options={[[false, "Without Portal API"], [true, "With Portal API"]]}
                value={api}
                onChange={setApi}
              />
            </div>
          </div>

          {/* API banner */}
          <div className="flex items-center gap-2.5 px-10 py-2 text-sm text-ink max-[768px]:flex-wrap max-[768px]:px-5 max-[600px]:px-4 max-[600px]:text-[13px]">
            <span className="text-xs font-semibold tracking-[0.4px]">{api ? "API integration mode" : "Standalone mode"}</span>
            <span className="opacity-40">|</span>
            <span className="opacity-85">
              {api
                ? "Connecting the Zelim maintenance portal to the ERP creates a single source of truth — recommended long-term architecture."
                : "Standalone ERP costs only. Portal integration adds significant value and is the recommended end state."}
            </span>
          </div>

          <div className="px-10 pt-6 pb-[60px] max-[768px]:px-5 max-[768px]:pt-4 max-[768px]:pb-10 max-[600px]:px-4 max-[600px]:pt-3.5">

            {/* ══ CARDS VIEW ══ */}
            {view === "cards" && !sel && (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3.5">
                {platforms.map(pl => (
                  <div key={pl.id} className="flex flex-col overflow-hidden rounded-[20px] bg-card">
                    <div className="flex-1 p-[24px_30px] max-[600px]:p-5">
                      <Tag label={pl.tag} accent={pl.accent} />
                      <div className="mt-2.5 text-xl font-semibold tracking-[0.3px] text-ink">{pl.name}</div>
                      <div className="mt-0.5 text-sm text-ink">{pl.subtitle}</div>
                      <div className={clsx("mt-1 mb-4 text-sm font-semibold", accents[pl.accent].text)}>{pr(pl).license}</div>
                      {Object.entries(scoreLabels).map(([k, lbl]) => (
                        <div key={k} className="mb-[9px] flex items-center justify-between">
                          <span className="text-sm text-ink">{lbl}</span>
                          <Dots score={sc(pl)[k]} />
                        </div>
                      ))}
                      <div className="mt-3.5 pt-3">
                        <Tag label="Key strengths" accent={pl.accent} />
                        <div className="mt-2.5">
                          {pl.pros.slice(0, 3).map((pro, i) => (
                            <div key={i} className="mb-1.5 flex items-start gap-2">
                              <Check size={13} strokeWidth={2.5} className={clsx("mt-0.5 shrink-0", accents[pl.accent].text)} />
                              <span className="text-sm leading-normal text-ink">{pro}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3.5 pt-3">
                        <div className="mb-1 text-xs font-semibold tracking-[0.4px] text-ink">
                          Year 1 est. {api ? "(with API)" : "(without API)"}
                        </div>
                        <div className={clsx("text-xl font-semibold", accents[pl.accent].text)}>{pr(pl).year1}</div>
                      </div>
                      <div className={clsx(
                        "mt-2.5 rounded-r border-l-2 p-[9px_11px] text-sm leading-relaxed text-ink",
                        accents[pl.accent].borderLeft,
                        accents[pl.accent].bg,
                      )}>
                        {pl.verdict.split(".")[0]}.
                      </div>
                    </div>
                    <div className="px-[30px] pb-6 max-[600px]:px-5 max-[600px]:pb-5">
                      <ArrowButton onClick={() => setSel(pl.id)} fullWidth>Learn more</ArrowButton>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ══ DETAIL VIEW ══ */}
            {view === "cards" && sel && p && (
              <div>
                <div className="mb-[18px]">
                  <ArrowButton onClick={() => setSel(null)} direction="back">Back</ArrowButton>
                </div>
                <div className="overflow-hidden rounded-[20px] bg-card">
                  <div className={clsx("relative overflow-hidden bg-card", sectionPad)}>
                    <Tag label={p.tag} accent={p.accent} />
                    <div className="mt-2 text-[28px] font-semibold text-ink">{p.name}</div>
                    <div className="mt-[3px] text-[15px] text-ink">{p.subtitle}</div>
                  </div>
                  <div className="grid grid-cols-3 max-[600px]:grid-cols-1">
                    {[
                      { heading: "Scores", content: (
                        Object.entries(scoreLabels).map(([k, lbl]) => (
                          <div key={k} className="mb-3 flex items-center justify-between">
                            <span className="text-sm text-ink">{lbl}</span>
                            <Dots score={sc(p)[k]} />
                          </div>
                        ))
                      )},
                      { heading: "Strengths", content: (
                        p.pros.map((pro, i) => (
                          <div key={i} className="mb-2.5 flex items-start gap-[9px]">
                            <Check size={14} strokeWidth={2.5} className="mt-0.5 shrink-0 text-accent" />
                            <span className="text-sm leading-normal text-ink">{pro}</span>
                          </div>
                        ))
                      )},
                      { heading: "Risks", content: (
                        p.cons.map((con, i) => (
                          <div key={i} className="mb-2.5 flex items-start gap-[9px]">
                            <X size={14} strokeWidth={2.5} className="mt-0.5 shrink-0 text-danger" />
                            <span className="text-sm leading-normal text-ink">{con}</span>
                          </div>
                        ))
                      )},
                    ].map(({ heading, content }) => (
                      <div key={heading} className={sectionPad}>
                        <SectionLabel>{heading}</SectionLabel>
                        {content}
                      </div>
                    ))}
                  </div>
                  <div className={sectionPad}>
                    <SectionLabel>Capability checklist</SectionLabel>
                    <div className="grid grid-cols-3 gap-[10px_16px] max-[600px]:grid-cols-2 max-[600px]:gap-[10px_12px]">
                      {p.capabilities.map((cap, i) => (
                        <div key={i} className="flex items-start gap-[9px]">
                          <Icon has={cap.has} />
                          <div>
                            <div className="text-sm leading-snug text-ink">{cap.label}</div>
                            {cap.note && <div className="mt-px text-[13px] text-ink">{cap.note}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={sectionPad}>
                    <SectionLabel>Assessment</SectionLabel>
                    <div className={clsx("border-l-[3px] pl-3.5 text-sm leading-[1.75] text-ink", accents[p.accent].borderLeft)}>
                      {p.verdict}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ══ GRID VIEW ══ */}
            {view === "grid" && (
              <div>
                <div className="mb-3.5 flex gap-6 text-sm text-ink">
                  <span className="inline-flex items-center gap-[5px]"><Check size={13} strokeWidth={2.5} className="text-accent" /> Supported</span>
                  <span className="inline-flex items-center gap-[5px]"><Minus size={13} strokeWidth={2.5} className="text-warn" /> Partial / limited</span>
                  <span className="inline-flex items-center gap-[5px]"><X size={13} strokeWidth={2.5} className="text-danger" /> Not supported</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse rounded-lg bg-card">
                    <thead>
                      <tr className="bg-page">
                        <th className="sticky left-0 z-2 w-[28%] bg-page p-[13px_18px] text-left text-xs font-semibold tracking-[0.4px] text-ink shadow-[2px_0_6px_rgba(0,0,0,0.25)]">
                          Capability
                        </th>
                        {platforms.map(pl => (
                          <th key={pl.id} className={clsx("border-t-[3px] p-[13px_14px] text-center text-sm font-semibold text-ink", accents[pl.accent].borderTop)}>
                            {pl.name}
                            <div className={clsx("mt-[3px] text-xs font-semibold uppercase tracking-[1px]", accents[pl.accent].text)}>{pl.tag}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allCaps.map((lbl, i) => {
                        const rowBg = i % 2 === 0 ? "bg-card" : "bg-page";
                        return (
                          <tr key={i} className={rowBg}>
                            <td className={clsx("sticky left-0 z-1 p-[11px_18px] text-sm text-ink shadow-[2px_0_6px_rgba(0,0,0,0.25)]", rowBg)}>{lbl}</td>
                            {platforms.map(pl => {
                              const cap = pl.capabilities.find(c => c.label === lbl);
                              return (
                                <td key={pl.id} className="p-[11px_14px] text-center">
                                  {cap?.note
                                    ? <div className="mx-auto max-w-[110px] text-center text-[13px] leading-[1.3] text-ink">{cap.note}</div>
                                    : <div className="flex justify-center"><Icon has={cap ? cap.has : false} /></div>
                                  }
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
