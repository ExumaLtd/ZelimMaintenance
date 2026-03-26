import Airtable from 'airtable';
import { esc } from '../utils/api-utils';

const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_ID);

// ============================================================================
// INDIVIDUAL FETCH FUNCTIONS
// ============================================================================

/**
 * Fetch unit data by public token
 * @param {string} publicToken - The public token from URL
 * @returns {Promise<Object|null>} Unit data or null if not found
 */
export async function fetchUnitByToken(publicToken: string) {
  try {
    const records = await base(process.env.AIRTABLE_SWIFT_TABLE)
      .select({
        maxRecords: 1,
        filterByFormula: `{public_token} = '${esc(publicToken)}'`,
        fields: [
          'serial_number',
          'operating_company',
          'public_token',
          'annual_maintenance_due',
          'depth_maintenance_due',
        ],
      })
      .firstPage();

    if (!records || records.length === 0) {
      return null;
    }

    const record = records[0];

    // operating_company is now a linked record field — resolve the name
    let companyName = '';
    const operatingCompanyIds = record.get('operating_company') as string[] | undefined;
    if (operatingCompanyIds && operatingCompanyIds.length > 0) {
      try {
        const companyRecord = await base('operating_companies').find(operatingCompanyIds[0]);
        companyName = (companyRecord.get('company_name') as string) || '';
      } catch (e: any) {
        console.warn('Could not resolve operating company name:', e.message);
      }
    }

    return {
      record_id: record.id,
      serial_number: (record.get('serial_number') as string) || 'Unit',
      company: companyName,
      operating_company_id: operatingCompanyIds?.[0] || null,
      public_token: (record.get('public_token') as string) || publicToken,
      annual_maintenance_due: (record.get('annual_maintenance_due') as string) || null,
      depth_maintenance_due: (record.get('depth_maintenance_due') as string) || null,
    };
  } catch (error) {
    console.error('Error fetching unit:', error);
    throw error;
  }
}

/**
 * Fetch checklist template by maintenance type
 * Returns the RAW parsed JSON - each form handles its own structure
 * @param {string} maintenanceType - Type of maintenance (e.g., 'Monthly', 'Annual')
 * @returns {Promise<Object|null>} Template data or null if not found
 */
export async function fetchTemplate(maintenanceType: string) {
  try {
    let templateName;
    
    // Map the maintenance type to the exact template_name in Airtable
    switch(maintenanceType) {
      case 'Annual':
        templateName = 'Annual maintenance';
        break;
      case 'Monthly':
        templateName = 'Monthly maintenance';
        break;
      case '30-month depth':
        templateName = '30-month depth maintenance';
        break;
      case 'Unscheduled':
        templateName = 'Unscheduled maintenance';
        break;
      case 'Fault report':
        templateName = 'Fault report';
        break;
      default:
        console.error(`Unknown maintenance type: ${maintenanceType}`);
        return null;
    }
    
    const records = await base('checklist_templates')
      .select({
        maxRecords: 1,
        filterByFormula: `{template_name} = '${esc(templateName)}'`,
      })
      .firstPage();

    if (!records || records.length === 0) {
      console.log('Template not found for:', templateName);
      return null;
    }

    const record = records[0];
    const questionsJson = record.get('questions_json') as string | undefined;
    const declarationText = (record.get('declaration_text') as string) || '';
    
    let parsedJson: any = {};
    try {
      if (questionsJson) {
        parsedJson = JSON.parse(questionsJson);
      }
    } catch (e) {
      console.error('Failed to parse questions_json:', e);
      return null;
    }

    // Return the template with the RAW parsed JSON
    // Each form will extract what it needs from this
    return {
      id: record.id,
      type: maintenanceType,
      // Return BOTH the structured data AND the original format
      questionsData: Array.isArray(parsedJson) ? parsedJson : (parsedJson.questions || []),
      questions: Array.isArray(parsedJson) ? parsedJson.map(q => q.title) : (parsedJson.questions?.map(q => q.title) || []),
      // CRITICAL: Also return the raw parsed JSON so forms can access equipment_checklist, maintenance_checklist, etc.
      rawData: parsedJson,
      // Declaration text from Airtable
      declarationText,
    };
  } catch (error) {
    console.error('Error fetching template:', error);
    throw error;
  }
}

