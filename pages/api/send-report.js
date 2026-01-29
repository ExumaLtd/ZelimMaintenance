import { Resend } from 'resend';
import { MaintenanceReportEmail } from '../../emails/maintenance-report';
import { TechnicalAlertEmail } from '../../emails/technical-alert';

// Cleans any quotation marks from your .env.local file automatically
const apiKey = process.env.RESEND_API_KEY?.replace(/['"]+/g, '');
const resend = new Resend(apiKey);

// Helper function to add spaces to camelCase strings
const addSpacesToCamelCase = (str) => {
  return str.replace(/([A-Z])/g, ' $1').trim();
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // 1. Extract variables FIRST
    const { 
      engineerEmail, 
      engineerName, 
      serialNumber, 
      answers, // Now: { "Question text": { text: "answer", images: ["url1", "url2"] } }
      equipment_checklist, // Depth maintenance: [{ name, returned, condition, images }]
      maintenance_checklist, // Monthly maintenance: [{ id, title, questions: [{ text, answer }] }]
      reportType, 
      technicalData,
      companyLogoUrl 
    } = req.body;

    // 2. Define constants and brand colors
    const ZELIM_GREEN = "#172F36"; 
    const logoUrl = companyLogoUrl || "https://maintenance.exuma.co.uk/logo/zelim-logo-dark.png";

    // 3. Define displayType BEFORE it is used in preview URLs
    let displayType = reportType || 'Maintenance';
    
    // Add spaces to camelCase (e.g., "FaultReporting" → "Fault Reporting")
    displayType = addSpacesToCamelCase(displayType);
    
    // Add "Maintenance" suffix if not present (except for "Fault Reporting")
    if (!displayType.toLowerCase().includes('maintenance') && !displayType.toLowerCase().includes('fault')) {
      displayType = `${displayType} Maintenance`;
    }

    // 4. NOW create preview URLs using the initialized variables
    const baseUrl = "https://maintenance.exuma.co.uk";
    const engineerPreviewUrl = `${baseUrl}/api/emails/preview-maintenance-report?engineerName=${encodeURIComponent(engineerName)}&serialNumber=${encodeURIComponent(serialNumber)}`;
    const internalPreviewUrl = `${baseUrl}/api/emails/preview-technical-alert?serialNumber=${encodeURIComponent(serialNumber)}&displayType=${encodeURIComponent(displayType)}`;

    // 5. Set sender name and subject line
    const senderName = displayType.toLowerCase().includes('fault') 
      ? `Zelim Fault Submission`
      : `Zelim Maintenance Submission`;
    
    // Determine emoji based on maintenance type
    let emojiIcon = '📋'; // Default for Monthly/Annual
    if (displayType.toLowerCase().includes('depth')) {
      emojiIcon = '🔧';
    } else if (displayType.toLowerCase().includes('unscheduled')) {
      emojiIcon = '⚠️';
    } else if (displayType.toLowerCase().includes('fault')) {
      emojiIcon = '🚨';
    }
    
    // Subject includes type, emoji, and serial number
    const emailSubject = `${displayType} ${emojiIcon} ${serialNumber}`;

    // 6. Send both emails in a single batch call
    const data = await resend.batch.send([
      {
        // EMAIL 1: The receipt for the Engineer
        from: `${senderName} <maintenance@exuma.co.uk>`,
        to: [engineerEmail],
        subject: emailSubject,
        react: MaintenanceReportEmail({ 
          engineerName, 
          serialNumber,
          reportType: displayType,
          answers,
          equipmentChecklist: equipment_checklist, // Depth maintenance (returned/condition)
          maintenanceChecklist: maintenance_checklist, // Monthly maintenance (yes/no questions)
          brandColor: ZELIM_GREEN,
          logoUrl: logoUrl,
          previewUrl: engineerPreviewUrl
        }),
      },
      {
        // EMAIL 2: The Internal Technical Alert for the Zelim Team
        from: `${senderName} <maintenance@exuma.co.uk>`,
        to: ['maintenance@exuma.co.uk'], 
        subject: emailSubject,
        react: TechnicalAlertEmail({ 
          serialNumber, 
          displayType, 
          technicalData: {
            unit_record_id: technicalData?.unit_record_id,
            maintenance_company: technicalData?.maintenance_company || 'N/A',
            engineer_name: technicalData?.engineer_name || engineerName,
            location_display: technicalData?.location_display || 'N/A',
          },
          answers,
          equipmentChecklist: equipment_checklist, // Depth maintenance (returned/condition)
          maintenanceChecklist: maintenance_checklist, // Monthly maintenance (yes/no questions)
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