import Head from "next/head";
import { useState } from "react";

/**
 * Airtable record ID for:
 * checklist_templates → "Annual Maintenance"
 */
const ANNUAL_TEMPLATE_ID = "recOjIUedN1UD9jZK";

export default function AnnualMaintenance({ unit, questions }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);

    const formData = new FormData(e.target);

    // REQUIRED metadata for backend
    formData.append("checklist_template_id", ANNUAL_TEMPLATE_ID);
    formData.append("maintenance_type", "Annual");
    formData.append("unit_public_token", unit.public_token);

    try {
      const res = await fetch("/api/submit-maintenance", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Submission failed");
      }

      // Success page (can be changed later)
      window.location.href = `/swift/${unit.public_token}`;
    } catch (err) {
      console.error(err);
      setSubmitting(false);
      setError(true);
    }
  }

  return (
    <>
      <Head>
        <title>{unit.serial_number} – Annual Maintenance</title>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper">
          <h1 className="checklist-hero-title">
            {unit.serial_number}
            <span className="break-point">annual maintenance</span>
          </h1>

          {error && (
            <div className="error-banner">
              Submission failed. Please try again.
            </div>
          )}

          <form className="checklist-form" onSubmit={handleSubmit}>
            {/* Maintenance company */}
            <div className="form-group">
              <label>Maintenance company</label>
              <select name="maintenance_company" required>
                <option value="">Select…</option>
                <option value="Zelim">Zelim</option>
              </select>
            </div>

            {/* Engineer */}
            <div className="form-group">
              <label>Engineer name</label>
              <input type="text" name="engineer_name" required />
            </div>

            {/* Date */}
            <div className="form-group">
              <label>Date of maintenance</label>
              <input type="date" name="date_of_maintenance" required />
            </div>

            {/* Dynamic checklist questions */}
            {questions.map((question, index) => (
              <div className="form-group" key={index}>
                <label>{question}</label>
                <input
                  type="text"
                  name={`question_${index}`}
                  required
                />
              </div>
            ))}

            <button
              type="submit"
              className="primary-btn"
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Submit maintenance"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

/* ======================================================
   SERVER-SIDE DATA FETCHING
====================================================== */

export async function getServerSideProps({ params }) {
  const token = params.id;

  const headers = {
    Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
  };

  /**
   * 1️⃣ Fetch SWIFT unit by public token
   */
  const unitRes = await fetch(
    `${process.env.AIRTABLE_API_URL}/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_SWIFT_TABLE}?filterByFormula={public_token}='${token}'`,
    { headers }
  );

  const unitJson = await unitRes.json();

  if (!unitJson.records || unitJson.records.length === 0) {
    return { notFound: true };
  }

  const unit = unitJson.records[0].fields;

  /**
   * 2️⃣ Fetch Annual checklist template
   */
  const templateRes = await fetch(
    `${process.env.AIRTABLE_API_URL}/${process.env.AIRTABLE_BASE_ID}/checklist_templates/${ANNUAL_TEMPLATE_ID}`,
    { headers }
  );

  const templateJson = await templateRes.json();

  /**
   * 3️⃣ Parse questions_json (Airtable stores this as TEXT)
   */
  let questions = [];

  try {
    questions = JSON.parse(templateJson.fields.questions_json);
  } catch (err) {
    console.error("Failed to parse questions_json", err);
    questions = [];
  }

  return {
    props: {
      unit: {
        serial_number: unit.serial_number,
        public_token: unit.public_token,
      },
      questions,
    },
  };
}
