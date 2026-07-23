import { describe, it, expect } from 'vitest';
import { buildSubmitPayload, buildEmailAnswers } from '@/components/maintenance-form/submit';
import { unscheduledConfig } from '@/components/maintenance-form/config';

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
  maintenanceDate: '2026-07-23',
  locationDisplay: 'Leith, UK',
  locationCountry: 'United Kingdom',
  what3words: 'filled.count.soap',
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

describe('buildSubmitPayload', () => {
  const payload = buildSubmitPayload({
    typeLabel: unscheduledConfig.typeLabel,
    unit, template, admin,
    signatureData: 'data:image/png;base64,SIG',
    answers, questionImages,
  });

  it('produces the exact field set the submit-maintenance API expects', () => {
    expect(Object.keys(payload).sort()).toEqual([
      'answers',
      'checklist_template_id',
      'date_of_maintenance',
      'declaration_text',
      'engineer_email',
      'engineer_name',
      'engineer_phone',
      'engineer_record_id',
      'location_country',
      'location_display',
      'location_what3words',
      'maintained_by',
      'maintenance_type',
      'operating_company_id',
      'operator_email',
      'operator_name',
      'operator_phone',
      'operator_record_id',
      'serial_number',
      'signature',
      'unit_record_id',
    ]);
  });

  it('maps the admin and unit fields through unchanged', () => {
    expect(payload.maintenance_type).toBe('Unscheduled');
    expect(payload.maintained_by).toBe('Zelim Service Ltd');
    expect(payload.engineer_record_id).toBe('recENG');
    expect(payload.unit_record_id).toBe('recUNIT');
    expect(payload.checklist_template_id).toBe('recTEMPLATE');
    expect(payload.serial_number).toBe('SWI005');
    expect(payload.declaration_text).toBe('I confirm the work was completed.');
  });

  it('keys answers as q1..qN in template order, with url and fileType only on images', () => {
    expect(payload.answers).toEqual([
      {
        question: 'q1',
        answer: 'Photos attached',
        images: [{ url: 'https://img/1.jpg', fileType: 'image' }],
      },
      { question: 'q2', answer: 'Replaced belt tensioner', images: [] },
    ]);
  });
});

describe('buildEmailAnswers', () => {
  it('keys answers by question title and keeps thumbnails for the email template', () => {
    const emailAnswers = buildEmailAnswers(template, answers, questionImages);
    expect(emailAnswers).toEqual({
      'Photograph Swift': {
        text: 'Photos attached',
        images: [{ url: 'https://img/1.jpg', thumbnail: 'https://img/1_t.jpg', fileType: 'image' }],
      },
      'Describe the work': { text: 'Replaced belt tensioner', images: [] },
    });
  });

  it('reports unanswered questions as Not answered', () => {
    const emailAnswers = buildEmailAnswers(template, {}, {});
    expect(emailAnswers['Describe the work'].text).toBe('Not answered');
  });
});
