import { Resend } from 'resend';
import { MaintenanceReportEmail } from '../../emails/maintenance-report';
import { TechnicalAlertEmail } from '../../emails/technical-alert';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 10 email sends per hour per IP
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'rl:email',
});

// Cleans any quotation marks from your .env.local file automatically
const apiKey = process.env.RESEND_API_KEY?.replace(/['"]+/g, '');
const resend = new Resend(apiKey);

// Helper function to add spaces to camelCase strings
const addSpacesToCamelCase = (str) => {
  return str.replace(/([A-Z])/g, ' $1').trim();
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  if (!success) return res.status(429).json({ error: 'Too many requests. Please try again later.' });

  try {
    // 1. Extract variables FIRST
    const { 
      engineerEmail, 
      engineerName, 
      serialNumber, 
      company,
      answers,
      equipment_checklist,
      maintenance_checklist,
      reportType, 
      technicalData,
      companyLogoUrl,
      recordRef
    } = req.body;

    // Helper function to find company name from various possible sources
    const getCompanyName = () => {
      const getValue = (val) => {
        if (!val) return null;
        if (typeof val === 'string') return val;
        if (Array.isArray(val) && val.length > 0) return val[0];
        return null;
      };

      return getValue(company) ||
             getValue(technicalData?.company) ||
             getValue(technicalData?.company_name) ||
             getValue(technicalData?.companyName) ||
             getValue(technicalData?.unit?.company) ||
             'N/A';
    };

    const companyName = getCompanyName();

    // 2. Define constants and brand colors
    const ZELIM_GREEN = "#172F36";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://maintenance.exuma.co.uk';
    const logoUrl = companyLogoUrl || `${baseUrl}/logo/zelim-logo-dark.png`;
    const zelimLogoUrl = `${baseUrl}/logo/zelim-logo-dark.png`;

    // 3. Define displayType BEFORE it is used in preview URLs
    let displayType = reportType || 'Maintenance';

    // Add spaces to camelCase (e.g., "FaultReporting" → "Fault Reporting")
    displayType = addSpacesToCamelCase(displayType);

    // Add "Maintenance" suffix if not present (except for "Fault Reporting")
    if (!displayType.toLowerCase().includes('maintenance') && !displayType.toLowerCase().includes('fault')) {
      displayType = `${displayType} Maintenance`;
    }

    // 4. NOW create preview URLs using the initialized variables
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
          maintenanceCompany: technicalData?.maintenance_company || 'N/A',
          companyName: companyName,
          location: technicalData?.location_display || 'N/A',
          answers,
          equipmentChecklist: equipment_checklist,
          maintenanceChecklist: maintenance_checklist,
          brandColor: ZELIM_GREEN,
          logoUrl: logoUrl,
          zelimLogoUrl: zelimLogoUrl,
          previewUrl: engineerPreviewUrl,
          recordRef: recordRef || null
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
            company_name: companyName,
            maintenance_company: technicalData?.maintenance_company || 'N/A',
            engineer_name: technicalData?.engineer_name || engineerName,
            location_display: technicalData?.location_display || 'N/A',
          },
          answers,
          equipmentChecklist: equipment_checklist,
          maintenanceChecklist: maintenance_checklist,
          brandColor: ZELIM_GREEN,
          logoUrl: logoUrl,
          zelimLogoUrl: zelimLogoUrl,
          previewUrl: internalPreviewUrl,
          recordRef: recordRef || null
        }),
      }
    ]);

    return res.status(200).json(data);

  } catch (error) {
    // Detailed error logging for troubleshooting
    console.error("--- RESEND BATCH ERROR ---");
    console.error(error.message);
    console.error("--- END ERROR ---");
    
    return res.status(500).json({ error: error.message });
  }
}