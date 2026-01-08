import { useState, useEffect } from "react";
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
  if (["SWI001", "SWI002"].includes(serialNumber) || companyName?.includes("Changi")) {
    return { src: "/client_logos/changi_airport/ChangiAirport_Logo(White).svg", alt: "Logo" };
  }
  if (serialNumber === "SWI003" || companyName?.includes("Milford Haven")) {
    return { src: "/client_logos/port_of_milford_haven/PortOfMilfordHaven(White).svg", alt: "Logo" };
  }
  if (["SWI010", "SWI011"].includes(serialNumber) || companyName?.includes("Hatloy")) {
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
  const [detectedTown, setDetectedTown] = useState("");       
  const [detectedCountry, setDetectedCountry] = useState(""); 
  
  const [selectedCompany, setSelectedCompany] = useState("");
  const [engName, setEngName] = useState("");
  const [engEmail, setEngEmail] = useState("");
  const [engPhone, setEngPhone] = useState("");
  const [answers, setAnswers] = useState({});

  const storageKey = `draft_annual_${unit?.serial_number}`;

  // 1. PERSISTENCE: Load Draft on Mount
  useEffect(() => {
    const date = new Date().toISOString().split('T')[0];
    setToday(date);
    const savedDraft = localStorage.getItem(storageKey);
    if (savedDraft) {
      try {
        const data = JSON.parse(savedDraft);
        if (data.maintained_by) setSelectedCompany(data.maintained_by);
        if (data.location_display) setLocationDisplay(data.location_display);
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
  }, [storageKey]);

  // 2. PERSISTENCE: Save Draft on Change
  const handleInputChange = (e) => {
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.photoUrls = photoUrls;
    localStorage.setItem(storageKey, JSON.stringify(data));
    
    if (e.target.name.startsWith('q')) {
      setAnswers(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }
  };

  // Geolocation Logic
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=14`);
        const data = await res.json();
        if (data.address) {
          const loc = data.address.suburb || data.address.village || data.address.town || data.address.city;
          const country = data.address.country_code === 'gb' ? 'UK' : data.address.country;
          setLocationDisplay(loc ? `${loc}, ${country}` : country);
          setDetectedTown(data.address.city || data.address.town || "");
          setDetectedCountry(data.address.country || "");
        }
      } catch (err) { console.error(err); }
    });
  }, []);

  const handleCompanyChange = (e) => {
    setSelectedCompany(e.target.value);
    setEngName(""); setEngEmail(""); setEngPhone("");
  };

  const handleEngineerChange = (e) => {
    const name = e.target.value;
    setEngName(name);
    const eng = allEngineers.find(x => x.name === name);
    if (eng) { setEngEmail(eng.email || ""); setEngPhone(eng.phone || ""); }
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
      unit_record_id: unit.record_id,
      checklist_template_id: template.id,
      answers: (template.questions || []).map((_, i) => ({
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
          /* FORCED THEME UPDATES */
          .form-scope .checklist-form-card {
            background: #152A31 !important;
            padding: 38px !important;
            width: 100%;
            text-align: left;
          }

          @media (min-width: 901px) {
            .form-scope .checklist-form-card {
              border-radius: 20px !important;
            }
          }

          .checklist-input::placeholder, .checklist-textarea::placeholder {
            color: #7d8f93 !important;
            opacity: 1;
          }
        `}</style>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper">
          <div className="swift-checklist-container">
            {logo && <div className="checklist-logo"><img src={logo.src} alt="Logo" /></div>}
            <h1 className="checklist-hero-title">{unit?.serial_number}<span className="break-point">annual maintenance</span></h1>
            
            <div className="checklist-form-card">
              <form onSubmit={handleSubmit} onChange={handleInputChange}>
                {/* Header Info */}
                <div className="checklist-inline-group">
                  <div className="checklist-field">
                    <label className="checklist-label">Maintenance company</label>
                    <select name="maintained_by" className="checklist-input" required value={selectedCompany} onChange={handleCompanyChange}>
                      <option value="" disabled>Select Company</option>
                      {allCompanies.sort().map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="checklist-field">
                    <label className="checklist-label">Location</label>
                    <input className="checklist-input" name="location_display" required value={locationDisplay} onChange={(e) => setLocationDisplay(e.target.value)} />
                  </div>
                  <div className="checklist-field">
                    <label className="checklist-label">Date</label>
                    <input type="date" className="checklist-input" name="date_of_maintenance" defaultValue={today} required />
                  </div>
                </div>

                <div className="checklist-inline-group" style={{ marginTop: '24px' }}>
                  <div className="checklist-field">
                    <label className="checklist-label">Engineer name</label>
                    <input className="checklist-input" name="engineer_name" list="eng-list" required value={engName} onChange={handleEngineerChange} />
                    <datalist id="eng-list">
                      {allEngineers.filter(e => !selectedCompany || e.companyName === selectedCompany).map((e, i) => <option key={i} value={e.name} />)}
                    </datalist>
                  </div>
                  <div className="checklist-field">
                    <label className="checklist-label">Engineer email</label>
                    <input type="email" className="checklist-input" name="engineer_email" required value={engEmail} onChange={(e) => setEngEmail(e.target.value)} />
                  </div>
                  <div className="checklist-field">
                    <label className="checklist-label">Engineer phone</label>
                    <input type="tel" className="checklist-input" name="engineer_phone" value={engPhone} onChange={(e) => setEngPhone(e.target.value)} />
                  </div>
                </div>

                {/* Dynamic Questions */}
                {(template.questions || []).map((q, i) => (
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
          record_id: uJson.records[0].id, 
          public_token: uJson.records[0].fields.public_token 
        },
        template: { 
          id: tJson.records[0].id, 
          questions: JSON.parse(tJson.records[0].fields.questions_json || "[]") 
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