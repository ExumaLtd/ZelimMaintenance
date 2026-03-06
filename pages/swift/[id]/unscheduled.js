import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import { z } from "zod";
import clsx from "clsx";
import { getCompanyLogoUrl, getClientLogo } from '../../../utils/get-company-logo';
import { autoGrow } from '../../../utils/form-utils';
import ImageUploader from '../../../components/image-uploader';
import VoiceInput from '../../../components/voice-input';
import DatePicker from '../../../components/date-picker';
import { ChevronDown, ChevronUp } from "lucide-react";
import SignaturePad from '../../../components/signature-pad';
import { useAutoSave } from '../../../hooks/use-auto-save';
import { getClientSession } from '../../../lib/session';
import { fetchFormData } from '@/lib/data-fetching';

const unscheduledSchema = z.object({
  company: z.string().min(1, 'Please select a maintenance company.'),
  location: z.string().min(1, 'Please provide a location.'),
  engineerName: z.string().min(1, 'Please select or enter an engineer name.'),
  engineerEmail: z.string().email('Please provide a valid engineer email.'),
  engineerPhone: z.string().min(1, 'Please provide an engineer phone number.'),
  declaration: z.boolean().refine(val => val === true, { message: 'Please accept the declaration before submitting.' }),
  signature: z.string().min(1, 'Please sign before submitting.'),
});


