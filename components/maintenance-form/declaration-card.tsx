import clsx from 'clsx';
import type { CSSProperties, RefObject } from 'react';
import type { ChecklistTemplate, FieldErrors, SetState } from './types';
import SignaturePad from '../signature-pad';
import ArrowButton from '../ui/arrow-button';

/**
 * CARD 3: declaration checkbox, signature pad, error message and the
 * submit button. The owning form provides validation state and the
 * submit handling via its wrapping <form>.
 */
type DeclarationCardProps = {
  template: ChecklistTemplate;
  declarationChecked: boolean;
  setDeclarationChecked: SetState<boolean>;
  fieldErrors: FieldErrors;
  setFieldErrors: SetState<FieldErrors>;
  setErrorMsg: SetState<string>;
  signatureRef: RefObject<any>;
  setSignatureData: SetState<string | null>;
  errorMsg: string;
  submitting: boolean;
  submitLabel?: string;
  style?: CSSProperties;
};

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
  submitLabel = "Submit maintenance",
  style,
}: DeclarationCardProps) {
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
            hasError={!!fieldErrors.signature}
          />
        </div>
      </div>

      {errorMsg && <p className="error-message">{errorMsg}</p>}
      <ArrowButton type="submit" disabled={submitting} className="mt-[34px] max-[600px]:mt-[30px]">
        {submitting ? "Submitting" : submitLabel}
      </ArrowButton>
    </div>
  );
}
