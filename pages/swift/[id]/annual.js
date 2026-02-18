// pages/swift/[id]/annual.js
// ✅ UPDATED with all recent fixes + declaration checkbox (div/label htmlFor pattern)

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import { z } from "zod";
import clsx from "clsx";
import { getCompanyLogoUrl } from '../../../utils/get-company-logo';
import ImageUploader from '../../../components/image-uploader';
import VoiceInput from '../../../components/voice-input';
import DatePicker from '../../../components/date-picker';
import { ChevronDown, ChevronUp } from "lucide-react";
import SignaturePad from '../../../components/signature-pad';
import { useAutoSave } from '../../../hooks/use-auto-save';
import { fetchFormData } from '@/lib/data-fetching';
import { getClientSession } from '../../../lib/session';

const annualAdminSchema = z.object({
  company: z.string().min(1, 'Please select a maintenance company.'),
  location: z.string().min(1, 'Please provide a location.'),
  engineerName: z.string().min(1, 'Please select or enter an engineer name.'),
  engineerEmail: z.string().email('Please provide a valid engineer email.'),
  engineerPhone: z.string().min(1, 'Please provide an engineer phone number.'),
});

const autoGrow = (e) => {
  const el = e.target || e;
  el.style.height = "78px";
  el.style.height = el.scrollHeight + "px";
};

const getClientLogo = (companyName, serialNumber) => {
  const logoMap = {
    changi: {
      serials: ["SWI001", "SWI002"],
      nameMatch: "Changi",
      src: "/client_logos/changi_airport/ChangiAirport_Logo(White).svg",
    },
    milford: {
      serials: ["SWI003"],
      nameMatch: "Milford Haven",
      src: "/client_logos/port_of_milford_haven/PortOfMilfordHaven_Logo(White).svg",
    },
    hatloy: {
      serials: ["SWI010", "SWI011"],
      nameMatch: "Hatloy",
      src: "/client_logos/hatloy_maritime/HatloyMaritime_Logo(White).svg",
    },
  };

  for (const client of Object.values(logoMap)) {
    if (client.serials.includes(serialNumber) || companyName?.includes(client.nameMatch)) {
      return { src: client.src, alt: `${companyName} Logo` };
    }
  }
  return null;
};

// Define sections for multi-step flow
const sections = [
  { step: 1, title: "Photograph SWIFT", subtitle: null, questionIds: [1] },
  { step: 2, title: "Records and visual checks", subtitle: null, questionIds: [2, 3] },
  { step: 3, title: "Lubrication and mechanical checks", subtitle: null, questionIds: [4, 5, 6] },
  { step: 4, title: "Conveyor belt checks", subtitle: null, questionIds: [7, 8, 9, 10] },
  { step: 5, title: "Functional and control tests", subtitle: null, questionIds: [11, 12, 13, 14, 15] },
  { step: 6, title: "Deployment and winch checks", subtitle: null, questionIds: [16, 17, 18, 19, 20, 21, 22, 23] },
  { step: 7, title: "Electrical checks", subtitle: null, questionIds: [24, 25] },
  { step: 8, title: "Verification trial and notes", subtitle: null, questionIds: [26, 27] }
];