export default function Unscheduled({ unit, template, allCompanies = [], allEngineers = [] }) {
  const router = useRouter();

  const companyFieldRef = useRef(null);
  const locationFieldRef = useRef(null);
  const engineerFieldRef = useRef(null);
  const signatureRef = useRef(null);
  const companyDropdownRef = useRef(null);
  const engineerDropdownRef = useRef(null);
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
    declaration: false,
    signature: false,
  });

  const [answers, setAnswers] = useState({});
  const [questionImages, setQuestionImages] = useState({});

  const [locationDisplay, setLocationDisplay] = useState("");
  const [locationCountry, setLocationCountry] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [engName, setEngName] = useState("");
  const [engEmail, setEngEmail] = useState("");
  const [engPhone, setEngPhone] = useState("");
  const [engId, setEngId] = useState("");

  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showEngineerDropdown, setShowEngineerDropdown] = useState(false);

  const storageKey = useMemo(() => {
  const session = getClientSession();
  const pin = session?.pin || 'unknown';
  return `draft_unscheduled_${unit?.serial_number}_${pin}`;
}, [unit?.serial_number]);

  // Auto-save draft to Airtable
  useAutoSave({
    unitId: unit?.record_id,
    maintenanceType: 'Unscheduled',
    engineerEmail: engEmail,
    draftData: {
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
    setEngId(engineer.id || "");
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
    setEngId("");
    setShowEngineerDropdown(false);
  }, []);

  const handleImagesChange = (questionKey, images) => {
    setQuestionImages(prev => ({
      ...prev,
      [questionKey]: images
    }));
  };

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

  // Load draft - ALWAYS check Airtable first, localStorage as fallback
  useEffect(() => {
    setToday(new Date().toISOString().split("T")[0]);
    
    const loadDraft = async () => {
      if (hasLoadedDraftRef.current) {
        console.log('⏭️ Draft already loaded, skipping...');
        return;
      }
      
      // PRIORITY 1: ALWAYS check Airtable first
      if (unit?.record_id) {
        try {
          console.log('🔍 Checking Airtable for draft...');
          const res = await fetch(
            `/api/get-draft?unitId=${unit.record_id}&maintenanceType=Unscheduled`
          );
          const data = await res.json();
          
          if (data.draft) {
            console.log('📦 Draft found in Airtable');
            
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
            return;
          } else {
            console.log('ℹ️ No draft found in Airtable');
          }
        } catch (error) {
          console.error('❌ Failed to load Airtable draft:', error);
        }
      }
      
      // PRIORITY 2: localStorage fallback
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
              `/api/reverse-geocode?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
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

    const newFieldErrors = {
      company: false,
      location: false,
      engineerName: false,
      engineerEmail: false,
      engineerPhone: false,
      declaration: false,
      signature: false,
    };

    document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));

    const result = unscheduledSchema.safeParse({
      company: selectedCompany || "",
      location: locationDisplay?.trim() || "",
      engineerName: (engName && engName !== "Please select") ? engName.trim() : "",
      engineerEmail: engEmail?.trim() || "",
      engineerPhone: engPhone?.trim() || "",
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
          if (!firstErrorField) firstErrorField = companyFieldRef;
        } else if (field === 'location') {
          newFieldErrors.location = true;
          if (!firstErrorField) firstErrorField = locationFieldRef;
        } else if (field === 'engineerName') {
          newFieldErrors.engineerName = true;
          if (!firstErrorField) firstErrorField = engineerFieldRef;
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
        const questionElement = document.querySelector(`[name="q${questionIndex}"]`);
        if (questionElement) {
          questionElement.classList.add('has-error');
          if (!firstErrorField) firstErrorField = { current: questionElement };
        }
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
            if (firstErrorField.current.focus) {
              firstErrorField.current.focus();
            }
          }, 300);
        }
      }
      return;
    }

    // Signature (base64 data URL) is uploaded server-side so record_ref can be used as filename

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
      maintenance_type: "Unscheduled",
      date_of_maintenance: new Date().toISOString(),
      engineer_name: engName,
      engineer_email: engEmail,
      engineer_phone: engPhone,
      engineer_record_id: engId,
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
            maintenanceType: 'Unscheduled',
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
          reportType: "Unscheduled",
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
        const imageStorageKey = `images_unscheduled_${unit?.serial_number}_${questionKey}`;
        localStorage.removeItem(imageStorageKey);
      });

      localStorage.setItem("last_submitted_sn", unit?.serial_number);
      localStorage.setItem("last_maintenance_type", "Unscheduled");
      localStorage.setItem("last_public_token", unit?.public_token);
      localStorage.removeItem(storageKey);
      router.push(`/portal/swift/unscheduled-complete`);
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
        <title>{unit?.serial_number} | Unscheduled Maintenance</title>
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
              <span className="break-point">unscheduled maintenance</span>
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
                    className={clsx("checklist-input", fieldErrors.location && "has-error")}
                    name="location_display"
                    required
                    value={locationDisplay}
                    onChange={(e) => {
                      setLocationDisplay(e.target.value);
                      if (e.target.value.trim()) {
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
                        setFieldErrors(prev => ({ ...prev, engineerPhone: false }));
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off" noValidate style={{ width: "100%", display: "block", margin: 0, padding: 0 }}>
            {/* CARD 2: QUESTIONS */}
            <div className="checklist-form-card" style={{ marginTop: "20px" }}>
                <h3 className="checklist-section-title">Unscheduled maintenance</h3>
                <p className="checklist-section-subtitle">
                  All unscheduled maintenance must be completed in accordance with the approved SWIFT Survivor Recovery System Maintenance Manual.
                </p>
                
                {(template?.questionsData || []).map((q, i) => (
                  <div key={i} style={{ marginTop: i === 0 ? "0" : "24px" }}>
                    <label className="checklist-label unscheduled-question-label">
                      {q.title}
                    </label>
                    {q.instruction && (
                      <p className="question-instruction unscheduled-question-instruction">{q.instruction}</p>
                    )}
                    
                    <div className="question-with-upload">
                      <div className="textarea-wrapper">
                        <textarea
                          name={`q${i + 1}`}
                          className="checklist-textarea"
                          value={answers[`q${i + 1}`] || ""}
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
                            const questionKey = `q${i + 1}`;
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
                          questionKey={`q${i + 1}`}
                          questionText={q.title}
                          serialNumber={unit?.serial_number}
                          maintenanceType="unscheduled"
                          initialImages={questionImages[`q${i + 1}`] || []}
                          onImagesChange={(images) => handleImagesChange(`q${i + 1}`, images)}
                        />
                      )}
                    </div>
                  </div>
                ))}

            </div>

            {/* CARD 3: DECLARATION & SIGNATURE */}
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
                  <span className="left">{submitting ? "Submitting" : "Submit maintenance"}</span>
                  <span className="right">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M10.1458 7.5L0 7.5L0 5.83333L10.1458 5.83333L5.47917 1.16667L6.66667 0L13.3333 6.66667L6.66667 13.3333L5.47917 12.1667L10.1458 7.5Z" fill="#172F36"/>
                    </svg>
                  </span>
                </button>
            </div>
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
  const token = params.id;
  try {
    const data = await fetchFormData(token, 'Unscheduled');

    if (data.notFound) {
      return { redirect: { destination: '/', permanent: false } };
    }

    return {
      props: {
        unit: data.unit,
        template: data.template,
        allCompanies: data.companies,
        allEngineers: data.engineers,
      },
    };
  } catch (err) {
    console.error('Error loading unscheduled form:', err);
    return { redirect: { destination: '/', permanent: false } };
  }
}