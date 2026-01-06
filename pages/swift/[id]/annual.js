import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head"; 
import { UploadDropzone } from "../../../utils/uploadthing"; 

function autoGrow(e) {
  const el = e.target;
  el.style.height = "48px"; 
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

export default function Annual({ unit, template, allCompanies = [] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(new Date().toISOString().split('T')[0]);
  }, []);

  if (!unit || !template) return <div className="p-8 text-white">Loading...</div>;

  const questions = template.questions || [];
  const sortedCompanies = [...allCompanies].sort((a, b) => a.localeCompare(b));

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.target);
    const formProps = Object.fromEntries(formData.entries());

    const payload = {
      ...formProps,
      photoUrls, 
      unit_record_id: unit.record_id,
      maintenance_type: "Annual",
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
      if (res.ok) {
        router.push(`/swift/${unit.public_token}/annual-complete`);
      } else {
        setSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  }

  const logo = getClientLogo(unit.company, unit.serial_number);

  return (
    <div className="swift-main-layout-wrapper">
      <Head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </Head>
      
      <div className="page-wrapper">
        <div className="swift-checklist-container">
          {logo && <div className="checklist-logo"><img src={logo.src} alt={logo.alt} /></div>}
          
          <h1 className="checklist-hero-title">
            {unit.serial_number}
            <span className="break-point">annual maintenance</span>
          </h1>
          
          <div className="checklist-form-card">
            <form onSubmit={handleSubmit}>
              
              <div className="checklist-inline-group">
                <div className="checklist-field">
                  <label className="checklist-label">Maintenance company</label>
                  <div className="input-icon-wrapper">
                    <select name="maintained_by" className="checklist-input" required>
                      <option value="">Please select</option>
                      {sortedCompanies.map((name, i) => (
                        <option key={i} value={name}>{name}</option>
                      ))}
                    </select>
                    <i className="fa-solid fa-chevron-down"></i>
                  </div>
                </div>

                <div className="checklist-field">
                  <label className="checklist-label">Engineer name</label>
                  <input className="checklist-input" name="engineer_name" required />
                </div>

                <div className="checklist-field">
                  <label className="checklist-label">Date of maintenance</label>
                  <div className="input-icon-wrapper">
                    <input 
                      type="date" 
                      className="checklist-input" 
                      name="date_of_maintenance" 
                      defaultValue={today} 
                      required 
                    />
                    <i className="fa-regular fa-calendar"></i>
                  </div>
                </div>
              </div>

              {questions.map((question, i) => (
                <div key={i}>
                  <label className="checklist-label">{question}</label>
                  <textarea 
                    name={`q${i + 1}`} 
                    className="checklist-textarea" 
                    onInput={autoGrow} 
                    rows={1}
                  />
                </div>
              ))}

              <label className="checklist-label" style={{ marginTop: '40px' }}>Upload photos</label>
              <UploadDropzone
                endpoint="maintenanceImage"
                className="bg-slate-800 ut-label:text-lg border-2 border-dashed border-gray-600 p-8 h-48 cursor-pointer mb-4"
                onClientUploadComplete={(res) => {
                  setPhotoUrls(prev => [...prev, ...res.map(f => f.url)]);
                }}
                onUploadError={(error) => alert(`Upload Error: ${error.message}`)}
              />

              <button className="checklist-submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit maintenance"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const token = params.id;
  
  try {
    const unitReq = await fetch(`${process.env.AIRTABLE_API_URL}/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_SWIFT_TABLE}?filterByFormula={public_token}='${token}'`, {
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
    });
    const unitJson = await unitReq.json();
    if (!unitJson.records?.length) return { notFound: true };
    const unitRec = unitJson.records[0];

    const templateReq = await fetch(`${process.env.AIRTABLE_API_URL}/${process.env.AIRTABLE_BASE_ID}/checklist_templates?filterByFormula={type}='Annual'`, {
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
    });
    const templateJson = await templateReq.json();
    const templateRec = templateJson.records[0];

    const companyReq = await fetch(`${process.env.AIRTABLE_API_URL}/${process.env.AIRTABLE_BASE_ID}/maintenance_companies`, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
    });
    const companyJson = await companyReq.json();
    const allCompanies = companyJson.records?.map(r => r.fields.company_name).filter(Boolean) || [];

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
        allCompanies 
      },
    };
  } catch (err) {
    console.error(err);
    return { notFound: true };
  }
}