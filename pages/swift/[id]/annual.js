import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head"; 
import Image from "next/image";
import { UploadDropzone } from "../../../utils/uploadthing"; 

function autoGrow(e) {
  const el = e.target || e; 
  // Base height matched to CSS min-height (78px) to prevent shrinking on mobile
  el.style.height = "78px"; 
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
  const [locationCountry, setLocationCountry] = useState(""); // FIXED: Added state for country
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
    list = list.filter(e => e.name !== engName);
    if (engName && engName !== "Please select" && engName.trim() !== "") {
      const search = engName.toLowerCase();
      const matches = list.filter(e => e.name.toLowerCase().includes(search));
      return matches; 
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
    setToday(new Date().toISOString().split('T')[0]);
    const savedDraft = localStorage.getItem(storageKey);
    if (savedDraft) {
      try {
        const data = JSON.parse(savedDraft);
        if (data.maintained_by) setSelectedCompany(data.maintained_by);
        if (data.location_display) setLocationDisplay(data.location_display);
        if (data.location_country) setLocationCountry(data.location_country); // FIXED: Restore country draft
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
          
          // FIXED: Extract country separately and handle UK alias
          const rawCountry = data.address.country || "";
          const country = data.address.country_code === 'gb' ? 'UK' : rawCountry;
          
          const combined = loc ? `${loc}, ${country}` : country;
          setLocationDisplay(prev => (!prev || prev.trim() === "") ? combined : prev);
          setLocationCountry(country); // FIXED: Populate country state
        }
      } catch (err) { console.error("Geo fetch error", err); }
    }, null, { enableHighAccuracy: true, timeout: 8000 });
  }, []);

  useEffect(() => {
    const draftData = {
      maintained_by: selectedCompany,
      location_display: locationDisplay,
      location_country: locationCountry, // FIXED: Include country in draft
      engineer_name: engName,
      engineer_email: engEmail,
      engineer_phone: engPhone,
      photoUrls,
      ...answers
    };
    localStorage.setItem(storageKey, JSON.stringify(draftData));
  }, [selectedCompany, locationDisplay, locationCountry, engName, engEmail, engPhone, photoUrls, answers, storageKey]);

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

  const clearEngineer = () => {
    setEngName("");
    setEngEmail("");
    setEngPhone("");
    setShowEngineerDropdown(false);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    if (!selectedCompany || engName === "Please select" || !engName) {
      setErrorMsg("Please select both a company and an engineer.");
      return;
    }
    setSubmitting(true);
    const payload = {
      maintained_by: selectedCompany,
      location_display: locationDisplay,
      location_country: locationCountry, // FIXED: Added location_country to payload
      maintenance_type: "Annual",        // FIXED: Added hardcoded maintenance_type
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
  const hasEngineerResults = filteredEngineers.length > 0;
  const hasClearEng = engName && engName !== "Please select" && engName !== "";
  const shouldShowEngDropdown = showEngineerDropdown && (hasEngineerResults || hasClearEng);

  return (
    <div className="form-scope">
      <Head>
        <title>{unit?.serial_number} | Annual Maintenance</title>
        <style>{`
          /* REMOVED .form-scope background color block */

          .form-scope .checklist-form-card {
            background: #152a31 !important;
            padding: 38px !important;
            border-radius: 20px !important;
            width: 100%;
            text-align: left;
            box-sizing: border-box;
          }

          .form-scope .checklist-submit:hover {
            background-color: #01e6dd !important;
            cursor: pointer;
          }

          .form-scope .checklist-input, 
          .form-scope .checklist-textarea {
            background-color: #27454b !important;
            border: 1px solid transparent !important;
            padding: 14px 16px !important;
            font-family: 'Montserrat', sans-serif;
            border-radius: 8px !important;
            width: 100%;
            display: block;
            color: #F7F7F7;
            min-height: 48px !important;
            line-height: 20px !important;
            box-sizing: border-box !important;
          }
          .form-scope .checklist-textarea {
            min-height: 78px !important;
            resize: none !important;
            overflow: hidden;
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

          .form-scope .custom-dropdown-container { position: relative; width: 100%; }
          .form-scope .custom-dropdown-list {
            position: absolute;
            top: calc(100% + 8px);
            left: 0;
            right: 0;
            background: #27454B;
            border: 1px solid #00FFF6 !important;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(21, 42, 49, 0.4);
            margin: 0;
            padding: 6px 6px;
            list-style: none;
            z-index: 1000;
            max-height: 250px;
            overflow-y: auto;
          }
          .form-scope .custom-dropdown-item {
            padding: 6px 16px;
            color: #F7F7F7;
            cursor: pointer;
            font-size: 16px;
            font-weight: 400;
            border-radius: 4px;
            transition: background 0.15s ease, color 0.15s ease;
          }
          .form-scope .custom-dropdown-item:hover,
          .form-scope .custom-dropdown-item.active { 
            background: #476166;
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
                            cursor: 'pointer',
                            borderColor: showCompanyDropdown ? '#00FFF6' : 'transparent',
                            paddingRight: '40px'
                          }}
                        />
                        <i className={showCompanyDropdown ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down"}></i>
                      </div>
                      {showCompanyDropdown && (
                        <ul className="custom-dropdown-list">
                          {allCompanies.sort().map((c, i) => (
                            <li 
                                key={i} 
                                className={`custom-dropdown-item ${selectedCompany === c ? 'active' : ''}`} 
                                onClick={() => selectCompany(c)}
                            >
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
                        style={{ paddingRight: '40px' }}
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
                          style={{ 
                            color: (engName === "Please select" || !engName) ? '#7d8f93' : '#F7F7F7',
                            borderColor: shouldShowEngDropdown ? '#00FFF6' : 'transparent',
                            paddingRight: (selectedCompany && (hasEngineerResults || hasClearEng)) ? '40px' : '16px'
                          }}
                        />
                        {(selectedCompany && (hasEngineerResults || hasClearEng)) && (
                           <i className={showEngineerDropdown ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down"}></i>
                        )}
                      </div>
                      {shouldShowEngDropdown && (
                        <ul className="custom-dropdown-list">
                          {hasClearEng && (
                            <li className="custom-dropdown-item" onClick={clearEngineer}>
                               Clear details
                            </li>
                          )}
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

        <footer className="footer-section">
          <a href="https://www.zelim.com" target="_blank" rel="noopener noreferrer">
            <Image 
              src="/logo/zelim-logo.svg" 
              width={120} 
              height={40} 
              alt="Zelim logo" 
              style={{ opacity: 1 }}
            />
          </a>
        </footer>
      </div>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const token = params.id;
  try {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_SWIFT_TABLE || "swift_units"; 
    
    if (!apiKey || !baseId) throw new Error("Missing Airtable Env");

    const headers = { Authorization: `Bearer ${apiKey}` };
    const unitFormula = encodeURIComponent(`{public_token}='${token}'`);
    const templateFormula = encodeURIComponent(`{type}='Annual'`);

    const urls = [
      `https://api.airtable.com/v0/${baseId}/${tableName}?filterByFormula=${unitFormula}`,
      `https://api.airtable.com/v0/${baseId}/checklist_templates?filterByFormula=${templateFormula}`,
      `https://api.airtable.com/v0/${baseId}/maintenance_companies`,
      `https://api.airtable.com/v0/${baseId}/engineers`
    ];

    const responses = await Promise.all(urls.map(url => fetch(url, { headers })));
    const results = await Promise.all(responses.map(res => res.json()));
    
    const [unitData, templateData, companyData, engineerData] = results;
    
    if (!unitData.records || unitData.records.length === 0) return { notFound: true };

    const unitRecord = unitData.records[0];
    const companyLookup = {};
    if (companyData.records) {
      companyData.records.forEach(r => { if (r.fields.company_name) companyLookup[r.id] = r.fields.company_name; });
    }
    
    return {
      props: {
        unit: { 
          serial_number: unitRecord.fields.unit_name || unitRecord.fields.serial_number || "Unit", 
          company: unitRecord.fields.company || "",
          record_id: unitRecord.id, 
          public_token: unitRecord.fields.public_token || token 
        },
        template: { 
          id: templateData.records?.[0]?.id || "", 
          questions: templateData.records?.[0]?.fields.questions_json ? JSON.parse(templateData.records[0].fields.questions_json) : []
        },
        allCompanies: Object.values(companyLookup).filter(Boolean),
        allEngineers: engineerData.records?.map(r => ({ 
          name: r.fields.engineer_name, 
          email: r.fields.email || "", 
          phone: r.fields.phone || "", 
          companyName: (r.fields["company"] && r.fields["company"][0]) ? companyLookup[r.fields["company"][0]] : "" 
        })).filter(e => e.name) || []
      }
    };
  } catch (err) { 
    console.error("Server Error:", err.message);
    return { notFound: true }; 
  }
}