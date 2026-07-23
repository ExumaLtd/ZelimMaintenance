import { buildSubmitPayload } from './submit';
import type { Unit, ChecklistTemplate, AdminValues, Answers, QuestionImages, UploadedImage } from './types';

/**
 * Payload builders for the two checklist forms that keep their unique logic
 * in-page (monthly and depth). They spread buildSubmitPayload so the shared
 * field set stays under the payload contract tests, and only the per-form
 * extras are built here. Both are covered by tests/checklist-payloads.test.ts;
 * changing a field shape here is a live API contract change.
 */

type MonthlyGroup = {
  id: number;
  title: string;
  questions: { id: number; text: string; answer: boolean | null }[];
};

/** The maintenance_checklist JSON string stored on the Airtable record. */
export function buildMonthlyChecklistJson(checklistData: MonthlyGroup[]) {
  return JSON.stringify(
    checklistData.map(group => ({
      id: group.id,
      title: group.title,
      questions: group.questions.map(q => ({
        id: q.id,
        text: q.text,
        answer: q.answer === true ? 'Yes' : q.answer === false ? 'No' : 'Not answered'
      }))
    }))
  );
}

type MonthlyPayloadArgs = {
  unit: Unit;
  template: ChecklistTemplate;
  admin: AdminValues;
  signatureData: string | null;
  checklistData: MonthlyGroup[];
  photographImages: UploadedImage[];
  photographComments: string;
  stepComments: Record<string, string>;
  stepCommentImages: Record<string, UploadedImage[]>;
};

export function buildMonthlyPayload({ unit, template, admin, signatureData, checklistData, photographImages, photographComments, stepComments, stepCommentImages }: MonthlyPayloadArgs) {
  const answers: { question: string; answer: string; images: { url: string; fileType: string }[] }[] = [];
  if (photographImages.length > 0 || photographComments) {
    answers.push({
      question: "Photograph Swift",
      answer: photographComments || "",
      images: photographImages.map(img => ({ url: img.url, fileType: img.fileType || 'image' }))
    });
  }
  checklistData.forEach((group, groupIndex) => {
    const comment = stepComments[groupIndex];
    const images = stepCommentImages[groupIndex] || [];
    if (comment || images.length > 0) {
      answers.push({
        question: `Further comments (${group.title})`,
        answer: comment || "",
        images: images.map(img => ({ url: img.url, fileType: img.fileType || 'image' }))
      });
    }
  });

  return {
    ...buildSubmitPayload({
      typeLabel: 'Monthly',
      unit, template, admin, signatureData,
      answers: {}, questionImages: {},
    }),
    maintenance_checklist: buildMonthlyChecklistJson(checklistData),
    answers,
  };
}

type DepthEquipmentItem = { id: number; [key: string]: unknown };

/** Equipment rows with their condition photos resolved to plain URLs. */
export function buildDepthEquipmentChecklist(checklistData: DepthEquipmentItem[], checklistImages: QuestionImages) {
  return checklistData.map(item => ({
    ...item,
    images: checklistImages[`item_${item.id}`]?.map(img => img.url) || []
  }));
}

type DepthAnswersArgs = {
  template: ChecklistTemplate;
  answers: Answers;
  questionImages: QuestionImages;
  isWinchReturned: boolean;
};

/**
 * Keys keep their original template position: filtering before keying would
 * shift q20-q25 onto the skipped winch keys and lose answers.
 */
export function buildDepthAnswers({ template, answers, questionImages, isWinchReturned }: DepthAnswersArgs) {
  return (template?.questionsData || [])
    .map((q, i) => ({ q, questionKey: `q${i + 1}` }))
    .filter(({ q }) => !(!isWinchReturned && q.id >= 14 && q.id <= 19))
    .map(({ questionKey }) => ({
      question: questionKey,
      answer: answers[questionKey] || "",
      images: (questionImages[questionKey] || []).map(img => ({ url: img.url, fileType: img.fileType || 'image' }))
    }));
}

type DepthPayloadArgs = {
  unit: Unit;
  template: ChecklistTemplate;
  admin: AdminValues;
  signatureData: string | null;
  answers: Answers;
  questionImages: QuestionImages;
  checklistData: DepthEquipmentItem[];
  checklistImages: QuestionImages;
  isWinchReturned: boolean;
};

export function buildDepthPayload({ unit, template, admin, signatureData, answers, questionImages, checklistData, checklistImages, isWinchReturned }: DepthPayloadArgs) {
  return {
    ...buildSubmitPayload({
      typeLabel: template?.type || 'Depth',
      unit, template, admin, signatureData,
      answers: {}, questionImages: {},
    }),
    equipment_checklist: JSON.stringify(buildDepthEquipmentChecklist(checklistData, checklistImages)),
    answers: buildDepthAnswers({ template, answers, questionImages, isWinchReturned }),
  };
}
