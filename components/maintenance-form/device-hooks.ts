import { useEffect } from 'react';
import { dlog } from './debug';

/**
 * Fill the location field from network geolocation plus reverse geocoding.
 * Skips when a location is already set (e.g. restored from a draft) or the
 * page was opened from a draft link. Runs once on mount by design; the
 * exhaustive-deps warning is accepted tech debt shared by every form.
 */
export function useGeolocation({ locationDisplay, setLocationDisplay, setLocationCountry, setLocationFailed }) {
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    if (locationDisplay && locationDisplay.trim() !== "") return;

    const urlParams = new URLSearchParams(window.location.search);
    const isDraft = urlParams.get('draft') === 'true';
    if (isDraft) return;

    const options = {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 0
    };

    const doGetLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(
              `/api/reverse-geocode?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
            );

            if (!res.ok) {
              console.error('Geocoding failed:', res.status);
              return;
            }

            const data = await res.json();

            if (data?.address) {
              const loc = data.address.suburb || data.address.village || data.address.town || data.address.city || "";
              const formalCountry = data.address.country || "";
              const displayCountry = data.address.country_code ? data.address.country_code.toUpperCase() : formalCountry;
              const shortCountry = displayCountry === "GB" ? "UK" : displayCountry;
              const combinedDisplay = loc ? `${loc}, ${shortCountry}` : shortCountry;

              setLocationDisplay((prev) => (!prev || prev.trim() === "") ? combinedDisplay : prev);
              setLocationCountry(formalCountry);
            }
          } catch (err) {
            console.error("Geocoding error:", err);
          }
        },
        (error) => {
          setLocationFailed(true);
          switch(error.code) {
            case error.PERMISSION_DENIED:
              dlog("User denied location permission");
              break;
            case error.POSITION_UNAVAILABLE:
              dlog("Location information unavailable");
              break;
            case error.TIMEOUT:
              dlog("Location request timed out");
              break;
            default:
              dlog("Unknown location error:", error.message);
          }
        },
        options
      );
    };

    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        if (result.state !== 'denied') doGetLocation();
      }).catch(() => doGetLocation());
    } else {
      doGetLocation();
    }
  }, []);
}

/**
 * Ask for microphone permission on page load so the first voice input
 * does not stall on the browser prompt mid-checklist.
 */
export function useMicPreflight() {
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.mediaDevices || !navigator.permissions) return;
    navigator.permissions.query({ name: 'microphone' }).then(result => {
      if (result.state === 'prompt') {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => { stream.getTracks().forEach(t => t.stop()); })
          .catch(() => {});
      }
    }).catch(() => {});
  }, []);
}
