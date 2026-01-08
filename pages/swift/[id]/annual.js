import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { UploadDropzone } from "../../../utils/uploadthing";

function autoGrow(e) {
  const el = e.target || e;
  el.style.height = "72px";
  el.style.height = el.scrollHeight + "px";
}

const getClientLogo = (companyName, serialNumber) => {
  const sn = serialNumber || "";
  const cn = companyName || "";
  if (["SWI001", "SWI002"].includes(sn) || cn.includes("Changi")) {
    return { src: "/client_logos/changi_airport/ChangiAirport_Logo(White).svg", alt: "Logo" };
  }
  if (sn === "SWI003" || cn.includes("Milford Haven")) {
    return { src: "/client_logos/port_of_milford_haven/PortOfMilfordHaven(White).svg", alt: "Logo" };
  }
  if (["SWI010", "SWI011"].includes(sn) || cn.includes("Hatloy")) {
    return { src: "/client_logos/Hatloy Maritime/HatloyMaritime_Logo(White).svg", alt: "Logo" };
  }
  return null;
};

export default function Annual({ unit, template, allCompanies = [], allEngineers = [] }) {
  const router = useRouter();
  const storageKey = `draft_annual_${unit?.serial_number}`;

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [photoUrls, setPhotoUrls] = useState([]);
  const [today, setToday] = useState("");

  const [selectedCompany, setSelectedCompany] = useState("");
  const [locationDisplay, setLocationDisplay] = useState("");
  const [engName, setEngName] = useState("");
  const [engEmail, setEngEmail] = useState("");
  const [engPhone, setEngPhone] = useState("");
  const [answers, setAnswers] = useState({});

  const saveDraft = (patch) => {
    const existing = JSON.parse(localStorage.getItem(storageKey) || "{}");
    localStorage.setItem(storageKey, JSON.stringify({ ...existing, ...patch }));
  };

  const filteredEngineers = useMemo(() => {
    if (!selectedCompany) return allEngineers;
    return allEngineers.filter(e => e.companyName === selectedCompany);
  }, [selectedCompany, allEngineers]);

  /* ------------------ INITIAL LOAD ------------------ */
  useEffect(() => {
    setToday(new Date().toISOString().split("T")[0]);

    const saved = localStorage.getItem(storageKey);
    if (!saved) return;

    try {
      const d = JSON.parse(saved);
      if (d.maintained_by) setSelectedCompany(d.maintained_by);
      if (d.location_display) setLocationDisplay(d.location_display);
      if (d.engineer_name) setEngName(d.engineer_name);
      if (d.engineer_email) setEngEmail(d.engineer_email);
      if (d.engineer_phone) setEngPhone(d.engineer_phone);
      if (d.photoUrls) setPhotoUrls(d.photoUrls);

      const qa = {};
      Object.keys(d).forEach(k => k.startsWith("q") && (qa[k] = d[k]));
      setAnswers(qa);
    } catch {}
  }, [storageKey]);

  /* ------------------ GEOLOCATION (SAFE) ------------------ */
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=14`,
          { headers: { "Accept-Language": "en" } }
        );
        const j = await r.json();
        if (!j?.address) return;

        const loc =
          j.address.suburb ||
          j.address.village ||
          j.address.town ||
          j.address.city ||
          "";
        const country = j.address.country_code === "gb" ? "UK" : j.address.country || "";
        const combined = loc ? `${loc}, ${country}` : country;

        setLocationDisplay(prev => {
          if (!prev) {
            saveDraft({ location_display: combined });
            return combined;
          }
          return prev;
        });
      } catch {}
    }, () => {}, { enableHighAccuracy: true, timeout: 8000 });
  }, []);

  /* ------------------ SUBMIT ------------------ */
  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const formData = new FormData(e.target);
    const props = Object.fromEntries(formData.entries());

    const payload = {
      ...props,
      maintained_by: selectedCompany,
      location_display: locationDisplay,
      photoUrls,
      unit_record_id: unit?.record_id,
      checklist_template_id: template?.id,
      answers: (template?.questions || []).map((_, i) => ({
        question: `q${i + 1}`,
        answer: props[`q${i + 1}`] || ""
      }))
    };

    try {
      const res = await fetch("/api/submit-maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed");
      localStorage.removeItem(storageKey);
      router.push(`/swift/${unit.public_token}/annual-complete`);
    } catch (err) {
      setErrorMsg(err.message);
      setSubmitting(false);
    }
  }

  const logo = getClientLogo(unit?.company, unit?.serial_number);

  return (
    <div className="form-scope">
      <Head>
        <title>{unit?.serial_number} | Annual Maintenance</title>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper">
          <div className="swift-checklist-container">

            {logo && (
              <div className="checklist-logo">
                <img src={logo.src} alt={logo.alt} />
              </div>
            )}

            <h1 className="checklist-hero-title">
              {unit?.serial_number}
              <span className="break-point">annual maintenance</span>
            </h1>

            <div className="checklist-form-card">
              <form onSubmit={handleSubmit} autoComplete="off">

                {/* COMPANY / LOCATION / DATE */}
                <div className="checklist-inline-group">
                  <div className="checklist-field">
                    <label className="checklist-label">Maintenance company</label>
                    <select
                      className="checklist-input"
                      required
                      value={selectedCompany}
                      onChange={e => {
                        setSelectedCompany(e.target.value);
                        setEngName("");
                        setEngEmail("");
                        setEngPhone("");
                        saveDraft({ maintained_by: e.target.value });
                      }}
                    >
                      <option value="" disabled hidden>Please select</option>
                      {allCompanies.sort().map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="checklist-field">
                    <label className="checklist-label">Location</label>
                    <input
                      className="checklist-input"
                      required
                      value={locationDisplay}
                      onChange={e => {
                        setLocationDisplay(e.target.value);
                        saveDraft({ location_display: e.target.value });
                      }}
                    />
                  </div>

                  <div className="checklist-field">
                    <label className="checklist-label">Date</label>
                    <input
                      type="date"
                      className="checklist-input"
                      name="date_of_maintenance"
                      defaultValue={today}
                      required
                    />
                  </div>
                </div>

                {/* ENGINEER */}
                <div className="checklist-inline-group">
                  <div className="checklist-field">
                    <label className="checklist-label">Engineer name</label>
                    <input
                      className="checklist-input"
                      value={engName}
                      onChange={e => {
                        setEngName(e.target.value);
                        saveDraft({ engineer_name: e.target.value });
                        const found = allEngineers.find(x => x.name === e.target.value);
                        if (found) {
                          setEngEmail(found.email || "");
                          setEngPhone(found.phone || "");
                          saveDraft({
                            engineer_email: found.email || "",
                            engineer_phone: found.phone || ""
                          });
                        }
                      }}
                      list="eng-data"
                      required
                    />
                    <datalist id="eng-data">
                      {filteredEngineers.map(e => (
                        <option key={e.name} value={e.name} />
                      ))}
                    </datalist>
                  </div>

                  <div className="checklist-field">
                    <label className="checklist-label">Engineer email</label>
                    <input
                      className="checklist-input"
                      type="email"
                      value={engEmail}
                      onChange={e => {
                        setEngEmail(e.target.value);
                        saveDraft({ engineer_email: e.target.value });
                      }}
                      required
                    />
                  </div>

                  <div className="checklist-field">
                    <label className="checklist-label">Engineer phone</label>
                    <input
                      className="checklist-input"
                      value={engPhone}
                      onChange={e => {
                        setEngPhone(e.target.value);
                        saveDraft({ engineer_phone: e.target.value });
                      }}
                    />
                  </div>
                </div>

                {/* QUESTIONS */}
                {(template?.questions || []).map((q, i) => (
                  <div key={i} style={{ marginTop: 24 }}>
                    <label className="checklist-label">{q}</label>
                    <textarea
                      className="checklist-textarea"
                      onInput={autoGrow}
                      value={answers[`q${i + 1}`] || ""}
                      onChange={e => {
                        setAnswers(p => ({ ...p, [e.target.name]: e.target.value }));
                        saveDraft({ [e.target.name]: e.target.value });
                      }}
                      name={`q${i + 1}`}
                    />
                  </div>
                ))}

                {/* UPLOAD */}
                <div style={{ marginTop: 24 }}>
                  <label className="checklist-label">Upload photos</label>
                  <UploadDropzone
                    endpoint="maintenanceImage"
                    onClientUploadComplete={res => {
                      const urls = [...photoUrls, ...res.map(f => f.url)];
                      setPhotoUrls(urls);
                      saveDraft({ photoUrls: urls });
                    }}
                  />
                </div>

                {errorMsg && <p style={{ color: "#ff4d4d", marginTop: 16 }}>{errorMsg}</p>}

                <button className="checklist-submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit maintenance"}
                </button>

              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
