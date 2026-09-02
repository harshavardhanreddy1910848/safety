export interface GeoCoords {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  googleMapsLink: string;
  source?: 'gps' | 'ip' | 'cache' | 'default';
}

const STORAGE_KEY = 'silentsos_last_known_location';

export function getCachedLocation(): GeoCoords | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
        return {
          ...parsed,
          source: 'cache'
        };
      }
    }
  } catch (e) {}
  return null;
}

export function saveCachedLocation(coords: GeoCoords) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
  } catch (e) {}
}

export async function getIpGeolocation(): Promise<GeoCoords | null> {
  try {
    const res = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        const coords: GeoCoords = {
          lat: data.latitude,
          lng: data.longitude,
          accuracy: 2500, // IP accuracy approximation
          timestamp: Date.now(),
          googleMapsLink: `https://maps.google.com/?q=${data.latitude},${data.longitude}`,
          source: 'ip'
        };
        saveCachedLocation(coords);
        return coords;
      }
    }
  } catch (e) {
    console.warn('[Geolocation] IP location fetch failed:', e);
  }
  return null;
}

/**
 * Multi-layer robust geolocation resolver:
 * 1. Fast GPS check (high accuracy)
 * 2. Standard accuracy GPS check
 * 3. IP-based real location fallback
 * 4. LocalStorage cache fallback
 * 5. Default fallback
 */
export async function resolveBestLocation(timeoutMs = 6000): Promise<GeoCoords> {
  // Check if browser has geolocation
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    // 1. Try High Accuracy (3.5s timeout)
    const gpsPromise = new Promise<GeoCoords>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: GeoCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 15,
            timestamp: pos.timestamp || Date.now(),
            googleMapsLink: `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`,
            source: 'gps'
          };
          saveCachedLocation(coords);
          resolve(coords);
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: Math.min(timeoutMs, 3500), maximumAge: 60000 }
      );
    });

    try {
      return await gpsPromise;
    } catch (err: any) {
      console.log('[Geolocation] High-accuracy GPS timed out or unavailable, attempting standard GPS fallback...');
    }

    // 2. Try Standard Accuracy (2.5s timeout)
    const standardGpsPromise = new Promise<GeoCoords>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: GeoCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 50,
            timestamp: pos.timestamp || Date.now(),
            googleMapsLink: `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`,
            source: 'gps'
          };
          saveCachedLocation(coords);
          resolve(coords);
        },
        (err) => reject(err),
        { enableHighAccuracy: false, timeout: 2500, maximumAge: 300000 }
      );
    });

    try {
      return await standardGpsPromise;
    } catch (err: any) {
      console.warn('[Geolocation] Standard GPS failed/timed out, attempting IP Geolocation fallback...');
    }
  }

  // 3. Try IP-based real geolocation (resolves accurately even on desktop without GPS chip)
  const ipLocation = await getIpGeolocation();
  if (ipLocation) {
    console.log('[Geolocation] Successfully acquired real IP location:', ipLocation);
    return ipLocation;
  }

  // 4. Try Cached Location
  const cached = getCachedLocation();
  if (cached) {
    console.log('[Geolocation] Using cached location:', cached);
    return cached;
  }

  // 5. Default fallback
  const defaultCoords: GeoCoords = {
    lat: 13.0827,
    lng: 80.2707,
    accuracy: 5000,
    timestamp: Date.now(),
    googleMapsLink: 'https://maps.google.com/?q=13.0827,80.2707',
    source: 'default'
  };
  return defaultCoords;
}
