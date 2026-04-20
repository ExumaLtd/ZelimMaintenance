import { MaintenanceReportEmail } from '../../../emails/maintenance-report';
import { render } from 'react-email';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      engineerName = 'John Smith',
      serialNumber = 'SWI005',
      brandColor = '#172F36',
      logoUrl = 'https://maintenance.exuma.co.uk/logo/zelim-logo-dark.png'
    } = req.query as Record<string, string>;

    // Sample answers for preview
    const sampleAnswers = {
      'Is the unit free from visible damage?': 'Yes, unit appears in good condition',
      'Have all seals been inspected?': 'All seals inspected and intact',
      'Is the buoyancy chamber secure?': 'Secure, no issues detected',
      'Battery voltage reading': '12.6V - Within normal range',
      'Additional notes': 'Annual maintenance completed successfully. All systems operational.'
    };

    const html = await render(
      MaintenanceReportEmail({
        engineerName,
        serialNumber,
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
  } catch (error: any) {
    console.error('Preview error:', error);
    return res.status(500).send('<html><body><p>Preview unavailable.</p></body></html>');
  }
}