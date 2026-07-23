import { getCompanyLogoUrl } from '@/utils/get-company-logo';
import { submitWithOfflineQueue } from '@/utils/offline-queue';
import type { NextRouter } from 'next/router';
import type { MaintenanceFormConfig } from './config';
import type { Unit, ChecklistTemplate, Answers, QuestionImages, AdminValues } from './types';

type EmailAnswer = { text: string; images: { url: string; thumbnail?: string; fileType: string }[] };

/** Answers keyed by question title, as the report email template expects. */
export function buildEmailAnswers(template: ChecklistTemplate, answers: Answers, questionImages: QuestionImages) {
  const emailFriendlyAnswers: Record<string, EmailAnswer> = {};
  (template?.questionsData || []).forEach((q, i) => {
    const questionKey = `q${i + 1}`;
    const textAnswer = answers[questionKey] || "Not answered";
    const images = questionImages[questionKey] || [];

    emailFriendlyAnswers[q.title] = {
      text: textAnswer,
      images: images.map(img => ({ url: img.url, thumbnail: img.thumbnail, fileType: img.fileType || 'image' }))
    };
  });
  return emailFriendlyAnswers;
}

/** The submit-maintenance API payload, identical across all form types. */
type SubmitPayloadArgs = {
  typeLabel: string;
  unit: Unit;
  template: ChecklistTemplate;
  admin: AdminValues;
  signatureData: string | null;
  answers: Answers;
  questionImages: QuestionImages;
};

export function buildSubmitPayload({ typeLabel, unit, template, admin, signatureData, answers, questionImages }: SubmitPayloadArgs) {
  return {
    maintained_by: admin.selectedCompany,
    location_display: admin.locationDisplay,
    location_country: admin.locationCountry,
    maintenance_type: typeLabel,
    date_of_maintenance: new Date().toISOString(),
    // Engineer fields (engineer logins)
    engineer_name: admin.engName,
    engineer_email: admin.engEmail,
    engineer_phone: admin.engPhone,
    engineer_record_id: admin.engId,
    // Operator fields (operator logins)
    operator_name: admin.operatorName,
    operator_email: admin.operatorEmail,
    operator_phone: admin.operatorPhone,
    operator_record_id: admin.operatorId,
    operating_company_id: unit?.operating_company_id,
    unit_record_id: unit?.record_id,
    checklist_template_id: template?.id,
    serial_number: unit?.serial_number,
    declaration_text: template?.declarationText || "",
    signature: signatureData,
    answers: (template?.questionsData || []).map((_, i) => {
      const questionKey = `q${i + 1}`;
      return {
        question: questionKey,
        answer: answers[questionKey] || "",
        images: (questionImages[questionKey] || []).map(img => ({ url: img.url, fileType: img.fileType || 'image' }))
      };
    }),
  };
}

/**
 * Save the submission, send the report email, clear the local draft and
 * uploader caches, then navigate to the confirmation page. Throws when the
 * database save fails so the form can surface the error and re-enable
 * submission; throws OfflineQueuedError when the network is down and the
 * submission was queued on-device instead. The signature (base64 data URL)
 * is uploaded server-side so record_ref can be used as the filename.
 */
type PerformSubmissionArgs = {
  config: MaintenanceFormConfig;
  unit: Unit;
  template: ChecklistTemplate;
  accessType: string;
  admin: AdminValues;
  answers: Answers;
  questionImages: QuestionImages;
  signatureData: string | null;
  storageKey: string;
  extraLocalKeys?: string[];
  router: NextRouter;
};

export async function performSubmission({
  config,
  unit,
  template,
  accessType,
  admin,
  answers,
  questionImages,
  signatureData,
  storageKey,
  extraLocalKeys = [],
  router,
}: PerformSubmissionArgs) {
  const emailFriendlyAnswers = buildEmailAnswers(template, answers, questionImages);
  const payload = buildSubmitPayload({
    typeLabel: config.typeLabel,
    unit, template, admin, signatureData, answers, questionImages,
  });

  const companyLogoUrl = getCompanyLogoUrl(unit?.company, unit?.serial_number);

  // Built before submitting so the pair can be queued offline as one unit;
  // recordRef is patched in from the submit response when it actually sends.
  const reportBody = {
    engineerEmail: accessType === 'operator' ? admin.operatorEmail : admin.engEmail,
    engineerName: accessType === 'operator' ? admin.operatorName : admin.engName,
    serialNumber: unit?.serial_number,
    company: unit?.company,
    answers: emailFriendlyAnswers,
    reportType: config.typeLabel,
    companyLogoUrl: companyLogoUrl,
    isOperator: accessType === 'operator',
    technicalData: {
      unit_record_id: unit?.record_id,
      checklist_template_id: template?.id,
      maintenance_company: accessType === 'operator' ? unit?.company : admin.selectedCompany,
      engineer_name: accessType === 'operator' ? admin.operatorName : admin.engName,
      location_display: admin.locationDisplay,
      date_of_maintenance: new Date().toISOString().split('T')[0],
      time_of_maintenance: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    },
  };

  const imageKeys = (template?.questionsData || []).map(
    (_, i) => `images_${config.uploadSlug}_${unit?.serial_number}_q${i + 1}`
  );

  await submitWithOfflineQueue({
    queueKey: storageKey,
    submitPayload: payload,
    reportBody,
    clearKeys: [...imageKeys, storageKey, ...extraLocalKeys],
  });

  imageKeys.forEach((key) => localStorage.removeItem(key));

  localStorage.setItem("last_submitted_sn", unit?.serial_number);
  localStorage.setItem("last_maintenance_type", config.typeLabel);
  localStorage.setItem("last_public_token", unit?.public_token);
  extraLocalKeys.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(storageKey);
  router.push(config.completeRoute);
}
