import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import { z } from "zod";
import ImageUploader from '@/components/image-uploader';
import { getCompanyLogoUrl } from '@/utils/get-company-logo';
import { submitOrQueue } from '@/utils/offline-queue';
import { buildDepthPayload } from '@/components/maintenance-form/checklist-payloads';
import { autoGrow, focusFirstError } from '@/utils/form-utils';
import { useAutoSave } from '@/hooks/use-auto-save';
import { errorMessage } from '@/utils/errors';
import { fetchFormData } from '@/lib/data-fetching';
import { getSession } from '@/lib/session';
import FormShell from '@/components/maintenance-form/form-shell';
import type { FieldErrors, FormPageProps, UploadedImage, Answers, QuestionImages } from '@/components/maintenance-form/types';
import type { FormEvent } from 'react';
import type { GetServerSidePropsContext } from 'next';

type EquipmentItem = {
  id: number;
  name: string;
  returned: boolean | null;
  condition: 'good' | 'fair' | 'poor' | null;
  [key: string]: any;
};
import ArrowButton from '@/components/ui/arrow-button';
import { useAdminFields, AdminCard } from '@/components/maintenance-form/admin-card';
import QuestionField from '@/components/maintenance-form/question-field';
import DeclarationCard from '@/components/maintenance-form/declaration-card';
import { useGeolocation, useMicPreflight } from '@/components/maintenance-form/device-hooks';
import { dlog } from '@/components/maintenance-form/debug';

const depthAdminSchema = z.object({
  company: z.string().min(1, 'Please select a maintenance company.'),
  location: z.string().min(1, 'Please provide a location.'),
  engineerName: z.string().min(1, 'Please select or enter an engineer name.'),
  engineerEmail: z.string().email('Please provide a valid engineer email.'),
  engineerPhone: z.string().min(1, 'Please provide an engineer phone number.').max(20, 'Phone number must be 20 characters or less.'),
});

// Define sections for multi-step flow
const sections = [
  {
    step: 1,
    title: "Pre-disassembly inspection",
    subtitle: "Equipment checklist"
  },
  {
    step: 2,
    title: "30-month depth maintenance",
    subtitle: "All 30-month depth maintenance must be completed in accordance with the approved Swift Rescue Conveyor Maintenance Manual and Installation Guide.",
    questionIds: [1]
  },
  {
    step: 3,
    title: "Functional test",
    subtitle: null,
    questionIds: [2]
  },
  {
    step: 4,
    title: "Clean the Swift",
    subtitle: null,
    questionIds: [3]
  },
  {
    step: 5,
    title: "Service history and condition review",
    subtitle: null,
    questionIds: [4, 5]
  },
  {
    step: 6,
    title: "Disassembly and cleaning",
    subtitle: null,
    questionIds: [6, 7]
  },
  {
    step: 7,
    title: "Component inspections",
    subtitle: null,
    questionIds: [8, 9, 10, 11, 12, 13]
  },
  {
    step: 8,
    title: "Winch maintenance",
    subtitle: null,
    questionIds: [14, 15, 16, 17, 18, 19]
  },
  {
    step: 9,
    title: "Reassembly and testing",
    subtitle: null,
    questionIds: [20, 21, 22, 23]
  },
  {
    step: 10,
    title: "Final packaging and notes",
    subtitle: null,
    questionIds: [24, 25]
  }
];

