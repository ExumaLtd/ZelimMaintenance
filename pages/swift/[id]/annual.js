import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { UploadDropzone } from "../../../utils/uploadthing"; 

export default function Annual({ unit, template }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [photoUrls, setPhotoUrls] = useState([]);

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

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Airtable Error - Check Table IDs");
      router.push(`/swift/${unit.public_token}/annual-complete`);
    } catch (err) {
      setErrorMsg(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="swift-main-layout-wrapper">
      <div className="page-wrapper">
        <div className="swift-checklist-container">
          <h1 className="checklist-hero-title">{unit.serial_number} annual maintenance</h1>
          {errorMsg && <p className="checklist-error" style={{color: 'red', marginBottom: '10px'}}>{errorMsg}</p>}

          <div className="checklist-form-card">
            <form onSubmit={handleSubmit}>
              <label className="checklist-label">Engineer name</label>
              <input className="checklist-input" name="engineer_name" required />

              <label className="checklist-label">Upload photos</label>
              <UploadDropzone
                endpoint="maintenanceImage"
                className="bg-slate-800 border-2 border-dashed border-gray-600 p-8 h-48 cursor-pointer mb-4"
                onClientUploadComplete={(res) => {
                  setPhotoUrls(prev => [...prev, ...res.map(f => f.url)]);
                  alert("Upload complete!");
                }}
              />

              {photoUrls.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                    {photoUrls.map((url, index) => (
                      <img key={index} src={url} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px' }} />
                    ))}
                </div>
              )}

              <button className="checklist-submit" disabled={submitting}>
                {submitting ? "Submitting to Airtable..." : "Submit maintenance"}
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

  return {
    props: {
      unit: { serial_number: unitRec.fields.serial_number, record_id: unitRec.id, public_token: unitRec.fields.public_token },
      template: { id: templateRec.id, questions: JSON.parse(templateRec.fields.questions_json || "[]") },
    },
  };
}