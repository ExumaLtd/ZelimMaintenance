// pages/swift/[id]/annual.js

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";

// Auto-expand textareas
function autoGrow(e) {
  const el = e.target;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

// -------------------------------------------------
// CLIENT LOGO RESOLVER
// -------------------------------------------------
const getClientLogo = (companyName, serialNumber) => {
  if (["SWI001", "SWI002"].includes(serialNumber) || companyName.includes("Changi")) {
    return {
      src: "/client_logos/changi_airport/ChangiAirport_Logo(White).svg",
      alt: `${companyName} Logo`,
    };
  }

  if (serialNumber === "SWI003" || companyName.includes("Milford Haven")) {
    return {
      src: "/client_logos/port_of_milford_haven/PortOfMilfordHaven(White).svg",
      alt: `${companyName} Logo`,
    };
  }

  if (["SWI010", "SWI011"].includes(serialNumber) || companyName.includes("Hatloy")) {
    return {
      src: "/client_logos/Hatloy Maritime/HatloyMaritime_Logo(White).svg",
      alt: `${companyName} Logo`,
    };
  }

  return null;
};

export default function Annual({ unit }) {
  const router = useRouter();
  const canvasRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [geo, setGeo] = useState({ lat: "", lng: "", town: "", w3w: "" });

  // -------------------------------------------------
  // SIGNATURE PAD
  // -------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#01FFF6";

    let drawing = false;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };

    const start = (e) => {
      drawing = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const move = (e) => {
      if (!drawing) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
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
    const ctx = canvasRef.current.getContext("2d");
    const data = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height).data;
    return !data.some((pixel) => pixel !== 0);
  };

  // -------------------------------------------------
  // GEO + WHAT3WORDS
  // -------------------------------------------------
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      let w3w = "";
      let town = "";

      try {
        const w3 = await fetch(
          `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat}%2C${lng}&key=${process.env.NEXT_PUBLIC_W3W_API_KEY}`
        );
        const w3json = await w3.json();
        w3w = w3json.words || "";

        const osm = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        );
        const osmJson = await osm.json();

        town =
          osmJson.address?.town ||
          osmJson.address?.village ||
          osmJson.address?.city ||
          "";
      } catch {}

      setGeo({ lat, lng, w3w, town });
    });
  }, []);

  // -------------------------------------------------
  // FORM SUBMISSION
  // -------------------------------------------------
  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    if (signatureIsEmpty()) {
      setErrorMsg("Signature is required.");
      return;
    }

    setSubmitting(true);

    const form = new FormData(e.target);

    canvasRef.current.toBlob(async (blob) => {
      form.append("signature", blob, "signature.png");
      form.append("location_lat", geo.lat);
      form.append("location_lng", geo.lng);
      form.append("location_town", geo.town);
      form.append("location_what3words", geo.w3w);

      try {
        const res = await fetch("/api/submit-maintenance", {
          method: "POST",
          body: form,
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        router.push(`/swift/${unit.public_token}/annual-complete`);
      } catch {
        setErrorMsg("Submission failed.");
      }

      setSubmitting(false);
    });
  }

  const questions = Array.from({ length: 16 }, (_, i) => `Question ${i + 1}`);
  const logo = getClientLogo(unit.company, unit.serial_number);

  return (
    <div className="swift-main-layout-wrapper">
      <div className="page-wrapper">
        <div className="swift-checklist-container">
          {logo && (
            <div className="checklist-logo">
              <img src={logo.src} alt={logo.alt} />
            </div>
          )}

          <h1 className="checklist-hero-title">
            {unit.model} {unit.serial_number}
            <span className="break-point">Annual Maintenance</span>
          </h1>

          {errorMsg && <p className="checklist-error">{errorMsg}</p>}

          <div className="checklist-form-card">
            <form onSubmit={handleSubmit}>
              {/* First field gets top padding restored */}
              <label className="checklist-label first-label">Maintenance company</label>
              <select name="maintained_by" className="checklist-input" required>
                <option value="">Select...</option>
                <option value="Zelim">Zelim</option>
              </select>

              <label className="checklist-label">Engineer name</label>
              <input name="engineer_name" className="checklist-input" required />

              <label className="checklist-label">Date of maintenance</label>
              <input type="date" name="date_of_maintenance" className="checklist-input" required />

              {/* QUESTIONS */}
              {questions.map((q, i) => (
                <div key={i}>
                  <label className="checklist-label">{q}</label>
                  <textarea
                    className="checklist-textarea"
                    name={`q${i + 1}`}
                    rows={2}
                    onInput={autoGrow}
                  />
                </div>
              ))}

              <label className="checklist-label">Additional comments</label>
              <textarea className="checklist-textarea" name="comments" rows={2} onInput={autoGrow} />

              <label className="checklist-label">Upload photos</label>
              <input type="file" name="photos" multiple accept="image/*" />

              <label className="checklist-label">Signature</label>
              <canvas ref={canvasRef} className="checklist-signature" width={600} height={250} />

              {/* BUTTONS WRAPPED CORRECTLY */}
              <div className="signature-actions">
                <button type="button" className="checklist-clear-btn" onClick={clearSignature}>
                  Clear signature
                </button>

                <button className="checklist-submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>

              <input type="hidden" name="unit_record_id" value={unit.record_id} />
              <input type="hidden" name="maintenance_type" value="Annual" />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------
// SERVER SIDE PROPS
// -------------------------------------------------
export async function getServerSideProps({ params }) {
  const token = params.id;

  const req = await fetch(
    `${process.env.AIRTABLE_API_URL}/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_SWIFT_TABLE}?filterByFormula={public_token}='${token}'`,
    {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
    }
  );

  const json = await req.json();
  if (!json.records.length) return { notFound: true };

  const rec = json.records[0];

  return {
    props: {
      unit: {
        model: rec.fields.model,
        serial_number: rec.fields.serial_number,
        company: rec.fields.company,
        record_id: rec.id,
        public_token: rec.fields.public_token,
      },
    },
  };
}
