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

export default function FaultReporting({ unit, template, allCompanies = [], allEngineers = [] }) {
  const router = useRouter();

  const companyFieldRef = useRef(null);
  const locationFieldRef = useRef(null);
  const engineerFieldRef = useRef(null);
  const companyDropdownRef = useRef(null);
  const engineerDropdownRef = useRef(null);
  const hasLoadedDraftRef = useRef(false);
  const hasSubmittedRef = useRef(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [today, setToday] = useState("");
  const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    company: false,
    location: false,
    engineerName: false,
    engineerEmail: false,
    engineerPhone: false,
    declaration: false,
  });

  const [answers, setAnswers] = useState({});
  const [questionImages, setQuestionImages] = useState({});

  const [locationDisplay, setLocationDisplay] = useState("");
  const [locationCountry, setLocationCountry] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [engName, setEngName] = useState("");
  const [engEmail, setEngEmail] = useState("");
  const [engPhone, setEngPhone] = useState("");

  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showEngineerDropdown, setShowEngineerDropdown] = useState(false);

  const storageKey = useMemo(() => {
  const session = getClientSession();
  const pin = session?.pin || 'unknown';
  return `draft_fault_${unit?.serial_number}_${pin}`;
}, [unit?.serial_number]);

  // Auto-save draft to Airtable
  useAutoSave({
    unitId: unit?.record_id,
    maintenanceType: 'Fault report',
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
            `/api/get-draft?unitId=${unit.record_id}&maintenanceType=Fault report`
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

  // Pre-request microphone permission on page load
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
      ...answers,
    };
    localStorage.setItem(storageKey, JSON.stringify(draftData));
  }, [selectedCompany, locationDisplay, locationCountry, engName, engEmail, engPhone, answers, storageKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (submitting) return;

    hasSubmittedRef.current = true;

    const errors = [];
    let firstErrorField = null;
    const newFieldErrors = {
      company: false,
      location: false,
      engineerName: false,
      engineerEmail: false,
      engineerPhone: false,
      declaration: false,
    };

    document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));

    if (!selectedCompany || selectedCompany === "Please select") {
      errors.push({ field: 'company', message: 'Please select a maintenance company.' });
      newFieldErrors.company = true;
      if (!firstErrorField) firstErrorField = companyFieldRef;
    }

    if (!locationDisplay || !locationDisplay.trim()) {
      errors.push({ field: 'location', message: 'Please provide a location.' });
      newFieldErrors.location = true;
      if (!firstErrorField) firstErrorField = locationFieldRef;
    }

    if (!engName || engName === "Please select" || !engName.trim()) {
      errors.push({ field: 'engineer', message: 'Please select or enter an engineer name.' });
      newFieldErrors.engineerName = true;
      if (!firstErrorField) firstErrorField = engineerFieldRef;
    }

    if (!engEmail || !engEmail.trim()) {
      errors.push({ field: 'email', message: 'Please provide an engineer email.' });
      newFieldErrors.engineerEmail = true;
    }

    if (!engPhone || !engPhone.trim()) {
      errors.push({ field: 'phone', message: 'Please provide an engineer phone number.' });
      newFieldErrors.engineerPhone = true;
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

    // Declaration must be checked
    if (!declarationChecked) {
      errors.push({ field: 'declaration', message: 'Please confirm the declaration before submitting.' });
      newFieldErrors.declaration = true;
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
      hasSubmittedRef.current = false;
      return;
    }

    setSubmitting(true);

    const emailFriendlyAnswers = {};
    (template?.questionsData || []).forEach((q, i) => {
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
      maintenance_type: "Fault report",
      date_of_maintenance: new Date().toISOString(),
      engineer_name: engName,
      engineer_email: engEmail,
      engineer_phone: engPhone,
      unit_record_id: unit?.record_id,
      checklist_template_id: template?.id,
      serial_number: unit?.serial_number,
      declaration_text: template?.declarationText || "",
      answers: (template?.questionsData || []).map((q, i) => {
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
      const submitResult = await res.json();

      try {
        await fetch('/api/mark-draft-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unitId: unit?.record_id,
            maintenanceType: 'Fault report',
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
          reportType: "Fault report",
          recordRef: submitResult.recordRef,
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
        const imageStorageKey = `images_fault_reporting_${unit?.serial_number}_${questionKey}`;
        localStorage.removeItem(imageStorageKey);
      });

      localStorage.setItem("last_submitted_sn", unit?.serial_number);
      localStorage.setItem("last_maintenance_type", "Fault report");
      localStorage.setItem("last_public_token", unit?.public_token);
      localStorage.removeItem(storageKey);
      router.push(`/portal/swift/fault-reporting-complete`);
    } catch (err) {
      setErrorMsg(err.message);
      setSubmitting(false);
      hasSubmittedRef.current = false;
    }
  };

  const logo = getClientLogo(unit?.company, unit?.serial_number);
  const hasEngineerResults = filteredEngineers.length > 0;
  const hasClearEng = engName && engName !== "Please select" && engName !== "";
  const shouldShowEngDropdown = showEngineerDropdown && (hasEngineerResults || hasClearEng);

  return (
    <div className="form-scope">
      <Head>
        <title>{unit?.serial_number} | Fault Reporting</title>
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
              <span className="break-point">fault reporting</span>
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
                        setFieldErrors(prev => ({ ...prev, engineerPhone: false }));
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* CARD 2: QUESTIONS */}
            <div className="checklist-form-card" style={{ marginTop: "20px" }}>
              <form onSubmit={handleSubmit} autoComplete="off" noValidate>
                <h3 className="checklist-section-title">Fault report</h3>
                <p className="checklist-section-subtitle">
                  Report damage, defects, or wear on the SWIFT. Describe what is affected and when it was noticed, then attach clear photos where possible.
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
                          maintenanceType="fault_reporting"
                          initialImages={questionImages[`q${i + 1}`] || []}
                          onImagesChange={(images) => handleImagesChange(`q${i + 1}`, images)}
                        />
                      )}
                    </div>
                  </div>
                ))}

                {template?.declarationText && (
                  <div className={`declaration-checkbox ${fieldErrors.declaration ? 'has-error' : ''}`}>
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

                {errorMsg && <p className="error-message">{errorMsg}</p>}
                <button type="submit" className="checklist-submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit fault"}
                </button>
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
  const token = params.id;
  try {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_SWIFT_TABLE || "swift_units";

    if (!apiKey || !baseId) throw new Error("Missing Airtable Env");

    const headers = { Authorization: `Bearer ${apiKey}` };
    const unitFormula = encodeURIComponent(`{public_token}='${token}'`);
    const templateFormula = encodeURIComponent(`{template_name}='Fault report'`);

    const urls = [
      `https://api.airtable.com/v0/${baseId}/${tableName}?filterByFormula=${unitFormula}`,
      `https://api.airtable.com/v0/${baseId}/checklist_templates?filterByFormula=${templateFormula}`,
      `https://api.airtable.com/v0/${baseId}/maintenance_companies`,
      `https://api.airtable.com/v0/${baseId}/engineers`,
    ];

    const responses = await Promise.all(urls.map((url) => fetch(url, { headers })));
    const results = await Promise.all(responses.map((res) => res.json()));
    const [unitData, templateData, companyData, engineerData] = results;

    if (!unitData.records || unitData.records.length === 0) return { notFound: true };

    const unitRecord = unitData.records[0];
    const companyLookup = {};
    if (companyData.records) {
      companyData.records.forEach((r) => {
        if (r.fields.company_name) companyLookup[r.id] = r.fields.company_name;
      });
    }

    let parsedJson = {};
    try {
      if (templateData.records?.[0]?.fields.questions_json) {
        parsedJson = JSON.parse(templateData.records[0].fields.questions_json);
      }
    } catch (e) {
      console.error("Failed to parse questions_json:", e);
    }

    // Extract declaration_text from template record
    const declarationText = templateData.records?.[0]?.fields.declaration_text || "";

    return {
      props: {
        unit: {
          serial_number: unitRecord.fields.unit_name || unitRecord.fields.serial_number || "Unit",
          company: unitRecord.fields.company || "",
          record_id: unitRecord.id,
          public_token: unitRecord.fields.public_token || token,
        },
        template: {
          id: templateData.records?.[0]?.id || "",
          declarationText,
          questionsData: Array.isArray(parsedJson) ? parsedJson : (parsedJson.questions || []),
          questions: Array.isArray(parsedJson) ? parsedJson.map(q => q.title) : (parsedJson.questions?.map(q => q.title) || []),
        },
        allCompanies: Object.values(companyLookup).filter(Boolean),
        allEngineers:
          engineerData.records
            ?.map((r) => ({
              name: r.fields.engineer_name,
              email: r.fields.email || "",
              phone: r.fields.phone || "",
              companyName:
                r.fields["company"] && r.fields["company"][0] ? companyLookup[r.fields["company"][0]] : "",
            }))
            .filter((e) => e.name) || [],
      },
    };
  } catch (err) {
    console.error("getServerSideProps error:", err);
    return { notFound: true };
  }
}