// hooks/use-auto-save.js
import { useEffect, useRef } from 'react';

/**
 * Auto-save hook with smart idle detection
 * - Saves immediately when enabled
 * - Then saves every 30 seconds when user is active
 * - Stops saving after 90 seconds of inactivity
 * - Saves on page unload as backup
 */
export function useAutoSave(draftData, isEnabled = true) {
  const lastActivityRef = useRef(Date.now());
  const saveIntervalRef = useRef(null);
  const idleTimeoutRef = useRef(null);
  const lastSaveRef = useRef(0);

  const saveDraft = async () => {
    console.log('saveDraft called, isEnabled:', isEnabled);
    
    if (!isEnabled) {
      console.log('❌ Auto-save disabled');
      return;
    }
    
    console.log('draftData:', {
      unitId: draftData.unitId,
      maintenanceType: draftData.maintenanceType,
      engineerEmail: draftData.engineerEmail,
    });
    
    if (!draftData.unitId || !draftData.maintenanceType || !draftData.engineerEmail) {
      console.log('❌ Missing required fields');
      return;
    }
    
    // Prevent duplicate saves within 5 seconds
    const now = Date.now();
    if (now - lastSaveRef.current < 5000) {
      console.log('⏭️ Skipping save (too soon)');
      return;
    }
    
    lastSaveRef.current = now;
    console.log('📤 Calling /api/save-draft...');
    
    try {
      const response = await fetch('/api/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData),
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✓ Draft saved:', result.action);
      } else {
        const errorData = await response.json();
        console.error('❌ Draft save failed:', errorData);
      }
    } catch (error) {
      console.error('❌ Draft save error:', error);
    }
  };

  const stopAutoSave = () => {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = null;
      console.log('🛑 Auto-save stopped (idle)');
    }
  };

  const startAutoSave = () => {
    if (!saveIntervalRef.current && isEnabled) {
      // Save immediately first
      saveDraft();
      
      // Then set up interval for subsequent saves
      saveIntervalRef.current = setInterval(saveDraft, 30 * 1000); // Every 30 seconds
      console.log('🚀 Auto-save started');
    }
  };

  const handleActivity = () => {
    lastActivityRef.current = Date.now();
    
    // Start auto-saving if not already running
    if (!saveIntervalRef.current && isEnabled) {
      startAutoSave();
    }
    
    // Reset idle timeout
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    
    // Stop auto-saving after 90 seconds of no activity
    idleTimeoutRef.current = setTimeout(() => {
      stopAutoSave();
    }, 90 * 1000);
  };

  useEffect(() => {
    if (!isEnabled) {
      console.log('❌ Auto-save not enabled');
      return;
    }

    console.log('✅ Auto-save enabled, setting up listeners');

    // Listen for activity
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'input', 'change'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start auto-save immediately
    startAutoSave();
    
    // Set initial idle timeout
    idleTimeoutRef.current = setTimeout(stopAutoSave, 90 * 1000);

    // Save on page close as backup
    const handleBeforeUnload = () => {
      // Use navigator.sendBeacon for more reliable save on page close
      if (draftData.unitId && draftData.maintenanceType && draftData.engineerEmail) {
        const blob = new Blob([JSON.stringify(draftData)], { type: 'application/json' });
        navigator.sendBeacon('/api/save-draft', blob);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(saveIntervalRef.current);
      clearTimeout(idleTimeoutRef.current);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('beforeunload', handleBeforeUnload);
      console.log('🧹 Auto-save cleanup');
    };
  }, [isEnabled, draftData.unitId, draftData.maintenanceType, draftData.engineerEmail]);

  // Return manual save function in case needed
  return { saveDraft };
}