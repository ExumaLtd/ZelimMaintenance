// hooks/useAutoSave.js
import { useEffect, useRef } from 'react';

/**
 * Auto-save hook with smart idle detection
 * - Saves every 30 seconds when user is active
 * - Stops saving after 90 seconds of inactivity
 * - Saves on page unload as backup
 */
export function useAutoSave(draftData, isEnabled = true) {
  const lastActivityRef = useRef(Date.now());
  const saveIntervalRef = useRef(null);
  const idleTimeoutRef = useRef(null);

  const saveDraft = async () => {
    if (!isEnabled) return;
    if (!draftData.unitId || !draftData.maintenanceType || !draftData.engineerEmail) return;
    
    try {
      const response = await fetch('/api/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData),
      });

      if (response.ok) {
        console.log('✓ Draft saved');
      }
    } catch (error) {
      console.error('Draft save failed:', error);
    }
  };

  const stopAutoSave = () => {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = null;
      console.log('Auto-save stopped (idle)');
    }
  };

  const startAutoSave = () => {
    if (!saveIntervalRef.current && isEnabled) {
      saveIntervalRef.current = setInterval(saveDraft, 30 * 1000); // Every 30 seconds
      console.log('Auto-save started');
    }
  };

  const handleActivity = () => {
    lastActivityRef.current = Date.now();
    
    // Start auto-saving if not already running
    startAutoSave();
    
    // Reset idle timeout
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    
    // Stop auto-saving after 90 seconds of no activity
    idleTimeoutRef.current = setTimeout(() => {
      stopAutoSave();
    }, 90 * 1000);
  };

  useEffect(() => {
    if (!isEnabled) return;

    // Listen for activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    // Start auto-save initially
    startAutoSave();
    idleTimeoutRef.current = setTimeout(stopAutoSave, 90 * 1000);

    // Save on page close as backup
    window.addEventListener('beforeunload', saveDraft);

    return () => {
      clearInterval(saveIntervalRef.current);
      clearTimeout(idleTimeoutRef.current);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('beforeunload', saveDraft);
    };
  }, [isEnabled, JSON.stringify(draftData)]);

  // Return manual save function in case needed
  return { saveDraft };
}