export default function Annual({ unit, template, companies = [], engineers = [] }) {
  const router = useRouter();

  const companyFieldRef = useRef(null);
  const locationFieldRef = useRef(null);
  const engineerFieldRef = useRef(null);
  const companyDropdownRef = useRef(null);
  const engineerDropdownRef = useRef(null);
  const signatureRef = useRef(null);
  const card2Ref = useRef(null);
  const hasLoadedDraftRef = useRef(false);
  const hasSubmittedRef = useRef(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [today, setToday] = useState("");
  const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({
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
  const [locationDisplay, setLocationDisplay] = useState("");
  const [locationCountry, setLocationCountry] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [engName, setEngName] = useState("");
  const [engEmail, setEngEmail] = useState("");
  const [engPhone, setEngPhone] = useState("");
  const [answers, setAnswers] = useState({});
  const [questionImages, setQuestionImages] = useState({});

  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showEngineerDropdown, setShowEngineerDropdown] = useState(false);

  const storageKey = useMemo(() => {
  const session = getClientSession();
  const pin = session?.pin || 'unknown';
  return `draft_annual_${unit?.serial_number}_${pin}`;
}, [unit?.serial_number]);

  // Auto-save draft to Airtable
  useAutoSave({
    unitId: unit?.record_id,
    maintenanceType: 'Annual',
    engineerEmail: engEmail,
    draftData: {
      currentStep,
      answers,
      questionImages,
      selectedCompany,
      locationDisplay,
      locationCountry,
      engName,
      engEmail,
      engPhone,
    }
  }, 
    !submitting && 
    !hasSubmittedRef.current &&
    (
      Object.keys(answers).some(key => answers[key]?.trim()) ||
      Object.keys(questionImages).length > 0 ||
      (selectedCompany && selectedCompany !== '') ||
      (engName && engName !== '' && engName !== 'Please select') ||
      (engEmail && engEmail !== '') ||
      (engPhone && engPhone !== '')
    )
  );

  const filteredEngineers = useMemo(() => {
    if (!selectedCompany) return [];
    let list = engineers.filter(e => e.companyName === selectedCompany && e.name !== engName);
    
    if (engName && engName !== "Please select" && engName.trim()) {
      const search = engName.toLowerCase();
      return list.filter(e => e.name.toLowerCase().includes(search));
    }
    return list;
  }, [selectedCompany, engName, engineers]);

  const selectCompany = useCallback((company) => {
    setSelectedCompany(company);
    setEngName("Please select");
    setEngEmail("");
    setEngPhone("");
    setShowCompanyDropdown(false);
    setFieldErrors(prev => ({ ...prev, company: false }));
  }, []);

  const selectEngineer = useCallback((engineer) => {
    setEngName(engineer.name);
    setEngEmail(engineer.email || "");
    setEngPhone(engineer.phone || "");
    setShowEngineerDropdown(false);
    setFieldErrors(prev => ({
      ...prev,
      engineerName: false,
      engineerEmail: engineer.email ? false : prev.engineerEmail,
      engineerPhone: engineer.phone ? false : prev.engineerPhone,
    }));
    const engineerInput = document.querySelector('[name="engineer_name"]');
    if (engineerInput) engineerInput.classList.remove('has-error');
    if (engineer.email) {
      const emailInput = document.querySelector('[name="engineer_email"]');
      if (emailInput) emailInput.classList.remove('has-error');
    }
    if (engineer.phone) {
      const phoneInput = document.querySelector('[name="engineer_phone"]');
      if (phoneInput) phoneInput.classList.remove('has-error');
    }
  }, []);

  const clearEngineer = useCallback(() => {
    setEngName("");
    setEngEmail("");
    setEngPhone("");
    setShowEngineerDropdown(false);
  }, []);

  const handleImagesChange = (questionKey, images) => {
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

  // Handle continue to next step
  const handleContinueToNextStep = () => {
    const errors = [];
    const newFieldErrors = {
      company: false,
      location: false,
      engineerName: false,
      engineerEmail: false,
      engineerPhone: false,
      photographImages: false,
    };

    document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));

    // Only validate admin fields on step 1
    if (currentStep === 1) {
      const adminResult = annualAdminSchema.safeParse({
        company: selectedCompany || "",
        location: locationDisplay?.trim() || "",
        engineerName: (engName && engName !== "Please select") ? engName.trim() : "",
        engineerEmail: engEmail?.trim() || "",
        engineerPhone: engPhone?.trim() || "",
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
      
      const photographQuestion = currentQuestions.find(q => q.id === 1);
      if (photographQuestion) {
        const questionIndex = (template?.questionsData || []).indexOf(photographQuestion) + 1;
        const images = questionImages[`q${questionIndex}`] || [];
        if (images.length === 0) {
          errors.push('photograph_images');
          newFieldErrors.photographImages = true;
          setErrorMsg("Please upload at least one photo of the SWIFT.");
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
        const questionElement = document.querySelector(`[name="q${questionIndex}"]`);
        if (questionElement) {
          questionElement.classList.add('has-error');
        }
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

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target)) {
        setShowCompanyDropdown(false);
      }
      if (engineerDropdownRef.current && !engineerDropdownRef.current.contains(event.target)) {
        setShowEngineerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event) => {
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
        setCurrentStep(currentStep - 1);
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
  }, [currentStep]);

  // Save currentStep to localStorage whenever it changes
  useEffect(() => {
    if (currentStep > 1) {
      localStorage.setItem(`${storageKey}_step`, currentStep.toString());
    }
  }, [currentStep, storageKey]);

  // Load draft - ALWAYS check Airtable first, localStorage as fallback
  useEffect(() => {
    setToday(new Date().toISOString().split("T")[0]);
    
    const loadDraft = async () => {
      // Only load once per session
      if (hasLoadedDraftRef.current) {
        console.log('⏭️ Draft already loaded, skipping...');
        return;
      }
      
      // PRIORITY 1: ALWAYS check Airtable first
      if (unit?.record_id) {
        try {
          console.log('🔍 Checking Airtable for draft...');
          const res = await fetch(
            `/api/get-draft?unitId=${unit.record_id}&maintenanceType=Annual`
          );
          const data = await res.json();
          
          if (data.draft) {
            console.log('📦 Draft found in Airtable');
            
            // CRITICAL FIX: Set currentStep WITHOUT pushing history to prevent auto-submit
            if (data.draft.currentStep) {
              setCurrentStep(data.draft.currentStep);
              // DON'T push history states - it was causing form auto-submit on Step 8
            }
            
            if (data.draft.answers) setAnswers(data.draft.answers);
            if (data.draft.questionImages) setQuestionImages(data.draft.questionImages);
            if (data.draft.selectedCompany) setSelectedCompany(data.draft.selectedCompany);
            if (data.draft.locationDisplay) setLocationDisplay(data.draft.locationDisplay);
            if (data.draft.locationCountry) setLocationCountry(data.draft.locationCountry);
            if (data.draft.engName) setEngName(data.draft.engName);
            if (data.draft.engEmail) setEngEmail(data.draft.engEmail);
            if (data.draft.engPhone) setEngPhone(data.draft.engPhone);
            
            // Clear stale localStorage
            localStorage.removeItem(storageKey);
            
            hasLoadedDraftRef.current = true;
            console.log('✅ Draft loaded from Airtable:', new Date(data.lastUpdated).toLocaleString());
            return; // STOP
          } else {
            console.log('ℹ️ No draft found in Airtable');
          }
        } catch (error) {
          console.error('❌ Failed to load Airtable draft:', error);
        }
      }
      
      // PRIORITY 2: localStorage fallback (only if Airtable had nothing)
      console.log('🔍 Checking localStorage for draft...');
      const savedDraft = localStorage.getItem(storageKey);
      if (savedDraft) {
        try {
          const data = JSON.parse(savedDraft);
          if (data.maintained_by) setSelectedCompany(data.maintained_by);
          if (data.location_display && data.location_display.trim()) {
            setLocationDisplay(data.location_display);
          }
          if (data.location_country) setLocationCountry(data.location_country);
          if (data.engineer_name) setEngName(data.engineer_name);
          if (data.engineer_email) setEngEmail(data.engineer_email);
          if (data.engineer_phone) setEngPhone(data.engineer_phone);

          const draftAnswers = {};
          Object.keys(data).forEach((key) => {
            if (key.startsWith("q")) draftAnswers[key] = data[key];
          });
          setAnswers(draftAnswers);
          
          // ✅ NEW: Restore currentStep from localStorage
          const savedStep = localStorage.getItem(`${storageKey}_step`);
          if (savedStep) {
            const stepNum = parseInt(savedStep, 10);
            if (stepNum > 1 && stepNum <= sections.length) {
              setCurrentStep(stepNum);
            }
          }
          
          hasLoadedDraftRef.current = true;
          console.log('✅ Draft loaded from localStorage');
        } catch (e) {
          console.error("❌ localStorage draft load error:", e);
        }
      } else {
        console.log('ℹ️ No draft found in localStorage - fresh start');
      }
    };
    
    loadDraft();
  }, [unit?.record_id, storageKey]);

  // Get geolocation
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    if (locationDisplay && locationDisplay.trim() !== "") return;

    const urlParams = new URLSearchParams(window.location.search);
    const isDraft = urlParams.get('draft') === 'true';
    if (isDraft) return;

    const options = {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 0
    };

    const doGetLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=14&accept-language=en-GB`
            );

            if (!res.ok) {
              console.error('Geocoding failed:', res.status);
              return;
            }

            const data = await res.json();

            if (data?.address) {
              const loc = data.address.suburb || data.address.village || data.address.town || data.address.city || "";
              const formalCountry = data.address.country || "";
              const displayCountry = data.address.country_code ? data.address.country_code.toUpperCase() : formalCountry;
              const shortCountry = displayCountry === "GB" ? "UK" : displayCountry;
              const combinedDisplay = loc ? `${loc}, ${shortCountry}` : shortCountry;

              setLocationDisplay((prev) => (!prev || prev.trim() === "") ? combinedDisplay : prev);
              setLocationCountry(formalCountry);
            }
          } catch (err) {
            console.error("Geocoding error:", err);
          }
        },
        (error) => {
          switch(error.code) {
            case error.PERMISSION_DENIED:
              console.log("User denied location permission");
              break;
            case error.POSITION_UNAVAILABLE:
              console.log("Location information unavailable");
              break;
            case error.TIMEOUT:
              console.log("Location request timed out");
              break;
            default:
              console.log("Unknown location error:", error.message);
          }
        },
        options
      );
    };

    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        if (result.state !== 'denied') doGetLocation();
      }).catch(() => doGetLocation());
    } else {
      doGetLocation();
    }
  }, []);

  // Pre-request microphone permission
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.mediaDevices || !navigator.permissions) return;
    navigator.permissions.query({ name: 'microphone' }).then(result => {
      if (result.state === 'prompt') {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => { stream.getTracks().forEach(t => t.stop()); })
          .catch(() => {});
      }
    }).catch(() => {});
  }, []);

  // Save draft to localStorage (refresh protection)
  useEffect(() => {
    const draftData = {
      maintained_by: selectedCompany,
      location_display: locationDisplay,
      location_country: locationCountry,
      engineer_name: engName,
      engineer_email: engEmail,
      engineer_phone: engPhone,
      ...answers,
    };
    localStorage.setItem(storageKey, JSON.stringify(draftData));
  }, [selectedCompany, locationDisplay, locationCountry, engName, engEmail, engPhone, answers, storageKey]);

  const handleSubmit = async (e) => {
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

    const errors = [];
    let firstErrorField = null;

    document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));

    const requiredQuestions = currentQuestions.filter(q => q.required);
    for (let i = 0; i < requiredQuestions.length; i++) {
      const q = requiredQuestions[i];
      const questionIndex = (template?.questionsData || []).indexOf(q) + 1;
      const answer = answers[`q${questionIndex}`];
      
      if (!answer || !answer.trim()) {
        errors.push({ field: `q${questionIndex}`, message: `Please answer: ${q.title}.` });
        const questionElement = document.querySelector(`[name="q${questionIndex}"]`);
        if (questionElement) {
          questionElement.classList.add('has-error');
          if (!firstErrorField) firstErrorField = { current: questionElement };
        }
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

    const payload = {
      maintained_by: selectedCompany,
      location_display: locationDisplay,
      location_country: locationCountry,
      maintenance_type: "Annual",
      date_of_maintenance: new Date().toISOString(),
      engineer_name: engName,
      engineer_email: engEmail,
      engineer_phone: engPhone,
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
          images: (questionImages[questionKey] || []).map(img => ({ url: img.url, fileType: img.fileType }))
        };
      }),
    };

    try {
      const res = await fetch("/api/submit-maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to submit to database. Please try again.");
      const submitResult = await res.json();

      try {
        await fetch('/api/mark-draft-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unitId: unit?.record_id,
            maintenanceType: 'Annual',
            engineerEmail: engEmail,
          }),
        });
      } catch (err) {
        console.log('No draft to mark complete (form completed without auto-save)');
      }

      const companyLogoUrl = getCompanyLogoUrl(unit?.company, unit?.serial_number);

      await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engineerEmail: engEmail,
          engineerName: engName,
          serialNumber: unit?.serial_number,
          company: unit?.company,
          answers: emailFriendlyAnswers,
          reportType: "Annual",
          companyLogoUrl: companyLogoUrl,
          recordRef: submitResult.recordRef,
          technicalData: {
            unit_record_id: unit?.record_id,
            checklist_template_id: template?.id,
            maintenance_company: selectedCompany,
            engineer_name: engName,
            location_display: locationDisplay,
            date_of_maintenance: new Date().toISOString().split('T')[0],
            time_of_maintenance: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          },
        }),
      });

      (template?.questionsData || []).forEach((_, i) => {
        const questionKey = `q${i + 1}`;
        const imageStorageKey = `images_annual_${unit?.serial_number}_${questionKey}`;
        localStorage.removeItem(imageStorageKey);
      });

      localStorage.setItem("last_submitted_sn", unit?.serial_number);
      localStorage.setItem("last_maintenance_type", "Annual");
      localStorage.setItem("last_public_token", unit?.public_token);
      localStorage.removeItem(`${storageKey}_step`);
      localStorage.removeItem(storageKey);
      router.push(`/portal/swift/annual-complete`);
    } catch (err) {
      setErrorMsg(err.message);
      setSubmitting(false);
      hasSubmittedRef.current = false; // Reset on error
    }
  };

  const logo = getClientLogo(unit?.company, unit?.serial_number);
  const hasEngineerResults = filteredEngineers.length > 0;
  const hasClearEng = engName && engName !== "Please select" && engName !== "";
  const shouldShowEngDropdown = showEngineerDropdown && (hasEngineerResults || hasClearEng);
  
  return (
    <div className="form-scope">
      <Head>
        <title>{unit?.serial_number} | Annual Maintenance</title>
      </Head>

      <div className="swift-main-layout-wrapper">
        <div className="page-wrapper">
          <div className="swift-checklist-container">
            {logo && (
              <div className="checklist-logo">
                <Image src={logo.src} alt={logo.alt} fill priority sizes="250px" />
              </div>
            )}

            <h1 className="checklist-hero-title">
              {unit?.serial_number}
              <span className="break-point">annual maintenance</span>
            </h1>

            {/* CARD 1: ADMIN FIELDS */}
            <div className="checklist-form-card">
              <div className="checklist-inline-group">
                <div className="checklist-field" ref={companyFieldRef}>
                  <label className="checklist-label">Maintenance company</label>
                  <div className="custom-dropdown-container" ref={companyDropdownRef}>
                    <div className="field-icon-wrapper">
                      <input
                        readOnly
                        className={clsx(
                          "checklist-input",
                          selectedCompany ? "is-active" : "is-placeholder",
                          showCompanyDropdown && "is-focused",
                          fieldErrors.company && "has-error"
                        )}
                        value={selectedCompany || "Please select"}
                        onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                        style={{ cursor: "pointer", paddingRight: "40px" }}
                      />
                      <div className="field-icon-inside">
                        {showCompanyDropdown ? <ChevronUp size={20} strokeWidth={1.5} /> : <ChevronDown size={20} strokeWidth={1.5} />}
                      </div>
                    </div>
                    {showCompanyDropdown && (
                      <ul className={clsx("custom-dropdown-list", fieldErrors.company && "has-error")}>
                        {companies.sort().map((c, i) => (
                          <li
                            key={i}
                            className={`custom-dropdown-item ${selectedCompany === c ? "active" : ""}`}
                            onClick={() => selectCompany(c)}
                          >
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="checklist-field" ref={locationFieldRef}>
                  <label className="checklist-label">Location</label>
                  <input
                    className={clsx("checklist-input", fieldErrors.location && "has-error")}
                    name="location_display"
                    required
                    value={locationDisplay}
                    onChange={(e) => {
                      setLocationDisplay(e.target.value);
                      if (e.target.value.trim()) {
                        e.target.classList.remove('has-error');
                        setFieldErrors(prev => ({ ...prev, location: false }));
                      }
                    }}
                  />
                </div>

                <div className="checklist-field">
                  <label className="checklist-label">Date</label>
                  <DatePicker
                    value={maintenanceDate}
                    onChange={(date) => setMaintenanceDate(date)}
                    max={today}
                  />
                </div>
              </div>

              <div className="checklist-inline-group" style={{ marginTop: "24px" }}>
                <div className="checklist-field" ref={engineerFieldRef}>
                  <label className="checklist-label">Engineer name</label>
                  <div className="custom-dropdown-container" ref={engineerDropdownRef}>
                    <div className="field-icon-wrapper">
                      <input
                        className={clsx(
                          "checklist-input",
                          engName === "Please select" || !engName ? "is-placeholder" : "is-active",
                          shouldShowEngDropdown && "is-focused",
                          fieldErrors.engineerName && "has-error"
                        )}
                        name="engineer_name"
                        required
                        value={engName}
                        autoComplete="off"
                        onFocus={() => {
                          if (selectedCompany) setShowEngineerDropdown(true);
                        }}
                        onChange={(e) => {
                          setEngName(e.target.value);
                          if (selectedCompany) setShowEngineerDropdown(true);
                          if (e.target.value.trim() && e.target.value !== "Please select") {
                            setFieldErrors(prev => ({ ...prev, engineerName: false }));
                          }
                        }}
                        style={{
                          paddingRight: selectedCompany && (hasEngineerResults || hasClearEng) ? "40px" : "16px",
                        }}
                      />
                      {selectedCompany && (hasEngineerResults || hasClearEng) && (
                        <div className="field-icon-inside">
                          {showEngineerDropdown ? <ChevronUp size={20} strokeWidth={1.5} /> : <ChevronDown size={20} strokeWidth={1.5} />}
                        </div>
                      )}
                    </div>
                    {shouldShowEngDropdown && (
                      <ul className={clsx("custom-dropdown-list", fieldErrors.engineerName && "has-error")}>
                        {hasClearEng && (
                          <li className="custom-dropdown-item" onClick={clearEngineer}>
                            Clear details
                          </li>
                        )}
                        {filteredEngineers.map((eng, i) => (
                          <li key={i} className="custom-dropdown-item" onClick={() => selectEngineer(eng)}>
                            {eng.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="checklist-field">
                  <label className="checklist-label">Engineer email</label>
                  <input
                    type="email"
                    className={clsx("checklist-input", fieldErrors.engineerEmail && "has-error")}
                    name="engineer_email"
                    required
                    value={engEmail}
                    onChange={(e) => {
                      setEngEmail(e.target.value);
                      if (e.target.value.trim()) {
                        e.target.classList.remove('has-error');
                        setFieldErrors(prev => ({ ...prev, engineerEmail: false }));
                      }
                    }}
                  />
                </div>

                <div className="checklist-field">
                  <label className="checklist-label">Engineer phone</label>
                  <input
                    type="tel"
                    className={clsx("checklist-input", fieldErrors.engineerPhone && "has-error")}
                    name="engineer_phone"
                    required
                    value={engPhone}
                    onChange={(e) => {
                      setEngPhone(e.target.value);
                      if (e.target.value.trim()) {
                        e.target.classList.remove('has-error');
                        setFieldErrors(prev => ({ ...prev, engineerPhone: false }));
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off" noValidate style={{ width: "100%", display: "block", margin: 0, padding: 0 }}>
            {/* CARD 2: QUESTIONS (Multi-step) */}
            <div ref={card2Ref} className="checklist-form-card" style={{ marginTop: "20px" }}>
                {currentStep === 1 && (
                  <>
                    <h3 className="checklist-section-title">Annual maintenance</h3>
                    <p className="checklist-section-subtitle">
                      All annual maintenance must be completed in accordance with the approved SWIFT Survivor Recovery System Maintenance Manual.
                    </p>
                  </>
                )}
                
                {currentSection && currentSection.step > 1 && (
                  <h3 className="checklist-section-title" style={{ margin: "0 0 22px" }}>{currentSection.title}</h3>
                )}
                
                {currentQuestions.map((q, idx) => {
                  const questionIndex = (template?.questionsData || []).indexOf(q) + 1;
                  return (
                    <div key={q.id} style={{ marginTop: idx === 0 ? "0" : "24px" }}>
                      <label className="checklist-label">
                        {q.title}
                      </label>
                      {q.instruction && (
                        <p className="question-instruction">{q.instruction}</p>
                      )}
                      
                      <div className="question-with-upload">
                        <div className="textarea-wrapper">
                          <textarea
                            name={`q${questionIndex}`}
                            className="checklist-textarea"
                            value={answers[`q${questionIndex}`] || ""}
                            onChange={(e) => {
                              setAnswers((prev) => ({ ...prev, [e.target.name]: e.target.value }));
                              autoGrow(e);
                              if (e.target.value.trim()) {
                                e.target.classList.remove('has-error');
                              }
                            }}
                            onInput={autoGrow}
                            placeholder=""
                            required={q.required}
                          />

                          <VoiceInput
                            onTranscript={(text) => {
                              const questionKey = `q${questionIndex}`;
                              setAnswers((prev) => ({
                                ...prev,
                                [questionKey]: (prev[questionKey] || '') + text
                              }));
                              requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                  const textarea = document.querySelector(`[name="${questionKey}"]`);
                                  if (textarea) autoGrow(textarea);
                                });
                              });
                            }}
                            onError={(errorMsg) => setErrorMsg(errorMsg)}
                          />
                        </div>
                        
                        {q.allow_uploads && (
                          <ImageUploader
                            questionKey={`q${questionIndex}`}
                            questionText={q.title}
                            serialNumber={unit?.serial_number}
                            maintenanceType="annual"
                            initialImages={questionImages[`q${questionIndex}`] || []}
                            onImagesChange={(images) => handleImagesChange(`q${questionIndex}`, images)}
                            hasError={q.id === 1 && fieldErrors.photographImages}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}

                {currentStep < sections.length && errorMsg && <p className="error-message">{errorMsg}</p>}

                {currentStep < sections.length && (
                  <button
                    type="button"
                    className="checklist-submit"
                    onClick={handleContinueToNextStep}
                  >
                    Continue
                  </button>
                )}
            </div>

            {/* CARD 3: DECLARATION & SIGNATURE */}
            {currentStep === sections.length && (
              <div className="checklist-form-card" style={{ marginTop: "20px" }}>
                <h3 className="checklist-section-title">Declaration</h3>

                {template?.declarationText && (
                  <div className={clsx("declaration-checkbox", fieldErrors.declaration && "has-error")}>
                    <input
                      type="checkbox"
                      id="declaration-check"
                      checked={declarationChecked}
                      onChange={(e) => {
                        setDeclarationChecked(e.target.checked);
                        if (e.target.checked) {
                          setFieldErrors(prev => ({ ...prev, declaration: false }));
                          setErrorMsg("");
                        }
                      }}
                    />
                    <label htmlFor="declaration-check" className="declaration-checkmark" />
                    <span className="declaration-text">
                      {template.declarationText}
                    </span>
                  </div>
                )}

                <div style={{ marginTop: "20px" }}>
                  <label className="checklist-label">Signature</label>
                  <div style={{ marginTop: "8px" }}>
                    <SignaturePad
                      ref={signatureRef}
                      onChange={(data) => {
                        setSignatureData(data);
                        if (data) setFieldErrors(prev => ({ ...prev, signature: false }));
                      }}
                      hasError={fieldErrors.signature}
                    />
                  </div>
                </div>

                {errorMsg && <p className="error-message">{errorMsg}</p>}
                <button type="submit" className="checklist-submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit maintenance"}
                </button>
              </div>
            )}
            </form>
          </div>
        </div>

        <footer className="footer-section">
          <a href="https://www.zelim.com" target="_blank" rel="noopener noreferrer">
            <Image src="/logo/zelim-logo.svg" width={120} height={40} alt="Zelim logo" />
          </a>
        </footer>
      </div>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const publicToken = params.id;
  
  try {
    const data = await fetchFormData(publicToken, 'Annual');
    
    if (data.notFound) {
      return { redirect: { destination: '/', permanent: false } };
    }
    
    return { 
      props: {
        unit: data.unit,
        template: data.template,
        companies: data.companies,
        engineers: data.engineers,
      } 
    };
  } catch (error) {
    console.error('Error loading annual form:', error);
    return { redirect: { destination: '/', permanent: false } };
  }
}