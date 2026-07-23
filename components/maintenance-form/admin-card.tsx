import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { RefObject } from 'react';
import type { Unit, Engineer, Operator, FieldErrors, SetState } from './types';
import clsx from 'clsx';
import { ChevronDown, ChevronUp } from 'lucide-react';
import DatePicker from '../date-picker';

/**
 * State and handlers for the admin card: maintenance company, location,
 * date, and the engineer or operator identity fields with their
 * autocomplete dropdowns. setFieldErrors comes from the owning form so
 * selections clear validation errors the same way they always have.
 */
type AdminFieldsArgs = {
  unit: Unit;
  accessType: string;
  engineers: Engineer[];
  operators: Operator[];
  setFieldErrors: SetState<FieldErrors>;
};

export function useAdminFields({ unit, accessType, engineers, operators, setFieldErrors }: AdminFieldsArgs) {
  const companyFieldRef = useRef<HTMLDivElement | null>(null);
  const locationFieldRef = useRef<HTMLDivElement | null>(null);
  const engineerFieldRef = useRef<HTMLDivElement | null>(null);
  const companyDropdownRef = useRef<HTMLDivElement | null>(null);
  const engineerDropdownRef = useRef<HTMLDivElement | null>(null);
  const operatorDropdownRef = useRef<HTMLDivElement | null>(null);

  const [today, setToday] = useState('');
  const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().split('T')[0]);

  const [locationDisplay, setLocationDisplay] = useState('');
  const [locationCountry, setLocationCountry] = useState('');
  const [locationFailed, setLocationFailed] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(accessType === 'operator' ? unit?.company || '' : '');
  const [engName, setEngName] = useState('');
  const [engEmail, setEngEmail] = useState('');
  const [engPhone, setEngPhone] = useState('');
  const [engId, setEngId] = useState('');

  const [operatorName, setOperatorName] = useState('');
  const [operatorEmail, setOperatorEmail] = useState('');
  const [operatorPhone, setOperatorPhone] = useState('');
  const [operatorId, setOperatorId] = useState('');

  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showEngineerDropdown, setShowEngineerDropdown] = useState(false);
  const [showOperatorDropdown, setShowOperatorDropdown] = useState(false);

  useEffect(() => {
    setToday(new Date().toISOString().split('T')[0]);
  }, []);

  const filteredEngineers = useMemo(() => {
    if (!selectedCompany) return [];
    let list = engineers.filter(e => e.companyName === selectedCompany && e.name !== engName);

    if (engName && engName !== 'Please select' && engName.trim()) {
      const search = engName.toLowerCase();
      return list.filter(e => e.name.toLowerCase().includes(search));
    }
    return list;
  }, [selectedCompany, engName, engineers]);

  const filteredOperators = useMemo(() => {
    const opId = unit?.operating_company_id;
    if (!opId) return operators;
    let list = operators.filter(o => o.operating_company_id === opId && o.name !== operatorName);
    if (operatorName && operatorName !== 'Please select' && operatorName.trim()) {
      const search = operatorName.toLowerCase();
      return list.filter(o => o.name.toLowerCase().includes(search));
    }
    return list;
  }, [unit?.operating_company_id, operatorName, operators]);

  const selectCompany = useCallback((company: string) => {
    setSelectedCompany(company);
    setEngName('Please select');
    setEngEmail('');
    setEngPhone('');
    setEngId('');
    setShowCompanyDropdown(false);
    setFieldErrors(prev => ({ ...prev, company: false }));
  }, [setFieldErrors]);

  const selectEngineer = useCallback((engineer: Engineer) => {
    setEngName(engineer.name);
    setEngEmail(engineer.email || '');
    setEngPhone(engineer.phone || '');
    setEngId(engineer.id || '');
    setShowEngineerDropdown(false);
    setFieldErrors(prev => ({
      ...prev,
      engineerName: false,
      engineerEmail: engineer.email ? false : prev.engineerEmail,
      engineerPhone: engineer.phone ? false : prev.engineerPhone,
    }));
  }, [setFieldErrors]);

  const clearEngineer = useCallback(() => {
    setEngName('');
    setEngEmail('');
    setEngPhone('');
    setEngId('');
    setShowEngineerDropdown(false);
  }, []);

  const selectOperator = useCallback((operator: Operator) => {
    setOperatorName(operator.name);
    setOperatorEmail(operator.email || '');
    setOperatorPhone(operator.phone || '');
    setOperatorId(operator.id || '');
    setShowOperatorDropdown(false);
    setFieldErrors(prev => ({
      ...prev,
      engineerName: false,
      engineerEmail: operator.email ? false : prev.engineerEmail,
      engineerPhone: operator.phone ? false : prev.engineerPhone,
    }));
  }, [setFieldErrors]);

  const clearOperator = useCallback(() => {
    setOperatorName('');
    setOperatorEmail('');
    setOperatorPhone('');
    setOperatorId('');
    setShowOperatorDropdown(false);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
        setShowCompanyDropdown(false);
      }
      if (engineerDropdownRef.current && !engineerDropdownRef.current.contains(event.target as Node)) {
        setShowEngineerDropdown(false);
      }
      if (operatorDropdownRef.current && !operatorDropdownRef.current.contains(event.target as Node)) {
        setShowOperatorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasEngineerResults = filteredEngineers.length > 0;
  const hasClearEng = engName && engName !== 'Please select' && engName !== '';
  const shouldShowEngDropdown = showEngineerDropdown && (hasEngineerResults || hasClearEng);
  const hasOperatorResults = filteredOperators.length > 0;
  const hasClearOp = operatorName && operatorName !== 'Please select' && operatorName !== '';
  const shouldShowOpDropdown = showOperatorDropdown && (hasOperatorResults || hasClearOp);

  return {
    companyFieldRef, locationFieldRef, engineerFieldRef,
    companyDropdownRef, engineerDropdownRef, operatorDropdownRef,
    today, maintenanceDate, setMaintenanceDate,
    locationDisplay, setLocationDisplay,
    locationCountry, setLocationCountry,
    locationFailed, setLocationFailed,
    selectedCompany, setSelectedCompany,
    engName, setEngName, engEmail, setEngEmail, engPhone, setEngPhone, engId, setEngId,
    operatorName, setOperatorName, operatorEmail, setOperatorEmail,
    operatorPhone, setOperatorPhone, operatorId, setOperatorId,
    showCompanyDropdown, setShowCompanyDropdown,
    showEngineerDropdown, setShowEngineerDropdown,
    showOperatorDropdown, setShowOperatorDropdown,
    filteredEngineers, filteredOperators,
    selectCompany, selectEngineer, clearEngineer, selectOperator, clearOperator,
    hasEngineerResults, hasClearEng, shouldShowEngDropdown,
    hasOperatorResults, hasClearOp, shouldShowOpDropdown,
  };
}

/** CARD 1: company or operator, location, date, and identity fields.
    cardRef lets a form scroll the whole card into view on validation errors. */
export type AdminFields = ReturnType<typeof useAdminFields>;

type AdminCardProps = {
  admin: AdminFields;
  accessType: string;
  companies: string[];
  fieldErrors: FieldErrors;
  setFieldErrors: SetState<FieldErrors>;
  cardRef?: RefObject<HTMLDivElement | null> | null;
};

export function AdminCard({ admin, accessType, companies, fieldErrors, setFieldErrors, cardRef = null }: AdminCardProps) {
  const {
    companyFieldRef, locationFieldRef, engineerFieldRef,
    companyDropdownRef, engineerDropdownRef, operatorDropdownRef,
    today, maintenanceDate, setMaintenanceDate,
    locationDisplay, setLocationDisplay, locationFailed,
    selectedCompany,
    engName, setEngName, engEmail, setEngEmail, engPhone, setEngPhone, setEngId,
    operatorName, setOperatorName, operatorEmail, setOperatorEmail,
    operatorPhone, setOperatorPhone, setOperatorId,
    showCompanyDropdown, setShowCompanyDropdown,
    showEngineerDropdown, setShowEngineerDropdown,
    showOperatorDropdown, setShowOperatorDropdown,
    filteredEngineers, filteredOperators,
    selectCompany, selectEngineer, clearEngineer, selectOperator, clearOperator,
    hasEngineerResults, hasClearEng, shouldShowEngDropdown,
    hasOperatorResults, hasClearOp, shouldShowOpDropdown,
  } = admin;

  return (
    <div ref={cardRef} className="checklist-form-card">
      <div className="checklist-inline-group">
        <div className="checklist-field" ref={companyFieldRef}>
          <label className="checklist-label">{accessType === 'operator' ? 'Operator' : 'Maintenance company'}</label>
          {accessType === 'operator' ? (
            <input
              readOnly
              className="checklist-input is-active"
              value={selectedCompany}
            />
          ) : (
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
          )}
        </div>

        <div className="checklist-field" ref={locationFieldRef}>
          <label className="checklist-label">Location</label>
          <input
            className={clsx("checklist-input", fieldErrors.location && "has-error")}
            name="location_display"
            required
            placeholder={locationFailed && !locationDisplay ? "Enter location manually" : ""}
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

      {accessType === 'operator' ? (
        <div className="checklist-inline-group" style={{ marginTop: "24px" }}>
          <div className="checklist-field" ref={engineerFieldRef}>
            <label className="checklist-label">Operator name</label>
            <div className="custom-dropdown-container" ref={operatorDropdownRef}>
              <div className="field-icon-wrapper">
                <input
                  className={clsx(
                    "checklist-input",
                    operatorName === "Please select" || !operatorName ? "is-placeholder" : "is-active",
                    shouldShowOpDropdown && "is-focused",
                    fieldErrors.engineerName && "has-error"
                  )}
                  name="operator_name"
                  required
                  value={operatorName}
                  autoComplete="off"
                  onFocus={() => setShowOperatorDropdown(true)}
                  onChange={(e) => {
                    setOperatorName(e.target.value);
                    setOperatorId("");
                    setShowOperatorDropdown(true);
                    if (e.target.value.trim() && e.target.value !== "Please select") {
                      setFieldErrors(prev => ({ ...prev, engineerName: false }));
                    }
                  }}
                  style={{
                    paddingRight: (hasOperatorResults || hasClearOp) ? "40px" : "16px",
                  }}
                />
                {(hasOperatorResults || hasClearOp) && (
                  <div className="field-icon-inside">
                    {showOperatorDropdown ? <ChevronUp size={20} strokeWidth={1.5} /> : <ChevronDown size={20} strokeWidth={1.5} />}
                  </div>
                )}
              </div>
              {shouldShowOpDropdown && (
                <ul className={clsx("custom-dropdown-list", fieldErrors.engineerName && "has-error")}>
                  {hasClearOp && (
                    <li className="custom-dropdown-item" onClick={clearOperator}>
                      Clear details
                    </li>
                  )}
                  {filteredOperators.map((op, i) => (
                    <li key={i} className="custom-dropdown-item" onClick={() => selectOperator(op)}>
                      {op.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="checklist-field">
            <label className="checklist-label">Operator email</label>
            <input
              type="email"
              className={clsx("checklist-input", fieldErrors.engineerEmail && "has-error")}
              name="operator_email"
              required
              value={operatorEmail}
              onChange={(e) => {
                setOperatorEmail(e.target.value);
                if (e.target.value.trim()) {
                  setFieldErrors(prev => ({ ...prev, engineerEmail: false }));
                }
              }}
            />
          </div>

          <div className="checklist-field">
            <label className="checklist-label">Operator phone</label>
            <input
              type="tel"
              maxLength={20}
              className={clsx("checklist-input", fieldErrors.engineerPhone && "has-error")}
              name="operator_phone"
              required
              value={operatorPhone}
              onChange={(e) => {
                setOperatorPhone(e.target.value);
                if (e.target.value.trim()) {
                  setFieldErrors(prev => ({ ...prev, engineerPhone: false }));
                }
              }}
            />
          </div>
        </div>
      ) : (
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
                    setEngId("");
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
              maxLength={20}
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
      )}
    </div>
  );
}
