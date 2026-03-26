import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '../../lib/session';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { esc, getClientIp } from '../../utils/api-utils';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 20 submissions per hour per IP
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 h'),
  prefix: 'rl:submit',
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

// Generate a human-readable record reference
// Format: RI/SWI005/A/060226/1
// Uses Redis INCR for an atomic daily counter — no race condition under concurrent submissions.
async function generateRecordRef(serialNumber, maintenanceType) {
  const typeMap = {
    'Monthly': 'M',
    'Annual': 'A',
    '30-month depth': 'D',
    'Unscheduled': 'U',
    'Fault report': 'F',
    'Fault Reporting': 'F',
    'FaultReporting': 'F',
  };

  const typeCode = typeMap[maintenanceType] || 'X';

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const dateCode = `${dd}${mm}${yy}`;

  try {
    // Atomic increment — concurrent submissions always get unique counters
    const key = `ref:${serialNumber}:${typeCode}:${dateCode}`;
    const count = await redis.incr(key);
    await redis.expire(key, 86400); // Expire after 24h
    return `RI/${serialNumber}/${typeCode}/${dateCode}/${count}`;
  } catch (error) {
    // Redis unavailable — fall back to a millisecond timestamp suffix so the
    // ref is still unique, just less readable. Submission should not be lost.
    console.warn('Redis counter unavailable, using timestamp fallback:', error.message);
    return `RI/${serialNumber}/${typeCode}/${dateCode}/${Date.now()}`;
  }
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req);
  const { success } = await ratelimit.limit(ip);
  if (!success) return res.status(429).json({ error: 'Too many requests. Please try again later.' });

  // Get session to extract PIN
  const session = getSession(req);
  if (!session || !session.pin) {
    return res.status(401).json({ error: 'No valid session found' });
  }

  const accessPin = session.pin;
  const isOperator = session.access === 'operator';
  const userType = isOperator ? 'Operator' : 'Engineer';

  const {
    unit_record_id,
    maintained_by,
    engineer_name,
    engineer_record_id,
    engineer_email,
    engineer_phone,
    operator_record_id,
    operator_name,
    operator_email,
    operator_phone,
    operating_company_id,
    date_of_maintenance,
    maintenance_type,
    location_display,
    location_town,
    location_country,
    answers,
    maintenance_checklist,
    serial_number,
    checklist_template_id,
    declaration_text,
    signature,
  } = req.body;

  if (!unit_record_id || !date_of_maintenance || !maintenance_type || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Missing or invalid required fields' });
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  // Verify this unit belongs to the session's token — prevents IDOR
  const unitVerifyRes = await fetch(
    `https://api.airtable.com/v0/${baseId}/swift_units/${encodeURIComponent(unit_record_id)}?fields[]=public_token`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  if (!unitVerifyRes.ok) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const unitVerifyData = await unitVerifyRes.json();
  if (unitVerifyData.fields?.public_token !== session.token) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // Generate record reference
    const recordRef = await generateRecordRef(serial_number, maintenance_type);

    let companyRecordId = null;
    let engineerRecordId = null;
    let operatorRecordId = null;

    if (isOperator) {
      if (operator_record_id) {
        // Existing operator selected from dropdown
        operatorRecordId = operator_record_id;
      } else if (operator_name) {
        // New operator typed manually — look up or create
        const opRes = await fetch(
          `https://api.airtable.com/v0/${baseId}/operators?filterByFormula=${encodeURIComponent(`{operator_name}='${esc(operator_name)}'`)}&maxRecords=1`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        if (!opRes.ok) throw new Error(`Operator lookup failed: ${opRes.status}`);
        const opData = await opRes.json();

        const operatorFields = {
          "operator_name": operator_name,
          "email": operator_email,
          "phone": operator_phone,
          "operating_company": operating_company_id ? [operating_company_id] : [],
        };

        if (opData?.records?.length > 0) {
          // Operator exists — reuse, update if details changed
          operatorRecordId = opData.records[0].id;
          const existing = opData.records[0].fields;
          const needsUpdate = existing.email !== operator_email || existing.phone !== operator_phone;
          if (needsUpdate) {
            await fetch(`https://api.airtable.com/v0/${baseId}/operators/${operatorRecordId}`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ fields: operatorFields }),
            });
          }
        } else {
          // Create new operator record
          const newOp = await fetch(`https://api.airtable.com/v0/${baseId}/operators`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: operatorFields }),
          });
          if (!newOp.ok) throw new Error(`Operator create failed: ${newOp.status}`);
          const newOpData = await newOp.json();
          operatorRecordId = newOpData.id;
        }
      }
    } else {
      // Engineer path — resolve maintenance company and engineer record
      const [compRes, engRes] = await Promise.all([
        fetch(`https://api.airtable.com/v0/${baseId}/maintenance_companies?filterByFormula=${encodeURIComponent(`{company_name}='${esc(maintained_by)}'`)}&maxRecords=1`, {
          headers: { Authorization: `Bearer ${apiKey}` }
        }),
        engineer_record_id
          ? Promise.resolve(null)
          : fetch(`https://api.airtable.com/v0/${baseId}/engineers?filterByFormula=${encodeURIComponent(`{engineer_name}='${esc(engineer_name)}'`)}&maxRecords=1`, {
              headers: { Authorization: `Bearer ${apiKey}` }
            })
      ]);

      if (!compRes.ok) throw new Error(`Company lookup failed: ${compRes.status}`);
      const compData = await compRes.json();
      const engData = engRes && engRes.ok ? await engRes.json() : null;

      companyRecordId = compData.records?.[0]?.id;

      const engineerFields = {
        "engineer_name": engineer_name,
        "email": engineer_email,
        "phone": engineer_phone,
        "maintenance_company": companyRecordId ? [companyRecordId] : []
      };

      if (engineer_record_id) {
        engineerRecordId = engineer_record_id;
      } else if (engData?.records?.length > 0) {
        engineerRecordId = engData.records[0].id;
        const existing = engData.records[0].fields;
        const needsUpdate =
          existing.email !== engineer_email ||
          existing.phone !== engineer_phone ||
          JSON.stringify(existing.maintenance_company || []) !== JSON.stringify(engineerFields.maintenance_company);
        if (needsUpdate) {
          await fetch(`https://api.airtable.com/v0/${baseId}/engineers/${engineerRecordId}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: engineerFields })
          });
        }
      } else {
        const newEng = await fetch(`https://api.airtable.com/v0/${baseId}/engineers`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: engineerFields })
        });
        if (!newEng.ok) throw new Error(`Engineer create failed: ${newEng.status}`);
        const newEngData = await newEng.json();
        engineerRecordId = newEngData.id;
      }
    }

    // Prepare shared data
    const trimmedDate = date_of_maintenance.split('T')[0];
    
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const dateStr = `${dd}-${mm}-${yyyy}`;
    const cloudinaryFolder = `zelimmaintenance/SWIFT/${maintenance_type.toLowerCase()}/${serial_number}/${dateStr}`;

    // Upload signature server-side so record_ref can be used as the filename
    let signatureAttachment = null;
    if (signature && signature.startsWith('data:image/')) {
      try {
        const base64Data = signature.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: 'image/png' });
        const safeRef = recordRef.replace(/\//g, '_'); // e.g. RI_SWI005_U_180226_5
        const sigPublicId = `${cloudinaryFolder}/${safeRef}_signature`;
        const sigTimestamp = Math.round(Date.now() / 1000);
        const sigParamStr = `public_id=${sigPublicId}&timestamp=${sigTimestamp}${process.env.CLOUDINARY_API_SECRET}`;
        const sigSignature = crypto.createHash('sha1').update(sigParamStr).digest('hex');
        const sigFormData = new FormData();
        sigFormData.append('file', blob, `${safeRef}_signature.png`);
        sigFormData.append('api_key', process.env.CLOUDINARY_API_KEY ?? '');
        sigFormData.append('timestamp', String(sigTimestamp));
        sigFormData.append('signature', sigSignature);
        sigFormData.append('public_id', sigPublicId);
        const sigRes = await fetch('https://api.cloudinary.com/v1_1/zelimmaintenanceportal/image/upload', {
          method: 'POST',
          body: sigFormData,
        });
        if (sigRes.ok) {
          const sigData = await sigRes.json();
          // Add a dark background so the light signature ink is visible on white backgrounds (e.g. Airtable previews)
          const signatureUrl = sigData.secure_url.replace('/upload/', '/upload/b_rgb:1e3a42/');
          signatureAttachment = [{ url: signatureUrl }];
        } else {
          console.warn('Signature upload failed:', await sigRes.text());
        }
      } catch (sigErr) {
        console.warn('Signature upload error:', sigErr.message);
      }
    }

    const formattedAnswers = answers.reduce((acc, item) => {
      acc[item.question] = {
        text: item.answer,
        images: item.images || []
      };
      return acc;
    }, {});

    // Split uploaded files into photos / videos / documents for Airtable attachment fields
    const allFiles = answers.flatMap(item => item.images || []);
    const photoAttachments = allFiles.filter(f => f.fileType === 'image').map(f => ({ url: f.url }));
    const videoAttachments = allFiles.filter(f => f.fileType === 'video').map(f => ({ url: f.url }));
    const docAttachments   = allFiles.filter(f => f.fileType === 'pdf').map(f => ({ url: f.url }));

    // OPTIMIZATION 3: Submit to BOTH tables in PARALLEL
    const submitterName = isOperator ? operator_name : engineer_name;
    const submitterEmail = isOperator ? operator_email : engineer_email;

    const logFields = {
      "unit_link": [unit_record_id],
      "date_of_maintenance": trimmedDate,
      "maintenance_type": maintenance_type,
      "engineer_name": submitterName,
      "engineer_email": submitterEmail,
      "location_display": location_display || "",
      "checklist_json": JSON.stringify(formattedAnswers),
      "cloudinary_folder": cloudinaryFolder,
      "access_pin_used": accessPin,
      "user_type": userType,
      "record_ref": recordRef,
      "declaration_accepted": true,
      "declaration_text": declaration_text || "",
    };

    if (signatureAttachment) logFields["technician_signature"] = signatureAttachment;
    if (photoAttachments.length > 0) logFields["photos"] = photoAttachments;
    if (videoAttachments.length > 0) logFields["videos"] = videoAttachments;
    if (docAttachments.length > 0)   logFields["documents"] = docAttachments;

    if (maintenance_checklist) {
      logFields["maintenance_checklist"] = maintenance_checklist;
    }

    const finalTown = location_town || location_display || "";
    const checkFields = {
      "unit": [unit_record_id],
      "date_of_maintenance": trimmedDate,
      "maintenance_type": maintenance_type,
      "location_display": location_display || "",
      "location_town": finalTown,
      "location_country": location_country || "",
      "checklist_template": [checklist_template_id],
      "checklist_json": JSON.stringify(formattedAnswers),
      "cloudinary_folder": cloudinaryFolder,
      "access_pin_used": accessPin,
      "user_type": userType,
      "locked_by": accessPin,
      "record_ref": recordRef,
      "declaration_accepted": true,
      "declaration_text": declaration_text || "",
    };

    if (isOperator) {
      if (operatorRecordId) checkFields["operator"] = [operatorRecordId];
    } else {
      if (companyRecordId) checkFields["maintained_by"] = [companyRecordId];
      if (engineerRecordId) checkFields["engineer"] = [engineerRecordId];
    }

    if (signatureAttachment) checkFields["technician_signature"] = signatureAttachment;
    if (photoAttachments.length > 0) checkFields["photos"] = photoAttachments;
    if (videoAttachments.length > 0) checkFields["videos"] = videoAttachments;
    if (docAttachments.length > 0)   checkFields["documents"] = docAttachments;

    if (maintenance_checklist) {
      checkFields["maintenance_checklist"] = maintenance_checklist;
    }

    // Submit to both tables simultaneously
    const [logRes, checkRes] = await Promise.all([
      fetch(`https://api.airtable.com/v0/${baseId}/maintenance_logs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: logFields })
      }),
      fetch(`https://api.airtable.com/v0/${baseId}/maintenance_checks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: checkFields })
      })
    ]);

    if (!checkRes.ok || !logRes.ok) {
      const [logText, checkText] = await Promise.all([
        logRes.text(),
        checkRes.text()
      ]);
      console.error("Log Error Details:", logText);
      console.error("Check Error Details:", checkText);
      throw new Error(`Airtable Sync Error`);
    }

    // Mark the draft as completed — call Airtable directly, no HTTP round-trip to self
    try {
      const draftFormula = encodeURIComponent(
        `AND({maintenance_type}='${esc(maintenance_type)}',{access_pin_used}='${esc(accessPin)}',NOT({completed}),FIND('${esc(unit_record_id)}',ARRAYJOIN({unit_id})))`
      );
      const draftFindRes = await fetch(
        `https://api.airtable.com/v0/${baseId}/maintenance_drafts?filterByFormula=${draftFormula}&fields[]=unit_id&maxRecords=1`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (draftFindRes.ok) {
        const draftData = await draftFindRes.json();
        if (draftData.records?.length > 0) {
          const draftId = draftData.records[0].id;
          await fetch(`https://api.airtable.com/v0/${baseId}/maintenance_drafts/${draftId}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { completed: true } })
          });
        }
      }
    } catch (markError) {
      console.warn('⚠️ Error marking draft complete:', markError.message);
    }

    return res.status(200).json({ success: true, recordRef });
  } catch (error) {
    console.error("Final Submission Failure:", error.message);
    return res.status(500).json({ success: false, error: 'Submission failed. Please try again.' });
  }
}