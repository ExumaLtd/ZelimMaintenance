import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Head from "next/head"; 
import { UploadDropzone } from "../../../utils/uploadthing"; 

function autoGrow(e) {
  const el = e.target || e; 
  el.style.height = "72px"; 
  const newHeight = el.scrollHeight;
  el.style.height = newHeight + "px";
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
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [photoUrls, setPhotoUrls] = useState([]);
  const [today, setToday] = useState("");
  
  const [locationDisplay, setLocationDisplay] = useState(""); 
  const [selectedCompany, setSelectedCompany] = useState("");
  const [engName, setEngName] = useState("");
  const [engEmail, setEngEmail] = useState("");
  const [engPhone, setEngPhone] = useState("");
  const [answers, setAnswers] = useState({});

  const storageKey = `draft_annual_${unit?.serial_number}`;

  const filteredEngineers = useMemo(() => {
    if (!selectedCompany) return allEngineers;
    return allEngineers.filter(e => e.companyName === selectedCompany);
  }, [selectedCompany, allEngineers]);

  // 1. COMBINED INITIALIZATION (Fixes Desktop Race Condition)
  useEffect(() => {
    const date = new Date().toISOString().split('T')[0];
    setToday(date);
    
    const savedDraft = localStorage.getItem(storageKey);
    let existingLocation = "";

    if (savedDraft) {
      try {
        const data = JSON.parse(savedDraft);
        if (data.maintained_by) setSelectedCompany(data.maintained_by);
        if (data.location_display) {
            existingLocation = data.location_display;
            setLocationDisplay(data.location_display);
        }
        if (data.engineer_name) setEngName(data.engineer_name);
        if (data.engineer_email) setEngEmail(data.engineer_email);
        if (data.engineer_phone) setEngPhone(data.engineer_phone);
        if (data.photoUrls) setPhotoUrls(data.photoUrls);
        
        const draftAnswers = {};
        Object.keys(data).forEach(key => {
          if (key.startsWith('q')) draftAnswers[key] = data[key];
        });
        setAnswers(draftAnswers);
      } catch (e) { console.error("Draft load error:", e); }
    }

    // ONLY detect location if the draft didn't have one
    if (!existingLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=14`, {
            headers: { 'Accept-Language': 'en' }
          });
          const data = await res.json();
          if (data && data.address) {
            const loc = data.address.suburb || data.address.village || data.address.town || data.address.city || "";
            const country = data.address.country_code === 'gb' ? 'UK' : (data.address.country || "");
            const combined = loc ? `${loc}, ${country}` : country;
            setLocationDisplay(combined);
          }
        } catch (err) { console.error("Geo fetch error", err); }
      }, null, { enableHighAccuracy: true, timeout: 5000 });
    }
  }, [storageKey]);

  const handleInputChange = (e) => {
  if (e.target.name === "location_display") return;

  const formData = new FormData(e.currentTarget);
  const data = Object.fromEntries(formData.entries());
  data.photoUrls = photoUrls;
  localStorage.setItem(storageKey, JSON.stringify(data));
  
  if (e.target.name.startsWith('q')) {
    setAnswers(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }
};

  const handleCompanyChange = (e) => {
    const val = e.target.value;
    setSelectedCompany(val);
    setEngName(""); 
    setEngEmail(""); 
    setEngPhone("");
  };

  const handleEngineerChange = (e) => {
    const name = e.target.value;
    setEngName(name);
    const found = allEngineers.find(x => x.name === name);
    if (found) {
      setEngEmail(found.email || "");
      setEngPhone(found.phone || "");
    }
  };

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
        question: `q${i+1}`,
        answer: props[`q${i+1}`] || ""
      }))
    };
    try {
      const res = await fetch("/api/submit-maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      localStorage.removeItem(storageKey);
      router.push(`/swift/${unit.public_token}/annual-complete`);
    } catch (err) { setErrorMsg(err.message); setSubmitting(false); }
  }

  const logo = getClientLogo(unit?.company, unit?.serial_number);

  return (
    <div className="form-scope">
      <Head>
        <title>{unit?.serial_number} | Annual Maintenance</title>
        <style>{`
          .form-scope .checklist-form-card {
            background: #152A31 !important;
            padding: 38px !important;
            width: 100%;
          }
          @media (max-width: 600px) {
            .form-scope .checklist-form-card { padding: 30px 24px !important; }
          }
          .form-scope .checklist-input, .form-scope .checklist-textarea {
            background-color: #27454B;
            border: 2px solid transparent !important; 
            border-radius: 8px;
            color: #F7F7F7;
            padding: 10px 16px;
            font-family: 'Montserrat', sans-serif;
            font-size: 16px !important;
            box-sizing: border-box;
            outline: none !important;
            width: 100%;
          }
          .form-scope .checklist-input:focus { border-color: #00FFF6 !important; }
          .form-scope .checklist-input:-webkit-autofill {
            -webkit-box-shadow: 0 0 0 1000px #27454b inset !important;
            -webkit-text-fill-color: #F7F7F7 !important;
          }
          .form-scope select.checklist-input {
            appearance: none;
            -webkit-appearance: none;
            background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
            background-repeat: no-repeat;
            background-position: right 16px center;
            background-size: 12px;
          }
          .form-scope input[type="date"].checklist-input::-webkit-calendar-picker-indicator { filter: invert(1); }
        `}</style>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper">
          <div className="swift-checklist-container">
            {logo && (
              <div className="checklist-logo">
                <img src={logo.src} alt={logo.alt} style={{ maxHeight: '40px', marginBottom: '40px' }} />
              </div>
            )}
            <h1 className="checklist-hero-title">{unit?.serial_number}<span className="break-point">annual maintenance</span></h1>
            
            <div className="checklist-form-card">
              <form onSubmit={handleSubmit} onChange={handleInputChange} autoComplete="none">
                <div className="checklist-inline-group">
                  <div className="checklist-field">
                    <label className="checklist-label">Maintenance company</label>
                    <select 
                      name="maintained_by" 
                      className="checklist-input" 
                      required 
                      value={selectedCompany} 
                      onChange={handleCompanyChange}
                      style={{ color: selectedCompany ? '#F7F7F7' : '#7d8f93' }}
                    >
                      <option value="" disabled hidden>Please select</option>
                      {allCompanies.sort().map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="checklist-field">
                    <label className="checklist-label">Location</label>
                    <input 
                      className="checklist-input" 
                      name="location_display" 
                      required 
                      value={locationDisplay} 
                      onChange={(e) => setLocationDisplay(e.target.value)} 
                      autoComplete="off" 
                    />
                  </div>
                  <div className="checklist-field">
                    <label className="checklist-label">Date</label>
                    <input type="date" className="checklist-input" name="date_of_maintenance" defaultValue={today} required />
                  </div>
                </div>

                <div className="checklist-inline-group" style={{ marginTop: '24px' }}>
                  <div className="checklist-field">
                    <label className="checklist-label">Engineer name</label>
                    <input 
                      className="checklist-input" 
                      name="engineer_name" 
                      list="eng-data-list" 
                      required 
                      value={engName} 
                      onChange={handleEngineerChange} 
                      autoComplete="off"
                    />
                    <datalist id="eng-data-list">
                      {filteredEngineers.map((e, i) => <option key={i} value={e.name} />)}
                    </datalist>
                  </div>
                  <div className="checklist-field">
                    <label className="checklist-label">Engineer email</label>
                    <input type="email" className="checklist-input" name="engineer_email" required value={engEmail} onChange={(e) => setEngEmail(e.target.value)} autoComplete="off" />
                  </div>
                  <div className="checklist-field">
                    <label className="checklist-label">Engineer phone</label>
                    <input type="tel" className="checklist-input" name="engineer_phone" value={engPhone} onChange={(e) => setEngPhone(e.target.value)} autoComplete="off" />
                  </div>
                </div>

                {(template?.questions || []).map((q, i) => (
                  <div key={i} style={{ marginTop: '24px' }}>
                    <label className="checklist-label">{q}</label>
                    <textarea 
                      name={`q${i + 1}`} 
                      className="checklist-textarea" 
                      onInput={autoGrow} 
                      value={answers[`q${i+1}`] || ""}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [e.target.name]: e.target.value }))}
                    />
                  </div>
                ))}

                <div style={{ marginTop: '24px' }}>
                  <label className="checklist-label">Upload photos</label>
                  <UploadDropzone endpoint="maintenanceImage" onClientUploadComplete={(res) => {
                    const newUrls = [...photoUrls, ...res.map(f => f.url)];
                    setPhotoUrls(newUrls);
                    const draft = JSON.parse(localStorage.getItem(storageKey) || "{}");
                    localStorage.setItem(storageKey, JSON.stringify({ ...draft, photoUrls: newUrls }));
                  }} />
                </div>

                {errorMsg && <p style={{ color: '#ff4d4d', marginTop: '16px' }}>{errorMsg}</p>}

                <button className="checklist-submit" disabled={submitting} style={{ marginTop: '32px' }}>
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

export async function getServerSideProps({ params }) {
  const token = params.id;
  try {
    const headers = { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` };
    const baseId = process.env.AIRTABLE_BASE_ID;
    const [uReq, tReq, cReq, eReq] = await Promise.all([
      fetch(`https://api.airtable.com/v0/${baseId}/${process.env.AIRTABLE_SWIFT_TABLE}?filterByFormula={public_token}='${token}'`, { headers }),
      fetch(`https://api.airtable.com/v0/${baseId}/checklist_templates?filterByFormula={type}='Annual'`, { headers }),
      fetch(`https://api.airtable.com/v0/${baseId}/maintenance_companies`, { headers }),
      fetch(`https://api.airtable.com/v0/${baseId}/engineers`, { headers })
    ]);
    const [uJson, tJson, cJson, eJson] = await Promise.all([uReq.json(), tReq.json(), cReq.json(), eReq.json()]);
    if (!uJson.records?.[0]) return { notFound: true };

    const companyMap = {};
    cJson.records?.forEach(r => companyMap[r.id] = r.fields.company_name);
    
    return {
      props: {
        unit: { 
          serial_number: uJson.records[0].fields.unit_name || uJson.records[0].fields.serial_number, 
          company: uJson.records[0].fields.company || "",
          record_id: uJson.records[0].id, 
          public_token: uJson.records[0].fields.public_token 
        },
        template: { 
          id: tJson.records?.[0]?.id || "", 
          questions: JSON.parse(tJson.records?.[0]?.fields.questions_json || "[]") 
        },
        allCompanies: Object.values(companyMap).filter(Boolean),
        allEngineers: eJson.records?.map(r => ({ 
          name: r.fields.engineer_name, 
          email: r.fields.email || "", 
          phone: r.fields.phone || "", 
          companyName: companyMap[r.fields["company"]?.[0]] || "" 
        })).filter(e => e.name) || []
      }
    };
  } catch (err) { return { notFound: true }; }
}