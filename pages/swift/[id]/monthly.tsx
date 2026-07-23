import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import { z } from "zod";
import clsx from "clsx";
import { getCompanyLogoUrl } from '@/utils/get-company-logo';
import { autoGrow } from '@/utils/form-utils';
import ImageUploader from '@/components/image-uploader';
import VoiceInput from '@/components/voice-input';
import { useAutoSave } from '@/hooks/use-auto-save';
import { errorMessage } from '@/utils/errors';
import { fetchFormData } from '@/lib/data-fetching';
import { getSession } from '@/lib/session';
import FormShell from '@/components/maintenance-form/form-shell';
import ArrowButton from '@/components/ui/arrow-button';
import { useAdminFields, AdminCard } from '@/components/maintenance-form/admin-card';
import DeclarationCard from '@/components/maintenance-form/declaration-card';
import { useGeolocation, useMicPreflight } from '@/components/maintenance-form/device-hooks';
import { useDraftLoader } from '@/components/maintenance-form/persistence';

const monthlyAdminSchema = z.object({
  company: z.string().min(1, 'Operator is required.'),
  location: z.string().min(1, 'Please provide a location.'),
  engineerName: z.string().min(1, 'Please provide an operators name.'),
  engineerEmail: z.string().email('Please provide a valid operators email.'),
  engineerPhone: z.string().min(1, 'Please provide an operators phone number.').max(20, 'Phone number must be 20 characters or less.'),
});

const monthlySchema = z.object({
  company: z.string().min(1, 'Operator is required.'),
  location: z.string().min(1, 'Please provide a location.'),
  engineerName: z.string().min(1, 'Please provide an operators name.'),
  engineerEmail: z.string().email('Please provide a valid operators email.'),
  engineerPhone: z.string().min(1, 'Please provide an operators phone number.').max(20, 'Phone number must be 20 characters or less.'),
  declaration: z.boolean().refine(val => val === true, { message: 'Please accept the declaration before submitting.' }),
  signature: z.string().min(1, 'Please sign before submitting.'),
});


