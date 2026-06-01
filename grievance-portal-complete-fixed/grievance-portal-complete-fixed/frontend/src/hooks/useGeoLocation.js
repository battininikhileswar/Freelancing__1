import { useState, useCallback } from 'react';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

/**
 * useGeoLocation — GPS detection + optional reverse geocoding via OpenStreetMap Nominatim
 */
export function useGeoLocation() {
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const detect = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return null;
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude: lat, longitude: lng, accuracy } = position.coords;

          let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          let state = '';
          let district = '';

          // Reverse geocode via Nominatim (free, no API key needed)
          try {
            const res = await fetch(
              `${NOMINATIM_URL}?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
              { headers: { 'Accept-Language': 'en' } }
            );
            const data = await res.json();
            const addr = data.address || {};

            address = data.display_name?.split(',').slice(0, 3).join(',').trim() || address;
            state = addr.state || '';
            district = addr.county || addr.state_district || addr.city_district || '';
          } catch {
            // Nominatim failed — use raw coords
          }

          const result = { lat, lng, address, state: state.toLowerCase(), district: district.toLowerCase(), accuracy };
          setLocation(result);
          setIsLoading(false);
          resolve(result);
        },
        (err) => {
          const messages = {
            1: 'Location access denied. Please allow location permission or enter manually.',
            2: 'Position unavailable. Please enter location manually.',
            3: 'Location request timed out. Please try again.',
          };
          const msg = messages[err.code] || 'Unable to detect location.';
          setError(msg);
          setIsLoading(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }, []);

  const clear = useCallback(() => {
    setLocation(null);
    setError(null);
  }, []);

  return { location, isLoading, error, detect, clear };
}

export default useGeoLocation;
