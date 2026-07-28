import { useState, useEffect } from 'react';

type LocationState = {
  lat: number | null;
  lng: number | null;
  accuracy: number;
  timestamp: number;
  error: string | null;
};

export function useGeolocation() {
  const [location, setLocation] = useState<LocationState>(() => {
    try {
      const cached = localStorage.getItem('silentsos_last_location');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          return {
            lat: parsed.lat,
            lng: parsed.lng,
            accuracy: parsed.accuracy || 100,
            timestamp: parsed.timestamp || Date.now(),
            error: null
          };
        }
      }
    } catch (e) {}
    return {
      lat: null,
      lng: null,
      accuracy: 0,
      timestamp: Date.now(),
      error: null
    };
  });

  useEffect(() => {
    let watchId: number;

    const handleSuccess = (position: GeolocationPosition) => {
      const newLoc = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp || Date.now(),
        error: null
      };
      setLocation(newLoc);
      try {
        localStorage.setItem('silentsos_last_location', JSON.stringify({
          lat: newLoc.lat,
          lng: newLoc.lng,
          accuracy: newLoc.accuracy,
          timestamp: newLoc.timestamp
        }));
      } catch (e) {}
    };

    const handleError = (error: GeolocationPositionError) => {
      let msg = error.message;
      if (error.code === error.PERMISSION_DENIED) {
        msg = 'Location permission denied in browser settings.';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        msg = 'Location information is unavailable.';
      } else if (error.code === error.TIMEOUT) {
        msg = 'Location request timed out.';
      }

      setLocation(prev => ({
        ...prev,
        error: msg
      }));
    };

    const startWatching = () => {
      if (!navigator.geolocation) {
        setLocation(prev => ({
          ...prev,
          error: 'Geolocation is not supported by your browser.'
        }));
        return;
      }

      // Try watching with reasonable timeout and cached age support
      watchId = navigator.geolocation.watchPosition(
        handleSuccess,
        (err) => {
          // If high accuracy times out or fails, try standard accuracy fallback
          if (err.code === err.TIMEOUT) {
            navigator.geolocation.getCurrentPosition(
              handleSuccess,
              handleError,
              { enableHighAccuracy: false, timeout: 5000, maximumAge: 15000 }
            );
          } else {
            handleError(err);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 10000
        }
      );
    };

    const checkPermissionAndStart = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const status = await navigator.permissions.query({ name: 'geolocation' });
          
          const handlePermissionChange = () => {
            if (status.state === 'denied') {
              if (watchId) navigator.geolocation.clearWatch(watchId);
              setLocation(prev => ({
                ...prev,
                error: 'Location access denied in browser settings.'
              }));
            } else {
              startWatching();
            }
          };

          status.onchange = handlePermissionChange;

          if (status.state === 'denied') {
            setLocation(prev => ({
              ...prev,
              error: 'Location access denied in browser settings.'
            }));
          } else {
            startWatching();
          }
        } else {
          startWatching();
        }
      } catch (err) {
        startWatching();
      }
    };

    checkPermissionAndStart();

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return location;
}