import { describe, it, expect } from 'vitest';
import { buildMonthlyPayload, buildDepthPayload, buildDepthAnswers } from '@/components/maintenance-form/checklist-payloads';
import { buildSubmitPayload } from '@/components/maintenance-form/submit';
import { submitMaintenanceSchema } from '@/lib/submit-schema';

/**
 * Contract tests for the monthly and depth payloads, which were previously
 * built inline in the pages and covered by no test. If a change here fails,
 * live checklist submissions would break; fix the builder, not the test.
 */

const unit = {
  record_id: 'recUNIT',
  serial_number: 'SWI005',
  operating_company_id: 'recOPCO',
  public_token: 'tok123',
  company: 'Test Operator',
};

const admin = {
  selectedCompany: 'Test Operator',
  maintenanceDate: '2026-07-23',
  locationDisplay: 'Leith, UK',
  locationCountry: 'United Kingdom',
  what3words: 'filled.count.soap',
  engName: '',
  engEmail: '',
  engPhone: '',
  engId: '',
  operatorName: 'QA Operator',
  operatorEmail: 'op@example.com',
  operatorPhone: '07000000000',
  operatorId: 'recOP',
};

describe('buildMonthlyPayload', () => {
  const template = { id: 'recTEMPLATE', declarationText: 'I confirm.' };
  const checklistData = [
    {
      id: 1,
      title: 'Visual inspection',
      questions: [
        { id: 1, text: 'Conveyor belt', answer: true },
        { id: 2, text: 'Winch', answer: false },
        { id: 3, text: 'Tape switch', answer: null },
      ],
    },
  ];

  const payload = buildMonthlyPayload({
    unit, template, admin,
    signatureData: 'data:image/png;base64,SIG',
    checklistData,
    photographImages: [{ url: 'https://img/1.jpg', fileType: 'image' }],
    photographComments: 'All fine',
    stepComments: { 0: 'Slight wear' },
    stepCommentImages: {},
  });

  it('carries the shared field set from buildSubmitPayload plus the checklist', () => {
    const engineKeys = Object.keys(buildSubmitPayload({
      typeLabel: 'Monthly', unit, template, admin,
      signatureData: null, answers: {}, questionImages: {},
    }));
    expect(Object.keys(payload).sort()).toEqual([...engineKeys, 'maintenance_checklist'].sort());
    expect(payload.maintenance_type).toBe('Monthly');
  });

  it('maps toggle answers to Yes, No, and Not answered', () => {
    const checklist = JSON.parse(payload.maintenance_checklist);
    expect(checklist[0].questions.map((q: { answer: string }) => q.answer)).toEqual([
      'Yes', 'No', 'Not answered',
    ]);
  });

  it('collects the photograph and per-group comment answers', () => {
    expect(payload.answers.map(a => a.question)).toEqual([
      'Photograph Swift',
      'Further comments (Visual inspection)',
    ]);
  });

  it('passes the server schema', () => {
    expect(submitMaintenanceSchema.safeParse(payload).success).toBe(true);
  });
});

describe('buildDepthPayload', () => {
  // 25 questions with ids matching their template position, like the live
  // depth template; ids 14-19 are the winch section.
  const questionsData = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    title: `Question ${i + 1}`,
    required: true,
    allow_uploads: true,
  }));
  const template = { id: 'recTEMPLATE', type: '30-month depth', declarationText: 'I confirm.', questionsData };
  const answers = Object.fromEntries(questionsData.map((_, i) => [`q${i + 1}`, `Answer ${i + 1}`]));
  const checklistData = [
    { id: 3, name: 'Winch (including rope)', returned: false, condition: null },
  ];

  const common = {
    unit, template, admin,
    signatureData: 'data:image/png;base64,SIG',
    answers,
    questionImages: {},
    checklistData,
    checklistImages: { item_3: [{ url: 'https://img/w.jpg', fileType: 'image' }] },
  };

  it('keeps original question keys when the winch questions are skipped', () => {
    const skipped = buildDepthAnswers({ template, answers, questionImages: {}, isWinchReturned: false });
    const keys = skipped.map(a => a.question);
    expect(keys).not.toEqual(expect.arrayContaining(['q14', 'q19']));
    expect(keys).toEqual(expect.arrayContaining(['q13', 'q20', 'q25']));
    // The final sections keep their own answers, not the winch section's.
    expect(skipped.find(a => a.question === 'q20')?.answer).toBe('Answer 20');
    expect(skipped.find(a => a.question === 'q25')?.answer).toBe('Answer 25');
  });

  it('sends all questions when the winch was returned', () => {
    const full = buildDepthAnswers({ template, answers, questionImages: {}, isWinchReturned: true });
    expect(full.length).toBe(25);
    expect(full[13]).toEqual(expect.objectContaining({ question: 'q14', answer: 'Answer 14' }));
  });

  it('resolves equipment condition photos to plain URLs', () => {
    const payload = buildDepthPayload({ ...common, isWinchReturned: false });
    const equipment = JSON.parse(payload.equipment_checklist);
    expect(equipment[0].images).toEqual(['https://img/w.jpg']);
    expect(payload.maintenance_type).toBe('30-month depth');
  });

  it('passes the server schema', () => {
    const payload = buildDepthPayload({ ...common, isWinchReturned: false });
    expect(submitMaintenanceSchema.safeParse(payload).success).toBe(true);
  });
});
