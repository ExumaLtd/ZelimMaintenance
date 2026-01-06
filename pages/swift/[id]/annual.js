import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { UploadDropzone } from "../../../utils/uploadthing"; 

function autoGrow(e) {
  const el = e.target;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
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
  const [errorMsg, setErrorMsg] = useState("");
  const [photoUrls, setPhotoUrls] = useState([]);
  const [today, setToday] = useState("");

  useEffect(() => {
    const date = new Date().toISOString().split('T')[0];
    setToday(date);
  }, []);

  if (!unit || !template) return <div className="p-8 text-white">Loading...</div>;

  const questions = template.questions || [];
  const sortedCompanies = [...allCompanies].sort((a, b) => a.localeCompare(b));

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    const formData = new FormData(e.target);
    const formProps = Object.fromEntries(formData.entries());

    const payload = {
      ...formProps,
      photoUrls: photoUrls, 
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

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Airtable Permission Error");
      router.push(`/swift/${unit.public_token}/annual-complete`);
    } catch (err) {
      setErrorMsg(err.message);
      setSubmitting(false);
    }
  }

  const logo = getClientLogo(unit.company, unit.serial_number);

  return (
    <div className="swift-main-layout-wrapper">
      <div className="page-wrapper">
        <div className="swift-checklist-container">
          {logo && <div className="checklist-logo"><img src={logo.src} alt={logo.alt} /></div>}
          <h1 className="checklist-hero-title">{unit.serial_number}<span className="break-point">annual maintenance</span></h1>
          
          <div className="checklist-form-card">
            <form onSubmit={handleSubmit}>
              <label className="checklist-label">Maintenance company</label>
              <select name="maintained_by" className="checklist-input" required>
                <option value="">Please select</option>
                {sortedCompanies.map((companyName, index) => (
                  <option key={index} value={companyName}>
                    {companyName}
                  </option>
                ))}
              </select>

              <label className="checklist-label">Engineer name</label>
              <input className="checklist-input" name="engineer_name" required placeholder="Type name..." />

              <label className="checklist-label">Date of maintenance</label>
              <input 
                type="date" 
                className="checklist-input" 
                name="date_of_maintenance" 
                defaultValue={today} 
                required 
              />

              {questions.map((question, i) => (
                <div key={i}>
                  <label className="checklist-label">{question}</label>
                  <textarea name={`q${i + 1}`} className="checklist-textarea" rows={2} onInput={autoGrow} />
                </div>
              ))}

              <label className="checklist-label">Upload photos</label>
              <UploadDropzone
                endpoint="maintenanceImage"
                className="bg-slate-800 ut-label:text-lg border-2 border-dashed border-gray-600 p-8 h-48 cursor-pointer mb-4"
                onClientUploadComplete={(res) => {
                  setPhotoUrls(prev => [...prev, ...res.map(f => f.url)]);
                  alert("Photos uploaded!");
                }}
                onUploadError={(error) => setErrorMsg(`Upload Error: ${error.message}`)}
              />

              <button className="checklist-submit" disabled={submitting} style={{ marginTop: '20px' }}>
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
      unit: { serial_number: unitRec.fields.unit_name || unitRec.fields.serial_number, company: unitRec.fields.company, record_id: unitRec.id, public_token: unitRec.fields.public_token },
      template: { id: templateRec.id, questions: JSON.parse(templateRec.fields.questions_json || "[]") },
      allCompanies: allCompanies 
    },
  };
}