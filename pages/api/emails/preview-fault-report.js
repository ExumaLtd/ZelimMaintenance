import { TechnicalAlertEmail } from '../../../emails/technical-alert';
import { render } from '@react-email/render';

export default async function handler(req, res) {
  try {
    const { 
      serialNumber = 'SWI005',
      displayType = 'Fault Report',
      brandColor = '#172F36',
      logoUrl = 'https://maintenance.exuma.co.uk/logo/zelim-logo-dark.png'
    } = req.query;

    // Sample technical data and answers for preview
    const sampleTechnicalData = {
      unit_record_id: 'rec75U8ecJM2ZpRSs',
      checklist_template_id: 'recABC123XYZ',
      engineer_phone: '+44 7700 900123',
      location_country: 'United Kingdom'
    };

    const sampleAnswers = {
      'Fault description': 'Visible damage to exterior casing on the port side near the buoyancy chamber. Approximately 15cm crack noticed during routine inspection. No water ingress detected at this time.',
      'Date fault noticed': '28th January 2026',
      'Severity assessment': 'Medium - Requires attention but unit remains operational',
      'Recommended action': 'Schedule repair within next maintenance window. Monitor for any water ingress or structural degradation.',
      'Additional notes': 'Photos attached showing extent of damage. Unit remains in service pending repair schedule.'
    };

    const html = render(
      TechnicalAlertEmail({
        serialNumber,
        displayType,
        technicalData: sampleTechnicalData,
        answers: sampleAnswers,
        brandColor,
        logoUrl,
        previewUrl: null
      }),
      {
        pretty: true
      }
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Preview error:', error);
    return res.status(500).send(`
      <html>
        <body>
          <h1>Preview Error</h1>
          <pre>${error.message}</pre>
          <pre>${error.stack}</pre>
        </body>
      </html>
    `);
  }
}