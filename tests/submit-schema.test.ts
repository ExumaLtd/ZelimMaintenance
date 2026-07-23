import { describe, it, expect } from 'vitest';
import { submitMaintenanceSchema } from '@/lib/submit-schema';
import { buildSubmitPayload } from '@/components/maintenance-form/submit';
import { unscheduledConfig } from '@/components/maintenance-form/config';

/**
 * Contract tests between the client payload builders and the server-side
 * schema. If a schema change makes any of these fail, live forms on vessels
 * would get 400s; fix the schema, not the test.
 */

const unit = {
  record_id: 'recUNIT',
  serial_number: 'SWI005',
  operating_company_id: 'recOPCO',
  public_token: 'tok123',
  company: 'Test Operator',
};

const template = {
  id: 'recTEMPLATE',
  declarationText: 'I confirm the work was completed.',
  questionsData: [
    { id: 1, title: 'Photograph Swift', required: true, allow_uploads: true },
    { id: 2, title: 'Describe the work', required: true, allow_uploads: false },
  ],
};

const admin = {
  selectedCompany: 'Zelim Service Ltd',
  locationDisplay: 'Leith, UK',
  locationCountry: 'United Kingdom',
  engName: 'Jo Bloggs',
  engEmail: 'jo@example.com',
  engPhone: '07000000000',
  engId: 'recENG',
  operatorName: '',
  operatorEmail: '',
  operatorPhone: '',
  operatorId: '',
};

const answers = { q1: 'Photos attached', q2: 'Replaced belt tensioner' };
const questionImages = {
  q1: [{ url: 'https://img/1.jpg', thumbnail: 'https://img/1_t.jpg', fileType: 'image' }],
};

const enginePayload = buildSubmitPayload({
  typeLabel: unscheduledConfig.typeLabel,
  unit, template, admin,
  signatureData: 'data:image/png;base64,SIG',
  answers, questionImages,
});

describe('submitMaintenanceSchema', () => {
  it('accepts the engine payload (unscheduled, fault, annual)', () => {
    expect(submitMaintenanceSchema.safeParse(enginePayload).success).toBe(true);
  });

  it('accepts the monthly variant with its maintenance_checklist string', () => {
    const monthly = {
      ...enginePayload,
      maintenance_type: 'Monthly',
      maintenance_checklist: JSON.stringify([
        { id: 1, title: 'Conveyor', questions: [{ id: 1, text: 'Belt ok?', answer: 'Yes' }] },
      ]),
    };
    expect(submitMaintenanceSchema.safeParse(monthly).success).toBe(true);
  });

  it('accepts the depth variant with its equipment_checklist string', () => {
    const depth = {
      ...enginePayload,
      maintenance_type: '30-month depth',
      equipment_checklist: JSON.stringify([
        { id: 1, name: 'Winch', returned: true, condition: 'Good', images: [] },
      ]),
    };
    expect(submitMaintenanceSchema.safeParse(depth).success).toBe(true);
  });

  it('accepts a null signature and absent optional fields', () => {
    const minimal = {
      unit_record_id: 'recUNIT',
      maintenance_type: 'Unscheduled',
      date_of_maintenance: new Date().toISOString(),
      answers: [],
      signature: null,
    };
    expect(submitMaintenanceSchema.safeParse(minimal).success).toBe(true);
  });

  it('rejects a payload missing unit_record_id', () => {
    const { unit_record_id: _omitted, ...rest } = enginePayload;
    expect(submitMaintenanceSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects answers that are not an array of question/answer objects', () => {
    expect(
      submitMaintenanceSchema.safeParse({ ...enginePayload, answers: 'not-an-array' }).success
    ).toBe(false);
    expect(
      submitMaintenanceSchema.safeParse({
        ...enginePayload,
        answers: [{ question: 'q1', answer: 42 }],
      }).success
    ).toBe(false);
  });

  it('rejects answer images without a url', () => {
    expect(
      submitMaintenanceSchema.safeParse({
        ...enginePayload,
        answers: [{ question: 'q1', answer: 'ok', images: [{ fileType: 'image' }] }],
      }).success
    ).toBe(false);
  });
});
