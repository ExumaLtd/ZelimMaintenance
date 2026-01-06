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
  const [selectedCompany, setSelectedCompany] = useState("");

  const storageKey = `draft_annual_${unit?.serial_number}`;

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
              if (input.tagName === "TEXTAREA") autoGrow(input);
            }
          });
          if (data.maintained_by) setSelectedCompany(data.maintained_by);
        }, 100);
      } catch (e) {
        console.error("Error loading draft", e);
      }
    }
  }, [storageKey]);

  const handleInputChange = (e) => {
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    localStorage.setItem(storageKey, JSON.stringify(data));
  };

  if (!unit || !template) return <div className="p-8 text-white">Loading...</div>;

  const questions = template.questions || [];
  const sortedCompanies = [...allCompanies].sort((a, b) => a.localeCompare(b));

  const filteredEngineers = allEngineers
    .filter(eng => !selectedCompany || eng.companyName === selectedCompany)
    .map(eng => eng.name)
    .sort((a, b) => a.localeCompare(b));

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    const formData = new FormData(e.target);
    const formProps = Object.fromEntries(formData.entries());

    const payload = {
      ...formProps,
      maintenance_type: "Annual",
      photoUrls: photoUrls, 
      unit_record_id: unit.record_id,
      checklist_template_id: template.id,
      answers: questions.map((_, i) => ({
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

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Airtable Submission Error");
      localStorage.removeItem(storageKey);
      router.push(`/swift/${unit.public_token}/annual-complete`);
    } catch (err) {
      setErrorMsg(err.message);
      setSubmitting(false);
    }
  }

  const logo = getClientLogo(unit.company, unit.serial_number);

  return (
    <div className="form-scope">
      <div className="swift-main-layout-wrapper">
        <Head>
          <title>{unit.serial_number} | Annual Maintenance</title>
        </Head>
        
        <div className="page-wrapper">
          <div className="swift-checklist-container">
            
            {logo && (
              <div className="checklist-logo">
                <img src={logo.src} alt={logo.alt} />
              </div>
            )}

            <h1 className="checklist-hero-title">
              {unit.serial_number}
              <span className="break-point">annual maintenance</span>
            </h1>
            
            <div className="checklist-form-card">
              <form onSubmit={handleSubmit} onChange={handleInputChange}>
                
                <div className="checklist-inline-group">
                  {/* Maintenance Company */}
                  <div className="checklist-field">
                    <label className="checklist-label">Maintenance company</label>
                    <div className="input-icon-wrapper">
                      <select 
                        name="maintained_by" 
                        className="checklist-input" 
                        required 
                        defaultValue=""
                        onChange={(e) => setSelectedCompany(e.target.value)}
                      >
                        <option value="" disabled hidden>Please select</option>
                        {sortedCompanies.map((companyName, index) => (
                          <option key={index} value={companyName}>{companyName}</option>
                        ))}
                      </select>
                      <i className="fa-solid fa-chevron-down"></i>
                    </div>
                  </div>

                  {/* Engineer Name */}
                  <div className="checklist-field">
                    <label className="checklist-label">Engineer name</label>
                    <input 
                      className="checklist-input" 
                      name="engineer_name" 
                      autoComplete="off"
                      list={selectedCompany ? "engineer-list" : undefined} 
                      required 
                      placeholder={selectedCompany ? "Type or select" : "Select company first"}
                    />
                    <datalist id="engineer-list">
                      {filteredEngineers.map((name, index) => (
                        <option key={index} value={name} />
                      ))}
                    </datalist>
                  </div>

                  {/* Date of Maintenance */}
                  <div className="checklist-field">
                    <label className="checklist-label">Date of maintenance</label>
                    <div className="input-icon-wrapper">
                      <input 
                        type="date" 
                        className="checklist-input" 
                        name="date_of_maintenance" 
                        defaultValue={today} 
                        max={today} 
                        required 
                      />
                      {/* Updated Icon Below */}
                      <i className="fa-regular fa-calendar"></i>
                    </div>
                  </div>
                </div>

                {/* Dynamic Questions */}
                {questions.map((question, i) => (
                  <div key={i}>
                    <label className="checklist-label">{question}</label>
                    <textarea 
                      name={`q${i + 1}`} 
                      className="checklist-textarea" 
                      onInput={autoGrow} 
                      rows={2} 
                      style={{ height: '72px' }} 
                    />
                  </div>
                ))}

                <label className="checklist-label">Upload photos</label>
                <UploadDropzone
                  endpoint="maintenanceImage"
                  className="bg-slate-800 ut-label:text-lg border-2 border-dashed border-gray-600 p-8 h-48 cursor-pointer mb-4"
                  onClientUploadComplete={(res) => setPhotoUrls(prev => [...prev, ...res.map(f => f.url)])}
                  onUploadError={(error) => alert(`Upload Error: ${error.message}`)}
                />

                {errorMsg && <p style={{ color: '#ff4d4d', marginTop: '10px' }}>{errorMsg}</p>}

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

    const [uJson, tJson, cJson, eJson] = await Promise.all([uReq.json(), tReq.json(), cReq.json(), eReq.json()]);

    if (!uJson.records?.length) return { notFound: true };
    const unitRec = uJson.records[0];
    const templateRec = tJson.records[0];

    const companyIdToName = {};
    cJson.records?.forEach(r => {
      companyIdToName[r.id] = r.fields.company_name;
    });

    return {
      props: {
        unit: { 
          serial_number: unitRec.fields.unit_name || unitRec.fields.serial_number, 
          company: unitRec.fields.company, 
          record_id: unitRec.id, 
          public_token: unitRec.fields.public_token 
        },
        template: { 
          id: templateRec.id, 
          questions: JSON.parse(templateRec.fields.questions_json || "[]") 
        },
        allCompanies: Object.values(companyIdToName).filter(Boolean),
        allEngineers: eJson.records?.map(r => ({
          name: r.fields.engineer_name,
          companyName: companyIdToName[r.fields["company"]?.[0]] || "" 
        })).filter(eng => eng.name) || []
      },
    };
  } catch (err) {
    console.error(err);
    return { notFound: true };
  }
}