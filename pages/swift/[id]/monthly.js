import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import { getCompanyLogoUrl } from '../../../utils/get-company-logo';
import ImageUploader from '../../../components/image-uploader';
import { ChevronDown, ChevronUp, Calendar } from "lucide-react";

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

export default function Monthly({ unit, template, allCompanies = [], allEngineers = [] }) {
  const router = useRouter();

  const companyFieldRef = useRef(null);
  const locationFieldRef = useRef(null);
  const engineerFieldRef = useRef(null);
  const companyDropdownRef = useRef(null);
  const engineerDropdownRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [today, setToday] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    company: false,
    location: false,
    engineerName: false,
    engineerEmail: false,
    engineerPhone: false,
  });

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

  const storageKey = `draft_monthly_${unit?.serial_number}`;

  const filteredEngineers = useMemo(() => {
    if (!selectedCompany) return [];
    let list = allEngineers.filter(e => e.companyName === selectedCompany && e.name !== engName);
    
    if (engName && engName !== "Please select" && engName.trim()) {
      const search = engName.toLowerCase();
      return list.filter(e => e.name.toLowerCase().includes(search));
    }
    return list;
  }, [selectedCompany, engName, allEngineers]);

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

  // Load draft from localStorage
  useEffect(() => {
    setToday(new Date().toISOString().split("T")[0]);
    const savedDraft = localStorage.getItem(storageKey);
    if (!savedDraft) return;

    try {
      const data = JSON.parse(savedDraft);
      if (data.maintained_by) setSelectedCompany(data.maintained_by);
      if (data.location_display) setLocationDisplay(data.location_display);
      if (data.location_country) setLocationCountry(data.location_country);
      if (data.engineer_name) setEngName(data.engineer_name);
      if (data.engineer_email) setEngEmail(data.engineer_email);
      if (data.engineer_phone) setEngPhone(data.engineer_phone);

      const draftAnswers = {};
      Object.keys(data).forEach((key) => {
        if (key.startsWith("q")) draftAnswers[key] = data[key];
      });
      setAnswers(draftAnswers);
    } catch (e) {
      console.error("Draft load error:", e);
    }
  }, [storageKey]);

  // Get geolocation - IMPROVED VERSION
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;

    // Only run geolocation if location field is empty
    if (locationDisplay && locationDisplay.trim() !== "") return;

    const options = {
      enableHighAccuracy: true,
      timeout: 15000, // Increased to 15 seconds for slower connections
      maximumAge: 0 // Don't use cached position
    };

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=14&accept-language=en-GB`,
            {
              headers: {
                'User-Agent': 'SWIFT Maintenance App' // Nominatim requires User-Agent
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

            // Only set if field is still empty (user hasn't typed anything)
            setLocationDisplay((prev) => (!prev || prev.trim() === "") ? combinedDisplay : prev);
            setLocationCountry(formalCountry);
          }
        } catch (err) {
          console.error("Geocoding error:", err);
          // Silently fail - user can enter location manually
        }
      },
      (error) => {
        // Handle different error codes
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
        // Don't show error to user - they can enter location manually
      },
      options
    );
  }, []); // Only run once on mount

  // Save draft to localStorage
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

  const selectCompany = (company) => {
    setSelectedCompany(company);
    setEngName("Please select");
    setEngEmail("");
    setEngPhone("");
    setShowCompanyDropdown(false);
    // Remove error state when valid selection made
    setFieldErrors(prev => ({ ...prev, company: false }));
  };

  const selectEngineer = (engineer) => {
    setEngName(engineer.name);
    setEngEmail(engineer.email || "");
    setEngPhone(engineer.phone || "");
    setShowEngineerDropdown(false);
    // Remove error states when valid selection made
    setFieldErrors(prev => ({
      ...prev,
      engineerName: false,
      engineerEmail: engineer.email ? false : prev.engineerEmail,
      engineerPhone: engineer.phone ? false : prev.engineerPhone,
    }));
    // Remove error class from engineer name input
    const engineerInput = document.querySelector('[name="engineer_name"]');
    if (engineerInput) engineerInput.classList.remove('has-error');
    // Also remove error from email if it gets filled
    if (engineer.email) {
      const emailInput = document.querySelector('[name="engineer_email"]');
      if (emailInput) emailInput.classList.remove('has-error');
    }
    // Also remove error from phone if it gets filled
    if (engineer.phone) {
      const phoneInput = document.querySelector('[name="engineer_phone"]');
      if (phoneInput) phoneInput.classList.remove('has-error');
    }
  };

  const clearEngineer = () => {
    setEngName("");
    setEngEmail("");
    setEngPhone("");
    setShowEngineerDropdown(false);
  };

  const scrollToField = (ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleImagesChange = (questionKey, images) => {
    setQuestionImages(prev => ({
      ...prev,
      [questionKey]: images
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (submitting) return;

    // Collect all errors
    const errors = [];
    let firstErrorField = null;
    const newFieldErrors = {
      company: false,
      location: false,
      engineerName: false,
      engineerEmail: false,
      engineerPhone: false,
    };

    // Remove all error classes from textareas/questions
    document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));

    // Validation - Maintenance company
    if (!selectedCompany || selectedCompany === "Please select") {
      errors.push({ field: 'company', message: 'Please select a maintenance company.' });
      newFieldErrors.company = true;
      if (!firstErrorField) firstErrorField = companyFieldRef;
    }

    // Validation - Location
    if (!locationDisplay || !locationDisplay.trim()) {
      errors.push({ field: 'location', message: 'Please provide a location.' });
      newFieldErrors.location = true;
      if (!firstErrorField) firstErrorField = locationFieldRef;
      const locationInput = document.querySelector('[name="location_display"]');
      if (locationInput) locationInput.classList.add('has-error');
    }

    // Validation - Engineer name
    if (!engName || engName === "Please select" || !engName.trim()) {
      errors.push({ field: 'engineer', message: 'Please select or enter an engineer name.' });
      newFieldErrors.engineerName = true;
      if (!firstErrorField) firstErrorField = engineerFieldRef;
      const engineerInput = document.querySelector('[name="engineer_name"]');
      if (engineerInput) engineerInput.classList.add('has-error');
    }

    // Validation - Engineer email
    if (!engEmail || !engEmail.trim()) {
      errors.push({ field: 'engineer_email', message: 'Please provide an engineer email.' });
      newFieldErrors.engineerEmail = true;
      if (!firstErrorField) {
        const emailInput = document.querySelector('[name="engineer_email"]');
        if (emailInput) firstErrorField = { current: emailInput };
      }
      const emailInput = document.querySelector('[name="engineer_email"]');
      if (emailInput) emailInput.classList.add('has-error');
    }

    // Validation - Engineer phone
    if (!engPhone || !engPhone.trim()) {
      errors.push({ field: 'engineer_phone', message: 'Please provide an engineer phone number.' });
      newFieldErrors.engineerPhone = true;
      if (!firstErrorField) {
        const phoneInput = document.querySelector('[name="engineer_phone"]');
        if (phoneInput) firstErrorField = { current: phoneInput };
      }
      const phoneInput = document.querySelector('[name="engineer_phone"]');
      if (phoneInput) phoneInput.classList.add('has-error');
    }

    // Validate required questions
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

    // Update field errors state
    setFieldErrors(newFieldErrors);

    // If there are errors, show message and scroll to first error
    if (errors.length > 0) {
      if (errors.length === 1) {
        setErrorMsg(errors[0].message);
      } else {
        setErrorMsg("Please check for multiple errors.");
      }
      
      // Scroll to first error
      if (firstErrorField) {
        if (firstErrorField.current) {
          firstErrorField.current.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => {
            if (firstErrorField.current.focus) {
              firstErrorField.current.focus();
            } else if (firstErrorField.current.querySelector) {
              // For dropdown containers, try to focus the input inside
              const input = firstErrorField.current.querySelector('.checklist-input');
              if (input) input.focus();
            }
          }, 300);
        }
      }
      return;
    }

    setSubmitting(true);

    // Prepare email-friendly answers WITH images
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
      maintenance_type: "Monthly",
      date_of_maintenance: new Date().toISOString(),
      engineer_name: engName,
      engineer_email: engEmail,
      engineer_phone: engPhone,
      unit_record_id: unit?.record_id,
      checklist_template_id: template?.id,
      serial_number: unit?.serial_number,
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

      // Get company logo URL for email
      const companyLogoUrl = getCompanyLogoUrl(unit?.company, unit?.serial_number);

      await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engineerEmail: engEmail,
          engineerName: engName,
          serialNumber: unit?.serial_number,
          answers: emailFriendlyAnswers,
          reportType: "Monthly",
          companyLogoUrl: companyLogoUrl,
          technicalData: {
            unit_record_id: unit?.record_id,
            checklist_template_id: template?.id,
            maintenance_company: selectedCompany,
            engineer_name: engName,
            location_display: locationDisplay,
          },
        }),
      });

      // Clear image localStorage after successful submission
      (template?.questionsData || []).forEach((_, i) => {
        const questionKey = `q${i + 1}`;
        const imageStorageKey = `images_monthly_${unit?.serial_number}_${questionKey}`;
        localStorage.removeItem(imageStorageKey);
      });

      localStorage.setItem("last_submitted_sn", unit?.serial_number);
      localStorage.removeItem(storageKey);
      router.push(`/swift/${unit.public_token}/monthly-complete`);
    } catch (err) {
      setErrorMsg(err.message);
      setSubmitting(false);
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

            <div className="checklist-form-card">
              <form onSubmit={handleSubmit} autoComplete="off" noValidate>
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
                      className="checklist-input"
                      name="location_display"
                      required
                      value={locationDisplay}
                      onChange={(e) => {
                        setLocationDisplay(e.target.value);
                        // Remove error class when user types
                        if (e.target.value.trim()) {
                          e.target.classList.remove('has-error');
                        }
                      }}
                    />
                  </div>

                  <div className="checklist-field">
                    <label className="checklist-label">Date</label>
                    <div className="field-icon-wrapper">
                      <input
                        type="date"
                        className="checklist-input"
                        name="date_of_maintenance"
                        defaultValue={today}
                        max={today}
                        required
                        style={{ paddingRight: "40px" }}
                      />
                      <div className="field-icon-inside">
                        <Calendar size={20} strokeWidth={1.5} />
                      </div>
                    </div>
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
                            // Remove error when user types
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
                      className="checklist-input"
                      name="engineer_email"
                      required
                      value={engEmail}
                      onChange={(e) => {
                        setEngEmail(e.target.value);
                        // Remove error class when user types valid email
                        if (e.target.value.trim()) {
                          e.target.classList.remove('has-error');
                        }
                      }}
                    />
                  </div>

                  <div className="checklist-field">
                    <label className="checklist-label">Engineer phone</label>
                    <input
                      type="tel"
                      className="checklist-input"
                      name="engineer_phone"
                      required
                      value={engPhone}
                      onChange={(e) => {
                        setEngPhone(e.target.value);
                        // Remove error class when user types
                        if (e.target.value.trim()) {
                          e.target.classList.remove('has-error');
                        }
                      }}
                    />
                  </div>
                </div>

                {/* QUESTIONS WITH IMAGE UPLOADERS */}
                {(template?.questionsData || []).map((q, i) => (
                  <div key={i} style={{ marginTop: "24px" }}>
                    <label className="checklist-label">
                      {q.title}
                    </label>
                    {q.instruction && (
                      <p className="question-instruction">{q.instruction}</p>
                    )}
                    
                    {/* Wrapper for side-by-side layout on desktop */}
                    <div className="question-with-upload">
                      <div className="textarea-wrapper">
                        <textarea
                          name={`q${i + 1}`}
                          className="checklist-textarea"
                          onInput={autoGrow}
                          value={answers[`q${i + 1}`] || ""}
                          onChange={(e) => {
                            setAnswers((prev) => ({ ...prev, [e.target.name]: e.target.value }));
                            // Remove error class when user types
                            if (e.target.value.trim()) {
                              e.target.classList.remove('has-error');
                            }
                          }}
                          required={q.required}
                        />
                      </div>
                      
                      {/* IMAGE UPLOADER */}
                      {q.allow_uploads && (
                        <ImageUploader
                          questionKey={`q${i + 1}`}
                          questionText={q.title}
                          serialNumber={unit?.serial_number}
                          maintenanceType="monthly"
                          onImagesChange={(images) => handleImagesChange(`q${i + 1}`, images)}
                        />
                      )}
                    </div>
                  </div>
                ))}

                {errorMsg && <p className="error-message">{errorMsg}</p>}
                <button className="checklist-submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit maintenance"}
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
    const templateFormula = encodeURIComponent(`{type}='Monthly'`);

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
          questionsData: templateData.records?.[0]?.fields.questions_json
            ? JSON.parse(templateData.records[0].fields.questions_json)
            : [],
          questions: templateData.records?.[0]?.fields.questions_json
            ? JSON.parse(templateData.records[0].fields.questions_json).map(q => q.title)
            : [],
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
    return { notFound: true };
  }
}