import { Resend } from 'resend';
import { MaintenanceReportEmail } from '../../emails/MaintenanceReport';

// Cleans any quotation marks from your .env.local file automatically
const apiKey = process.env.RESEND_API_KEY?.replace(/['"]+/g, '');
const resend = new Resend(apiKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // Extracting the data from the request body
    const { engineerEmail, engineerName, serialNumber, answers, reportType } = req.body;

    // Logic to ensure the subject line is professional and descriptive
    // This handles cases for "Annual", "Depth", and "Unscheduled"
    let displayType = reportType || 'Maintenance';
    
    // If the frontend just sends "Annual", we append " Maintenance" for the subject
    if (!displayType.toLowerCase().includes('maintenance')) {
      displayType = `${displayType} Maintenance`;
    }

    const dynamicSubject = `${serialNumber} ${displayType} Confirmation`;

    const data = await resend.emails.send({
      // This MUST match the domain you just verified in the Resend Dashboard
      from: 'Zelim Maintenance <maintenance@exuma.co.uk>',
      to: [engineerEmail],
      cc: ['maintenance@exuma.co.uk'],
      subject: dynamicSubject,
      react: MaintenanceReportEmail({ engineerName, serialNumber, answers }),
    });

    // Success log for the VS Code terminal
    console.log("RESEND SUCCESS:", data);
    return res.status(200).json(data);

  } catch (error) {
    // Detailed error logging for troubleshooting
    console.error("--- RESEND ERROR ---");
    console.error(error.message);
    console.error("--- END ERROR ---");
    
    return res.status(500).json({ error: error.message });
  }
}