import { useEffect, useRef } from 'react';

/**
 * Optimized auto-save hook that saves drafts to Airtable
 * - Debounces saves to prevent spam
 * - Uses refs to prevent unnecessary re-renders
 * - Saves on page unload
 */
type AutoSaveConfig = {
  unitId?: string;
  maintenanceType: string;
  engineerEmail?: string;
  draftData: Record<string, any>;
};

export function useAutoSave(config: AutoSaveConfig, shouldSave: unknown) {
  const { unitId, maintenanceType, engineerEmail, draftData } = config;
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string | null>(null);
  const draftRecordIdRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const configRef = useRef(config);
  const shouldSaveRef = useRef(shouldSave);

  // Latest-ref pattern: refs update after every commit, so beforeunload and
  // the debounce timer always read the current values. Events can only fire
  // between commits, so an effect is as safe as a render-phase write here.
  useEffect(() => {
    configRef.current = config;
    shouldSaveRef.current = shouldSave;
  });

  // Save function using refs
  const saveDraft = async (force = false) => {
    if (isSavingRef.current && !force) {
      // A save is in flight; remember to run again with the latest state
      // once it finishes, or this debounce firing would be silently lost.
      pendingSaveRef.current = true;
      return;
    }
    
    const { unitId, maintenanceType, engineerEmail, draftData } = configRef.current;
    
    if (!unitId) return;
    if (!shouldSaveRef.current && !force) return;

    const currentData = JSON.stringify(draftData);
    if (!force && lastSavedRef.current === currentData) return;

    try {
      isSavingRef.current = true;
      
      const response = await fetch('/api/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId,
          maintenanceType,
          engineerEmail: engineerEmail || '',
          draftData,
          recordId: draftRecordIdRef.current,
        }),
      });

      if (response.ok) {
        lastSavedRef.current = currentData;
        const data = await response.json();
        if (data.recordId) draftRecordIdRef.current = data.recordId;
      }
    } catch (error) {
      console.error('Draft save error:', error);
    } finally {
      isSavingRef.current = false;
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        saveDraft();
      }
    }
  };

  // CRITICAL: Only trigger on draftData changes, use serialized version
  const draftDataString = JSON.stringify(draftData);
  
  useEffect(() => {
    if (!shouldSave) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, 5000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
    // Retriggers only when the serialized draft changes; shouldSave gates the
    // body but must not restart the debounce timer on every gate flip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftDataString]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const { unitId, maintenanceType, engineerEmail, draftData } = configRef.current;
      if (shouldSaveRef.current && unitId) {
        const blob = new Blob([JSON.stringify({
          unitId,
          maintenanceType,
          engineerEmail: engineerEmail || '',
          draftData,
        })], { type: 'application/json' });
        
        navigator.sendBeacon('/api/save-draft', blob);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, []);

  return {
    getDraftId: () => draftRecordIdRef.current,
  };
}