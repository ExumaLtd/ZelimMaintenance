import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import { getCompanyLogoUrl } from '../../../utils/get-company-logo';
import { ChevronDown, ChevronUp, Calendar, Upload } from "lucide-react";

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

  // Checklist state
  const [checklistAnswers, setChecklistAnswers] = useState({});
  const [checklistImages, setChecklistImages] = useState({});

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
      if (data.location_display && data.location_display.trim()) {
        setLocationDisplay(data.location_display);
      }
      if (data.location_country) setLocationCountry(data.location_country);
      if (data.engineer_name) setEngName(data.engineer_name);
      if (data.engineer_email) setEngEmail(data.engineer_email);
      if (data.engineer_phone) setEngPhone(data.engineer_phone);

      // Load checklist answers
      if (data.checklistAnswers) setChecklistAnswers(data.checklistAnswers);

      // Load text question answers
      const draftAnswers = {};
      Object.keys(data).forEach((key) => {
        if (key.startsWith("q")) draftAnswers[key] = data[key];
      });
      setAnswers(draftAnswers);
    } catch (e) {
      console.error("Draft load error:", e);
    }
  }, [storageKey]);

  // Load checklist images from localStorage
  useEffect(() => {
    const equipmentList = template?.equipmentChecklist || [];
    const loadedImages = {};
    
    equipmentList.forEach((item) => {
      const imageStorageKey = `checklist_images_monthly_${unit?.serial_number}_item_${item.id}`;
      const saved = localStorage.getItem(imageStorageKey);
      if (saved) {
        try {
          loadedImages[item.id] = JSON.parse(saved);
        } catch (e) {
          console.error("Failed to load images for item", item.id, e);
        }
      }
    });
    
    setChecklistImages(loadedImages);
  }, [template, unit]);

  // Get geolocation
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    if (locationDisplay && locationDisplay.trim() !== "") return;

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

  // Save draft to localStorage
  useEffect(() => {
    const draftData = {
      maintained_by: selectedCompany,
      location_display: locationDisplay,
      location_country: locationCountry,
      engineer_name: engName,
      engineer_email: engEmail,
      engineer_phone: engPhone,
      checklistAnswers: checklistAnswers,
      ...answers,
    };
    localStorage.setItem(storageKey, JSON.stringify(draftData));
  }, [selectedCompany, locationDisplay, locationCountry, engName, engEmail, engPhone, answers, checklistAnswers, storageKey]);

  const selectCompany = (company) => {
    setSelectedCompany(company);
    setEngName("Please select");
    setEngEmail("");
    setEngPhone("");
    setShowCompanyDropdown(false);
    setFieldErrors(prev => ({ ...prev, company: false }));
  };

  const selectEngineer = (engineer) => {
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
  };

  const clearEngineer = () => {
    setEngName("");
    setEngEmail("");
    setEngPhone("");
    setShowEngineerDropdown(false);
  };

  // Handle checklist returned change
  const handleChecklistReturnedChange = (itemId, value) => {
    setChecklistAnswers(prev => {
      const updated = { ...prev, [itemId]: { ...prev[itemId], returned: value } };
      // Auto-select "Good" if "Yes" is selected
      if (value === "Yes" && !updated[itemId].condition) {
        updated[itemId].condition = "Good";
      }
      return updated;
    });
  };

  // Handle checklist condition change
  const handleChecklistConditionChange = (itemId, value) => {
    setChecklistAnswers(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], condition: value }
    }));
  };

  // Handle checklist image upload
  const handleChecklistImageUpload = async (itemId, files) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
      alert("Image must be less than 10MB");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("questionKey", `item_${itemId}`);
      formData.append("serialNumber", unit?.serial_number);
      formData.append("maintenanceType", "monthly");

      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      
      setChecklistImages(prev => {
        const updated = {
          ...prev,
          [itemId]: [...(prev[itemId] || []), { url: data.url, name: file.name }]
        };
        
        // Save to localStorage
        const imageStorageKey = `checklist_images_monthly_${unit?.serial_number}_item_${itemId}`;
        localStorage.setItem(imageStorageKey, JSON.stringify(updated[itemId]));
        
        return updated;
      });
    } catch (err) {
      console.error("Image upload error:", err);
      alert("Failed to upload image. Please try again.");
    }
  };

  // Handle checklist image removal
  const handleChecklistImageRemove = (itemId, imageIndex) => {
    setChecklistImages(prev => {
      const updated = {
        ...prev,
        [itemId]: (prev[itemId] || []).filter((_, i) => i !== imageIndex)
      };
      
      // Update localStorage
      const imageStorageKey = `checklist_images_monthly_${unit?.serial_number}_item_${itemId}`;
      if (updated[itemId].length === 0) {
        localStorage.removeItem(imageStorageKey);
      } else {
        localStorage.setItem(imageStorageKey, JSON.stringify(updated[itemId]));
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (submitting) return;

    const errors = [];
    let firstErrorField = null;
    const newFieldErrors = {
      company: false,
      location: false,
      engineerName: false,
      engineerEmail: false,
      engineerPhone: false,
    };

    // Remove all error classes
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
    }

    // Validation - Engineer name
    if (!engName || engName === "Please select" || !engName.trim()) {
      errors.push({ field: 'engineer', message: 'Please select or enter an engineer name.' });
      newFieldErrors.engineerName = true;
      if (!firstErrorField) firstErrorField = engineerFieldRef;
    }

    // Validation - Engineer email
    if (!engEmail || !engEmail.trim()) {
      errors.push({ field: 'engineer_email', message: 'Please provide an engineer email.' });
      newFieldErrors.engineerEmail = true;
    }

    // Validation - Engineer phone
    if (!engPhone || !engPhone.trim()) {
      errors.push({ field: 'engineer_phone', message: 'Please provide an engineer phone number.' });
      newFieldErrors.engineerPhone = true;
    }

    // Validate checklist - all items must have returned status and condition
    const equipmentList = template?.equipmentChecklist || [];
    for (const item of equipmentList) {
      const answer = checklistAnswers[item.id];
      if (!answer || !answer.returned) {
        errors.push({ field: `checklist_${item.id}`, message: `Please mark if "${item.name}" was returned.` });
      } else if (answer.returned === "Yes" && !answer.condition) {
        errors.push({ field: `checklist_${item.id}`, message: `Please select condition for "${item.name}".` });
      }
    }

    // Validate required text questions
    const requiredQuestions = (template?.questions || []).filter(q => q.required);
    for (const q of requiredQuestions) {
      const answer = answers[`q${q.id}`];
      if (!answer || !answer.trim()) {
        errors.push({ field: `q${q.id}`, message: `Please answer: ${q.title}.` });
        const questionElement = document.querySelector(`[name="q${q.id}"]`);
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

    setSubmitting(true);

    // Prepare checklist data for email and database
    const checklistData = equipmentList.map(item => {
      const answer = checklistAnswers[item.id] || {};
      const images = checklistImages[item.id] || [];
      return {
        id: item.id,
        name: item.name,
        returned: answer.returned || "No",
        condition: answer.condition || "N/A",
        images: images.map(img => img.url)
      };
    });

    // Prepare text question answers for email
    const emailFriendlyAnswers = {};
    (template?.questions || []).forEach((q) => {
      const textAnswer = answers[`q${q.id}`] || "Not answered";
      emailFriendlyAnswers[q.title] = {
        text: textAnswer,
        images: [] // Text questions don't have image uploads in monthly
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
      equipment_checklist: checklistData,
      answers: (template?.questions || []).map((q) => ({
        question: `q${q.id}`,
        answer: answers[`q${q.id}`] || "",
        images: []
      })),
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
          checklistData: checklistData,
          answers: emailFriendlyAnswers,
          reportType: "Monthly",
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

      // Clear checklist image localStorage after successful submission
      equipmentList.forEach((item) => {
        const imageStorageKey = `checklist_images_monthly_${unit?.serial_number}_item_${item.id}`;
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
                {/* FORM FIELDS */}
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
                      onChange={(e) => setLocationDisplay(e.target.value)}
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
                      onChange={(e) => setEngEmail(e.target.value)}
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
                      onChange={(e) => setEngPhone(e.target.value)}
                    />
                  </div>
                </div>

                {/* EQUIPMENT CHECKLIST */}
                <div className="checklist-section" style={{ marginTop: "32px" }}>
                  <h3>Equipment checklist</h3>
                  <div className="checklist-items">
                    {(template?.equipmentChecklist || []).map((item, index) => (
                      <div key={item.id} className="checklist-item">
                        <div className="item-header">
                          <div className="item-number">{index + 1}</div>
                          <h4 className="item-title">{item.name}</h4>
                        </div>

                        <div className="item-fields">
                          <div className="form-group">
                            <label>Returned</label>
                            <div className="radio-group">
                              <div className="radio-option">
                                <input
                                  type="radio"
                                  id={`item_${item.id}_yes`}
                                  name={`item_${item.id}_returned`}
                                  checked={checklistAnswers[item.id]?.returned === "Yes"}
                                  onChange={() => handleChecklistReturnedChange(item.id, "Yes")}
                                />
                                <label htmlFor={`item_${item.id}_yes`}>Yes</label>
                              </div>
                              <div className="radio-option">
                                <input
                                  type="radio"
                                  id={`item_${item.id}_no`}
                                  name={`item_${item.id}_returned`}
                                  checked={checklistAnswers[item.id]?.returned === "No"}
                                  onChange={() => handleChecklistReturnedChange(item.id, "No")}
                                />
                                <label htmlFor={`item_${item.id}_no`}>No</label>
                              </div>
                            </div>
                          </div>

                          {checklistAnswers[item.id]?.returned === "Yes" && (
                            <div className="form-group">
                              <label>Condition</label>
                              <div className="radio-group">
                                <div className="radio-option">
                                  <input
                                    type="radio"
                                    id={`item_${item.id}_good`}
                                    name={`item_${item.id}_condition`}
                                    checked={checklistAnswers[item.id]?.condition === "Good"}
                                    onChange={() => handleChecklistConditionChange(item.id, "Good")}
                                  />
                                  <label htmlFor={`item_${item.id}_good`}>Good</label>
                                </div>
                                <div className="radio-option">
                                  <input
                                    type="radio"
                                    id={`item_${item.id}_fair`}
                                    name={`item_${item.id}_condition`}
                                    checked={checklistAnswers[item.id]?.condition === "Fair"}
                                    onChange={() => handleChecklistConditionChange(item.id, "Fair")}
                                  />
                                  <label htmlFor={`item_${item.id}_fair`}>Fair</label>
                                </div>
                                <div className="radio-option">
                                  <input
                                    type="radio"
                                    id={`item_${item.id}_poor`}
                                    name={`item_${item.id}_condition`}
                                    checked={checklistAnswers[item.id]?.condition === "Poor"}
                                    onChange={() => handleChecklistConditionChange(item.id, "Poor")}
                                  />
                                  <label htmlFor={`item_${item.id}_poor`}>Poor</label>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* IMAGE UPLOAD SECTION */}
                        <div className="checklist-upload-section">
                          <h4>Upload images (optional)</h4>
                          <div className="checklist-file-upload-wrapper">
                            <input
                              type="file"
                              id={`upload_item_${item.id}`}
                              className="checklist-file-upload-input"
                              accept="image/*"
                              onChange={(e) => handleChecklistImageUpload(item.id, e.target.files)}
                            />
                            <label htmlFor={`upload_item_${item.id}`} className="checklist-file-upload-label">
                              <Upload size={20} />
                              Choose image
                            </label>
                          </div>

                          {checklistImages[item.id] && checklistImages[item.id].length > 0 && (
                            <div className="checklist-image-grid">
                              {checklistImages[item.id].map((img, imgIndex) => (
                                <div key={imgIndex} className="checklist-preview-item">
                                  <img src={img.url} alt={`${item.name} ${imgIndex + 1}`} />
                                  <button
                                    type="button"
                                    className="checklist-remove-image"
                                    onClick={() => handleChecklistImageRemove(item.id, imgIndex)}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TEXT QUESTIONS */}
                {(template?.questions || []).map((q) => (
                  <div key={q.id} style={{ marginTop: "24px" }}>
                    <label className="checklist-label">
                      {q.title}
                      {q.required && <span style={{ color: '#e74c3c' }}> *</span>}
                    </label>
                    {q.instruction && (
                      <p className="question-instruction">{q.instruction}</p>
                    )}
                    <textarea
                      name={`q${q.id}`}
                      className="checklist-textarea"
                      onInput={autoGrow}
                      value={answers[`q${q.id}`] || ""}
                      onChange={(e) => {
                        setAnswers((prev) => ({ ...prev, [e.target.name]: e.target.value }));
                        if (e.target.value.trim()) {
                          e.target.classList.remove('has-error');
                        }
                      }}
                      required={q.required}
                    />
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
    const templateFormula = encodeURIComponent(`{template_name}='Monthly maintenance'`);

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

    // Parse the JSON from checklist_templates
    let parsedTemplate = { equipmentChecklist: [], questions: [] };
    if (templateData.records?.[0]?.fields.questions_json) {
      try {
        parsedTemplate = JSON.parse(templateData.records[0].fields.questions_json);
      } catch (e) {
        console.error("Failed to parse template JSON:", e);
      }
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
          equipmentChecklist: parsedTemplate.equipment_checklist || [],
          questions: parsedTemplate.questions || [],
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