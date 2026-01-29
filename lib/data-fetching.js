// lib/data-fetching.js
// Shared data fetching functions for all maintenance forms
// WITH PARALLELIZATION (4x faster) but NO CACHING (always fresh data)

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
 * Uses the EXACT same logic as the original forms
 * @param {string} maintenanceType - Type of maintenance (e.g., 'Monthly', 'Annual')
 * @returns {Promise<Object|null>} Template data or null if not found
 */
export async function fetchTemplate(maintenanceType) {
  try {
    let formula;
    
    // Use the EXACT formulas from the original forms
    switch(maintenanceType) {
      case 'Annual':
        formula = `{type}='Annual'`;
        break;
      case 'Monthly':
        formula = `{template_name}='Monthly maintenance'`;
        break;
      case '30-month depth':
        formula = `FIND('depth', LOWER({type})) > 0`;
        break;
      case 'Unscheduled':
        formula = `{template_name}='Unscheduled maintenance'`;
        break;
      case 'Fault report':
        formula = `{template_name}='Fault report'`;
        break;
      default:
        console.error(`Unknown maintenance type: ${maintenanceType}`);
        return null;
    }
    
    const records = await base('checklist_templates')
      .select({
        maxRecords: 1,
        filterByFormula: formula,
      })
      .firstPage();

    if (!records || records.length === 0) {
      console.log('Template not found for:', maintenanceType);
      return null;
    }

    const record = records[0];
    const questionsJson = record.get('questions_json');
    
    let parsedJson = {};
    try {
      if (questionsJson) {
        parsedJson = JSON.parse(questionsJson);
      }
    } catch (e) {
      console.error('Failed to parse questions_json:', e);
    }

    return {
      id: record.id,
      type: record.get('type') || maintenanceType,
      questionsData: Array.isArray(parsedJson) ? parsedJson : (parsedJson.questions || []),
      questions: Array.isArray(parsedJson) ? parsedJson.map(q => q.title) : (parsedJson.questions?.map(q => q.title) || []),
    };
  } catch (error) {
    console.error('Error fetching template:', error);
    throw error;
  }
}

/**
 * Fetch all maintenance companies (NO CACHING - always fresh)
 * @returns {Promise<Array<string>>} List of company names
 */
export async function fetchCompanies() {
  try {
    console.log('🔄 Fetching companies from Airtable');
    const records = await base('maintenance_companies')
      .select({
        fields: ['company_name'],
        sort: [{ field: 'company_name', direction: 'asc' }],
      })
      .all();

    const companies = records.map(r => r.get('company_name')).filter(Boolean);
    console.log(`✅ Fetched ${companies.length} companies`);
    return companies;
  } catch (error) {
    console.error('Error fetching companies:', error);
    throw error;
  }
}

/**
 * Fetch all engineers (NO CACHING - always fresh)
 * @returns {Promise<Array<Object>>} List of engineer objects with name, email, phone, company
 */
export async function fetchEngineers() {
  try {
    console.log('🔄 Fetching engineers from Airtable');
    const records = await base('engineers')
      .select({
        fields: ['engineer_name', 'email', 'phone', 'company'],
        sort: [{ field: 'engineer_name', direction: 'asc' }],
      })
      .all();

    // Need to get company names from IDs
    const companyRecords = await base('maintenance_companies')
      .select({
        fields: ['company_name'],
      })
      .all();

    const companyLookup = {};
    companyRecords.forEach(r => {
      if (r.fields.company_name) {
        companyLookup[r.id] = r.fields.company_name;
      }
    });

    const engineers = records.map(r => ({
      name: r.get('engineer_name'),
      email: r.get('email') || '',
      phone: r.get('phone') || '',
      companyName: r.get('company') && r.get('company')[0] ? companyLookup[r.get('company')[0]] : '',
    })).filter(e => e.name);

    console.log(`✅ Fetched ${engineers.length} engineers`);
    return engineers;
  } catch (error) {
    console.error('Error fetching engineers:', error);
    throw error;
  }
}

// ============================================================================
// MAIN FETCH FUNCTION (USE THIS IN YOUR FORMS)
// ============================================================================

/**
 * Fetch all data needed for a maintenance form in parallel
 * This is the main function you should use in getServerSideProps
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

    // Fetch all data in parallel (4x faster than sequential!)
    const [unit, template, companies, engineers] = await Promise.all([
      fetchUnitByToken(publicToken),
      fetchTemplate(maintenanceType),
      fetchCompanies(),
      fetchEngineers(),
    ]);

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