import { Resend } from 'resend';
import { MaintenanceReportEmail } from '../../emails/MaintenanceReport';
import { TechnicalAlertEmail } from '../../emails/TechnicalAlert';

// Cleans any quotation marks from your .env.local file automatically
const apiKey = process.env.RESEND_API_KEY?.replace(/['"]+/g, '');
const resend = new Resend(apiKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // Extracting the data from the request body
    const { 
      engineerEmail, 
      engineerName, 
      serialNumber, 
      answers, 
      reportType, 
      technicalData 
    } = req.body;

    // Logic to ensure the subject line is professional and descriptive
    let displayType = reportType || 'Maintenance';
    if (!displayType.toLowerCase().includes('maintenance')) {
      displayType = `${displayType} Maintenance`;
    }

    const engineerSubject = `${serialNumber} ${displayType} Confirmation`;
    const internalSubject = `TECHNICAL ALERT: ${serialNumber} - ${displayType}`;

    // Send both emails in a single batch call using React templates for both
    const data = await resend.batch.send([
      {
        // EMAIL 1: The receipt for the Engineer
        from: 'Zelim Maintenance <maintenance@exuma.co.uk>',
        to: [engineerEmail],
        subject: engineerSubject,
        react: MaintenanceReportEmail({ engineerName, serialNumber, answers }),
      },
      {
        // EMAIL 2: The Internal Technical Alert for the Zelim Team
        // Updated display name to "Zelim Maintenance Submission"
        from: 'Zelim Maintenance Submission <maintenance@exuma.co.uk>',
        to: ['maintenance@exuma.co.uk'], 
        subject: internalSubject,
        react: TechnicalAlertEmail({ 
          serialNumber, 
          displayType, 
          technicalData, 
          answers 
        }),
      }
    ]);

    // Success log for the terminal
    console.log("RESEND BATCH SUCCESS:", data);
    return res.status(200).json(data);

  } catch (error) {
    // Detailed error logging for troubleshooting
    console.error("--- RESEND BATCH ERROR ---");
    console.error(error.message);
    console.error("--- END ERROR ---");
    
    return res.status(500).json({ error: error.message });
  }
}