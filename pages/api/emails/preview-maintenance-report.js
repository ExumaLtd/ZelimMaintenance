import { MaintenanceReportEmail } from '../../../emails/maintenance-report';

export default async function handler(req, res) {
  const { 
    engineerName = 'John Smith',
    serialNumber = 'SWI005',
    brandColor = '#172F36',
    logoUrl = 'https://maintenance.exuma.co.uk/logo/zelim-logo-dark.png'
  } = req.query;

  // Sample answers for preview
  const sampleAnswers = {
    'Is the unit free from visible damage?': 'Yes, unit appears in good condition',
    'Have all seals been inspected?': 'All seals inspected and intact',
    'Is the buoyancy chamber secure?': 'Secure, no issues detected',
    'Battery voltage reading': '12.6V - Within normal range',
    'Additional notes': 'Annual maintenance completed successfully. All systems operational.'
  };

  try {
    // Import render function
    const { render } = await import('@react-email/render');
    
    const html = render(
      MaintenanceReportEmail({
        engineerName,
        serialNumber,
        answers: sampleAnswers,
        brandColor,
        logoUrl
      })
    );

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message });
  }
}