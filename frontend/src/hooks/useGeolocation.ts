import { useState, useEffect } from 'react';

type LocationState = {
  lat: number | null;
  lng: number | null;
  accuracy: number;
  timestamp: number;
  error: string | null;
};

export function useGeolocation() {
  const [location, setLocation] = useState<LocationState>({
    lat: null,
    lng: null,
    accuracy: 0,
    timestamp: Date.now(),
    error: null,
  });

  useEffect(() => {
    let watchId: number | null = null;
    let isMounted = true;

    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser.',
      }));
      return;
    }

    const handleSuccess = (pos: GeolocationPosition) => {
      if (!isMounted) return;
      setLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp || Date.now(),
        error: null,
      });
    };

    const handleError = (err: GeolocationPositionError) => {
      if (!isMounted) return;
      let msg = err.message;
      if (err.code === err.PERMISSION_DENIED) {
        msg = 'Location permission denied. Please allow location access in your browser.';
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        msg = 'GPS location unavailable.';
      } else if (err.code === err.TIMEOUT) {
        msg = 'GPS location request timed out.';
      }
      setLocation((prev) => ({
        ...prev,
        error: msg,
      }));
    };

    watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 10000,
    });

    return () => {
      isMounted = false;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  return location;
}