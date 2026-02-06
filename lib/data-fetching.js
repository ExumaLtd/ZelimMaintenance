import Airtable from 'airtable';

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
export async function fetchUnitByToken(publicToken) {
  try {
    const records = await base(process.env.AIRTABLE_SWIFT_TABLE)
      .select({
        maxRecords: 1,
        filterByFormula: `{public_token} = "${publicToken}"`,
        fields: [
          'serial_number',
          'company',
          'public_token',
          'annual_maintenance_due',
          'depth_maintenance_due',
        ],
      })
      .firstPage();

    if (!records || records.length === 0) {
      console.log('Unit not found for token:', publicToken);
      return null;
    }

    const record = records[0];
    return {
      record_id: record.id,
      serial_number: record.get('serial_number') || 'Unit',
      company: record.get('company') || '',
      public_token: record.get('public_token') || publicToken,
      annual_maintenance_due: record.get('annual_maintenance_due') || null,
      depth_maintenance_due: record.get('depth_maintenance_due') || null,
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
export async function fetchTemplate(maintenanceType) {
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
    
    console.log(`Looking for template: ${templateName}`);
    
    const records = await base('checklist_templates')
      .select({
        maxRecords: 1,
        filterByFormula: `{template_name} = "${templateName}"`,
      })
      .firstPage();

    if (!records || records.length === 0) {
      console.log('Template not found for:', templateName);
      return null;
    }

    const record = records[0];
    const questionsJson = record.get('questions_json');
    const declarationText = record.get('declaration_text') || '';
    
    let parsedJson = {};
    try {
      if (questionsJson) {
        parsedJson = JSON.parse(questionsJson);
      }
    } catch (e) {
      console.error('Failed to parse questions_json:', e);
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
export async function fetchFormData(publicToken, maintenanceType) {
  try {
    console.log('=== FETCHING FORM DATA ===');
    console.log('Token:', publicToken);
    console.log('Type:', maintenanceType);
    
    const startTime = Date.now();

    // ✅ OPTIMIZATION: Fetch all raw data in parallel (no dependencies between calls)
    console.log('🔄 Fetching unit, template, companies, and engineers in parallel...');
    const [unit, template, companyRecords, engineerRecords] = await Promise.all([
      fetchUnitByToken(publicToken),
      fetchTemplate(maintenanceType),
      base('maintenance_companies').select({
        fields: ['company_name'],
        sort: [{ field: 'company_name', direction: 'asc' }],
      }).all(),
      base('engineers').select({
        fields: ['engineer_name', 'email', 'phone', 'company'],
        sort: [{ field: 'engineer_name', direction: 'asc' }],
      }).all(),
    ]);

    // ✅ Build company lookup (fast - in-memory operation)
    const companyLookup = {};
    companyRecords.forEach(r => {
      if (r.fields.company_name) {
        companyLookup[r.id] = r.fields.company_name;
      }
    });

    // ✅ Process companies list
    const companies = companyRecords
      .map(r => r.get('company_name'))
      .filter(Boolean);
    
    console.log(`✅ Fetched ${companies.length} companies`);

    // ✅ Process engineers with company lookup
    const engineers = engineerRecords.map(r => ({
      name: r.get('engineer_name'),
      email: r.get('email') || '',
      phone: r.get('phone') || '',
      companyName: r.get('company')?.[0] ? companyLookup[r.get('company')[0]] : '',
    })).filter(e => e.name);
    
    console.log(`✅ Fetched ${engineers.length} engineers`);

    const duration = Date.now() - startTime;
    console.log(`✅ All data fetched in ${duration}ms`);

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
    };
  } catch (error) {
    console.error('❌ Error fetching form data:', error);
    throw error;
  }
}