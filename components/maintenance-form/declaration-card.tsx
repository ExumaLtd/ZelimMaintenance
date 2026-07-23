import clsx from 'clsx';
import SignaturePad from '../signature-pad';

/**
 * CARD 3: declaration checkbox, signature pad, error message and the
 * submit button. The owning form provides validation state and the
 * submit handling via its wrapping <form>.
 */
export default function DeclarationCard({
  template,
  declarationChecked,
  setDeclarationChecked,
  fieldErrors,
  setFieldErrors,
  setErrorMsg,
  signatureRef,
  setSignatureData,
  errorMsg,
  submitting,
  style,
}) {
  return (
    <div className="checklist-form-card" style={style}>
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
  );
}
