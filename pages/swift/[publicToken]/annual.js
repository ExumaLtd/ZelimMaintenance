import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";

// Auto-grow helper for textareas
function autoGrow(e) {
  const el = e.target;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

export default function Annual({ unit }) {
  const router = useRouter();
  const canvasRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [geo, setGeo] = useState({ lat: "", lng: "", town: "", w3w: "" });

  /* ---------------------------------------------------------
     SIGNATURE PAD INITIALISATION
  --------------------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let drawing = false;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();

      if (e.touches) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top
        };
      }

      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const start = (e) => {
      e.preventDefault();
      drawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const move = (e) => {
      if (!drawing) return;
      e.preventDefault();
      const pos = getPos(e);

      ctx.lineTo(pos.x, pos.y);
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

  function clearSignature() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function signatureIsEmpty() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    return !data.some((px) => px !== 0);
  }

  /* ---------------------------------------------------------
     LOCATION + WHAT3WORDS + TOWN
  --------------------------------------------------------- */
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
      } catch (err) {
        console.log("Location lookup failed", err);
      }

      setGeo({ lat, lng, w3w, town });
    });
  }, []);

  /* ---------------------------------------------------------
     CHECKLIST QUESTIONS (PLACEHOLDERS)
  --------------------------------------------------------- */
  const questions = [
    "Question one",
    "Question two",
    "Question three",
    "Question four",
    "Question five",
    "Question six",
    "Question seven",
    "Question eight",
    "Question nine",
    "Question ten",
    "Question eleven",
    "Question twelve",
    "Question thirteen",
    "Question fourteen",
    "Question fifteen",
    "Question sixteen"
  ];

  /* ---------------------------------------------------------
     FORM SUBMISSION
  --------------------------------------------------------- */
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    if (signatureIsEmpty()) {
      setSubmitting(false);
      setErrorMsg("Signature is required.");
      return;
    }

    const form = e.target;
    const data = new FormData(form);

    // add signature png
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      data.append("signature", blob, "signature.png");

      // geo metadata
      data.append("location_lat", geo.lat);
      data.append("location_lng", geo.lng);
      data.append("location_town", geo.town);
      data.append("location_what3words", geo.w3w);

      fetch("/api/submit-maintenance", {
        method: "POST",
        body: data
      })
        .then(async (r) => {
          const json = await r.json();
          if (!json.success) throw new Error(json.error);

          router.push(`/swift/${unit.public_token}/annual-complete`);
        })
        .catch((err) => {
          console.log(err);
          setErrorMsg("Something went wrong submitting the form.");
          setSubmitting(false);
        });
    });
  }

  /* ---------------------------------------------------------
     PAGE RENDER
  --------------------------------------------------------- */
  return (
    <div className="swift-checklist-container">
      <div className="checklist-logo">
        <img src="/logos/zelim-logo.png" />
      </div>

      <h1 className="checklist-hero-title">
        {unit.model} {unit.serial_number}
        <span className="break-point">Annual Maintenance</span>
      </h1>

      {errorMsg && <p className="checklist-error">{errorMsg}</p>}

      <div className="checklist-form-card">
        <form onSubmit={handleSubmit}>

          {/* BASIC DETAILS */}
          <label className="checklist-label">Maintenance company</label>
          <select name="maintained_by" required className="checklist-input">
            <option value="">Select...</option>
            <option value="Company A">Company A</option>
            <option value="Company B">Company B</option>
            <option value="Company C">Company C</option>
          </select>

          <label className="checklist-label">Engineer name</label>
          <input className="checklist-input" name="engineer_name" required />

          <label className="checklist-label">Date of maintenance</label>
          <input className="checklist-input" type="date" name="date_of_maintenance" required />


          {/* CHECKLIST QUESTIONS */}
          {questions.map((q, i) => (
            <div key={i}>
              <label className="checklist-label">{q}</label>
              <textarea
                name={`q${i + 1}`}
                className="checklist-textarea"
                rows={2}
                required
                onInput={autoGrow}
              ></textarea>
            </div>
          ))}

          <label className="checklist-label">Additional comments</label>
          <textarea
            name="comments"
            rows={2}
            className="checklist-textarea"
            onInput={autoGrow}
          ></textarea>

          {/* PHOTOS */}
          <label className="checklist-label">Upload photos</label>
          <input
            type="file"
            name="photos"
            accept="image/*"
            multiple
            className="checklist-input"
          />

          {/* SIGNATURE */}
          <label className="checklist-label">Signature</label>

          <canvas
            ref={canvasRef}
            width={350}
            height={150}
            className="checklist-signature"
          ></canvas>

          <button
            type="button"
            onClick={clearSignature}
            className="checklist-clear-btn"
          >
            Clear signature
          </button>


          {/* HIDDEN FIELDS */}
          <input type="hidden" name="unit_record_id" value={unit.record_id} />
          <input type="hidden" name="maintenance_type" value="Annual" />

          {/* SUBMIT */}
          <button className="checklist-submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   SSR – LOAD UNIT
--------------------------------------------------------- */
export async function getServerSideProps({ params }) {
  const token = params.publicToken;

  const res = await fetch(
    `${process.env.AIRTABLE_API_URL}/swift_units?filterByFormula={public_token}='${token}'`,
    {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      },
    }
  );

  const json = await res.json();

  if (!json.records.length) return { notFound: true };

  const record = json.records[0];

  return {
    props: {
      unit: {
        serial_number: record.fields.serial_number || "",
        model: record.fields.model || "",
        record_id: record.id,
        public_token: record.fields.public_token
      }
    }
  };
}
