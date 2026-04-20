import { useEffect, useRef } from 'react';

/**
 * Optimized auto-save hook that saves drafts to Airtable
 * - Debounces saves to prevent spam
 * - Uses refs to prevent unnecessary re-renders
 * - Saves on page unload
 */
export function useAutoSave(config, shouldSave) {
  const { unitId, maintenanceType, engineerEmail, draftData } = config;
  const saveTimeoutRef = useRef(null);
  const lastSavedRef = useRef(null);
  const draftRecordIdRef = useRef(null);
  const isSavingRef = useRef(false);
  const configRef = useRef(config);
  const shouldSaveRef = useRef(shouldSave);

  // Update refs synchronously during render so beforeunload/pagehide always
  // sees the current value without waiting for a useEffect flush
  configRef.current = config;
  shouldSaveRef.current = shouldSave;

  // Save function using refs
  const saveDraft = async (force = false) => {
    if (isSavingRef.current && !force) return;
    
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
        console.log('✅ Draft saved');
      }
    } catch (error) {
      console.error('Draft save error:', error);
    } finally {
      isSavingRef.current = false;
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
}