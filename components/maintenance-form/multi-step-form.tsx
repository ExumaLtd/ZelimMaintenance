import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import { z } from "zod";
import FormShell from './form-shell';
import ArrowButton from '../ui/arrow-button';
import { useAdminFields, AdminCard } from './admin-card';
import QuestionField from './question-field';
import DeclarationCard from './declaration-card';
import { useGeolocation, useMicPreflight } from './device-hooks';
import { useDraftLoader, useLocalDraftMirror, applyCommonAirtableDraft, applyCommonLocalDraft } from './persistence';
import { performSubmission } from './submit';
import { useAutoSave } from '@/hooks/use-auto-save';
import { errorMessage } from '@/utils/errors';
import type { FormEvent, ReactNode } from 'react';
import type { MaintenanceFormConfig } from './config';
import type { FormPageProps, Answers, QuestionImages, UploadedImage, FieldErrors } from './types';

const adminSchema = z.object({
  company: z.string().min(1, 'Please select a maintenance company.'),
  location: z.string().min(1, 'Please provide a location.'),
  engineerName: z.string().min(1, 'Please select or enter an engineer name.'),
  engineerEmail: z.string().email('Please provide a valid engineer email.'),
  engineerPhone: z.string().min(1, 'Please provide an engineer phone number.').max(20, 'Phone number must be 20 characters or less.'),
});

/**
 * Multi-step maintenance form: questions grouped into sections from
 * config.sections, admin fields validated on step 1, declaration and
 * signature on the final step. Drives the annual, monthly and depth pages.
 * renderQuestion lets a page swap in a custom renderer for template
 * questions that need more than the standard textarea block.
 */
type MultiStepFormProps = FormPageProps & {
  config: MaintenanceFormConfig;
  renderQuestion?: (args: Record<string, any>) => ReactNode | undefined;
};

