import { z } from 'zod';

/**
 * Server-side shape validation for the submit-maintenance API payload.
 *
 * The schema is a gate, not a transformer: the handler still reads req.body
 * directly, so parsing must never change values. It is deliberately loose
 * (unknown keys pass, optional fields accept null or undefined) because five
 * form variants share this endpoint: the engine forms send the
 * buildSubmitPayload field set, monthly adds a maintenance_checklist JSON
 * string, and depth adds an equipment_checklist JSON string. Tightening a
 * field here can reject live submissions from vessels; the contract tests in
 * tests/submit-schema.test.ts guard every variant.
 */

const uploadedFile = z.looseObject({
  url: z.string().min(1),
  fileType: z.string().optional(),
});

const answerItem = z.looseObject({
  question: z.string(),
  answer: z.string(),
  images: z.array(uploadedFile).optional(),
});

const optionalString = z.string().nullish();

export const submitMaintenanceSchema = z.looseObject({
  unit_record_id: z.string().min(1),
  maintenance_type: z.string().min(1),
  date_of_maintenance: z.string().min(1),
  answers: z.array(answerItem),
  serial_number: optionalString,
  checklist_template_id: optionalString,
  maintained_by: optionalString,
  location_display: optionalString,
  location_town: optionalString,
  location_country: optionalString,
  location_what3words: optionalString,
  engineer_name: optionalString,
  engineer_email: optionalString,
  engineer_phone: optionalString,
  engineer_record_id: optionalString,
  operator_name: optionalString,
  operator_email: optionalString,
  operator_phone: optionalString,
  operator_record_id: optionalString,
  operating_company_id: optionalString,
  declaration_text: optionalString,
  signature: optionalString,
  maintenance_checklist: optionalString,
  equipment_checklist: optionalString,
});
