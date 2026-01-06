// pages/swift/[id]/depth.js
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

function autoGrow(e) {
  const el = e.target;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

export default function Depth({ unit }) {
  const router = useRouter();
  const canvasRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [geo, setGeo] = useState({ lat: "", lng: "", town: "", w3w: "" });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let drawing = false;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    };

    const start = (e) => {
      e.preventDefault();
      drawing = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const move = (e) => {
      if (!drawing) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.strokeStyle = "#FFF";
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const end = () => (drawing = false);

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", end);
    canvas.addEventListener("touchstart", start);
    canvas.addEventListener("touchmove", move);
    canvas.addEventListener("touchend", end);
  }, []);

  const clearSignature = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const signatureIsEmpty = () => {
    const data = canvasRef.current
      .getContext("2d")
      .getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)
      .data;
    return !data.some((p) => p !== 0);
  };

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      let w3w = "";
      let town = "";
      try {
        const w3 = await fetch(`https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&key=${process.env.NEXT_PUBLIC_W3W_API_KEY}`);
        const w3json = await w3.json();
        w3w = w3json.words || "";
        const osm = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const osmJson = await osm.json();
        town = osmJson.address?.town || osmJson.address?.city || osmJson.address?.village || "";
      } catch (e) { console.log("Location lookup failed", e); }
      setGeo({ lat, lng, town, w3w });
    });
  }, []);

  const questions = Array.from({ length: 20 }, (_, i) => `Question ${i + 1}`);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    if (signatureIsEmpty()) {
      setErrorMsg("Signature is required.");
      return;
    }
    setSubmitting(true);
    const form = e.target;
    const data = new FormData(form);

    canvasRef.current.toBlob(async (blob) => {
      data.append("signature", blob, "signature.png");
      data.append("location_lat", geo.lat);
      data.append("location_lng", geo.lng);
      data.append("location_town", geo.town);
      data.append("location_what3words", geo.w3w);
      try {
        const res = await fetch("/api/submit-maintenance", { method: "POST", body: data });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        router.push(`/swift/${unit.public_token}/depth-complete`);
      } catch (err) {
        console.log(err);
        setErrorMsg("Submission failed.");
      }
      setSubmitting(false);
    });
  }

  return (
    <div className="form-scope">
      <Head>
        <title>{unit.serial_number} | Depth Maintenance</title>
      </Head>
      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper">
          <div className="swift-checklist-container">
            <div className="checklist-logo">
              <img src="/logo/zelim-logo.svg" alt="Zelim Logo" />
            </div>

            <h1 className="checklist-hero-title">
              {unit.serial_number}
              <span className="break-point">30-month depth maintenance</span>
            </h1>

            <div className="checklist-form-card">
              <form onSubmit={handleSubmit}>
                <div className="checklist-inline-group">
                  <div className="checklist-field">
                    <label className="checklist-label">Maintenance company</label>
                    <select name="maintained_by" className="checklist-input" required>
                      <option value="">Select...</option>
                      <option value="Zelim">Zelim</option>
                      <option value="Company Four">Company Four</option>
                    </select>
                  </div>
                  <div className="checklist-field">
                    <label className="checklist-label">Engineer name</label>
                    <input className="checklist-input" name="engineer_name" required />
                  </div>
                  <div className="checklist-field">
                    <label className="checklist-label">Date of maintenance</label>
                    <input type="date" className="checklist-input" name="date_of_maintenance" required />
                  </div>
                </div>

                {questions.map((q, i) => (
                  <div key={i}>
                    <label className="checklist-label">{q}</label>
                    <textarea name={`q${i + 1}`} className="checklist-textarea" rows={2} onInput={autoGrow} />
                  </div>
                ))}

                <label className="checklist-label">Signature</label>
                <div style={{ background: '#27454b', borderRadius: '8px', marginBottom: '10px' }}>
                   <canvas ref={canvasRef} width={350} height={150} style={{ width: '100%', cursor: 'crosshair' }} />
                </div>
                <button type="button" onClick={clearSignature} className="checklist-submit" style={{ background: '#4f6167', color: 'white', marginTop: '0' }}>
                  Clear signature
                </button>

                <input type="hidden" name="unit_record_id" value={unit.record_id} />
                <input type="hidden" name="maintenance_type" value="Depth" />

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
  const req = await fetch(`${process.env.AIRTABLE_API_URL}/${process.env.AIRTABLE_SWIFT_TABLE}?filterByFormula={public_token}='${token}'`, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
  });
  const json = await req.json();
  if (!json.records?.length) return { notFound: true };
  const rec = json.records[0];
  return {
    props: {
      unit: {
        serial_number: rec.fields.serial_number,
        record_id: rec.id,
        public_token: rec.fields.public_token,
      },
    },
  };
}