export default function MultiStepForm({ config, unit, template, companies = [], engineers = [], operators = [], accessType = 'maintenance', renderQuestion }: MultiStepFormProps) {
  const router = useRouter();
  const sections = config.sections!;

  const signatureRef = useRef<any>(null);
  const card2Ref = useRef<HTMLDivElement | null>(null);
  const hasSubmittedRef = useRef(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    company: false,
    location: false,
    engineerName: false,
    engineerEmail: false,
    engineerPhone: false,
    photographImages: false,
    declaration: false,
    signature: false,
  });

  const [currentStep, setCurrentStep] = useState(1);
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
      currentStep,
      answers,
      questionImages,
      selectedCompany: admin.selectedCompany,
      locationDisplay: admin.locationDisplay,
      locationCountry: admin.locationCountry,
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
    !hasSubmittedRef.current &&
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

    if (questionKey === 'q1' && images.length > 0) {
      setFieldErrors(prev => ({ ...prev, photographImages: false }));
      setErrorMsg("");
    }
  };

  // Get current section configuration
  const currentSection = sections.find(s => s.step === currentStep);

  // Get questions for current step
  const currentQuestions = useMemo(() => {
    if (!currentSection || !template?.questionsData) return [];
    return template.questionsData.filter(q =>
      currentSection.questionIds.includes(q.id)
    );
  }, [currentSection, template?.questionsData]);

  // Scroll the questions card into view after a step change
  const scrollToQuestionsCard = () => {
    setTimeout(() => {
      if (card2Ref.current) {
        const elementPosition = card2Ref.current.getBoundingClientRect().top + window.pageYOffset;
        const isMobile = window.innerWidth <= 768;
        const offset = isMobile ? 50 : 58;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  // Handle continue to next step
  const handleContinueToNextStep = () => {
    const errors: string[] = [];
    const newFieldErrors = {
      company: false,
      location: false,
      engineerName: false,
      engineerEmail: false,
      engineerPhone: false,
      photographImages: false,
      declaration: false,
      signature: false,
    };

    document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
    setQuestionErrors({});

    // Only validate admin fields on step 1
    if (currentStep === 1) {
      const adminResult = adminSchema.safeParse({
        company: admin.selectedCompany || "",
        location: admin.locationDisplay?.trim() || "",
        engineerName: accessType === 'operator'
          ? (admin.operatorName && admin.operatorName !== "Please select") ? admin.operatorName.trim() : ""
          : (admin.engName && admin.engName !== "Please select") ? admin.engName.trim() : "",
        engineerEmail: accessType === 'operator' ? admin.operatorEmail?.trim() || "" : admin.engEmail?.trim() || "",
        engineerPhone: accessType === 'operator' ? admin.operatorPhone?.trim() || "" : admin.engPhone?.trim() || "",
      });

      if (!adminResult.success) {
        adminResult.error.issues.forEach(issue => {
          const field = issue.path[0];
          if (field === 'company') {
            errors.push('company');
            newFieldErrors.company = true;
          } else if (field === 'location') {
            errors.push('location');
            newFieldErrors.location = true;
            const locationInput = document.querySelector('[name="location_display"]');
            if (locationInput) locationInput.classList.add('has-error');
          } else if (field === 'engineerName') {
            errors.push('engineer');
            newFieldErrors.engineerName = true;
            const engineerInput = document.querySelector('[name="engineer_name"]');
            if (engineerInput) engineerInput.classList.add('has-error');
          } else if (field === 'engineerEmail') {
            errors.push('email');
            newFieldErrors.engineerEmail = true;
            const emailInput = document.querySelector('[name="engineer_email"]');
            if (emailInput) emailInput.classList.add('has-error');
          } else if (field === 'engineerPhone') {
            errors.push('phone');
            newFieldErrors.engineerPhone = true;
            const phoneInput = document.querySelector('[name="engineer_phone"]');
            if (phoneInput) phoneInput.classList.add('has-error');
          }
        });
      }

      if (config.requireSwiftPhoto) {
        const photographQuestion = currentQuestions.find(q => q.id === 1);
        if (photographQuestion) {
          const questionIndex = (template?.questionsData || []).indexOf(photographQuestion) + 1;
          const images = questionImages[`q${questionIndex}`] || [];
          if (images.length === 0) {
            errors.push('photograph_images');
            newFieldErrors.photographImages = true;
            setErrorMsg("Please upload at least one photo of the Swift.");
          }
        }
      }
    }

    // Validate current step questions
    const requiredQuestions = currentQuestions.filter(q => q.required);
    for (let i = 0; i < requiredQuestions.length; i++) {
      const q = requiredQuestions[i];
      const questionIndex = (template?.questionsData || []).indexOf(q) + 1;
      const answer = answers[`q${questionIndex}`];

      if (!answer || !answer.trim()) {
        errors.push(`q${questionIndex}`);
        setQuestionErrors(prev => ({ ...prev, [`q${questionIndex}`]: true }));
      }
    }

    setFieldErrors(newFieldErrors);

    if (errors.length > 0 && !errors.includes('photograph_images')) {
      if (errors.length === 1) {
        if (errors.includes('company')) setErrorMsg("Please select a maintenance company.");
        else if (errors.includes('location')) setErrorMsg("Please provide a location.");
        else if (errors.includes('engineer')) setErrorMsg("Please select or enter an engineer name.");
        else if (errors.includes('email')) setErrorMsg("Please provide an engineer email.");
        else if (errors.includes('phone')) setErrorMsg("Please provide an engineer phone number.");
        else setErrorMsg("Please complete all required questions.");
      } else {
        setErrorMsg("Please check for multiple errors.");
      }
      return;
    }

    if (errors.includes('photograph_images')) {
      return;
    }

    setErrorMsg("");
    setCurrentStep(currentStep + 1);

    window.history.pushState({ step: currentStep + 1 }, '', window.location.href);

    scrollToQuestionsCard();
  };

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.step) {
        setCurrentStep(event.state.step);
        scrollToQuestionsCard();
      } else if (currentStep > 1) {
        setCurrentStep(currentStep - 1);
        scrollToQuestionsCard();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentStep]);

  // Save currentStep to localStorage whenever it changes
  useEffect(() => {
    if (currentStep > 1) {
      localStorage.setItem(`${storageKey}_step`, currentStep.toString());
    }
  }, [currentStep, storageKey]);

  useDraftLoader({
    unit,
    typeLabel: config.typeLabel,
    storageKey,
    applyAirtableDraft: (draft) => {
      if (draft.currentStep) {
        setCurrentStep(draft.currentStep);
        for (let s = 2; s <= draft.currentStep; s++) {
          window.history.pushState({ step: s }, '', window.location.href);
        }
      }
      applyCommonAirtableDraft(draft, admin, setAnswers, setQuestionImages);
    },
    applyLocalDraft: (data) => {
      applyCommonLocalDraft(data, admin, setAnswers);

      // Restore currentStep from localStorage
      const savedStep = localStorage.getItem(`${storageKey}_step`);
      if (savedStep) {
        const stepNum = parseInt(savedStep, 10);
        if (stepNum > 1 && stepNum <= sections.length) {
          setCurrentStep(stepNum);
        }
      }
    },
  });

  useGeolocation(admin);
  useMicPreflight();

  useLocalDraftMirror({
    storageKey,
    selectedCompany: admin.selectedCompany,
    locationDisplay: admin.locationDisplay,
    locationCountry: admin.locationCountry,
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

    // Declaration must be checked
    if (!declarationChecked) {
      setErrorMsg("Please accept the declaration before submitting.");
      setFieldErrors(prev => ({ ...prev, declaration: true }));
      return;
    }

    // Signature must be provided
    if (!signatureData) {
      setErrorMsg("Please sign before submitting.");
      setFieldErrors(prev => ({ ...prev, signature: true }));
      return;
    }

    const errors: { field: string; message: string }[] = [];
    let firstErrorField: { current: any } | null = null;

    document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
    setQuestionErrors({});

    const requiredQuestions = currentQuestions.filter(q => q.required);
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

    if (errors.length > 0) {
      if (errors.length === 1) {
        setErrorMsg(errors[0].message);
      } else {
        setErrorMsg("Please check for multiple errors.");
      }

      if (firstErrorField?.current) {
        firstErrorField.current.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          if (firstErrorField.current.focus) {
            firstErrorField.current.focus();
          }
        }, 300);
      }
      return;
    }

    setSubmitting(true);
    hasSubmittedRef.current = true; // Block all future auto-saves

    try {
      await performSubmission({
        config, unit, template, accessType, admin,
        answers, questionImages, signatureData, storageKey,
        extraLocalKeys: [`${storageKey}_step`],
        router,
      });
    } catch (err) {
      setErrorMsg(errorMessage(err));
      setSubmitting(false);
      hasSubmittedRef.current = false; // Reset on error
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
        {/* CARD 2: QUESTIONS (Multi-step) */}
        <div ref={card2Ref} className="checklist-form-card" style={{ marginTop: "20px" }}>
          {currentStep === 1 && (
            <>
              <h3 className="checklist-section-title">{config.sectionTitle}</h3>
              <p className="checklist-section-subtitle">
                {config.sectionSubtitle}
              </p>
            </>
          )}

          {currentSection && currentSection.step > 1 && (
            <h3 className="checklist-section-title" style={{ margin: "0 0 22px" }}>{currentSection.title}</h3>
          )}

          {currentQuestions.map((q, idx) => {
            const questionIndex = (template?.questionsData || []).indexOf(q) + 1;

            if (renderQuestion) {
              const custom = renderQuestion({
                q, questionIndex, idx,
                answers, setAnswers,
                questionErrors, setQuestionErrors,
                questionImages, handleImagesChange,
                setErrorMsg, fieldErrors,
              });
              if (custom !== undefined) return custom;
            }

            return (
              <QuestionField
                key={q.id}
                q={q}
                questionIndex={questionIndex}
                isFirst={idx === 0}
                answers={answers}
                setAnswers={setAnswers}
                questionErrors={questionErrors}
                setQuestionErrors={setQuestionErrors}
                setErrorMsg={setErrorMsg}
                questionImages={questionImages}
                onImagesChange={handleImagesChange}
                serialNumber={unit?.serial_number}
                uploadSlug={config.uploadSlug}
                uploaderHasError={q.id === 1 && !!fieldErrors.photographImages}
              />
            );
          })}

          {currentStep < sections.length && errorMsg && <p className="error-message">{errorMsg}</p>}

          {currentStep < sections.length && (
            <ArrowButton onClick={handleContinueToNextStep} className="mt-[34px] max-[600px]:mt-[30px]">
              Continue
            </ArrowButton>
          )}
        </div>

        {/* CARD 3: DECLARATION & SIGNATURE */}
        {currentStep === sections.length && (
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
        )}
      </form>
    </FormShell>
  );
}
