import { getCompanyLogoUrl } from '@/utils/get-company-logo';

/** Answers keyed by question title, as the report email template expects. */
export function buildEmailAnswers(template, answers, questionImages) {
  const emailFriendlyAnswers = {};
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
export function buildSubmitPayload({ typeLabel, unit, template, admin, signatureData, answers, questionImages }) {
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
 * submission. The signature (base64 data URL) is uploaded server-side so
 * record_ref can be used as the filename.
 */
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
}) {
  const emailFriendlyAnswers = buildEmailAnswers(template, answers, questionImages);
  const payload = buildSubmitPayload({
    typeLabel: config.typeLabel,
    unit, template, admin, signatureData, answers, questionImages,
  });

  const res = await fetch("/api/submit-maintenance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Failed to submit to database. Please try again.");
  const submitResult = await res.json();

  const companyLogoUrl = getCompanyLogoUrl(unit?.company, unit?.serial_number);

  await fetch("/api/send-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      engineerEmail: accessType === 'operator' ? admin.operatorEmail : admin.engEmail,
      engineerName: accessType === 'operator' ? admin.operatorName : admin.engName,
      serialNumber: unit?.serial_number,
      company: unit?.company,
      answers: emailFriendlyAnswers,
      reportType: config.typeLabel,
      companyLogoUrl: companyLogoUrl,
      recordRef: submitResult.recordRef,
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
    }),
  });

  (template?.questionsData || []).forEach((_, i) => {
    const questionKey = `q${i + 1}`;
    const imageStorageKey = `images_${config.uploadSlug}_${unit?.serial_number}_${questionKey}`;
    localStorage.removeItem(imageStorageKey);
  });

  localStorage.setItem("last_submitted_sn", unit?.serial_number);
  localStorage.setItem("last_maintenance_type", config.typeLabel);
  localStorage.setItem("last_public_token", unit?.public_token);
  extraLocalKeys.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(storageKey);
  router.push(config.completeRoute);
}
