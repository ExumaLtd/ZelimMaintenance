import { useEffect, useRef } from 'react';
import { dlog } from './debug';
import type { Unit, Answers, QuestionImages, SetState } from './types';
import type { AdminFields } from './admin-card';

type DraftBlob = Record<string, any>;

/**
 * Load a saved draft once per page load: the Airtable draft wins, with the
 * localStorage mirror as fallback. The applyAirtableDraft and
 * applyLocalDraft callbacks push the values into the owning form's state
 * (multi-step forms also restore the current step there).
 */
type DraftLoaderArgs = {
  unit: Unit;
  typeLabel: string;
  storageKey: string;
  applyAirtableDraft: (draft: DraftBlob) => void;
  applyLocalDraft: (data: DraftBlob) => void;
};

export function useDraftLoader({ unit, typeLabel, storageKey, applyAirtableDraft, applyLocalDraft }: DraftLoaderArgs) {
  const hasLoadedDraftRef = useRef(false);

  useEffect(() => {
    const loadDraft = async () => {
      // Only load once per session
      if (hasLoadedDraftRef.current) {
        dlog('⏭️ Draft already loaded, skipping...');
        return;
      }

      // PRIORITY 1: ALWAYS check Airtable first
      if (unit?.record_id) {
        try {
          dlog('🔍 Checking Airtable for draft...');
          const res = await fetch(
            `/api/get-draft?unitId=${unit.record_id}&maintenanceType=${typeLabel}`
          );
          const data = await res.json();

          if (data.draft) {
            dlog('📦 Draft found in Airtable');

            applyAirtableDraft(data.draft);

            // Clear stale localStorage
            localStorage.removeItem(storageKey);

            hasLoadedDraftRef.current = true;
            dlog('✅ Draft loaded from Airtable:', new Date(data.lastUpdated).toLocaleString());
            return;
          } else {
            dlog('ℹ️ No draft found in Airtable');
          }
        } catch (error) {
          console.error('❌ Failed to load Airtable draft:', error);
        }
      }

      // PRIORITY 2: localStorage fallback (only if Airtable had nothing)
      dlog('🔍 Checking localStorage for draft...');
      const savedDraft = localStorage.getItem(storageKey);
      if (savedDraft) {
        try {
          const data = JSON.parse(savedDraft);
          applyLocalDraft(data);

          hasLoadedDraftRef.current = true;
          dlog('✅ Draft loaded from localStorage');
        } catch (e) {
          console.error("❌ localStorage draft load error:", e);
        }
      } else {
        dlog('ℹ️ No draft found in localStorage - fresh start');
      }
    };

    loadDraft();
    // Load-once semantics: the apply callbacks are recreated every render but
    // must not retrigger a draft load, which would clobber user input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit?.record_id, storageKey]);
}

/**
 * Mirror the admin fields and answers to localStorage on every change as
 * refresh protection. Restore reads engineer_* and q* keys only, so the
 * engineer_record_id written here is informational.
 */
type LocalDraftMirrorArgs = {
  storageKey: string;
  selectedCompany: string;
  locationDisplay: string;
  locationCountry: string;
  engName: string;
  engEmail: string;
  engPhone: string;
  engId: string;
  answers: Answers;
};

export function useLocalDraftMirror({ storageKey, selectedCompany, locationDisplay, locationCountry, engName, engEmail, engPhone, engId, answers }: LocalDraftMirrorArgs) {
  useEffect(() => {
    const draftData = {
      maintained_by: selectedCompany,
      location_display: locationDisplay,
      location_country: locationCountry,
      engineer_name: engName,
      engineer_email: engEmail,
      engineer_phone: engPhone,
      engineer_record_id: engId,
      ...answers,
    };
    localStorage.setItem(storageKey, JSON.stringify(draftData));
  }, [selectedCompany, locationDisplay, locationCountry, engName, engEmail, engPhone, engId, answers, storageKey]);
}

/**
 * The values every form restores from an Airtable draft. Step restoration
 * for multi-step forms happens in the caller before this runs.
 */
export function applyCommonAirtableDraft(draft: DraftBlob, admin: AdminFields, setAnswers: SetState<Answers>, setQuestionImages: SetState<QuestionImages>) {
  if (draft.answers) setAnswers(draft.answers);
  if (draft.questionImages) setQuestionImages(draft.questionImages);
  if (draft.selectedCompany) admin.setSelectedCompany(draft.selectedCompany);
  if (draft.locationDisplay) admin.setLocationDisplay(draft.locationDisplay);
  if (draft.locationCountry) admin.setLocationCountry(draft.locationCountry);
  if (draft.engName) admin.setEngName(draft.engName);
  if (draft.engEmail) admin.setEngEmail(draft.engEmail);
  if (draft.engPhone) admin.setEngPhone(draft.engPhone);
  if (draft.engId) admin.setEngId(draft.engId);
  if (draft.operatorName) admin.setOperatorName(draft.operatorName);
  if (draft.operatorEmail) admin.setOperatorEmail(draft.operatorEmail);
  if (draft.operatorPhone) admin.setOperatorPhone(draft.operatorPhone);
  if (draft.operatorId) admin.setOperatorId(draft.operatorId);
}

/** The values every form restores from the localStorage mirror. */
export function applyCommonLocalDraft(data: DraftBlob, admin: AdminFields, setAnswers: SetState<Answers>) {
  if (data.maintained_by) admin.setSelectedCompany(data.maintained_by);
  if (data.location_display && data.location_display.trim()) {
    admin.setLocationDisplay(data.location_display);
  }
  if (data.location_country) admin.setLocationCountry(data.location_country);
  if (data.engineer_name) admin.setEngName(data.engineer_name);
  if (data.engineer_email) admin.setEngEmail(data.engineer_email);
  if (data.engineer_phone) admin.setEngPhone(data.engineer_phone);

  const draftAnswers: Answers = {};
  Object.keys(data).forEach((key) => {
    if (key.startsWith("q")) draftAnswers[key] = data[key];
  });
  setAnswers(draftAnswers);
}
