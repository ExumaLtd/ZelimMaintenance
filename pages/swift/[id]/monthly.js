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
import { fetchFormData } from '@/lib/data-fetching';
import { getClientSession } from '../../../lib/session';

const monthlySchema = z.object({
  company: z.string().min(1, 'Please select a maintenance company.'),
  location: z.string().min(1, 'Please provide a location.'),
  engineerName: z.string().min(1, 'Please select or enter an engineer name.'),
  engineerEmail: z.string().email('Please provide a valid engineer email.'),
  engineerPhone: z.string().min(1, 'Please provide an engineer phone number.'),
  declaration: z.boolean().refine(val => val === true, { message: 'Please accept the declaration before submitting.' }),
  signature: z.string().min(1, 'Please sign before submitting.'),
});


export default function Monthly({ unit, template, allCompanies = [], allEngineers = [] }) {
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

  // Checklist data - initialize from template (grouped structure)
  const [checklistData, setChecklistData] = useState([]);
  
  // Further comments
  const [furtherComments, setFurtherComments] = useState("");
  const [commentImages, setCommentImages] = useState([]);

  const [locationDisplay, setLocationDisplay] = useState("");
  const [locationCountry, setLocationCountry] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [engName, setEngName] = useState("");
  const [engEmail, setEngEmail] = useState("");
  const [engPhone, setEngPhone] = useState("");
  const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().split("T")[0]);

  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showEngineerDropdown, setShowEngineerDropdown] = useState(false);

  const storageKey = useMemo(() => {
  const session = getClientSession();
  const pin = session?.pin || 'unknown';
  return `draft_monthly_${unit?.serial_number}_${pin}`;
}, [unit?.serial_number]);

  // Auto-save draft to Airtable
  useAutoSave({
    unitId: unit?.record_id,
    maintenanceType: 'Monthly',
    engineerEmail: engEmail,
    draftData: {
      checklistData,
      furtherComments,
      commentImages,
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
      (checklistData && checklistData.length > 0 && checklistData.some(group => 
        group.questions.some(q => q.answer !== null)
      )) ||
      furtherComments?.trim() ||
      (commentImages && commentImages.length > 0) ||
      (selectedCompany && selectedCompany !== '') ||
      (engName && engName !== '' && engName !== 'Please select') ||
      (engEmail && engEmail !== '') ||
      (engPhone && engPhone !== '')
    )
  );

  // Initialize checklist data from template (grouped structure)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isDraft = urlParams.get('draft') === 'true';
    if (isDraft) return;
    
    if (template?.maintenanceChecklist && template.maintenanceChecklist.length > 0 && !hasLoadedDraftRef.current) {
      setChecklistData(
        template.maintenanceChecklist.map(group => ({
          ...group,
          questions: group.questions.map(q => ({
            ...q,
            answer: null
          }))
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

  // Handle comment images
  const handleCommentImagesChange = (images) => {
    setCommentImages(images);
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
            `/api/get-draft?unitId=${unit.record_id}&maintenanceType=Monthly`
          );
          const data = await res.json();
          
          if (data.draft) {
            console.log('📦 Draft found in Airtable');
            
            if (data.draft.checklistData) setChecklistData(data.draft.checklistData);
            if (data.draft.furtherComments) setFurtherComments(data.draft.furtherComments);
            if (data.draft.commentImages) setCommentImages(data.draft.commentImages);
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
          if (data.further_comments) setFurtherComments(data.further_comments);
          
          if (data.checklist_data && Array.isArray(data.checklist_data)) {
            setChecklistData(data.checklist_data);
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
              `/api/reverse-geocode?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
            );

            if (!res.ok) return;

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
          }
        },
        (error) => {
          console.log("Location error:", error.code);
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
      checklist_data: checklistData,
      further_comments: furtherComments,
    };
    localStorage.setItem(storageKey, JSON.stringify(draftData));
  }, [selectedCompany, locationDisplay, locationCountry, engName, engEmail, engPhone, checklistData, furtherComments, storageKey]);

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
      declaration: false,
      signature: false,
    };

    document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));

    const result = monthlySchema.safeParse({
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

    const incompleteItems = [];
    let hasNoAnswers = false;
    
    checklistData.forEach((group, groupIndex) => {
      group.questions.forEach((question, questionIndex) => {
        if (question.answer === null) {
          incompleteItems.push({ groupIndex, questionIndex, text: question.text });
        }
        if (question.answer === false) {
          hasNoAnswers = true;
        }
      });
    });

    if (incompleteItems.length > 0) {
      errors.push({ field: 'checklist', message: 'Please complete all checklist questions.' });
      incompleteItems.forEach(incomplete => {
        const row = document.querySelector(`[data-group="${incomplete.groupIndex}"][data-question="${incomplete.questionIndex}"]`);
        if (row) {
          const buttons = row.querySelectorAll('.toggle-btn');
          buttons.forEach(btn => btn.classList.add('has-error'));
        }
      });
    }
    
    if (hasNoAnswers && (!furtherComments || !furtherComments.trim())) {
      errors.push({ field: 'comments', message: 'Further comments are required when any question is answered "No".' });
      const textarea = document.querySelector('.checklist-textarea');
      if (textarea) {
        textarea.classList.add('has-error');
        textarea.scrollIntoView({ behavior: "smooth", block: "center" });
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
      hasSubmittedRef.current = false;
      return;
    }

    setSubmitting(true);

    const answers = [];
    if (furtherComments || commentImages.length > 0) {
      answers.push({
        question: "Further comments",
        answer: furtherComments || "",
        images: commentImages.map(img => ({ url: img.url, fileType: img.fileType }))
      });
    }

    const payload = {
      maintained_by: selectedCompany,
      location_display: locationDisplay,
      location_country: locationCountry,
      maintenance_type: "Monthly",
      date_of_maintenance: new Date().toISOString(),
      engineer_name: engName,
      engineer_email: engEmail,
      engineer_phone: engPhone,
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

      try {
        await fetch('/api/mark-draft-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unitId: unit?.record_id,
            maintenanceType: 'Monthly',
            engineerEmail: engEmail,
          }),
        });
      } catch (err) {
        console.log('No draft to mark complete (form completed without auto-save)');
      }

      const companyLogoUrl = getCompanyLogoUrl(unit?.company, unit?.serial_number);

      const answersForEmail = {};
      if (furtherComments || commentImages.length > 0) {
        answersForEmail["Further comments"] = {
          text: furtherComments || "",
          images: commentImages.map(img => ({ url: img.url, thumbnail: img.thumbnail, fileType: img.fileType || 'image' }))
        };
      }

      await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engineerEmail: engEmail,
          engineerName: engName,
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

      localStorage.setItem("last_submitted_sn", unit?.serial_number);
      localStorage.setItem("last_maintenance_type", "Monthly");
      localStorage.setItem("last_public_token", unit?.public_token);
      localStorage.removeItem(storageKey);
      router.push(`/portal/swift/monthly-complete`);
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
        <title>{unit?.serial_number} | Monthly Maintenance</title>
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
              <span className="break-point">monthly maintenance</span>
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
            {/* CARD 2: CHECKLIST + COMMENTS */}
            <div className="checklist-form-card" style={{ marginTop: "20px" }}>
                <h3 className="checklist-section-title">Monthly inspection checklist</h3>
                <p className="checklist-section-subtitle">
                  All monthly maintenance must be completed in accordance with the approved SWIFT Survivor Recovery System Maintenance Manual.
                </p>

                {checklistData.map((group, groupIndex) => (
                  <div key={group.id} className="equipment-table" style={{ marginBottom: groupIndex < checklistData.length - 1 ? '24px' : '0' }}>
                    <div className="equipment-header equipment-header-monthly" style={{ gridTemplateColumns: '1fr 120px' }}>
                      <div className="header-item" style={{ textAlign: 'left' }}>{group.title}</div>
                      <div className="header-returned">Completed?</div>
                    </div>
                    
                    <div className="equipment-questions-wrapper">
                      {group.questions.map((question, questionIndex) => (
                        <div 
                          key={question.id} 
                          className="equipment-row-wrapper"
                          data-group={groupIndex}
                          data-question={questionIndex}
                        >
                          <div className="item-name-mobile">{question.text}</div>
                          <div className="equipment-row" style={{ gridTemplateColumns: '1fr 120px' }}>
                            <div className="item-name">{question.text}</div>
                            
                            <div className="toggle-group">
                              <button 
                                type="button"
                                className={`toggle-btn ${question.answer === true ? 'active' : ''}`}
                                onClick={() => updateChecklist(groupIndex, questionIndex, true)}
                              >
                                Yes
                              </button>
                              <button 
                                type="button"
                                className={`toggle-btn ${question.answer === false ? 'active' : ''}`}
                                onClick={() => updateChecklist(groupIndex, questionIndex, false)}
                              >
                                No
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* FURTHER COMMENTS SECTION */}
                <div style={{ marginTop: "32px" }}>
                  <label className="checklist-label" style={{ marginTop: 0 }}>Further comments</label>
                  <p className="question-instruction">Record any additional observations, defects, or actions.</p>
                  
                  <div className="question-with-upload">
                    <div className="textarea-wrapper">
                      <textarea
                        className="checklist-textarea"
                        value={furtherComments}
                        onChange={(e) => {
                          setFurtherComments(e.target.value);
                          autoGrow(e);
                          if (e.target.value.trim()) {
                            e.target.classList.remove('has-error');
                          }
                        }}
                        onInput={autoGrow}
                        placeholder=""
                      />

                      <VoiceInput
                        onTranscript={(text) => {
                          setFurtherComments((prev) => (prev || '') + text);
                          requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                              const textarea = document.querySelector('.checklist-textarea');
                              if (textarea) autoGrow(textarea);
                            });
                          });
                        }}
                        onError={(errorMsg) => setErrorMsg(errorMsg)}
                      />
                    </div>
                    
                    <ImageUploader
                      questionKey="further_comments"
                      questionText="Further comments"
                      serialNumber={unit?.serial_number}
                      maintenanceType="monthly"
                      initialImages={commentImages || []}
                      onImagesChange={handleCommentImagesChange}
                    />
                  </div>
                </div>

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
                  {submitting ? "Submitting..." : "Submit maintenance"}
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
        allCompanies: data.companies,
        allEngineers: data.engineers,
      },
    };
  } catch (error) {
    console.error('Error loading monthly form:', error);
    return { redirect: { destination: '/', permanent: false } };
  }
}