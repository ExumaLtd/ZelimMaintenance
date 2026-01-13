import { Resend } from 'resend';
import { MaintenanceReportEmail } from '../../emails/maintenance-report';
import { TechnicalAlertEmail } from '../../emails/technical-alert';

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
      technicalData,
      companyLogoUrl  // NEW: Company/client logo URL
    } = req.body;

    // BRANDING CONSTANTS
    // Zelim Green: #172F36 (Applied to top accent line and buttons)
    const ZELIM_GREEN = "#172F36"; 
    
    // Company logo URL - this will be the client's logo (e.g., Changi Airport, Milford Haven, etc.)
    // Example: /client_logos/changi_airport/ChangiAirport_Logo.png
    const logoUrl = companyLogoUrl || "https://maintenance.exuma.co.uk/logo/zelim-logo-dark.png";

    // Generate preview URLs for "View in browser" links
    const baseUrl = "https://maintenance.exuma.co.uk";
    const engineerPreviewUrl = `${baseUrl}/api/emails/preview-maintenance-report?engineerName=${encodeURIComponent(engineerName)}&serialNumber=${encodeURIComponent(serialNumber)}`;
    const internalPreviewUrl = `${baseUrl}/api/emails/preview-technical-alert?serialNumber=${encodeURIComponent(serialNumber)}&displayType=${encodeURIComponent(displayType)}`;

    // Logic to ensure the subject line is professional and descriptive
    let displayType = reportType || 'Maintenance';
    if (!displayType.toLowerCase().includes('maintenance')) {
      displayType = `${displayType} Maintenance`;
    }

    const engineerSubject = `${serialNumber} ${displayType} Confirmation`;
    const internalSubject = `${serialNumber} ${displayType} Submitted`;

    // Send both emails in a single batch call using React templates for both
    const data = await resend.batch.send([
      {
        // EMAIL 1: The receipt for the Engineer
        from: 'Zelim Maintenance <maintenance@exuma.co.uk>',
        to: [engineerEmail],
        subject: engineerSubject,
        react: MaintenanceReportEmail({ 
          engineerName, 
          serialNumber, 
          answers,
          brandColor: ZELIM_GREEN,
          logoUrl: logoUrl,
          previewUrl: engineerPreviewUrl
        }),
      },
      {
        // EMAIL 2: The Internal Technical Alert for the Zelim Team
        from: 'Zelim Maintenance Submission <maintenance@exuma.co.uk>',
        to: ['maintenance@exuma.co.uk'], 
        subject: internalSubject,
        react: TechnicalAlertEmail({ 
          serialNumber, 
          displayType, 
          technicalData, 
          answers,
          brandColor: ZELIM_GREEN,
          logoUrl: logoUrl,
          previewUrl: internalPreviewUrl
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