import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AnnualMaintenance({ unit, template, engineerList }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If template wasn't found, show an error instead of crashing the page
  if (!template) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: Checklist template 'Annual' not found in Airtable.</div>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.target);
    const answers = {};
    
    template.questions.forEach(q => {
      answers[q.id] = formData.get(`q-${q.id}`);
    });

    const payload = {
      unit_record_id: unit.id,
      checklist_template_id: template.id,
      maintained_by: formData.get('maintained_by'),
      engineer_name: formData.get('engineer_name'),
      date_of_maintenance: formData.get('date_of_maintenance'),
      answers: answers,
    };

    try {
      const res = await fetch('/api/submit-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push('/annual-complete');
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Submission failed'}`);
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checklist-container">
      <Head>
        <title>Annual Maintenance - {unit?.name || 'Unit'}</title>
      </Head>

      <header className="checklist-header">
        <h1>Annual Maintenance</h1>
        <p className="unit-badge">{unit?.name}</p>
      </header>

      <form onSubmit={handleSubmit} className="checklist-form">
        <section className="form-section">
          <label className="checklist-label">Date of Maintenance</label>
          <input 
            type="date" 
            name="date_of_maintenance" 
            className="checklist-input" 
            required 
            defaultValue={new Date().toISOString().split('T')[0]} 
          />

          <label className="checklist-label">Maintenance Company</label>
          <select name="maintained_by" className="checklist-input" required>
            <option value="">Select Company...</option>
            <option value="Zelim">Zelim</option>
            <option value="Exuma">Exuma</option>
          </select>

          <label className="checklist-label">Engineer Name</label>
          <input 
            list="engineer-options" 
            name="engineer_name" 
            className="checklist-input" 
            placeholder="Search existing or type new name..." 
            required 
            autoComplete="off"
          />
          <datalist id="engineer-options">
            {engineerList.map((eng) => (
              <option key={eng.id} value={eng.name} />
            ))}
          </datalist>
        </section>

        <hr className="divider" />

        <div className="questions-grid">
          {template.questions.map((q) => (
            <div key={q.id} className="question-card">
              <p className="question-text">{q.text}</p>
              <div className="radio-group">
                <label><input type="radio" name={`q-${q.id}`} value="Pass" required /> Pass</label>
                <label><input type="radio" name={`q-${q.id}`} value="Fail" /> Fail</label>
                <label><input type="radio" name={`q-${q.id}`} value="N/A" /> N/A</label>
              </div>
            </div>
          ))}
        </div>

        <button type="submit" className="submit-button" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Complete Maintenance'}
        </button>
      </form>
    </div>
  );
}

export async function getServerSideProps(context) {
  const { id } = context.params;
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  try {
    // 1. Fetch Unit Details
    const unitRes = await fetch(`https://api.airtable.com/v0/${baseId}/swift_units/${id}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const unitData = await unitRes.json();

    // 2. Fetch Checklist Template (Annual)
    // IMPORTANT: Make sure the template name in Airtable is EXACTLY "Annual"
    const templateRes = await fetch(`https://api.airtable.com/v0/${baseId}/checklist_templates`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const templateJson = await templateRes.json();
    
    // Safety check: Find the record where name is "Annual" manually
    const templateRec = templateJson.records?.find(r => r.fields.name === 'Annual');

    // 3. Fetch Existing Engineers
    const engRes = await fetch(`https://api.airtable.com/v0/${baseId}/engineers`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const engJson = await engRes.json();
    const engineerList = engJson.records?.map(rec => ({
      id: rec.id,
      name: rec.fields.engineer_name || "" 
    })) || [];

    return {
      props: {
        unit: { id: unitData.id, name: unitData.fields.unit_name },
        template: templateRec ? { 
          id: templateRec.id, 
          questions: JSON.parse(templateRec.fields.questions_json) 
        } : null,
        engineerList
      }
    };
  } catch (error) {
    console.error("Fetch Error:", error);
    return { props: { unit: null, template: null, engineerList: [] } };
  }
}