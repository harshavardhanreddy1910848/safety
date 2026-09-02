import { useState, useEffect } from 'react';
import { getCachedLocation, saveCachedLocation, getIpGeolocation } from '../utils/geolocation';

type LocationState = {
  lat: number | null;
  lng: number | null;
  accuracy: number;
  timestamp: number;
  error: string | null;
};

export function useGeolocation() {
  const [location, setLocation] = useState<LocationState>(() => {
    const cached = getCachedLocation();
    if (cached) {
      return {
        lat: cached.lat,
        lng: cached.lng,
        accuracy: cached.accuracy,
        timestamp: cached.timestamp,
        error: null,
      };
    }
    return {
      lat: null,
      lng: null,
      accuracy: 0,
      timestamp: Date.now(),
      error: null,
    };
  });

  useEffect(() => {
    let watchId: number | null = null;
    let isMounted = true;

    const handleSuccess = (pos: GeolocationPosition) => {
      if (!isMounted) return;
      const coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp || Date.now(),
        googleMapsLink: `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`,
      };
      saveCachedLocation(coords);
      setLocation({
        ...coords,
        error: null,
      });
    };

    const handleFallback = async () => {
      const ipLoc = await getIpGeolocation();
      if (!isMounted) return;
      if (ipLoc) {
        setLocation({
          lat: ipLoc.lat,
          lng: ipLoc.lng,
          accuracy: ipLoc.accuracy,
          timestamp: ipLoc.timestamp,
          error: null,
        });
      }
    };

    const startWatching = () => {
      if (!navigator.geolocation) {
        handleFallback();
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (pos) => handleSuccess(pos),
        (err) => {
          console.warn('[Geolocation] watchPosition notice:', err.message);
          // If GPS times out or is unavailable on desktop, resolve IP fallback seamlessly
          handleFallback();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    };

    startWatching();

    return () => {
      isMounted = false;
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  return location;
}