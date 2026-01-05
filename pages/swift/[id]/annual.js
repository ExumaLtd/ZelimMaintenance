import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { UploadButton } from "../../../utils/uploadthing"; // Ensure this path is correct

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

export default function Annual({ unit, template }) {
  const router = useRouter();
  const canvasRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [geo, setGeo] = useState({ lat: "", lng: "", town: "", w3w: "" });
  
  // NEW: State for UploadThing URLs
  const [photoUrls, setPhotoUrls] = useState([]);

  const questions = template.questions || [];

  // Signature logic (remains same)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let drawing = false;
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };
    const start = (e) => { e.preventDefault(); drawing = true; const { x, y } = getPos(e); ctx.beginPath(); ctx.moveTo(x, y); };
    const move = (e) => {
      if (!drawing) return; e.preventDefault(); const { x, y } = getPos(e);
      ctx.lineTo(x, y); ctx.strokeStyle = "#FFF"; ctx.lineWidth = 2; ctx.stroke();
    };
    const end = () => (drawing = false);
    canvas.addEventListener("mousedown", start); canvas.addEventListener("mousemove", move); canvas.addEventListener("mouseup", end);
    canvas.addEventListener("touchstart", start); canvas.addEventListener("touchmove", move); canvas.addEventListener("touchend", end);
    return () => {
      canvas.removeEventListener("mousedown", start); canvas.removeEventListener("mousemove", move); canvas.removeEventListener("mouseup", end);
      canvas.removeEventListener("touchstart", start); canvas.removeEventListener("touchmove", move); canvas.removeEventListener("touchend", end);
    };
  }, []);

  const clearSignature = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const signatureIsEmpty = () => {
    const data = canvasRef.current.getContext("2d").getImageData(0, 0, canvasRef.current.width, canvasRef.current.height).data;
    return !data.some((pixel) => pixel !== 0);
  };

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      try {
        const w3 = await fetch(`https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat}%2C${lng}&key=${process.env.NEXT_PUBLIC_W3W_API_KEY}`);
        const w3json = await w3.json();
        const osm = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const osmJson = await osm.json();
        setGeo({ lat, lng, w3w: w3json.words || "", town: osmJson.address?.town || osmJson.address?.village || osmJson.address?.city || "" });
      } catch {}
    });
  }, []);

  // UPDATED HANDLE SUBMIT
  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    if (signatureIsEmpty()) { setErrorMsg("Signature is required."); return; }

    setSubmitting(true);
    const formEl = e.target;
    const formData = new FormData(formEl);
    const formProps = Object.fromEntries(formData.entries());

    // Convert signature to Base64 (Airtable handles this differently, but we send it to our API)
    const signatureBase64 = canvasRef.current.toDataURL("image/png");

    const payload = {
      ...formProps,
      location_lat: geo.lat,
      location_lng: geo.lng,
      location_town: geo.town,
      location_what3words: geo.w3w,
      photoUrls: photoUrls, // From UploadThing state
      signatureBase64: signatureBase64,
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
      if (!json.success) throw new Error(json.error || "Submission failed");

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
          {errorMsg && <p className="checklist-error">{errorMsg}</p>}

          <div className="checklist-form-card">
            <form onSubmit={handleSubmit}>
              <label className="checklist-label">Maintenance company</label>
              <select name="maintained_by" className="checklist-input" required>
                <option value="">Select...</option>
                <option value="Zelim">Zelim</option>
                <option value="Company Four">Company Four</option>
              </select>

              <label className="checklist-label">Engineer name</label>
              <input className="checklist-input" name="engineer_name" required />

              <label className="checklist-label">Date of maintenance</label>
              <input type="date" className="checklist-input" name="date_of_maintenance" required />

              {questions.map((question, i) => (
                <div key={i}>
                  <label className="checklist-label">{question}</label>
                  <textarea name={`q${i + 1}`} className="checklist-textarea" rows={2} onInput={autoGrow} />
                </div>
              ))}

              <label className="checklist-label">Additional comments</label>
              <textarea name="comments" className="checklist-textarea" rows={2} onInput={autoGrow} />

              <label className="checklist-label">Upload photos</label>
              <UploadButton
                endpoint="maintenanceImage"
                onClientUploadComplete={(res) => {
                  setPhotoUrls(res.map(f => f.url));
                  alert("Photos uploaded!");
                }}
                onUploadError={(error) => alert(`Upload Error: ${error.message}`)}
              />
              {photoUrls.length > 0 && <p style={{color: '#AAA', fontSize: '12px'}}>{photoUrls.length} photos ready.</p>}

              <label className="checklist-label">Signature</label>
              <canvas ref={canvasRef} width={350} height={150} className="checklist-signature" />
              <button type="button" onClick={clearSignature} className="checklist-clear-btn">Clear signature</button>

              <input type="hidden" name="unit_record_id" value={unit.record_id} />
              <input type="hidden" name="maintenance_type" value="Annual" />
              <input type="hidden" name="checklist_template_id" value={template.id} />

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
      unit: { serial_number: unitRec.fields.serial_number, company: unitRec.fields.company, record_id: unitRec.id, public_token: unitRec.fields.public_token },
      template: { id: templateRec.id, name: templateRec.fields.template_name, questions: JSON.parse(templateRec.fields.questions_json || "[]") },
    },
  };
}