// ============================================================================
// MAIN FETCH FUNCTION (USE THIS IN YOUR FORMS)
// ============================================================================

/**
 * Fetch all data needed for a maintenance form in parallel
 * OPTIMIZED: Fetches company data once and shares it between engineers and companies list
 * 
 * @param {string} publicToken - The public token from URL
 * @param {string} maintenanceType - Type of maintenance ('Monthly', 'Annual', etc.)
 * @returns {Promise<Object>} All form data or { notFound: true }
 * 
 * @example
 * // In your form's getServerSideProps:
 * const data = await fetchFormData(context.params.id, 'Monthly');
 * if (data.notFound) return { redirect: { destination: '/', permanent: false } };
 * return { props: { 
 *   unit: data.unit,
 *   template: data.template,
 *   allCompanies: data.companies,
 *   allEngineers: data.engineers,
 * }};
 */
export async function fetchFormData(publicToken: string, maintenanceType: string) {
  try {
    // ✅ OPTIMIZATION: Fetch all raw data in parallel (no dependencies between calls)
    const [unit, template, companyRecords, engineerRecords, operatorRecords] = await Promise.all([
      fetchUnitByToken(publicToken),
      fetchTemplate(maintenanceType),
      base('maintenance_companies').select({
        fields: ['company_name'],
        sort: [{ field: 'company_name', direction: 'asc' }],
      }).all(),
      base('engineers').select({
        fields: ['engineer_name', 'email', 'phone', 'maintenance_company'],
        sort: [{ field: 'engineer_name', direction: 'asc' }],
      }).all(),
      base('operators').select({
        fields: ['operator_name', 'email', 'phone', 'operating_company'],
        sort: [{ field: 'operator_name', direction: 'asc' }],
      }).all(),
    ]);

    // ✅ Build company lookup (fast - in-memory operation)
    const companyLookup: Record<string, any> = {};
    companyRecords.forEach(r => {
      if (r.fields.company_name) {
        companyLookup[r.id] = r.fields.company_name;
      }
    });

    // ✅ Process companies list
    const companies = companyRecords
      .map(r => r.get('company_name') as string)
      .filter(Boolean);

    // ✅ Process engineers with company lookup
    const engineers = engineerRecords.map(r => {
      const companyIds = r.get('maintenance_company') as string[] | undefined;
      return {
        id: r.id,
        name: r.get('engineer_name') as string,
        email: (r.get('email') as string) || '',
        phone: (r.get('phone') as string) || '',
        companyName: companyIds?.[0] ? companyLookup[companyIds[0]] : '',
      };
    }).filter(e => e.name);

    // ✅ Process operators — each carries their operating_company record ID for client-side filtering
    const operators = operatorRecords.map(r => {
      const opCompanyIds = r.get('operating_company') as string[] | undefined;
      return {
        id: r.id,
        name: r.get('operator_name') as string,
        email: (r.get('email') as string) || '',
        phone: (r.get('phone') as string) || '',
        operating_company_id: opCompanyIds?.[0] || '',
      };
    }).filter(o => o.name);

    // If unit not found, return notFound flag
    if (!unit) {
      return { notFound: true };
    }

    // If template not found, log warning but continue
    if (!template) {
      console.warn(`⚠️ No template found for ${maintenanceType}`);
    }

    return {
      unit,
      template,
      companies,
      engineers,
      operators,
    };
  } catch (error) {
    console.error('❌ Error fetching form data:', error);
    throw error;
  }
}