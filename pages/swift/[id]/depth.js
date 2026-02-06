import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import { getCompanyLogoUrl } from '../../../utils/get-company-logo';
import ImageUploader from '../../../components/image-uploader';
import VoiceInput from '../../../components/voice-input';
import DatePicker from '../../../components/date-picker';
import { ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { useAutoSave } from '../../../hooks/use-auto-save';
import { fetchFormData } from '@/lib/data-fetching';
import { getClientSession } from '../../../lib/session';

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
  { 
    step: 1, 
    title: "Pre-disassembly inspection", 
    subtitle: "Equipment checklist"
  },
  { 
    step: 2, 
    title: "30-month depth maintenance",
    subtitle: "All 30-month depth maintenance must be completed in accordance with the approved SWIFT Survivor Recovery System Maintenance Manual and Installation Guide.", 
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
    title: "Clean the SWIFT", 
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

export default function Depth({ unit, template, allCompanies = [], allEngineers = [] }) {
  const router = useRouter();

  const companyFieldRef = useRef(null);
  const locationFieldRef = useRef(null);
  const engineerFieldRef = useRef(null);
  const companyDropdownRef = useRef(null);
  const engineerDropdownRef = useRef(null);
  const card2Ref = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [today, setToday] = useState("");
  const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [fieldErrors, setFieldErrors] = useState({
    company: false,
    location: false,
    engineerName: false,
    engineerEmail: false,
    engineerPhone: false,
    photographImages: false,
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [checklistData, setChecklistData] = useState([]);
  const [closingItems, setClosingItems] = useState(new Set());

  const [locationDisplay, setLocationDisplay] = useState("");
  const [locationCountry, setLocationCountry] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [engName, setEngName] = useState("");
  const [engEmail, setEngEmail] = useState("");
  const [engPhone, setEngPhone] = useState("");
  const [answers, setAnswers] = useState({});
  const [questionImages, setQuestionImages] = useState({});
  const [checklistImages, setChecklistImages] = useState({});

  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showEngineerDropdown, setShowEngineerDropdown] = useState(false);

  const storageKey = useMemo(() => {
  const session = getClientSession();
  const pin = session?.pin || 'unknown';
  return `draft_depth_${unit?.serial_number}_${pin}`;
}, [unit?.serial_number]);

  // Refs to prevent duplicate operations
  const hasLoadedDraftRef = useRef(false);
  const hasSubmittedRef = useRef(false);

  // ✅ NEW: Check if winch was returned (item id: 3)
  const isWinchReturned = useMemo(() => {
    const winchItem = checklistData.find(item => item.id === 3);
    return winchItem?.returned === true;
  }, [checklistData]);

  useAutoSave({
    unitId: unit?.record_id,
    maintenanceType: '30-month depth',
    engineerEmail: engEmail,
    draftData: {
      checklistData,
      currentStep,
      answers,
      questionImages,
      checklistImages,
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
      (checklistData && checklistData.length > 0 && checklistData.some(item => 
        item.returned !== null || item.condition !== null
      )) ||
      Object.keys(answers).some(key => answers[key]?.trim()) ||
      Object.keys(questionImages).length > 0 ||
      Object.keys(checklistImages).length > 0 ||
      (selectedCompany && selectedCompany !== '') ||
      (engName && engName !== '' && engName !== 'Please select') ||
      (engEmail && engEmail !== '') ||
      (engPhone && engPhone !== '')
    )
  );

  // Initialize checklist data from template (only for fresh starts)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isDraft = urlParams.get('draft') === 'true';
    if (isDraft) return;
    
    if (template?.maintenanceChecklist && !hasLoadedDraftRef.current) {
      setChecklistData(
        template.maintenanceChecklist.map(item => ({
          ...item,
          returned: null,
          condition: null,
        }))
      );
    }
  }, [template]);

  const filteredEngineers = useMemo(() => {
    if (!selectedCompany) return [];
    let list = allEngineers.filter(e => e.companyName === selectedCompany && e.name !== engName);

    if (engName && engName !== "Please select" && engName.trim()) {
      const search = engName.toLowerCase();
      return list.filter(e => e.name.toLowerCase().includes(search));
    }
    return list;
  }, [selectedCompany, engName, allEngineers]);

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
    
    // Clear photo error when images are uploaded for "Photograph SWIFT" question
    if (questionKey === 'q1' && images.length > 0) {
      setFieldErrors(prev => ({ ...prev, photographImages: false }));
      setErrorMsg("");
    }
  };

  const handleChecklistImagesChange = (itemId, images) => {
    setChecklistImages(prev => ({
      ...prev,
      [`item_${itemId}`]: images
    }));
  };

  const updateChecklist = (index, field, value) => {
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
      
      const rows = document.querySelectorAll('.equipment-row-wrapper');
      if (rows[index]) {
        const allButtons = rows[index].querySelectorAll('.toggle-btn');
        allButtons.forEach(btn => btn.classList.remove('has-error'));
      }
      
      return updated;
    });
  };

  const isChecklistComplete = () => {
    return checklistData.every(item => {
      if (item.returned === null) return false;
      if (item.returned === true && item.condition === null) return false;
      return true;
    });
  };

  // Get current section configuration
  const currentSection = sections.find(s => s.step === currentStep);
  
  // Get questions for current step (Steps 2-8)
  const currentQuestions = useMemo(() => {
    if (!currentSection || !currentSection.questionIds || !template?.questionsData) return [];
    return template.questionsData.filter(q => 
      currentSection.questionIds.includes(q.id)
    );
  }, [currentSection, template?.questionsData]);

  // ✅ UPDATED: Handle continue to next step with winch skip logic
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
      if (!selectedCompany || selectedCompany === "Please select") {
        errors.push('company');
        newFieldErrors.company = true;
      }

      if (!locationDisplay || !locationDisplay.trim()) {
        errors.push('location');
        newFieldErrors.location = true;
        const locationInput = document.querySelector('[name="location_display"]');
        if (locationInput) locationInput.classList.add('has-error');
      }

      if (!engName || engName === "Please select" || !engName.trim()) {
        errors.push('engineer');
        newFieldErrors.engineerName = true;
        const engineerInput = document.querySelector('[name="engineer_name"]');
        if (engineerInput) engineerInput.classList.add('has-error');
      }

      if (!engEmail || !engEmail.trim()) {
        errors.push('email');
        newFieldErrors.engineerEmail = true;
        const emailInput = document.querySelector('[name="engineer_email"]');
        if (emailInput) emailInput.classList.add('has-error');
      }

      if (!engPhone || !engPhone.trim()) {
        errors.push('phone');
        newFieldErrors.engineerPhone = true;
        const phoneInput = document.querySelector('[name="engineer_phone"]');
        if (phoneInput) phoneInput.classList.add('has-error');
      }

      // Validate equipment checklist
      const incompleteItems = [];
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
          const rows = document.querySelectorAll('.equipment-row-wrapper');
          if (rows[item.index]) {
            if (item.type === 'returned') {
              const returnedButtons = rows[item.index].querySelectorAll('.toggle-group:not(.condition-group) .toggle-btn');
              returnedButtons.forEach(btn => btn.classList.add('has-error'));
            } else if (item.type === 'condition') {
              const conditionButtons = rows[item.index].querySelectorAll('.condition-group .toggle-btn');
              conditionButtons.forEach(btn => btn.classList.add('has-error'));
            }
          }
        });
      }
    }

    // Validate photograph upload on step 2 (Photograph SWIFT)
    if (currentStep === 2) {
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

    // Validate current step questions (Steps 2-8)
    if (currentStep > 1) {
      const requiredQuestions = currentQuestions.filter(q => q.required && q.id !== 1); // Exclude photograph question
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
    }

    setFieldErrors(newFieldErrors);

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
    
    // ✅ NEW: Skip Step 8 (Winch maintenance) if winch not returned
    let nextStep = currentStep + 1;
    if (currentStep === 7 && !isWinchReturned) {
      nextStep = 9; // Skip step 8
      console.log('⏭️ Skipping Step 8 (Winch maintenance) - winch not returned');
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
        // ✅ NEW: Handle back button with winch skip logic
        let previousStep = currentStep - 1;
        if (currentStep === 9 && !isWinchReturned) {
          previousStep = 7; // Skip back over step 8
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

// Save currentStep to localStorage whenever it changes
useEffect(() => {
  if (currentStep > 1) {
    localStorage.setItem(`${storageKey}_step`, currentStep.toString());
  }
}, [currentStep, storageKey]);

  // Load localStorage draft (only for page refreshes, not "Continue maintenance")
  useEffect(() => {
    setToday(new Date().toISOString().split("T")[0]);
    
    const urlParams = new URLSearchParams(window.location.search);
    const isDraft = urlParams.get('draft') === 'true';
    if (isDraft) return; // Skip localStorage when loading from Airtable
    
    const savedDraft = localStorage.getItem(storageKey);
    if (!savedDraft) return;

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
      
      if (data.checklist_data && Array.isArray(data.checklist_data)) {
        setChecklistData(data.checklist_data);
      }

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
    } catch (e) {
      console.error("Draft load error:", e);
    }
  }, [storageKey]);

  // Load draft from Airtable - ONLY when coming from "Continue maintenance"
  useEffect(() => {
    const loadDraft = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const isDraft = urlParams.get('draft') === 'true';
      
      if (!isDraft) return;
      if (!unit?.record_id) return;
      if (hasLoadedDraftRef.current) return; // Prevent duplicate loads
      
      hasLoadedDraftRef.current = true; // Mark as loaded immediately
      
      try {
        const res = await fetch(
          `/api/get-draft?unitId=${unit.record_id}&maintenanceType=30-month depth`
        );
        const data = await res.json();
        
        if (data.draft) {
          console.log('📦 Draft found in Airtable');
          
          // Load all data FIRST
          if (data.draft.checklistData) setChecklistData(data.draft.checklistData);
          if (data.draft.answers) setAnswers(data.draft.answers);
          if (data.draft.questionImages) setQuestionImages(data.draft.questionImages);
          if (data.draft.checklistImages) setChecklistImages(data.draft.checklistImages);
          if (data.draft.selectedCompany) setSelectedCompany(data.draft.selectedCompany);
          if (data.draft.locationDisplay) setLocationDisplay(data.draft.locationDisplay);
          if (data.draft.locationCountry) setLocationCountry(data.draft.locationCountry);
          if (data.draft.engName) setEngName(data.draft.engName);
          if (data.draft.engEmail) setEngEmail(data.draft.engEmail);
          if (data.draft.engPhone) setEngPhone(data.draft.engPhone);
          
          // Load currentStep LAST to prevent race conditions
          if (data.draft.currentStep) {
            // Use setTimeout to ensure all state updates complete first
            setTimeout(() => {
              setCurrentStep(data.draft.currentStep);
              console.log(`✅ Draft loaded - restored to step ${data.draft.currentStep}`);
            }, 0);
          } else {
            console.log('✅ Draft loaded from Airtable');
          }
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
        hasLoadedDraftRef.current = false; // Reset on error so user can retry
      }
    };
    
    loadDraft();
  }, [unit?.record_id]);
    
  // Get geolocation
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    if (locationDisplay && locationDisplay.trim() !== "") return;

    const urlParams = new URLSearchParams(window.location.search);
    const isDraft = urlParams.get('draft') === 'true';
    if (isDraft) return;

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=14&accept-language=en-GB`,
            {
              headers: {
                'User-Agent': 'SWIFT Maintenance App'
              }
            }
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
  }, []);

  // Pre-request microphone permission
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.mediaDevices) return;
    
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        stream.getTracks().forEach(track => track.stop());
        if (process.env.NODE_ENV === 'development') {
          console.log('✓ Microphone permission pre-granted');
        }
      })
      .catch(err => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Microphone permission denied or unavailable:', err.message);
        }
      });
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
      checklist_data: checklistData,
      ...answers,
    };
    localStorage.setItem(storageKey, JSON.stringify(draftData));
  }, [selectedCompany, locationDisplay, locationCountry, engName, engEmail, engPhone, checklistData, answers, storageKey]);
  
const handleSubmit = async (e) => {
  e.preventDefault();
  console.log('🔴 FORM SUBMITTED - Step:', currentStep);
  console.log('  - Event type:', e.type);
  console.log('  - Submitter:', e.nativeEvent?.submitter);
  console.log('  - Stack trace:', new Error().stack);
  
  setErrorMsg("");
  if (submitting) return;

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
    hasSubmittedRef.current = true; // Mark as submitted to prevent auto-save

const emailFriendlyAnswers = {};
(template?.questionsData || []).forEach((q, i) => {
  // ✅ Skip winch questions (14-19) if winch not returned
  if (!isWinchReturned && q.id >= 14 && q.id <= 19) {
    return; // Skip this question
  }
  
  const questionKey = `q${i + 1}`;
  const textAnswer = answers[questionKey] || "Not answered";
  const images = questionImages[questionKey] || [];
  
  emailFriendlyAnswers[q.title] = {
    text: textAnswer,
    images: images.map(img => img.url)
  };
});

    const payload = {
      maintained_by: selectedCompany,
      location_display: locationDisplay,
      location_country: locationCountry,
      maintenance_type: template?.type || "Depth",
      date_of_maintenance: new Date().toISOString(),
      engineer_name: engName,
      engineer_email: engEmail,
      engineer_phone: engPhone,
      unit_record_id: unit?.record_id,
      checklist_template_id: template?.id,
      serial_number: unit?.serial_number,
      equipment_checklist: JSON.stringify(
        checklistData.map(item => ({
          ...item,
          images: checklistImages[`item_${item.id}`]?.map(img => img.url) || []
        }))
      ),
      answers: (template?.questionsData || [])
  .filter((q) => {
    // ✅ Skip winch questions (14-19) if winch not returned
    if (!isWinchReturned && q.id >= 14 && q.id <= 19) {
      return false;
    }
    return true;
  })
  .map((q, i) => {
    const questionKey = `q${i + 1}`;
    return {
      question: questionKey,
      answer: answers[questionKey] || "",
      images: (questionImages[questionKey] || []).map(img => img.url)
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
          equipment_checklist: checklistData.map(item => ({
            ...item,
            images: checklistImages[`item_${item.id}`]?.map(img => img.url) || []
          })),
          reportType: template?.type || "Depth",
          companyLogoUrl: companyLogoUrl,
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
        const imageStorageKey = `images_depth_${unit?.serial_number}_${questionKey}`;
        localStorage.removeItem(imageStorageKey);
      });

      localStorage.setItem("last_submitted_sn", unit?.serial_number);
      localStorage.setItem("last_maintenance_type", template?.type || "Depth");
      localStorage.removeItem(storageKey);
      router.push('/portal/swift/depth-complete');
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
        <title>{unit?.serial_number} | Depth Maintenance</title>
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
              <span className="break-point">depth maintenance</span>
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
                        className={`checklist-input ${selectedCompany ? "is-active" : "is-placeholder"} ${
                          showCompanyDropdown ? "is-focused" : ""
                        } ${fieldErrors.company ? "has-error" : ""}`}
                        value={selectedCompany || "Please select"}
                        onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                        style={{ cursor: "pointer", paddingRight: "40px" }}
                      />
                      <div className="field-icon-inside">
                        {showCompanyDropdown ? <ChevronUp size={20} strokeWidth={1.5} /> : <ChevronDown size={20} strokeWidth={1.5} />}
                      </div>
                    </div>
                    {showCompanyDropdown && (
                      <ul className={`custom-dropdown-list ${fieldErrors.company ? "has-error" : ""}`}>
                        {allCompanies.sort().map((c, i) => (
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
                    className={`checklist-input ${fieldErrors.location ? "has-error" : ""}`}
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
                        className={`checklist-input ${
                          engName === "Please select" || !engName ? "is-placeholder" : "is-active"
                        } ${shouldShowEngDropdown ? "is-focused" : ""} ${fieldErrors.engineerName ? "has-error" : ""}`}
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
                      <ul className={`custom-dropdown-list ${fieldErrors.engineerName ? "has-error" : ""}`}>
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
                    className={`checklist-input ${fieldErrors.engineerEmail ? "has-error" : ""}`}
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
                    className={`checklist-input ${fieldErrors.engineerPhone ? "has-error" : ""}`}
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

            {/* CARD 2: MULTI-STEP CONTENT */}
            <div ref={card2Ref} className="checklist-form-card" style={{ marginTop: "20px" }}>
              <form onSubmit={handleSubmit} autoComplete="off" noValidate>
                {/* STEP 1: EQUIPMENT CHECKLIST */}
                {currentStep === 1 && (
                  <div>
                    <h3 className="checklist-section-title">{currentSection.title}</h3>
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
                                className={`toggle-btn ${item.returned === true ? 'active' : ''}`}
                                onClick={() => updateChecklist(index, 'returned', true)}
                              >
                                Yes
                              </button>
                              <button 
                                type="button"
                                className={`toggle-btn ${item.returned === false ? 'active' : ''}`}
                                onClick={() => updateChecklist(index, 'returned', false)}
                              >
                                No
                              </button>
                            </div>
                            
                            <div className={`toggle-group condition-group ${item.returned === true ? 'show-on-mobile' : ''}`}>
                              <button 
                                type="button"
                                className={`toggle-btn ${item.condition === 'good' ? 'active' : ''}`}
                                onClick={() => updateChecklist(index, 'condition', 'good')}
                                disabled={item.returned !== true}
                                style={{ opacity: item.returned !== true ? 0.3 : 1 }}
                              >
                                Good
                              </button>
                              <button 
                                type="button"
                                className={`toggle-btn ${item.condition === 'fair' ? 'active' : ''}`}
                                onClick={() => updateChecklist(index, 'condition', 'fair')}
                                disabled={item.returned !== true}
                                style={{ opacity: item.returned !== true ? 0.3 : 1 }}
                              >
                                Fair
                              </button>
                              <button 
                                type="button"
                                className={`toggle-btn ${item.condition === 'poor' ? 'active' : ''}`}
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
                    
                    <button 
                      type="button"
                      className="checklist-submit"
                      onClick={handleContinueToNextStep}
                    >
                      Continue
                    </button>
                  </div>
                )}

                {/* STEPS 2-8: QUESTIONS */}
                {currentStep > 1 && (
                  <div>
                    {currentStep === 2 && (
                      <>
                        <h3 className="checklist-section-title">{currentSection.title}</h3>
                        <p className="checklist-section-subtitle">{currentSection.subtitle}</p>
                      </>
                    )}
                    
                    {currentSection && currentStep > 2 && (
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
                                maintenanceType="depth"
                                initialImages={questionImages[`q${questionIndex}`] || []}
                                onImagesChange={(images) => handleImagesChange(`q${questionIndex}`, images)}
                                hasError={q.id === 1 && fieldErrors.photographImages}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {errorMsg && <p className="error-message">{errorMsg}</p>}
                    
                    {currentStep < sections.length ? (
                      <button 
                        type="button"
                        className="checklist-submit"
                        onClick={handleContinueToNextStep}
                      >
                        Continue
                      </button>
                    ) : (
                      <button 
                        type="button"
                        className="checklist-submit" 
                        disabled={submitting}
                        onClick={(e) => {
                          const form = e.target.closest('form');
                          if (form) {
                            form.requestSubmit();
                          }
                        }}
                      >
                        {submitting ? "Submitting..." : "Submit maintenance"}
                      </button>
                    )}
                  </div>
                )}
              </form>
            </div>
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
  console.time('⏱️ TOTAL getServerSideProps');
  const token = params.id;
  
  try {
    console.time('⏱️ fetchFormData call');
    const data = await fetchFormData(token, '30-month depth');
    console.timeEnd('⏱️ fetchFormData call');
    
    if (data.notFound) {
      return { redirect: { destination: '/', permanent: false } };
    }
    
    console.time('⏱️ Building props');
    const equipment_checklist = data.template?.rawData?.equipment_checklist || [];
    const questions = data.template?.rawData?.questions || [];
    
    const props = {
      unit: data.unit,
      template: {
        id: data.template?.id,
        type: data.template?.type,
        maintenanceChecklist: equipment_checklist,
        questionsData: questions,
        questions: questions.map(q => q.title),
      },
      allCompanies: data.companies,
      allEngineers: data.engineers,
    };
    console.timeEnd('⏱️ Building props');
    console.timeEnd('⏱️ TOTAL getServerSideProps');
    
    return { props };
  } catch (error) {
    console.error('Error loading depth form:', error);
    return { redirect: { destination: '/', permanent: false } };
  }
}