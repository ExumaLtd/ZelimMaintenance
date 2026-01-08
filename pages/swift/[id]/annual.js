import { useState, useEffect, useMemo, useRef } from "react";
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
  const companyDropdownRef = useRef(null);
  const engineerDropdownRef = useRef(null);
  
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
  
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showEngineerDropdown, setShowEngineerDropdown] = useState(false);

  const storageKey = `draft_annual_${unit?.serial_number}`;

  const filteredEngineers = useMemo(() => {
    if (!selectedCompany) return [];
    let list = allEngineers.filter(e => e.companyName === selectedCompany);
    if (engName && engName !== "Please select" && engName.trim() !== "") {
      list = list.filter(e => e.name.toLowerCase().includes(engName.toLowerCase()));
    }
    return list;
  }, [selectedCompany, engName, allEngineers]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target)) {
        setShowCompanyDropdown(false);
      }
      if (engineerDropdownRef.current && !engineerDropdownRef.current.contains(event.target)) {
        setShowEngineerDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        Object.keys(data).forEach(key => { if (key.startsWith('q')) draftAnswers[key] = data[key]; });
        setAnswers(draftAnswers);
      } catch (e) { console.error("Draft load error:", e); }
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
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
          setLocationDisplay(prev => (!prev || prev.trim() === "") ? combined : prev);
        }
      } catch (err) { console.error("Geo fetch error", err); }
    }, null, { enableHighAccuracy: true, timeout: 8000 });
  }, []);

  useEffect(() => {
    const draftData = {
      maintained_by: selectedCompany,
      location_display: locationDisplay,
      engineer_name: engName,
      engineer_email: engEmail,
      engineer_phone: engPhone,
      photoUrls,
      ...answers
    };
    localStorage.setItem(storageKey, JSON.stringify(draftData));
  }, [selectedCompany, locationDisplay, engName, engEmail, engPhone, photoUrls, answers, storageKey]);

  const selectCompany = (company) => {
    setSelectedCompany(company);
    setEngName("Please select"); 
    setEngEmail("");
    setEngPhone("");
    setShowCompanyDropdown(false);
  };

  const selectEngineer = (engineer) => {
    setEngName(engineer.name);
    setEngEmail(engineer.email || "");
    setEngPhone(engineer.phone || "");
    setShowEngineerDropdown(false);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    if (!selectedCompany || engName === "Please select") {
      setErrorMsg("Please select both a company and an engineer.");
      return;
    }
    setSubmitting(true);
    const payload = {
      maintained_by: selectedCompany,
      location_display: locationDisplay,
      date_of_maintenance: e.target.date_of_maintenance.value,
      engineer_name: engName,
      engineer_email: engEmail,
      engineer_phone: engPhone,
      photoUrls,
      unit_record_id: unit?.record_id,
      checklist_template_id: template?.id,
      answers: (template?.questions || []).map((_, i) => ({
        question: `q${i+1}`,
        answer: answers[`q${i+1}`] || ""
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
            background: #152a31 !important;
            padding: 38px !important;
            border-radius: 20px !important;
            width: 100%;
            text-align: left;
          }
          .form-scope .checklist-input, 
          .form-scope .checklist-textarea {
            background-color: #27454b !important;
            border: 1px solid transparent !important;
            padding: 14px 16px !important;
            padding-right: 40px !important;
            font-family: 'Montserrat', sans-serif;
            border-radius: 8px !important;
            width: 100%;
            display: block;
          }
          .form-scope .checklist-input:focus,
          .form-scope .checklist-textarea:focus {
            border-color: #00FFF6 !important;
            border-width: 1px !important;
            outline: none;
          }
          .form-scope .field-icon-wrapper {
            position: relative;
            display: flex;
            align-items: center;
          }
          .form-scope .field-icon-wrapper i {
            position: absolute;
            right: 16px;
            color: #f7f7f7;
            pointer-events: none;
          }
          .form-scope .fa-chevron-down, .form-scope .fa-chevron-up { font-size: 14px; }
          .form-scope .fa-calendar { font-size: 18px; }

          .custom-dropdown-container { position: relative; width: 100%; }
          .custom-dropdown-list {
            position: absolute;
            top: calc(100% + 5px);
            left: 0;
            right: 0;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            margin: 0;
            padding: 8px 4px; /* Added horizontal padding for the selection highlight */
            list-style: none;
            z-index: 1000;
            max-height: 250px;
            overflow-y: auto;
          }
          .custom-dropdown-list::before {
            content: '';
            position: absolute;
            top: -6px;
            left: 20px;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-bottom: 6px solid #ffffff;
          }
          .custom-dropdown-item {
            padding: 12px 18px;
            color: #152a31;
            cursor: pointer;
            font-size: 16px;
            font-weight: 400;
            border-radius: 6px; /* 6px border radius on item */
            transition: background 0.15s ease, color 0.15s ease;
          }
          .custom-dropdown-item:hover { 
            background: #324e54; 
            color: #F7F7F7;
          }

          .form-scope input[type="date"]::-webkit-calendar-picker-indicator {
            background: transparent; bottom: 0; color: transparent; cursor: pointer;
            height: auto; left: 0; position: absolute; right: 0; top: 0; width: auto;
          }
          @media (max-width: 600px) {
            .form-scope .checklist-form-card { padding: 30px 24px !important; }
          }
        `}</style>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper">
          <div className="swift-checklist-container">
            {logo && <div className="checklist-logo"><img src={logo.src} alt={logo.alt} /></div>}

            <h1 className="checklist-hero-title">
              {unit?.serial_number}
              <span className="break-point">annual maintenance</span>
            </h1>
            
            <div className="checklist-form-card">
              <form onSubmit={handleSubmit} autoComplete="off">
                <div className="checklist-inline-group">
                  <div className="checklist-field" ref={companyDropdownRef}>
                    <label className="checklist-label">Maintenance company</label>
                    <div className="custom-dropdown-container">
                      <div className="field-icon-wrapper">
                        <input 
                          readOnly
                          className="checklist-input" 
                          value={selectedCompany || "Please select"}
                          onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                          style={{ 
                            color: selectedCompany ? '#F7F7F7' : '#7d8f93', 
                            cursor: 'pointer' 
                          }}
                        />
                        <i className={showCompanyDropdown ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down"}></i>
                      </div>
                      {showCompanyDropdown && (
                        <ul className="custom-dropdown-list">
                          {allCompanies.sort().map((c, i) => (
                            <li key={i} className="custom-dropdown-item" onClick={() => selectCompany(c)}>
                              {c}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="checklist-field">
                    <label className="checklist-label">Location</label>
                    <input 
                      className="checklist-input" 
                      name="location_display" 
                      required 
                      value={locationDisplay} 
                      onChange={(e) => setLocationDisplay(e.target.value)}
                      style={{ color: '#F7F7F7' }}
                    />
                  </div>
                  <div className="checklist-field">
                    <label className="checklist-label">Date</label>
                    <div className="field-icon-wrapper">
                      <input 
                        type="date" 
                        className="checklist-input" 
                        name="date_of_maintenance" 
                        defaultValue={today} 
                        max={today} 
                        required 
                        style={{ color: '#F7F7F7' }}
                      />
                      <i className="fa-regular fa-calendar"></i>
                    </div>
                  </div>
                </div>

                <div className="checklist-inline-group" style={{ marginTop: '24px' }}>
                  <div className="checklist-field" ref={engineerDropdownRef}>
                    <label className="checklist-label">Engineer name</label>
                    <div className="custom-dropdown-container">
                      <div className="field-icon-wrapper">
                        <input 
                          className="checklist-input" 
                          name="engineer_name" 
                          required 
                          value={engName} 
                          autoComplete="off"
                          onFocus={() => { if(selectedCompany) setShowEngineerDropdown(true); }}
                          onChange={(e) => { setEngName(e.target.value); if(selectedCompany) setShowEngineerDropdown(true); }}
                          style={{ color: (engName === "Please select" || !engName) ? '#7d8f93' : '#F7F7F7' }}
                        />
                        {selectedCompany && (
                           <i className={showEngineerDropdown ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down"}></i>
                        )}
                      </div>
                      {showEngineerDropdown && filteredEngineers.length > 0 && (
                        <ul className="custom-dropdown-list">
                          {filteredEngineers.map((eng, i) => (
                            <li key={i} className="custom-dropdown-item" onClick={() => selectEngineer(eng)}>
                              {eng.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
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
                      style={{ color: '#F7F7F7' }}
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
                      style={{ color: '#F7F7F7' }}
                    />
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
                      style={{ color: '#F7F7F7' }}
                    />
                  </div>
                ))}

                <div style={{ marginTop: '24px' }}>
                  <label className="checklist-label">Upload photos</label>
                  <UploadDropzone endpoint="maintenanceImage" onClientUploadComplete={(res) => {
                    setPhotoUrls(prev => [...prev, ...res.map(f => f.url)]);
                  }} />
                </div>

                {errorMsg && <p style={{ color: '#ff4d4d', marginTop: '16px' }}>{errorMsg}</p>}
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
    
    const [uJson, tJson, cJson, eJson] = await Promise.all([uReq.json(), tReq.json(), cJson.json(), eJson.json()]);
    
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