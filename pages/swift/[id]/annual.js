import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head"; 
import { UploadDropzone } from "../../../utils/uploadthing"; 

const W3W_API_KEY = "MGELXQ7K";

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
  const [selectedCompany, setSelectedCompany] = useState("");
  const [capturedLocation, setCapturedLocation] = useState({ town: "", w3w: "", success: false });

  // Fields for Row 2
  const [engName, setEngName] = useState("");
  const [engEmail, setEngEmail] = useState("");
  const [engPhone, setEngPhone] = useState("");

  const storageKey = `draft_annual_${unit?.serial_number}`;

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://api.what3words.com/v3/convert-to-3wa?key=${W3W_API_KEY}&coordinates=${latitude},${longitude}`);
          const data = await res.json();
          if (data.words) {
            setCapturedLocation({ town: data.nearestPlace || "Unknown", w3w: `///${data.words}`, success: true });
          }
        } catch (err) { console.error(err); }
      }, null, { enableHighAccuracy: true });
    }
  }, []);

  useEffect(() => {
    const date = new Date().toISOString().split('T')[0];
    setToday(date);
    const savedDraft = localStorage.getItem(storageKey);
    if (savedDraft) {
      try {
        const data = JSON.parse(savedDraft);
        setTimeout(() => {
          Object.keys(data).forEach(key => {
            const input = document.getElementsByName(key)[0];
            if (input) { 
              input.value = data[key];
              if (key === "engineer_name") setEngName(data[key]);
              if (key === "engineer_email") setEngEmail(data[key]);
              if (key === "engineer_phone") setEngPhone(data[key]);
              if (input.tagName === "TEXTAREA") autoGrow(input); 
            }
          });
          if (data.maintained_by) setSelectedCompany(data.maintained_by);
        }, 100);
      } catch (e) { console.error(e); }
    }
  }, [storageKey]);

  const handleInputChange = (e) => {
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    localStorage.setItem(storageKey, JSON.stringify(data));
  };

  // NEW: Handle Auto-population
  const handleEngineerChange = (e) => {
    const name = e.target.value;
    setEngName(name);
    
    // Look for exact match in our engineer list
    const existingEng = allEngineers.find(eng => eng.name === name);
    if (existingEng) {
      setEngEmail(existingEng.email || "");
      setEngPhone(existingEng.phone || "");
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    if (!capturedLocation.success) {
      setErrorMsg("Location is mandatory. Please refresh and accept location permissions.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData(e.target);
    const formProps = Object.fromEntries(formData.entries());

    const payload = {
      ...formProps,
      location_town: capturedLocation.town, 
      location_what3words: capturedLocation.w3w,
      maintenance_type: "Annual",
      photoUrls, 
      unit_record_id: unit.record_id,
      checklist_template_id: template.id,
      answers: (template.questions || []).map((_, i) => ({ 
        question: `q${i+1}`, 
        answer: formProps[`q${i+1}`] || "" 
      }))
    };

    try {
      const res = await fetch("/api/submit-maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Airtable Submission Error");
      localStorage.removeItem(storageKey);
      router.push(`/swift/${unit.public_token}/annual-complete`);
    } catch (err) {
      setErrorMsg(err.message);
      setSubmitting(false);
    }
  }

  const sortedCompanies = [...allCompanies].sort((a, b) => a.localeCompare(b));
  const filteredEngineers = allEngineers
    .filter(eng => !selectedCompany || eng.companyName === selectedCompany)
    .sort((a, b) => a.name.localeCompare(b.name));

  const logo = getClientLogo(unit?.company, unit?.serial_number);

  return (
    <div className="form-scope">
      <Head><title>{unit?.serial_number} | Annual Maintenance</title></Head>
      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper">
          <div className="swift-checklist-container">
            {logo && <div className="checklist-logo"><img src={logo.src} alt={logo.alt} /></div>}
            <h1 className="checklist-hero-title">{unit?.serial_number}<span className="break-point">annual maintenance</span></h1>
            
            <div className="checklist-form-card">
              <form onSubmit={handleSubmit} onChange={handleInputChange}>
                
                {/* ROW 1 */}
                <div className="checklist-inline-group">
                  <div className="checklist-field">
                    <label className="checklist-label">Maintenance company</label>
                    <div className="input-icon-wrapper">
                      <select name="maintained_by" className="checklist-input" required defaultValue="" onChange={(e) => setSelectedCompany(e.target.value)} style={{ color: !selectedCompany ? 'rgba(255,255,255,0.4)' : 'white' }}>
                        <option value="" disabled hidden>Please select</option>
                        {sortedCompanies.map((name, i) => <option key={i} value={name} style={{ color: 'black' }}>{name}</option>)}
                      </select>
                      <i className="fa-solid fa-chevron-down"></i>
                    </div>
                  </div>
                  <div className="checklist-field">
                    <label className="checklist-label">Date of maintenance</label>
                    <div className="input-icon-wrapper">
                      <input type="date" className="checklist-input" name="date_of_maintenance" defaultValue={today} max={today} required />
                      <i className="fa-regular fa-calendar"></i>
                    </div>
                  </div>
                </div>

                {/* ROW 2 */}
                <div className="checklist-inline-group" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  <div className="checklist-field">
                    <label className="checklist-label">Engineer name</label>
                    <input 
                      className="checklist-input" 
                      name="engineer_name" 
                      autoComplete="off" 
                      list="engineer-list" 
                      required 
                      value={engName}
                      onChange={handleEngineerChange}
                    />
                    <datalist id="engineer-list">
                      {filteredEngineers.map((eng, i) => <option key={i} value={eng.name} />)}
                    </datalist>
                  </div>
                  <div className="checklist-field">
                    <label className="checklist-label">Engineer email</label>
                    <input 
                      type="email" 
                      className="checklist-input" 
                      name="engineer_email" 
                      required 
                      value={engEmail} 
                      onChange={(e) => setEngEmail(e.target.value)} 
                    />
                  </div>
                  <div className="checklist-field">
                    <label className="checklist-label">Engineer phone</label>
                    <input 
                      type="tel" 
                      className="checklist-input" 
                      name="engineer_phone" 
                      value={engPhone} 
                      onChange={(e) => setEngPhone(e.target.value)} 
                    />
                  </div>
                </div>

                {(template.questions || []).map((q, i) => (
                  <div key={i}>
                    <label className="checklist-label">{q}</label>
                    <textarea name={`q${i + 1}`} className="checklist-textarea" onInput={autoGrow} rows={2} style={{ height: '72px' }} />
                  </div>
                ))}

                <label className="checklist-label">Upload photos</label>
                <UploadDropzone endpoint="maintenanceImage" className="bg-slate-800 border-2 border-dashed border-gray-600 p-8 h-48 mb-4" onClientUploadComplete={(res) => setPhotoUrls(prev => [...prev, ...res.map(f => f.url)])} />

                <button className="checklist-submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit maintenance"}</button>
                {errorMsg && <p style={{ color: "rgb(255, 77, 77)", marginTop: "26px", fontSize: "14px", fontWeight: "500" }}>{errorMsg}</p>}
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
    const companyIdToName = {};
    cJson.records?.forEach(r => { companyIdToName[r.id] = r.fields.company_name; });
    
    return {
      props: {
        unit: { serial_number: uJson.records[0].fields.unit_name || uJson.records[0].fields.serial_number, company: uJson.records[0].fields.company, record_id: uJson.records[0].id, public_token: uJson.records[0].fields.public_token },
        template: { id: tJson.records[0].id, questions: JSON.parse(tJson.records[0].fields.questions_json || "[]") },
        allCompanies: Object.values(companyIdToName).filter(Boolean),
        allEngineers: eJson.records?.map(r => ({ 
          name: r.fields.engineer_name, 
          email: r.fields.email || "", 
          phone: r.fields.phone || "",
          companyName: companyIdToName[r.fields["company"]?.[0]] || "" 
        })).filter(eng => eng.name) || []
      },
    };
  } catch (err) { return { notFound: true }; }
}