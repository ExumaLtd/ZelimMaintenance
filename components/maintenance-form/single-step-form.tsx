import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import { z } from "zod";
import FormShell from './form-shell';
import { useAdminFields, AdminCard } from './admin-card';
import QuestionField from './question-field';
import DeclarationCard from './declaration-card';
import { useGeolocation, useMicPreflight } from './device-hooks';
import { useDraftLoader, useLocalDraftMirror, applyCommonAirtableDraft, applyCommonLocalDraft } from './persistence';
import { performSubmission } from './submit';
import { useAutoSave } from '@/hooks/use-auto-save';
import { errorMessage } from '@/utils/errors';
import type { FormEvent } from 'react';
import type { MaintenanceFormConfig } from './config';
import type { FormPageProps, Answers, QuestionImages, UploadedImage, FieldErrors } from './types';

const singleStepSchema = z.object({
  company: z.string().min(1, 'Please select a maintenance company.'),
  location: z.string().min(1, 'Please provide a location.'),
  engineerName: z.string().min(1, 'Please select or enter an engineer name.'),
  engineerEmail: z.string().email('Please provide a valid engineer email.'),
  engineerPhone: z.string().min(1, 'Please provide an engineer phone number.').max(20, 'Phone number must be 20 characters or less.'),
  declaration: z.boolean().refine(val => val === true, { message: 'Please accept the declaration before submitting.' }),
  signature: z.string().min(1, 'Please sign before submitting.'),
});

/**
 * Single-card maintenance form: all questions on one page, validated
 * together at submit. Drives the unscheduled and fault reporting pages.
 */
