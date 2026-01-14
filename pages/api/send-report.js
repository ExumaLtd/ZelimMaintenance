import { Resend } from 'resend';
import { MaintenanceReportEmail } from '../../emails/maintenance-report';
import { TechnicalAlertEmail } from '../../emails/technical-alert';

// Cleans any quotation marks from your .env.local file automatically
const apiKey = process.env.RESEND_API_KEY?.replace(/['"]+/g, '');
const resend = new Resend(apiKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // 1. Extract variables FIRST
    const { 
      engineerEmail, 
      engineerName, 
      serialNumber, 
      answers, // Now: { "Question text": { text: "answer", images: ["url1", "url2"] } }
      reportType, 
      technicalData,
      companyLogoUrl 
    } = req.body;

    // 2. Define constants and brand colors
    const ZELIM_GREEN = "#172F36"; 
    const logoUrl = companyLogoUrl || "https://maintenance.exuma.co.uk/logo/zelim-logo-dark.png";

    // 3. Define displayType BEFORE it is used in preview URLs
    let displayType = reportType || 'Maintenance';
    if (!displayType.toLowerCase().includes('maintenance')) {
      displayType = `${displayType} Maintenance`;
    }

    // 4. NOW create preview URLs using the initialized variables
    const baseUrl = "https://maintenance.exuma.co.uk";
    const engineerPreviewUrl = `${baseUrl}/api/emails/preview-maintenance-report?engineerName=${encodeURIComponent(engineerName)}&serialNumber=${encodeURIComponent(serialNumber)}`;
    const internalPreviewUrl = `${baseUrl}/api/emails/preview-technical-alert?serialNumber=${encodeURIComponent(serialNumber)}&displayType=${encodeURIComponent(displayType)}`;

    // 5. Set the subject lines
    const engineerSubject = `${serialNumber} ${displayType} Confirmation`;
    const internalSubject = `${serialNumber} ${displayType} Submitted`;

    // 6. Send both emails in a single batch call
    const data = await resend.batch.send([
      {
        // EMAIL 1: The receipt for the Engineer
        from: 'Zelim Maintenance <maintenance@exuma.co.uk>',
        to: [engineerEmail],
        subject: engineerSubject,
        react: MaintenanceReportEmail({ 
          engineerName, 
          serialNumber, 
          answers, // Component will handle displaying images
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
          technicalData: {
            unit_record_id: technicalData?.unit_record_id,
            maintenance_company: technicalData?.maintenance_company || 'N/A',
            engineer_name: technicalData?.engineer_name || engineerName,
            location_display: technicalData?.location_display || 'N/A',
          },
          answers, // Component will handle displaying images
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