export default function Depth({ unit, template, companies = [], engineers = [], operators = [], accessType = 'maintenance' }: FormPageProps) {
  const router = useRouter();

  const card2Ref = useRef<HTMLDivElement | null>(null);
  const signatureRef = useRef<any>(null);

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
    photographImages: false,
    declaration: false,
    signature: false,
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [checklistData, setChecklistData] = useState<EquipmentItem[]>([]);
  const [checklistErrors, setChecklistErrors] = useState<Record<number, { returned?: boolean; condition?: boolean }>>({});
  const [closingItems, setClosingItems] = useState<Set<number>>(new Set());

  const [answers, setAnswers] = useState<Answers>({});
  const [questionImages, setQuestionImages] = useState<QuestionImages>({});
  const [checklistImages, setChecklistImages] = useState<QuestionImages>({});
  const [questionErrors, setQuestionErrors] = useState<Record<string, boolean>>({});

  const admin = useAdminFields({ unit, accessType, engineers, operators, setFieldErrors });

  const storageKey = useMemo(() => {
    // The session cookie is httpOnly, so it is not readable client-side. The draft
    // localStorage key uses a fixed 'unknown' segment for the pin component.
    const pin = 'unknown';
    return `draft_depth_${unit?.serial_number}_${pin}`;
  }, [unit?.serial_number]);

  // Refs to prevent duplicate operations
  const hasLoadedDraftRef = useRef(false);
  const checklistInitialisedRef = useRef(false);
  // Mirror writes are held until the draft restore has finished, or the
  // initial empty state would destroy the saved mirror before it is read.
  const draftRestoredRef = useRef(false);

  // Check if winch was returned (item id: 3)
  const isWinchReturned = useMemo(() => {
    const winchItem = checklistData.find(item => item.id === 3);
    return winchItem?.returned === true;
  }, [checklistData]);

  // Auto-save draft to Airtable
  useAutoSave({
    unitId: unit?.record_id,
    maintenanceType: '30-month depth',
    engineerEmail: accessType === 'operator' ? admin.operatorEmail : admin.engEmail,
    draftData: {
      checklistData,
      currentStep,
      answers,
      questionImages,
      checklistImages,
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
      (checklistData && checklistData.length > 0 && checklistData.some(item =>
        item.returned !== null || item.condition !== null
      )) ||
      Object.keys(answers).some(key => answers[key]?.trim()) ||
      Object.keys(questionImages).length > 0 ||
      Object.keys(checklistImages).length > 0 ||
      (admin.selectedCompany && admin.selectedCompany !== '') ||
      (admin.engName && admin.engName !== '' && admin.engName !== 'Please select') ||
      (admin.engEmail && admin.engEmail !== '') ||
      (admin.engPhone && admin.engPhone !== '')
    )
  );

  // Initialize checklist data from template (only for fresh starts)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isDraft = urlParams.get('draft') === 'true';
    if (isDraft) return;

    if (template?.maintenanceChecklist && !checklistInitialisedRef.current) {
      checklistInitialisedRef.current = true;
      setChecklistData(
        template.maintenanceChecklist.map((item: any) => ({
          ...item,
          returned: null,
          condition: null,
        }))
      );
    }
  }, [template]);

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

  const handleChecklistImagesChange = (itemId: number, images: UploadedImage[]) => {
    setChecklistImages(prev => ({
      ...prev,
      [`item_${itemId}`]: images
    }));
  };

  const updateChecklist = (index: number, field: 'returned' | 'condition', value: boolean | string) => {
    setChecklistErrors(prev => {
      if (!prev[index]) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setChecklistData(prev => {
      const updated = [...prev];
      const item = updated[index];

      if (field === 'condition' && item.condition === 'poor' && value !== 'poor') {
        setClosingItems(prev => new Set(prev).add(item.id));
        setTimeout(() => {
          setClosingItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(item.id);
            return newSet;
          });
        }, 300);
      }

      if (field === 'condition' && item.condition === 'poor' && value === 'poor') {
        updated[index] = { ...updated[index], condition: null };
        setClosingItems(prev => new Set(prev).add(item.id));
        setTimeout(() => {
          setClosingItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(item.id);
            return newSet;
          });
        }, 300);
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }

      if (field === 'returned' && value === true) {
        updated[index].condition = 'good';
      }

      if (field === 'returned' && value === false) {
        updated[index].condition = null;
      }

      return updated;
    });
  };

  // Get current section configuration
  const currentSection = sections.find(s => s.step === currentStep);

  // Get questions for current step
  const currentQuestions = (!currentSection || !currentSection.questionIds || !template?.questionsData)
    ? []
    : template.questionsData.filter(q => currentSection.questionIds!.includes(q.id));

  // Handle continue to next step with winch skip logic
  const handleContinueToNextStep = () => {
    const errors: string[] = [];
    const newFieldErrors: FieldErrors = {
      company: false,
      location: false,
      engineerName: false,
      engineerEmail: false,
      engineerPhone: false,
      photographImages: false,
      declaration: false,
      signature: false,
    };

    setQuestionErrors({});
    const newChecklistErrors: Record<number, { returned?: boolean; condition?: boolean }> = {};

    if (currentStep === 1) {
      const adminResult = depthAdminSchema.safeParse({
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
          } else if (field === 'engineerName') {
            errors.push('engineer');
            newFieldErrors.engineerName = true;
          } else if (field === 'engineerEmail') {
            errors.push('email');
            newFieldErrors.engineerEmail = true;
          } else if (field === 'engineerPhone') {
            errors.push('phone');
            newFieldErrors.engineerPhone = true;
          }
        });
      }

      const incompleteItems: { index: number; type: 'returned' | 'condition' }[] = [];
      checklistData.forEach((item, index) => {
        if (item.returned === null) {
          incompleteItems.push({ index, type: 'returned' });
        } else if (item.returned === true && item.condition === null) {
          incompleteItems.push({ index, type: 'condition' });
        }
      });

      if (incompleteItems.length > 0) {
        errors.push('checklist');
        incompleteItems.forEach(item => {
          newChecklistErrors[item.index] = { ...newChecklistErrors[item.index], [item.type]: true };
        });
      }
    }

    if (currentStep === 2) {
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

    if (currentStep > 1) {
      const requiredQuestions = currentQuestions.filter(q => q.required && q.id !== 1);
      for (let i = 0; i < requiredQuestions.length; i++) {
        const q = requiredQuestions[i];
        const questionIndex = (template?.questionsData || []).indexOf(q) + 1;
        const answer = answers[`q${questionIndex}`];

        if (!answer || !answer.trim()) {
          errors.push(`q${questionIndex}`);
          setQuestionErrors(prev => ({ ...prev, [`q${questionIndex}`]: true }));
        }
      }
    }

    setFieldErrors(newFieldErrors);
    setChecklistErrors(newChecklistErrors);

    if (errors.length > 0 && !errors.includes('photograph_images')) {
      if (errors.length === 1) {
        if (errors.includes('company')) setErrorMsg("Please select a maintenance company.");
        else if (errors.includes('location')) setErrorMsg("Please provide a location.");
        else if (errors.includes('engineer')) setErrorMsg("Please select or enter an engineer name.");
        else if (errors.includes('email')) setErrorMsg("Please provide an engineer email.");
        else if (errors.includes('phone')) setErrorMsg("Please provide an engineer phone number.");
        else if (errors.includes('checklist')) setErrorMsg("Please complete the equipment checklist.");
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

    // Skip Step 8 (Winch maintenance) if winch not returned
    let nextStep = currentStep + 1;
    if (currentStep === 7 && !isWinchReturned) {
      nextStep = 9;
      dlog('⏭️ Skipping Step 8 (Winch maintenance) - winch not returned');
    }

    setCurrentStep(nextStep);
    window.history.pushState({ step: nextStep }, '', window.location.href);

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

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.step) {
        setCurrentStep(event.state.step);
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
      } else if (currentStep > 1) {
        let previousStep = currentStep - 1;
        if (currentStep === 9 && !isWinchReturned) {
          previousStep = 7;
        }
        setCurrentStep(previousStep);
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
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentStep, isWinchReturned]);

  // Re-apply autoGrow to all textareas when step changes (they render with correct
  // values but at default height, autoGrow only fires on user input otherwise)
  useEffect(() => {
    setTimeout(() => {
      document.querySelectorAll('.checklist-textarea').forEach((el) => autoGrow(el));
    }, 0);
  }, [currentStep]);

  // Load localStorage draft (only for page refreshes, not "Continue maintenance")
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isDraft = urlParams.get('draft') === 'true';
    if (isDraft) return; // the Airtable loader marks draftRestoredRef instead

    const savedDraft = localStorage.getItem(storageKey);
    if (!savedDraft) {
      draftRestoredRef.current = true;
      return;
    }

    try {
      const data = JSON.parse(savedDraft);
      if (data.maintained_by) admin.setSelectedCompany(data.maintained_by);
      if (data.location_display && data.location_display.trim()) {
        admin.setLocationDisplay(data.location_display);
      }
      if (data.location_country) admin.setLocationCountry(data.location_country);
      if (data.what3words) admin.setWhat3words(data.what3words);
      if (data.engineer_name) admin.setEngName(data.engineer_name);
      if (data.engineer_email) admin.setEngEmail(data.engineer_email);
      if (data.engineer_phone) admin.setEngPhone(data.engineer_phone);

      if (data.checklist_data && Array.isArray(data.checklist_data)) {
        // Restoring the localStorage draft after mount requires state here.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setChecklistData(data.checklist_data);
      }

      const draftAnswers: Answers = {};
      Object.keys(data).forEach((key) => {
        if (key.startsWith("q")) draftAnswers[key] = data[key];
      });
      setAnswers(draftAnswers);

    } catch (e) {
      console.error("Draft load error:", e);
    }
    draftRestoredRef.current = true;
    // Load-once semantics: admin setters are stable; the admin object identity
    // changes every render and must not retrigger a draft load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Load draft from Airtable - ONLY when coming from "Continue maintenance"
  useEffect(() => {
    const loadDraft = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const isDraft = urlParams.get('draft') === 'true';

      if (!isDraft) return;
      if (!unit?.record_id) return;
      if (hasLoadedDraftRef.current) return;

      hasLoadedDraftRef.current = true;

      try {
        const res = await fetch(
          `/api/get-draft?unitId=${unit.record_id}&maintenanceType=30-month depth`
        );
        const data = await res.json();

        if (data.draft) {
          dlog('📦 Draft found in Airtable');

          if (data.draft.checklistData) setChecklistData(data.draft.checklistData);
          if (data.draft.answers) setAnswers(data.draft.answers);
          if (data.draft.questionImages) setQuestionImages(data.draft.questionImages);
          if (data.draft.checklistImages) setChecklistImages(data.draft.checklistImages);
          if (data.draft.selectedCompany) admin.setSelectedCompany(data.draft.selectedCompany);
          if (data.draft.locationDisplay) admin.setLocationDisplay(data.draft.locationDisplay);
          if (data.draft.locationCountry) admin.setLocationCountry(data.draft.locationCountry);
          if (data.draft.what3words) admin.setWhat3words(data.draft.what3words);
          if (data.draft.engName) admin.setEngName(data.draft.engName);
          if (data.draft.engEmail) admin.setEngEmail(data.draft.engEmail);
          if (data.draft.engPhone) admin.setEngPhone(data.draft.engPhone);
          if (data.draft.engId) admin.setEngId(data.draft.engId);
          if (data.draft.operatorName) admin.setOperatorName(data.draft.operatorName);
          if (data.draft.operatorEmail) admin.setOperatorEmail(data.draft.operatorEmail);
          if (data.draft.operatorPhone) admin.setOperatorPhone(data.draft.operatorPhone);
          if (data.draft.operatorId) admin.setOperatorId(data.draft.operatorId);

          if (data.draft.currentStep) {
            setTimeout(() => {
              setCurrentStep(data.draft.currentStep);
              for (let s = 2; s <= data.draft.currentStep; s++) {
                window.history.pushState({ step: s }, '', window.location.href);
              }
              dlog(`✅ Draft loaded - restored to step ${data.draft.currentStep}`);
            }, 0);
          } else {
            dlog('✅ Draft loaded from Airtable');
          }
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
        hasLoadedDraftRef.current = false;
      }
    };

    loadDraft().finally(() => {
      draftRestoredRef.current = true;
    });
    // Load-once semantics, as above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit?.record_id]);

  useGeolocation(admin);
  useMicPreflight();

  // Save draft to localStorage (refresh protection). Held until the draft
  // restore finished so the initial empty state cannot clobber the mirror.
  useEffect(() => {
    if (!draftRestoredRef.current) return;
    const draftData = {
      maintained_by: admin.selectedCompany,
      location_display: admin.locationDisplay,
      location_country: admin.locationCountry,
      what3words: admin.what3words,
      engineer_name: admin.engName,
      engineer_email: admin.engEmail,
      engineer_phone: admin.engPhone,
      engineer_record_id: admin.engId,
      checklist_data: checklistData,
      ...answers,
    };
    localStorage.setItem(storageKey, JSON.stringify(draftData));
  }, [admin.selectedCompany, admin.locationDisplay, admin.locationCountry, admin.what3words, admin.engName, admin.engEmail, admin.engPhone, admin.engId, checklistData, answers, storageKey]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dlog('🔴 FORM SUBMITTED - Step:', currentStep);

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
    let firstErrorEl: Element | null = null;

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
        if (questionElement && !firstErrorEl) firstErrorEl = questionElement;
      }
    }

    if (errors.length > 0) {
      if (errors.length === 1) {
        setErrorMsg(errors[0].message);
      } else {
        setErrorMsg("Please check for multiple errors.");
      }

      focusFirstError(firstErrorEl);
      return;
    }

    setSubmitting(true);
    setHasSubmitted(true);

    const emailFriendlyAnswers: Record<string, any> = {};
    (template?.questionsData || []).forEach((q, i) => {
      // Skip winch questions (14-19) if winch not returned
      if (!isWinchReturned && q.id >= 14 && q.id <= 19) {
        return;
      }

      const questionKey = `q${i + 1}`;
      const textAnswer = answers[questionKey] || "Not answered";
      const images = questionImages[questionKey] || [];

      emailFriendlyAnswers[q.title] = {
        text: textAnswer,
        images: images.map(img => ({ url: img.url, thumbnail: img.thumbnail, fileType: img.fileType || 'image' }))
      };
    });

    const payload = buildDepthPayload({
      unit, template, admin, signatureData,
      answers, questionImages, checklistData, checklistImages, isWinchReturned,
    });

    try {
      const companyLogoUrl = getCompanyLogoUrl(unit?.company, unit?.serial_number);

      // Built before submitting so the pair can be queued offline as one
      // unit; recordRef is patched in from the submit response on send.
      const reportBody = {
        engineerEmail: accessType === 'operator' ? admin.operatorEmail : admin.engEmail,
        engineerName: accessType === 'operator' ? admin.operatorName : admin.engName,
        serialNumber: unit?.serial_number,
        company: unit?.company,
        answers: emailFriendlyAnswers,
        equipment_checklist: checklistData.map(item => ({
          ...item,
          images: checklistImages[`item_${item.id}`]?.map(img => img.url) || []
        })),
        reportType: template?.type || "Depth",
        companyLogoUrl: companyLogoUrl,
        isOperator: accessType === 'operator',
        technicalData: {
          unit_record_id: unit?.record_id,
          checklist_template_id: template?.id,
          maintenance_company: accessType === 'operator' ? unit?.company : admin.selectedCompany,
          engineer_name: accessType === 'operator' ? admin.operatorName : admin.engName,
          location_display: admin.locationDisplay,
          date_of_maintenance: admin.maintenanceDate,
          time_of_maintenance: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        },
      };

      const { queued } = await submitOrQueue({ submitPayload: payload, reportBody });

      // Includes the equipment checklist uploaders, or their photos would
      // restore into the next depth form for this unit.
      const imageKeys = [
        ...(template?.questionsData || []).map((_, i) => `images_depth_${unit?.serial_number}_q${i + 1}`),
        ...checklistData.map(item => `images_depth_${unit?.serial_number}_checklist_item_${item.id}`),
      ];
      imageKeys.forEach((key) => localStorage.removeItem(key));

      localStorage.setItem("last_submitted_sn", unit?.serial_number);
      localStorage.setItem("last_maintenance_type", template?.type || "Depth");
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}_step`);
      router.push(queued ? '/portal/swift/depth-complete?queued=true' : '/portal/swift/depth-complete');
    } catch (err) {
      setErrorMsg(errorMessage(err));
      setSubmitting(false);
      setHasSubmitted(false);
    }
  };

  return (
    <FormShell unit={unit} headTitle="Depth Maintenance" heroLabel="depth maintenance">
      <AdminCard
        admin={admin}
        accessType={accessType}
        companies={companies}
        fieldErrors={fieldErrors}
        setFieldErrors={setFieldErrors}
      />

      <form onSubmit={handleSubmit} autoComplete="off" noValidate style={{ width: "100%", display: "block", margin: 0, padding: 0 }}>
        {/* CARD 2: MULTI-STEP CONTENT */}
        <div ref={card2Ref} className="checklist-form-card" style={{ marginTop: "20px" }}>
          {/* STEP 1: EQUIPMENT CHECKLIST */}
          {currentStep === 1 && (
            <div>
              <h3 className="checklist-section-title">{currentSection!.title}</h3>
              <p className="checklist-section-subtitle">
                Please report equipment condition before starting maintenance.
              </p>

              <div className="equipment-table">
                <div className="equipment-header">
                  <div className="header-item"></div>
                  <div className="header-returned">Returned?</div>
                  <div className="header-condition">Condition?</div>
                </div>

                {checklistData.map((item, index) => (
                  <div key={item.id} className="equipment-row-wrapper">
                    <div className="item-name-mobile">{item.name}</div>
                    <div className="equipment-row">
                      <div className="item-name">{item.name}</div>

                      <div className="toggle-group">
                        <button
                          type="button"
                          aria-pressed={item.returned === true}
                          className={`toggle-btn ${item.returned === true ? 'active' : ''} ${checklistErrors[index]?.returned ? 'has-error' : ''}`}
                          onClick={() => updateChecklist(index, 'returned', true)}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          aria-pressed={item.returned === false}
                          className={`toggle-btn ${item.returned === false ? 'active' : ''} ${checklistErrors[index]?.returned ? 'has-error' : ''}`}
                          onClick={() => updateChecklist(index, 'returned', false)}
                        >
                          No
                        </button>
                      </div>

                      <div className={`toggle-group condition-group ${item.returned === true ? 'show-on-mobile' : ''}`}>
                        <button
                          type="button"
                          aria-pressed={item.condition === 'good'}
                          className={`toggle-btn ${item.condition === 'good' ? 'active' : ''} ${checklistErrors[index]?.condition ? 'has-error' : ''}`}
                          onClick={() => updateChecklist(index, 'condition', 'good')}
                          disabled={item.returned !== true}
                          style={{ opacity: item.returned !== true ? 0.3 : 1 }}
                        >
                          Good
                        </button>
                        <button
                          type="button"
                          aria-pressed={item.condition === 'fair'}
                          className={`toggle-btn ${item.condition === 'fair' ? 'active' : ''} ${checklistErrors[index]?.condition ? 'has-error' : ''}`}
                          onClick={() => updateChecklist(index, 'condition', 'fair')}
                          disabled={item.returned !== true}
                          style={{ opacity: item.returned !== true ? 0.3 : 1 }}
                        >
                          Fair
                        </button>
                        <button
                          type="button"
                          aria-pressed={item.condition === 'poor'}
                          className={`toggle-btn ${item.condition === 'poor' ? 'active' : ''} ${checklistErrors[index]?.condition ? 'has-error' : ''}`}
                          onClick={() => updateChecklist(index, 'condition', 'poor')}
                          disabled={item.returned !== true}
                          style={{ opacity: item.returned !== true ? 0.3 : 1 }}
                        >
                          Poor
                        </button>
                      </div>
                    </div>

                    {(item.condition === 'poor' || closingItems.has(item.id)) && (
                      <div className={`checklist-upload-section ${closingItems.has(item.id) ? 'closing' : ''}`}>
                        <ImageUploader
                          questionKey={`checklist_item_${item.id}`}
                          questionText={`${item.name} - Poor condition photos`}
                          serialNumber={unit?.serial_number}
                          maintenanceType="depth"
                          initialImages={checklistImages[`item_${item.id}`] || []}
                          onImagesChange={(images) => handleChecklistImagesChange(item.id, images)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {errorMsg && <p className="error-message">{errorMsg}</p>}

              <ArrowButton onClick={handleContinueToNextStep} className="mt-[34px] max-[600px]:mt-[30px]">
                Continue
              </ArrowButton>
            </div>
          )}

          {/* STEPS 2-10: QUESTIONS */}
          {currentStep > 1 && (
            <div>
              {currentStep === 2 && (
                <>
                  <h3 className="checklist-section-title">{currentSection!.title}</h3>
                  <p className="checklist-section-subtitle">{currentSection!.subtitle}</p>
                </>
              )}

              {currentSection && currentStep > 2 && (
                <h3 className="checklist-section-title" style={{ margin: "0 0 22px" }}>{currentSection.title}</h3>
              )}

              {currentQuestions.map((q, idx) => {
                const questionIndex = (template?.questionsData || []).indexOf(q) + 1;

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
                    uploadSlug="depth"
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

export async function getServerSideProps({ params, req }: GetServerSidePropsContext) {
  const token = String(params?.id ?? '');
  const session = getSession(req);
  // Enforce the session here rather than relying only on the proxy layer, and
  // confirm the URL token matches the session so one unit's session cannot load
  // another unit's data.
  if (!session || !session.pin || token !== session.token) {
    return { redirect: { destination: '/', permanent: false } };
  }
  const accessType = session.access;

  try {
    const data = await fetchFormData(token, '30-month depth');

    if (data.notFound) {
      return { redirect: { destination: '/', permanent: false } };
    }

    const equipment_checklist = data.template?.rawData?.equipment_checklist || [];
    const questions = data.template?.rawData?.questions || [];

    return {
      props: {
        unit: data.unit,
        template: {
          id: data.template?.id,
          type: data.template?.type,
          declarationText: data.template?.declarationText || "",
          maintenanceChecklist: equipment_checklist,
          questionsData: questions,
          questions: questions.map((q: any) => q.title),
        },
        companies: data.companies,
        engineers: data.engineers,
        operators: data.operators,
        accessType,
      },
    };
  } catch (error) {
    console.error('Error loading depth form:', error);
    return { redirect: { destination: '/', permanent: false } };
  }
}