export default function Monthly({ unit, template, companies = [], engineers = [], operators = [], accessType = 'operator' }) {
  const router = useRouter();

  const card1Ref = useRef(null);
  const card2Ref = useRef(null);
  const signatureRef = useRef(null);
  const hasSubmittedRef = useRef(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [photographImages, setPhotographImages] = useState([]);
  const [photographComments, setPhotographComments] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    company: false,
    location: false,
    engineerName: false,
    engineerEmail: false,
    engineerPhone: false,
    photographImages: false,
    stepComments: {},
    declaration: false,
    signature: false,
  });

  // Checklist data - initialize from template (grouped structure)
  const [checklistData, setChecklistData] = useState([]);

  // Further comments, one per checklist group, keyed by groupIndex
  const [stepComments, setStepComments] = useState<Record<string, string>>({});
  const [stepCommentImages, setStepCommentImages] = useState<Record<string, any[]>>({});

  const admin = useAdminFields({ unit, accessType, engineers, operators, setFieldErrors });

  const storageKey = useMemo(() => {
    // The session cookie is httpOnly, so it is not readable client-side. The draft
    // localStorage key uses a fixed 'unknown' segment for the pin component.
    const pin = 'unknown';
    return `draft_monthly_${unit?.serial_number}_${pin}`;
  }, [unit?.serial_number]);

  // Auto-save draft to Airtable
  useAutoSave({
    unitId: unit?.record_id,
    maintenanceType: 'Monthly',
    engineerEmail: accessType === 'operator' ? admin.operatorEmail : admin.engEmail,
    draftData: {
      currentStep,
      checklistData,
      stepComments,
      stepCommentImages,
      photographImages,
      photographComments,
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
      (checklistData && checklistData.length > 0 && checklistData.some(group =>
        group.questions.some(q => q.answer !== null)
      )) ||
      Object.values(stepComments).some(c => c?.trim()) ||
      Object.values(stepCommentImages).some(imgs => imgs?.length > 0) ||
      (photographImages && photographImages.length > 0) ||
      (admin.selectedCompany && admin.selectedCompany !== '') ||
      (admin.engName && admin.engName !== '' && admin.engName !== 'Please select') ||
      (admin.engEmail && admin.engEmail !== '') ||
      (admin.engPhone && admin.engPhone !== '')
    )
  );

  // Initialize checklist data from template (grouped structure). Skipped when
  // a draft is being restored so restored answers are not wiped.
  const hasLoadedDraftForInitRef = useRef(false);
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isDraft = urlParams.get('draft') === 'true';
    if (isDraft) return;

    if (template?.maintenanceChecklist && template.maintenanceChecklist.length > 0 && !hasLoadedDraftForInitRef.current) {
      setChecklistData(
        template.maintenanceChecklist
          .filter(item => item.questions && item.questions.length > 0)
          .map(group => ({
            ...group,
            questions: group.questions.map(q => ({
              ...q,
              answer: null
            }))
          }))
      );
    }
  }, [template]);

  // Checklist update function (for grouped structure)
  const updateChecklist = (groupIndex, questionIndex, value) => {
    setChecklistData(prev => {
      const updated = [...prev];
      updated[groupIndex] = {
        ...updated[groupIndex],
        questions: updated[groupIndex].questions.map((q, qIdx) =>
          qIdx === questionIndex ? { ...q, answer: value } : q
        )
      };

      const row = document.querySelector(`[data-group="${groupIndex}"][data-question="${questionIndex}"]`);
      if (row) {
        const allButtons = row.querySelectorAll('.toggle-btn');
        allButtons.forEach(btn => btn.classList.remove('has-error'));
      }

      return updated;
    });
  };

  // Handle comment images per step
  const handleStepCommentImagesChange = (groupIndex, images) => {
    setStepCommentImages(prev => ({ ...prev, [groupIndex]: images }));
  };

  // Handle continue from step 1 to step 2
  const handleContinue = () => {
    // On step 1 (admin + photo), validate both before advancing
    if (currentStep === 1) {
      const errors = [];
      const newFieldErrors = {
        company: false,
        location: false,
        engineerName: false,
        engineerEmail: false,
        engineerPhone: false,
        photographImages: false,
        declaration: false,
        signature: false,
        stepComments: {},
      };

      document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));

      const adminResult = monthlyAdminSchema.safeParse({
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
          if (field === 'company') { newFieldErrors.company = true; errors.push('company'); }
          else if (field === 'location') { newFieldErrors.location = true; errors.push('location'); }
          else if (field === 'engineerName') { newFieldErrors.engineerName = true; errors.push('engineer'); }
          else if (field === 'engineerEmail') { newFieldErrors.engineerEmail = true; errors.push('email'); }
          else if (field === 'engineerPhone') { newFieldErrors.engineerPhone = true; errors.push('phone'); }
        });
      }

      if (photographImages.length === 0) {
        newFieldErrors.photographImages = true;
        errors.push('photograph_images');
      }

      setFieldErrors(newFieldErrors);

      if (errors.length > 0) {
        if (errors.includes('photograph_images') && errors.length === 1) {
          setErrorMsg("Please upload at least one photo of the Swift.");
        } else if (errors.length === 1) {
          if (errors.includes('company')) setErrorMsg("Please select a maintenance company.");
          else if (errors.includes('location')) setErrorMsg("Please provide a location.");
          else if (errors.includes('engineer')) setErrorMsg("Please select or enter an engineer name.");
          else if (errors.includes('email')) setErrorMsg("Please provide an engineer email.");
          else if (errors.includes('phone')) setErrorMsg("Please provide an engineer phone number.");
        } else {
          setErrorMsg("Please check for multiple errors.");
        }
        if (card1Ref.current) {
          card1Ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }

      setErrorMsg("");
    }

    // On checklist steps (2+), if any question is "No", require a comment before continuing
    if (currentStep > 1 && !isLastStep) {
      const groupIndex = currentStep - 2;
      const group = checklistData[groupIndex];
      if (group) {
        const hasNo = group.questions.some(q => q.answer === false);
        if (hasNo && !stepComments[groupIndex]?.trim()) {
          setFieldErrors(prev => ({ ...prev, stepComments: { ...prev.stepComments, [groupIndex]: true } }));
          return;
        }
      }
    }

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    window.history.pushState({ step: nextStep }, '', window.location.href);

    setTimeout(() => {
      if (card2Ref.current) {
        const elementPosition = card2Ref.current.getBoundingClientRect().top + window.pageYOffset;
        const isMobile = window.innerWidth <= 768;
        const offset = isMobile ? 50 : 58;
        window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
      }
    }, 100);
  };

  // Set initial history state so forward navigation has a target
  useEffect(() => {
    if (!window.history.state?.step) {
      window.history.replaceState({ step: 1 }, '');
    }
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event) => {
      const targetStep = event.state?.step ?? 1;
      setCurrentStep(targetStep);
      setTimeout(() => {
        if (card2Ref.current) {
          const elementPosition = card2Ref.current.getBoundingClientRect().top + window.pageYOffset;
          const isMobile = window.innerWidth <= 768;
          const offset = isMobile ? 50 : 58;
          window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
        }
      }, 100);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useDraftLoader({
    unit,
    typeLabel: 'Monthly',
    storageKey,
    applyAirtableDraft: (draft) => {
      hasLoadedDraftForInitRef.current = true;
      if (draft.currentStep) {
        setCurrentStep(draft.currentStep);
        for (let s = 2; s <= draft.currentStep; s++) {
          window.history.pushState({ step: s }, '', window.location.href);
        }
      }
      if (draft.checklistData) setChecklistData(draft.checklistData);
      if (draft.stepComments) setStepComments(draft.stepComments);
      if (draft.stepCommentImages) setStepCommentImages(draft.stepCommentImages);
      if (draft.photographImages) setPhotographImages(draft.photographImages);
      if (draft.photographComments) setPhotographComments(draft.photographComments);
      if (draft.selectedCompany) admin.setSelectedCompany(draft.selectedCompany);
      if (draft.locationDisplay) admin.setLocationDisplay(draft.locationDisplay);
      if (draft.locationCountry) admin.setLocationCountry(draft.locationCountry);
      if (draft.engName) admin.setEngName(draft.engName);
      if (draft.engEmail) admin.setEngEmail(draft.engEmail);
      if (draft.engPhone) admin.setEngPhone(draft.engPhone);
      if (draft.engId) admin.setEngId(draft.engId);
      if (draft.operatorName) admin.setOperatorName(draft.operatorName);
      if (draft.operatorEmail) admin.setOperatorEmail(draft.operatorEmail);
      if (draft.operatorPhone) admin.setOperatorPhone(draft.operatorPhone);
      if (draft.operatorId) admin.setOperatorId(draft.operatorId);
    },
    applyLocalDraft: (data) => {
      hasLoadedDraftForInitRef.current = true;
      if (data.maintained_by) admin.setSelectedCompany(data.maintained_by);
      if (data.location_display && data.location_display.trim()) {
        admin.setLocationDisplay(data.location_display);
      }
      if (data.location_country) admin.setLocationCountry(data.location_country);
      if (data.engineer_name) admin.setEngName(data.engineer_name);
      if (data.engineer_email) admin.setEngEmail(data.engineer_email);
      if (data.engineer_phone) admin.setEngPhone(data.engineer_phone);
      if (data.further_comments) setStepComments({ [checklistData.length - 1]: data.further_comments });

      if (data.checklist_data && Array.isArray(data.checklist_data)) {
        setChecklistData(data.checklist_data);
      }
    },
  });

  useGeolocation(admin);
  useMicPreflight();

  // Save draft to localStorage (refresh protection)
  useEffect(() => {
    const draftData = {
      maintained_by: admin.selectedCompany,
      location_display: admin.locationDisplay,
      location_country: admin.locationCountry,
      engineer_name: admin.engName,
      engineer_email: admin.engEmail,
      engineer_phone: admin.engPhone,
      engineer_record_id: admin.engId,
      checklist_data: checklistData,
      step_comments: stepComments,
    };
    localStorage.setItem(storageKey, JSON.stringify(draftData));
  }, [admin.selectedCompany, admin.locationDisplay, admin.locationCountry, admin.engName, admin.engEmail, admin.engPhone, checklistData, stepComments, storageKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (submitting) return;

    hasSubmittedRef.current = true;

    const newFieldErrors = {
      company: false,
      location: false,
      engineerName: false,
      engineerEmail: false,
      engineerPhone: false,
      photographImages: false,
      stepComments: {},
      declaration: false,
      signature: false,
    };

    document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));

    const result = monthlySchema.safeParse({
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

    const errors = [];
    let firstErrorField = null;

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

    const incompleteItems = [];
    const groupsNeedingComments = [];

    checklistData.forEach((group, groupIndex) => {
      group.questions.forEach((question, questionIndex) => {
        if (question.answer === null) {
          incompleteItems.push({ groupIndex, questionIndex, text: question.text });
        }
      });
      const hasNo = group.questions.some(q => q.answer === false);
      if (hasNo && !stepComments[groupIndex]?.trim()) {
        groupsNeedingComments.push(groupIndex);
      }
    });

    if (incompleteItems.length > 0) {
      errors.push({ field: 'checklist', message: 'Please complete all checklist questions.' });
      const firstIncompleteGroupIndex = incompleteItems[0].groupIndex;
      const targetStep = firstIncompleteGroupIndex + 2;
      setCurrentStep(targetStep);
      window.history.pushState({ step: targetStep }, '', window.location.href);
      setTimeout(() => {
        incompleteItems.forEach(incomplete => {
          if (incomplete.groupIndex === firstIncompleteGroupIndex) {
            const row = document.querySelector(`[data-group="${incomplete.groupIndex}"][data-question="${incomplete.questionIndex}"]`);
            if (row) {
              const buttons = row.querySelectorAll('.toggle-btn');
              buttons.forEach(btn => btn.classList.add('has-error'));
            }
          }
        });
        if (card2Ref.current) {
          const elementPosition = card2Ref.current.getBoundingClientRect().top + window.pageYOffset;
          const isMobile = window.innerWidth <= 768;
          const offset = isMobile ? 50 : 58;
          window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
        }
      }, 200);
    }

    if (groupsNeedingComments.length > 0) {
      errors.push({ field: 'comments', message: 'Please explain any item marked "No" before submitting.' });
      const newStepCommentErrors = {};
      groupsNeedingComments.forEach(gi => { newStepCommentErrors[gi] = true; });
      newFieldErrors.stepComments = newStepCommentErrors;
      // Navigate to the earliest step missing a comment (if not already on incomplete step)
      if (incompleteItems.length === 0) {
        const targetStep = groupsNeedingComments[0] + 2;
        setCurrentStep(targetStep);
        window.history.pushState({ step: targetStep }, '', window.location.href);
        setTimeout(() => {
          if (card2Ref.current) {
            const elementPosition = card2Ref.current.getBoundingClientRect().top + window.pageYOffset;
            const isMobile = window.innerWidth <= 768;
            const offset = isMobile ? 50 : 58;
            window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
          }
        }, 200);
      }
    }

    setFieldErrors(newFieldErrors);

    if (errors.length > 0) {
      // 'comments' error is shown inline below the textarea, so exclude it from the global errorMsg
      const nonInlineErrors = errors.filter(e => e.field !== 'comments');
      if (nonInlineErrors.length === 1) {
        setErrorMsg(nonInlineErrors[0].message);
      } else if (nonInlineErrors.length > 1) {
        setErrorMsg("Please check for multiple errors.");
      } else {
        setErrorMsg("");
      }

      if (firstErrorField) {
        if (firstErrorField.current) {
          firstErrorField.current.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => {
            if (firstErrorField.current.focus) {
              firstErrorField.current.focus();
            }
          }, 300);
        }
      }
      hasSubmittedRef.current = false;
      return;
    }

    setSubmitting(true);

    const answers = [];
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

    const payload = {
      maintained_by: admin.selectedCompany,
      location_display: admin.locationDisplay,
      location_country: admin.locationCountry,
      maintenance_type: "Monthly",
      date_of_maintenance: new Date().toISOString(),
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
      maintenance_checklist: JSON.stringify(
        checklistData.map(group => ({
          id: group.id,
          title: group.title,
          questions: group.questions.map(q => ({
            id: q.id,
            text: q.text,
            answer: q.answer === true ? 'Yes' : q.answer === false ? 'No' : 'Not answered'
          }))
        }))
      ),
      answers: answers,
    };

    try {
      const res = await fetch("/api/submit-maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to submit to database. Please try again.");
      const submitResult = await res.json();

      const companyLogoUrl = getCompanyLogoUrl(unit?.company, unit?.serial_number);

      const answersForEmail = {};
      if (photographImages.length > 0 || photographComments) {
        answersForEmail["Photograph Swift"] = {
          text: photographComments || "",
          images: photographImages.map(img => ({ url: img.url, thumbnail: img.thumbnail, fileType: img.fileType || 'image' }))
        };
      }
      checklistData.forEach((group, groupIndex) => {
        const comment = stepComments[groupIndex];
        const images = stepCommentImages[groupIndex] || [];
        if (comment || images.length > 0) {
          answersForEmail[`Further comments (${group.title})`] = {
            text: comment || "",
            images: images.map(img => ({ url: img.url, thumbnail: img.thumbnail, fileType: img.fileType || 'image' }))
          };
        }
      });

      await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engineerEmail: accessType === 'operator' ? admin.operatorEmail : admin.engEmail,
          engineerName: accessType === 'operator' ? admin.operatorName : admin.engName,
          serialNumber: unit?.serial_number,
          company: unit?.company,
          maintenance_checklist: checklistData.map(group => ({
            id: group.id,
            title: group.title,
            questions: group.questions.map(q => ({
              id: q.id,
              text: q.text,
              answer: q.answer === true ? 'Yes' : q.answer === false ? 'No' : 'Not answered'
            }))
          })),
          answers: answersForEmail,
          reportType: "Monthly",
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

      localStorage.setItem("last_submitted_sn", unit?.serial_number);
      localStorage.setItem("last_maintenance_type", "Monthly");
      localStorage.setItem("last_public_token", unit?.public_token);
      localStorage.removeItem(storageKey);
      router.push(`/portal/swift/monthly-complete`);
    } catch (err) {
      setErrorMsg(errorMessage(err));
      setSubmitting(false);
      hasSubmittedRef.current = false;
    }
  };

  const totalSteps = template?.maintenanceChecklist?.length || 4;
  const isLastStep = currentStep === totalSteps;
  const currentGroup = currentStep > 1 ? checklistData[currentStep - 2] : null;

  return (
    <FormShell unit={unit} headTitle="Monthly Maintenance" heroLabel="monthly maintenance">
      <AdminCard
        admin={admin}
        accessType={accessType}
        companies={companies}
        fieldErrors={fieldErrors}
        setFieldErrors={setFieldErrors}
        cardRef={card1Ref}
      />

      <form onSubmit={handleSubmit} autoComplete="off" noValidate style={{ width: "100%", display: "block", margin: 0, padding: 0 }}>
        {/* CARD 2: MULTI-STEP */}
        <div ref={card2Ref} className="checklist-form-card" style={{ marginTop: "20px" }}>

          {/* STEP 1: Photograph Swift */}
          {currentStep === 1 && (
            <>
              <h3 className="checklist-section-title">Monthly maintenance</h3>
              <p className="checklist-section-subtitle">
                All monthly maintenance must be completed in accordance with Section 5.2 – Monthly maintenance of the approved Swift Rescue Conveyor Operators Maintenance Manual.
              </p>

              <div style={{ marginTop: "24px" }}>
                <label className="checklist-label">Photograph Swift</label>
                <p className="question-instruction">Take clear photos of the Swift in situ and the surrounding installation area.</p>
                <div className="question-with-upload">
                  <div className="textarea-wrapper relative">
                    <textarea
                      name="photograph_comments"
                      className="checklist-textarea pr-12! max-[768px]:pr-14!"
                      value={photographComments}
                      onChange={(e) => {
                        setPhotographComments(e.target.value);
                        autoGrow(e);
                      }}
                      onInput={autoGrow}
                      placeholder=""
                    />
                    <VoiceInput
                      onTranscript={(text) => {
                        setPhotographComments((prev) => (prev || '') + text);
                        requestAnimationFrame(() => {
                          requestAnimationFrame(() => {
                            const textarea = document.querySelector('[name="photograph_comments"]');
                            if (textarea) autoGrow(textarea);
                          });
                        });
                      }}
                      onError={(errorMsg) => setErrorMsg(errorMsg)}
                    />
                  </div>
                  <ImageUploader
                    questionKey="photograph_swift"
                    questionText="Photograph Swift"
                    serialNumber={unit?.serial_number}
                    maintenanceType="monthly"
                    initialImages={photographImages || []}
                    onImagesChange={(images) => {
                      setPhotographImages(images);
                      if (images.length > 0) {
                        setFieldErrors(prev => ({ ...prev, photographImages: false }));
                        setErrorMsg("");
                      }
                    }}
                    hasError={fieldErrors.photographImages}
                  />
                </div>
              </div>

              {errorMsg && <p className="error-message">{errorMsg}</p>}
              <ArrowButton onClick={handleContinue} className="mt-[34px] max-[600px]:mt-[30px]">
                Continue
              </ArrowButton>
            </>
          )}

          {/* STEPS 2+: Individual checklist group */}
          {currentStep > 1 && currentGroup && (
            <>
              <h3 className="checklist-section-title">{currentGroup.title}</h3>
              <p className="checklist-section-subtitle">
                {currentGroup.title === 'Visual inspection'
                  ? 'Visual inspections shall be carried out in accordance with the procedures detailed in the Swift Rescue Conveyor Operators Maintenance Manual.'
                  : currentGroup.title === 'Lubrication'
                  ? 'Lubrication shall be carried out in accordance with the procedures detailed in the Swift Rescue Conveyor Operators Maintenance Manual.'
                  : currentGroup.title === 'Testing'
                  ? 'Testing shall be carried out in accordance with the procedures detailed in the Swift Rescue Conveyor Operators Maintenance Manual.'
                  : 'Please report equipment condition before starting maintenance.'}
              </p>

              <div className="equipment-table">
                <div className="equipment-header equipment-header-monthly" style={{ gridTemplateColumns: '1fr 120px' }}>
                  <div className="header-item" style={{ textAlign: 'left' }}>{currentGroup.title}</div>
                  <div className="header-returned">Completed?</div>
                </div>

                {currentGroup.questions.map((question, questionIndex) => (
                  <div
                    key={question.id}
                    className="equipment-row-wrapper monthly-question-row"
                    data-group={currentStep - 2}
                    data-question={questionIndex}
                  >
                    <div className="item-name-mobile">{question.text}</div>
                    <div className="equipment-row monthly-equipment-row">
                      <div className="item-name">{question.text}</div>

                      <div className="toggle-group">
                        <button
                          type="button"
                          className={`toggle-btn ${question.answer === true ? 'active' : ''}`}
                          onClick={() => updateChecklist(currentStep - 2, questionIndex, true)}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          className={`toggle-btn ${question.answer === false ? 'active' : ''}`}
                          onClick={() => updateChecklist(currentStep - 2, questionIndex, false)}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Further comments - shown on every checklist step */}
              {(() => {
                const groupIndex = currentStep - 2;
                const hasError = fieldErrors.stepComments?.[groupIndex];
                return (
                  <div style={{ marginTop: "32px" }}>
                    <label className="checklist-label" style={{ marginTop: 0 }}>Further comments</label>
                    <p className="question-instruction">Record any additional observations, defects, or actions.</p>

                    <div className="question-with-upload">
                      <div className="textarea-wrapper relative">
                        <textarea
                          className={clsx("checklist-textarea pr-12! max-[768px]:pr-14!", hasError && "has-error")}
                          value={stepComments[groupIndex] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStepComments(prev => ({ ...prev, [groupIndex]: val }));
                            autoGrow(e);
                            if (val.trim()) {
                              setFieldErrors(prev => ({ ...prev, stepComments: { ...prev.stepComments, [groupIndex]: false } }));
                              setErrorMsg("");
                            }
                          }}
                          onInput={autoGrow}
                          placeholder=""
                        />

                        <VoiceInput
                          onTranscript={(text) => {
                            setStepComments(prev => ({ ...prev, [groupIndex]: (prev[groupIndex] || '') + text }));
                            requestAnimationFrame(() => {
                              requestAnimationFrame(() => {
                                const textarea = document.querySelector(`[data-step-comments="${groupIndex}"]`);
                                if (textarea) autoGrow(textarea);
                              });
                            });
                          }}
                          onError={(msg) => setErrorMsg(msg)}
                        />
                      </div>

                      <ImageUploader
                        questionKey={`further_comments_${groupIndex}`}
                        questionText="Further comments"
                        serialNumber={unit?.serial_number}
                        maintenanceType="monthly"
                        initialImages={stepCommentImages[groupIndex] || []}
                        onImagesChange={(images) => handleStepCommentImagesChange(groupIndex, images)}
                      />
                    </div>
                    {hasError && (
                      <p className="error-message">Please explain any item marked &ldquo;No&rdquo; before continuing.</p>
                    )}
                  </div>
                );
              })()}

              {/* Continue button - non-last steps only */}
              {!isLastStep && (
                <>
                  {errorMsg && <p className="error-message">{errorMsg}</p>}
                  <ArrowButton onClick={handleContinue} className="mt-[34px] max-[600px]:mt-[30px]">
                    Continue
                  </ArrowButton>
                </>
              )}
            </>
          )}

        </div>

        {/* CARD 3: DECLARATION & SIGNATURE */}
        {isLastStep && (
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

export async function getServerSideProps({ params, req }) {
  const token = params.id;

  const session = getSession(req);
  // Confirm the URL token matches the session so one unit's session cannot load
  // another unit's data. Monthly maintenance is operator-only.
  if (!session || session.access !== 'operator' || token !== session.token) {
    return { redirect: { destination: '/', permanent: false } };
  }

  try {
    const data = await fetchFormData(token, 'Monthly');

    if (data.notFound) {
      return { redirect: { destination: '/', permanent: false } };
    }

    const maintenanceChecklist = data.template?.rawData?.maintenance_checklist || [];

    return {
      props: {
        unit: data.unit,
        template: {
          ...data.template,
          maintenanceChecklist,
        },
        companies: data.companies,
        engineers: data.engineers,
        operators: data.operators,
        accessType: session.access,
      },
    };
  } catch (error) {
    console.error('Error loading monthly form:', error);
    return { redirect: { destination: '/', permanent: false } };
  }
}
