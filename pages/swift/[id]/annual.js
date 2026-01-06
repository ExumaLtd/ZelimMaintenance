import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AnnualMaintenance({ unit, template, engineerList }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If the data is still loading or missing, show a loading state instead of crashing
  if (!unit || !template) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
        <h2>Loading Maintenance Checklist...</h2>
        <p>If this takes more than 5 seconds, please check your Airtable connection.</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.target);
    const answers = {};
    
    template.questions.forEach((q, index) => {
      answers[index] = formData.get(`q-${index}`);
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
        <title>Annual Maintenance - {unit.name}</title>
      </Head>

      <header className="checklist-header">
        <h1>Annual Maintenance</h1>
        <p className="unit-badge">{unit.name}</p>
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
            placeholder="Search or type new..." 
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
          {template.questions.map((q, index) => (
            <div key={index} className="question-card">
              <p className="question-text">{q}</p>
              <div className="radio-group">
                <label><input type="radio" name={`q-${index}`} value="Pass" required /> Pass</label>
                <label><input type="radio" name={`q-${index}`} value="Fail" /> Fail</label>
                <label><input type="radio" name={`q-${index}`} value="N/A" /> N/A</label>
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
    // 1. Fetch Unit - Using optional chaining to prevent crash
    const unitRes = await fetch(`https://api.airtable.com/v0/${baseId}/swift_units/${id}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const unitData = await unitRes.json();

    // 2. Fetch Template (Filtering for Annual type)
    const templateRes = await fetch(`https://api.airtable.com/v0/${baseId}/checklist_templates?filterByFormula={type}='Annual'`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const templateJson = await templateRes.json();
    const templateRec = templateJson.records?.[0];

    // 3. Fetch Engineers
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
        unit: unitData.fields ? { id: unitData.id, name: unitData.fields.unit_name } : null,
        template: templateRec ? { 
          id: templateRec.id, 
          questions: JSON.parse(templateRec.fields.questions_json) 
        } : null,
        engineerList
      }
    };
  } catch (error) {
    console.error("Critical Fetch Error:", error);
    return { props: { unit: null, template: null, engineerList: [] } };
  }
}