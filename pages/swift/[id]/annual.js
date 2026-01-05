// pages/swift/[id]/annual.js

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

/* -----------------------------
   AUTO-GROW TEXTAREA
----------------------------- */
function autoGrow(e) {
  const el = e.target;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

export default function Annual({ unit, checklistTemplate }) {
  const router = useRouter();
  const canvasRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [geo, setGeo] = useState({ lat: "", lng: "", town: "", w3w: "" });

  /* -----------------------------
     SIGNATURE PAD
  ----------------------------- */
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

    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mouseup", end);
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", move);
      canvas.removeEventListener("touchend", end);
    };
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

  /* -----------------------------
     GEOLOCATION + WHAT3WORDS
  ----------------------------- */
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      let w3w = "";
      let town = "";

      try {
        const w3 = await fetch(
          `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&key=${process.env.NEXT_PUBLIC_W3W_API_KEY}`
        );
        const w3json = await w3.json();
        w3w = w3json.words || "";

        const osm = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        );
        const osmJson = await osm.json();
        town =
          osmJson.address?.town ||
          osmJson.address?.city ||
          osmJson.address?.village ||
          "";
      } catch (err) {
        console.warn("Location lookup failed");
      }

      setGeo({ lat, lng, town, w3w });
    });
  }, []);

  /* -----------------------------
     SUBMIT HANDLER
  ----------------------------- */
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
        const res = await fetch("/api/submit-maintenance", {
          method: "POST",
          body: data,
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        router.push(`/swift/${unit.public_token}/annual-complete`);
      } catch (err) {
        console.error(err);
        setErrorMsg("Submission failed. Please try again.");
        setSubmitting(false);
      }
    });
  }

  return (
    <>
      <Head>
        <title>Annual Maintenance</title>
      </Head>

      <div className="swift-checklist-container">
        <div className="checklist-logo">
          <img src="/logo/zelim-logo.svg" alt="Zelim Logo" />
        </div>

        <h1 className="checklist-hero-title">
          {unit.serial_number}
          <span className="break-point">annual maintenance</span>
        </h1>

        {errorMsg && <p className="checklist-error">{errorMsg}</p>}

        <div className="checklist-form-card">
          <form onSubmit={handleSubmit}>
            <label className="checklist-label">Maintenance company</label>
            <select name="maintained_by" className="checklist-input" required>
              <option value="">Select...</option>
              <option value="Zelim">Zelim</option>
            </select>

            <label className="checklist-label">Engineer name</label>
            <input
              className="checklist-input"
              name="engineer_name"
              required
            />

            <label className="checklist-label">Date of maintenance</label>
            <input
              type="date"
              className="checklist-input"
              name="date_of_maintenance"
              required
            />

            {checklistTemplate.questions.map((q, i) => (
              <div key={i}>
                <label className="checklist-label">{q}</label>
                <textarea
                  name={`q${i + 1}`}
                  className="checklist-textarea"
                  rows={2}
                  onInput={autoGrow}
                />
              </div>
            ))}

            <label className="checklist-label">Additional comments</label>
            <textarea
              name="comments"
              className="checklist-textarea"
              rows={2}
              onInput={autoGrow}
            />

            <label className="checklist-label">Upload photos</label>
            <input type="file" name="photos" accept="image/*" multiple />

            <label className="checklist-label">Signature</label>
            <canvas
              ref={canvasRef}
              width={350}
              height={150}
              className="checklist-signature"
            />

            <button
              type="button"
              onClick={clearSignature}
              className="checklist-clear-btn"
            >
              Clear signature
            </button>

            {/* REQUIRED HIDDEN FIELDS */}
            <input type="hidden" name="unit_record_id" value={unit.record_id} />
            <input type="hidden" name="maintenance_type" value="Annual" />
            <input
              type="hidden"
              name="checklist_template_id"
              value={checklistTemplate.id}
            />

            <button className="checklist-submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

/* -----------------------------
   SERVER SIDE PROPS
----------------------------- */
export async function getServerSideProps({ params }) {
  const token = params.id;

  // 🔑 THIS IS YOUR ANNUAL TEMPLATE RECORD
  const ANNUAL_TEMPLATE_ID = "recOjIUedN1UD9jZK";

  const unitReq = await fetch(
    `${process.env.AIRTABLE_API_URL}/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_SWIFT_TABLE}?filterByFormula={public_token}='${token}'`,
    {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      },
    }
  );

  const unitJson = await unitReq.json();
  if (!unitJson.records.length) return { notFound: true };

  const unitRec = unitJson.records[0];

  const templateReq = await fetch(
    `${process.env.AIRTABLE_API_URL}/${process.env.AIRTABLE_BASE_ID}/checklist_templates/${ANNUAL_TEMPLATE_ID}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      },
    }
  );

  const templateJson = await templateReq.json();

  return {
    props: {
      unit: {
        record_id: unitRec.id,
        serial_number: unitRec.fields.serial_number,
        public_token: unitRec.fields.public_token,
      },
      checklistTemplate: {
        id: templateJson.id,
        questions: templateJson.fields.questions_json || [],
      },
    },
  };
}
