import { useEffect, useRef } from 'react';

/**
 * Auto-save hook that saves drafts to Airtable
 * @param {Object} config - Configuration object
 * @param {string} config.unitId - Unit record ID
 * @param {string} config.maintenanceType - Type of maintenance
 * @param {string} config.engineerEmail - Engineer's email (can be invalid/empty)
 * @param {Object} config.draftData - Data to save
 * @param {boolean} shouldSave - Whether to trigger save (content exists)
 */
export function useAutoSave(config, shouldSave) {
  const { unitId, maintenanceType, engineerEmail, draftData } = config;
  const saveTimeoutRef = useRef(null);
  const lastSavedRef = useRef(null);
  const isSavingRef = useRef(false);

  // Save function
  const saveDraft = async (force = false) => {
    // Skip if already saving
    if (isSavingRef.current && !force) return;
    
    // Skip if no unit ID
    if (!unitId) return;
    
    // Skip if no content to save (unless forced)
    if (!shouldSave && !force) return;

    // Skip if data hasn't changed (unless forced)
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
        }),
      });

      if (response.ok) {
        lastSavedRef.current = currentData;
        console.log('✅ Draft saved');
      } else {
        console.error('Failed to save draft:', await response.text());
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      isSavingRef.current = false;
    }
  };

  // Auto-save on change (debounced)
  useEffect(() => {
    if (!shouldSave) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout to save after 2 seconds of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, 2000);

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [draftData, shouldSave, unitId, maintenanceType, engineerEmail]);

  // Save on page unload (back button, close tab, refresh)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (shouldSave && unitId) {
        // Use sendBeacon for reliable save on unload
        const blob = new Blob([JSON.stringify({
          unitId,
          maintenanceType,
          engineerEmail: engineerEmail || '',
          draftData,
        })], { type: 'application/json' });
        
        navigator.sendBeacon('/api/save-draft', blob);
        
        // Note: We don't show a confirmation dialog as it's annoying
        // The draft is saved automatically
      }
    };

    // Add both listeners for maximum compatibility
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [shouldSave, unitId, maintenanceType, engineerEmail, draftData]);

  // Also save when user navigates back (for SPAs)
  useEffect(() => {
    const handlePopState = () => {
      if (shouldSave && unitId) {
        saveDraft(true); // Force immediate save
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [shouldSave, unitId, maintenanceType, engineerEmail, draftData]);
}