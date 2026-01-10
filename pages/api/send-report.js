import { Resend } from 'resend';
import { MaintenanceReportEmail } from '../../emails/MaintenanceReport';

// Cleans any quotation marks from your .env.local file automatically
const apiKey = process.env.RESEND_API_KEY?.replace(/['"]+/g, '');
const resend = new Resend(apiKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { engineerEmail, engineerName, serialNumber, answers } = req.body;

    const data = await resend.emails.send({
      // This MUST match the domain you just verified in the Resend Dashboard
      from: 'Zelim Maintenance <maintenance@exuma.co.uk>',
      to: [engineerEmail],
      cc: ['maintenance@exuma.co.uk'],
      subject: `Maintenance Report: Unit ${serialNumber}`,
      react: MaintenanceReportEmail({ engineerName, serialNumber, answers }),
    });

    // This helps us see the success message in the VS Code terminal
    console.log("RESEND SUCCESS:", data);
    return res.status(200).json(data);

  } catch (error) {
    // If it fails, this will print the EXACT reason (e.g., "Domain not verified")
    console.error("--- RESEND ERROR ---");
    console.error(error.message);
    console.error("--- END ERROR ---");
    
    return res.status(500).json({ error: error.message });
  }
}