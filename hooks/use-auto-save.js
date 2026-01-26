// hooks/use-auto-save.js
import { useEffect, useRef, useCallback } from 'react';

/**
 * Auto-save hook with smart debouncing
 * - Waits 3 seconds after last change before saving
 * - Prevents duplicate saves
 * - Saves on page unload
 */
export function useAutoSave(payload, isEnabled = true) {
  const timeoutRef = useRef(null);
  const lastSavedRef = useRef(null);
  const payloadRef = useRef(payload);
  const hasInitializedRef = useRef(false);

  // Keep payloadRef up to date
  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  const saveDraft = useCallback(async () => {
    const currentPayload = payloadRef.current;
    
    // Skip if disabled or missing required fields
    if (!isEnabled || !currentPayload.unitId || !currentPayload.maintenanceType) {
      return;
    }
    
    // For partial drafts without email, use placeholder
    const payloadToSave = {
      ...currentPayload,
      engineerEmail: currentPayload.engineerEmail || 'draft@zelimmaintenance.com'
    };
    
    // Don't save if data hasn't changed
    const currentData = JSON.stringify(payloadToSave);
    if (currentData === lastSavedRef.current) {
      return;
    }
    
    try {
      const response = await fetch('/api/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToSave),
      });

      if (response.ok) {
        lastSavedRef.current = currentData;
      }
    } catch (error) {
      // Silent fail - don't interrupt user
    }
  }, [isEnabled]);

  useEffect(() => {
    if (!isEnabled) return;

    // Skip initial save on mount - only save after changes
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce - wait 3 seconds after last change
    timeoutRef.current = setTimeout(() => {
      saveDraft();
    }, 3000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [payload, isEnabled, saveDraft]);

  // Save on page unload
  useEffect(() => {
    if (!isEnabled) return;

    const handleBeforeUnload = () => {
      const currentPayload = payloadRef.current;
      if (currentPayload.unitId && currentPayload.maintenanceType) {
        const payloadToSave = {
          ...currentPayload,
          engineerEmail: currentPayload.engineerEmail || 'draft@zelimmaintenance.com'
        };
        const blob = new Blob([JSON.stringify(payloadToSave)], { type: 'application/json' });
        navigator.sendBeacon('/api/save-draft', blob);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEnabled]);

  return { saveDraft };
}