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
    error: null
  });

  useEffect(() => {
    let watchId: number | null = null;

    const handleSuccess = (pos: GeolocationPosition) => {
      setLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp || Date.now(),
        error: null
      });
    };

    const handleError = (error: { message?: string; code?: number }) => {
      let msg = error.message || 'Location error';
      setLocation({
        lat: null,
        lng: null,
        accuracy: 0,
        timestamp: Date.now(),
        error: msg
      });
    };

    const startWatching = () => {
      if (!navigator.geolocation) {
        setLocation({
          lat: null,
          lng: null,
          accuracy: 0,
          timestamp: Date.now(),
          error: 'Geolocation is not supported by your browser.'
        });
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (pos) => handleSuccess(pos),
        (err) => {
          let msg = err.message;
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'Location permission denied. Please allow location access in your browser settings.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'Location information is unavailable.';
          } else if (err.code === err.TIMEOUT) {
            msg = 'Location request timed out.';
          }
          handleError({ message: msg });
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    };

    const checkPermissionAndStart = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const status = await navigator.permissions.query({ name: 'geolocation' });
          
          const handlePermissionChange = () => {
            if (status.state === 'denied') {
              if (watchId !== null) navigator.geolocation.clearWatch(watchId);
              setLocation({
                lat: null,
                lng: null,
                accuracy: 0,
                timestamp: Date.now(),
                error: 'Location access denied in browser settings.'
              });
            } else {
              startWatching();
            }
          };

          status.onchange = handlePermissionChange;

          if (status.state === 'denied') {
            setLocation({
              lat: null,
              lng: null,
              accuracy: 0,
              timestamp: Date.now(),
              error: 'Location access denied in browser settings.'
            });
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
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  return location;
}