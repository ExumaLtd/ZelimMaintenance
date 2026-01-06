// pages/swift/[id]/depth.js
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

function autoGrow(e) {
  const el = e.target || e;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

export default function Depth({ unit }) {
  const router = useRouter();
  const canvasRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [geo, setGeo] = useState({ lat: "", lng: "", town: "", w3w: "" });
  
  // Signature States
  const [signatureLocked, setSignatureLocked] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);

  const storageKey = `draft_depth_${unit.serial_number}`;

  // 1. INITIALIZE SIGNATURE CANVAS
  useEffect(() => {
    if (signatureLocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
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
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end);

    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mouseup", end);
    };
  }, [signatureLocked]);

  // 2. LOAD DRAFT ON MOUNT
  useEffect(() => {
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
        }, 100);
      } catch (e) { console.error("Draft load failed", e); }
    }
  }, [storageKey]);

  // 3. AUTO-SAVE HANDLER
  const handleInputChange = (e) => {
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    localStorage.setItem(storageKey, JSON.stringify(data));
  };

  // 4. SIGNATURE LOCK LOGIC
  const lockSignature = () => {
    if (signatureIsEmpty()) {
      alert("Please provide a signature first.");
      return;
    }
    const dataUrl = canvasRef.current.toDataURL();
    setSignatureDataUrl(dataUrl);
    setSignatureLocked(true);
  };

  const unlockSignature = () => {
    setSignatureLocked(false);
    setSignatureDataUrl(null);
  };

  const signatureIsEmpty = () => {
    if (!canvasRef.current) return true;
    const data = canvasRef.current.getContext("2d")
      .getImageData(0, 0, canvasRef.current.width, canvasRef.current.height).data;
    return !data.some((p) => p !== 0);
  };

  // 5. GEO LOCATION
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      try {
        const w3 = await fetch(`https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&key=${process.env.NEXT_PUBLIC_W3W_API_KEY}`);
        const w3json = await w3.json();
        const osm = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const osmJson = await osm.json();
        setGeo({ 
          lat, lng, 
          w3w: w3json.words || "", 
          town: osmJson.address?.town || osmJson.address?.city || "" 
        });
      } catch (e) { console.log("Geo lookup failed", e); }
    });
  }, []);

  const questions = Array.from({ length: 20 }, (_, i) => `Question ${i + 1}`);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    if (!signatureLocked) {
      setErrorMsg("Please lock your signature before submitting.");
      return;
    }
    setSubmitting(true);
    const form = e.target;
    const data = new FormData(form);

    // Convert DataURL to Blob for upload
    const response = await fetch(signatureDataUrl);
    const blob = await response.blob();
    
    data.append("signature", blob, "signature.png");
    data.append("location_lat", geo.lat);
    data.append("location_lng", geo.lng);
    data.append("location_town", geo.town);
    data.append("location_what3words", geo.w3w);

    try {
      const res = await fetch("/api/submit-maintenance", { method: "POST", body: data });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      localStorage.removeItem(storageKey); // Success! Clear the draft.
      router.push(`/swift/${unit.public_token}/depth-complete`);
    } catch (err) {
      setErrorMsg("Submission failed. Your progress is saved locally.");
    }
    setSubmitting(false);
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
              <form onSubmit={handleSubmit} onChange={handleInputChange}>
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
                    <input className="checklist-input" name="engineer_name" required autoComplete="off" />
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
                <div style={{ background: '#27454b', borderRadius: '8px', padding: '10px', position: 'relative' }}>
                  {signatureLocked ? (
                    <img src={signatureDataUrl} alt="Locked Signature" style={{ width: '100%', height: '150px', objectFit: 'contain' }} />
                  ) : (
                    <canvas ref={canvasRef} width={350} height={150} style={{ width: '100%', cursor: 'crosshair', touchAction: 'none' }} />
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  {!signatureLocked ? (
                    <button type="button" onClick={lockSignature} className="checklist-submit" style={{ marginTop: 0 }}>
                      Lock Signature
                    </button>
                  ) : (
                    <button type="button" onClick={unlockSignature} className="checklist-submit" style={{ marginTop: 0, background: '#4f6167' }}>
                      Redo Signature
                    </button>
                  )}
                </div>

                <input type="hidden" name="unit_record_id" value={unit.record_id} />
                <input type="hidden" name="maintenance_type" value="Depth" />

                {errorMsg && <p style={{ color: '#ff4d4d', marginTop: '15px' }}>{errorMsg}</p>}

                <button className="checklist-submit" disabled={submitting || !signatureLocked}>
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