export default function SingleStepForm({ config, unit, template, companies = [], engineers = [], operators = [], accessType = 'maintenance' }: FormPageProps & { config: MaintenanceFormConfig }) {
  const router = useRouter();

  const signatureRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    company: false,
    location: false,
    engineerName: false,
    engineerEmail: false,
    engineerPhone: false,
    declaration: false,
    signature: false,
  });

  const [answers, setAnswers] = useState<Answers>({});
  const [questionImages, setQuestionImages] = useState<QuestionImages>({});
  const [questionErrors, setQuestionErrors] = useState<Record<string, boolean>>({});

  const admin = useAdminFields({ unit, accessType, engineers, operators, setFieldErrors });

  const storageKey = useMemo(() => {
    // The session cookie is httpOnly, so it is not readable client-side. The draft
    // localStorage key uses a fixed 'unknown' segment for the pin component.
    const pin = 'unknown';
    return `draft_${config.draftSlug}_${unit?.serial_number}_${pin}`;
  }, [config.draftSlug, unit?.serial_number]);

  // Auto-save draft to Airtable
  useAutoSave({
    unitId: unit?.record_id,
    maintenanceType: config.typeLabel,
    engineerEmail: accessType === 'operator' ? admin.operatorEmail : admin.engEmail,
    draftData: {
      answers,
      questionImages,
      selectedCompany: admin.selectedCompany,
      locationDisplay: admin.locationDisplay,
      locationCountry: admin.locationCountry,
      what3words: admin.what3words,
      engName: admin.engName,
      engEmail: admin.engEmail,
      engPhone: admin.engPhone,
      engId: admin.engId,
      operatorName: admin.operatorName,
      operatorEmail: admin.operatorEmail,
      operatorPhone: admin.operatorPhone,
      operatorId: admin.operatorId,
    }
  },
    !submitting &&
    !hasSubmitted &&
    (
      Object.keys(answers).some(key => answers[key]?.trim()) ||
      Object.keys(questionImages).length > 0 ||
      (admin.selectedCompany && admin.selectedCompany !== '') ||
      (admin.engName && admin.engName !== '' && admin.engName !== 'Please select') ||
      (admin.engEmail && admin.engEmail !== '') ||
      (admin.engPhone && admin.engPhone !== '')
    )
  );

  const handleImagesChange = (questionKey: string, images: UploadedImage[]) => {
    setQuestionImages(prev => ({
      ...prev,
      [questionKey]: images
    }));
  };

  const { draftLoadedRef } = useDraftLoader({
    unit,
    typeLabel: config.typeLabel,
    storageKey,
    applyAirtableDraft: (draft) => {
      applyCommonAirtableDraft(draft, admin, setAnswers, setQuestionImages);
    },
    applyLocalDraft: (data) => {
      applyCommonLocalDraft(data, admin, setAnswers);
    },
  });

  useGeolocation(admin);
  useMicPreflight();

  useLocalDraftMirror({
    storageKey,
    readyRef: draftLoadedRef,
    selectedCompany: admin.selectedCompany,
    locationDisplay: admin.locationDisplay,
    locationCountry: admin.locationCountry,
    what3words: admin.what3words,
    engName: admin.engName,
    engEmail: admin.engEmail,
    engPhone: admin.engPhone,
    engId: admin.engId,
    answers,
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    if (submitting) return;

    const newFieldErrors = {
      company: false,
      location: false,
      engineerName: false,
      engineerEmail: false,
      engineerPhone: false,
      declaration: false,
      signature: false,
    };

    setQuestionErrors({});

    const result = singleStepSchema.safeParse({
      company: admin.selectedCompany || "",
      location: admin.locationDisplay?.trim() || "",
      engineerName: accessType === 'operator'
        ? (admin.operatorName && admin.operatorName !== "Please select") ? admin.operatorName.trim() : ""
        : (admin.engName && admin.engName !== "Please select") ? admin.engName.trim() : "",
      engineerEmail: accessType === 'operator' ? admin.operatorEmail?.trim() || "" : admin.engEmail?.trim() || "",
      engineerPhone: accessType === 'operator' ? admin.operatorPhone?.trim() || "" : admin.engPhone?.trim() || "",
      declaration: declarationChecked,
      signature: signatureData || "",
    });

    const errors: { field: PropertyKey; message: string }[] = [];
    let firstErrorField: { current: any } | null = null;

    if (!result.success) {
      result.error.issues.forEach(issue => {
        const field = issue.path[0];
        errors.push({ field, message: issue.message });
        if (field === 'company') {
          newFieldErrors.company = true;
          if (!firstErrorField) firstErrorField = admin.companyFieldRef;
        } else if (field === 'location') {
          newFieldErrors.location = true;
          if (!firstErrorField) firstErrorField = admin.locationFieldRef;
        } else if (field === 'engineerName') {
          newFieldErrors.engineerName = true;
          if (!firstErrorField) firstErrorField = admin.engineerFieldRef;
        } else if (field === 'engineerEmail') {
          newFieldErrors.engineerEmail = true;
        } else if (field === 'engineerPhone') {
          newFieldErrors.engineerPhone = true;
        } else if (field === 'declaration') {
          newFieldErrors.declaration = true;
        } else if (field === 'signature') {
          newFieldErrors.signature = true;
        }
      });
    }

    const requiredQuestions = (template?.questionsData || []).filter(q => q.required);
    for (let i = 0; i < requiredQuestions.length; i++) {
      const q = requiredQuestions[i];
      const questionIndex = (template?.questionsData || []).indexOf(q) + 1;
      const answer = answers[`q${questionIndex}`];

      if (!answer || !answer.trim()) {
        errors.push({ field: `q${questionIndex}`, message: `Please answer: ${q.title}.` });
        setQuestionErrors(prev => ({ ...prev, [`q${questionIndex}`]: true }));
        const questionElement = document.querySelector(`[name="q${questionIndex}"]`);
        if (questionElement && !firstErrorField) firstErrorField = { current: questionElement };
      }
    }

    setFieldErrors(newFieldErrors);

    if (errors.length > 0) {
      if (errors.length === 1) {
        setErrorMsg(errors[0].message);
      } else {
        setErrorMsg("Please check for multiple errors.");
      }

      if (firstErrorField) {
        if (firstErrorField.current) {
          firstErrorField.current.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => {
            if (firstErrorField!.current.focus) {
              firstErrorField!.current.focus();
            }
          }, 300);
        }
      }
      return;
    }

    setSubmitting(true);
    setHasSubmitted(true); // Block all future auto-saves

    try {
      await performSubmission({
        config, unit, template, accessType, admin,
        answers, questionImages, signatureData, storageKey, router,
      });
    } catch (err) {
      setErrorMsg(errorMessage(err));
      setSubmitting(false);
      setHasSubmitted(false); // Reset on error
    }
  };

  return (
    <FormShell unit={unit} headTitle={config.headTitle} heroLabel={config.heroLabel}>
      <AdminCard
        admin={admin}
        accessType={accessType}
        companies={companies}
        fieldErrors={fieldErrors}
        setFieldErrors={setFieldErrors}
      />

      <form onSubmit={handleSubmit} autoComplete="off" noValidate style={{ width: "100%", display: "block", margin: 0, padding: 0 }}>
        {/* CARD 2: QUESTIONS */}
        <div className="checklist-form-card" style={{ marginTop: "20px" }}>
          <h3 className="checklist-section-title">{config.sectionTitle}</h3>
          <p className="checklist-section-subtitle">
            {config.sectionSubtitle}
          </p>

          {(template?.questionsData || []).map((q, i) => (
            <QuestionField
              key={i}
              q={q}
              questionIndex={i + 1}
              isFirst={i === 0}
              compact
              answers={answers}
              setAnswers={setAnswers}
              questionErrors={questionErrors}
              setQuestionErrors={setQuestionErrors}
              setErrorMsg={setErrorMsg}
              questionImages={questionImages}
              onImagesChange={handleImagesChange}
              serialNumber={unit?.serial_number}
              uploadSlug={config.uploadSlug}
            />
          ))}

        </div>

        <DeclarationCard
          template={template}
          declarationChecked={declarationChecked}
          setDeclarationChecked={setDeclarationChecked}
          fieldErrors={fieldErrors}
          setFieldErrors={setFieldErrors}
          setErrorMsg={setErrorMsg}
          signatureRef={signatureRef}
          setSignatureData={setSignatureData}
          errorMsg={errorMsg}
          submitting={submitting}
          style={{ marginTop: "20px" }}
        />
      </form>
    </FormShell>
  );
}
