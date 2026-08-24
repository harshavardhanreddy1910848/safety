import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { AppState, Contact, Settings, AlertEvent } from './types';

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0');
export const API_BASE   = isLocal ? 'http://localhost:3001/api' : `${window.location.origin}/api`;
export const MEDIA_BASE = isLocal ? 'http://localhost:3001' : window.location.origin; // For /evidence/* static files


const defaultSettings: Settings = {
  gestureSensitivity: 'Medium',
  autoRepeatInterval: 5,
  photoBurstCount: 5,
  videoDuration: '1min',
  audioQuality: 'high',
  cameraPreference: 'both',
  fakeCallDisguise: false,
  stealthMode: false,
  messageTemplate:
    '🚨 EMERGENCY ALERT — SilentSOS\nFrom: {name}\nTime: {time}\nType: {type}\n\n📍 GPS Location: {gps_link}\n\n⚠️ Please respond immediately or call emergency services. Updates every 5 minutes until you acknowledge.',
  safetyPin: '1234',
  autoDeleteDays: 30
};

const initialState: AppState = {
  isSetupComplete: false,
  userName: '',
  userRole: 'user',
  contacts: [],
  settings: defaultSettings,
  history: [],
  activeAlert: null
};

type AppContextType = {
  state: AppState;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  resetPassword: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (profile: string | { name?: string; phone?: string; bloodGroup?: string; homeAddress?: string; emergencyNotes?: string }) => Promise<void>;
  addContact: (contact: Contact) => Promise<void>;
  updateContact: (id: string, contact: Partial<Contact>) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  addHistoryEvent: (event: AlertEvent) => void;
  triggerAlert: (type: string) => Promise<void>;
  cancelAlert: () => Promise<void>;
  stopAlert: () => Promise<void>;
  completeSetup: () => Promise<void>;
  clearData: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
  currentLocation: {
    lat: number | null;
    lng: number | null;
    accuracy: number;
    timestamp: number;
  };
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('silentsos_token'));

  // Background geolocation tracker
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number | null;
    lng: number | null;
    accuracy: number;
    timestamp: number;
  }>(() => {
    try {
      const saved = localStorage.getItem('silentsos_last_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          return {
            lat: parsed.lat,
            lng: parsed.lng,
            accuracy: parsed.accuracy || 100,
            timestamp: parsed.timestamp || Date.now()
          };
        }
      }
    } catch (e) {}
    return {
      lat: null,
      lng: null,
      accuracy: Infinity,
      timestamp: 0
    };
  });

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLoc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp || Date.now()
        };
        setCurrentLocation(newLoc);
        try {
          localStorage.setItem('silentsos_last_location', JSON.stringify(newLoc));
        } catch (e) {}
      },
      (err) => {
        console.warn('[Background Geolocation] Error:', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const getCurrentPreciseLocation = async (): Promise<{
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
    googleMapsLink: string;
  }> => {
    const makeResult = (lat: number, lng: number, accuracy: number, timestamp?: number) => {
      const ts = timestamp || Date.now();
      const res = {
        lat,
        lng,
        accuracy,
        timestamp: ts,
        googleMapsLink: `https://maps.google.com/?q=${lat},${lng}`
      };
      try {
        localStorage.setItem('silentsos_last_location', JSON.stringify({ lat, lng, accuracy, timestamp: ts }));
      } catch (e) {}
      return res;
    };

    // 1. Check existing currentLocation state if accurate
    if (currentLocation.lat !== null && currentLocation.lng !== null && currentLocation.accuracy < 1000) {
      console.log('[Geolocation] Using background location:', currentLocation);
      return makeResult(currentLocation.lat, currentLocation.lng, currentLocation.accuracy, currentLocation.timestamp);
    }

    // Helper for browser position queries
    const fetchBrowserPos = (highAcc: boolean, timeoutMs: number): Promise<GeolocationPosition> => {
      return new Promise((res, rej) => {
        if (!navigator.geolocation) return rej(new Error('No geolocation API'));
        navigator.geolocation.getCurrentPosition(res, rej, {
          enableHighAccuracy: highAcc,
          timeout: timeoutMs,
          maximumAge: 10000
        });
      });
    };

    // 2. Query browser fast low-accuracy first (very fast on laptop/wifi/mobile)
    try {
      const pos = await fetchBrowserPos(false, 2000);
      console.log('[Geolocation] Fast standard position obtained:', pos.coords);
      return makeResult(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.timestamp);
    } catch (e) {
      console.warn('[Geolocation] Fast standard lookup missed:', e);
    }

    // 3. Try high-accuracy query
    try {
      const pos = await fetchBrowserPos(true, 3000);
      console.log('[Geolocation] High accuracy position obtained:', pos.coords);
      return makeResult(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.timestamp);
    } catch (e) {
      console.warn('[Geolocation] High accuracy lookup missed:', e);
    }

    // 4. Check cached background state or localStorage
    if (currentLocation.lat !== null && currentLocation.lng !== null) {
      console.log('[Geolocation] Using cached background location');
      return makeResult(currentLocation.lat, currentLocation.lng, currentLocation.accuracy, currentLocation.timestamp);
    }

    try {
      const saved = localStorage.getItem('silentsos_last_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          console.log('[Geolocation] Using cached localStorage position');
          return makeResult(parsed.lat, parsed.lng, parsed.accuracy || 500, parsed.timestamp);
        }
      }
    } catch (e) {}

    // 5. IP Geolocation API fallback
    try {
      console.log('[Geolocation] Attempting IP-based lookup fallback...');
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const ipData = await response.json();
        if (typeof ipData.latitude === 'number' && typeof ipData.longitude === 'number') {
          console.log('[Geolocation] IP Geolocation success:', ipData.latitude, ipData.longitude);
          return makeResult(ipData.latitude, ipData.longitude, 5000);
        }
      }
    } catch (e) {
      console.warn('[Geolocation] IP lookup failed:', e);
    }

    // 6. Safe Ultimate Fallback (Default emergency coordinates)
    console.log('[Geolocation] Using safe fallback coordinates');
    return makeResult(19.076, 72.8777, 10000);
  };

  // Sync state with backend on startup
  const fetchState = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/state`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setState({
          isSetupComplete: data.user.isSetupComplete,
          userName: data.user.name,
          userPhone: data.user.phone || '',
          userBloodGroup: data.user.bloodGroup || '',
          userHomeAddress: data.user.homeAddress || '',
          userEmergencyNotes: data.user.emergencyNotes || '',
          userRole: data.user.role || 'user',
          contacts: data.contacts,
          settings: data.settings,
          history: data.history,
          activeAlert: data.activeAlert ? {
            isActive: data.activeAlert.isActive,
            isCountingDown: false,
            startTime: data.activeAlert.startTime,
            type: data.activeAlert.type,
            id: data.activeAlert.id,
            contactsNotified: data.activeAlert.contactsNotified
          } : null
        });
      } else if (res.status === 401 || res.status === 403) {
        logout();
      }
    } catch (e) {
      console.error('Failed to sync state with backend:', e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchState(token);
    } else {
      setState(initialState);
    }
  }, [token]);

  const refreshHistory = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/alerts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const history = await res.json();
        setState(s => ({ ...s, history }));
      }
    } catch (e) {
      console.error('Failed to load alerts history', e);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }
    sessionStorage.setItem('silentsos_token', data.token);
    setToken(data.token);
  };

  const register = async (email: string, password: string, name: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    sessionStorage.setItem('silentsos_token', data.token);
    setToken(data.token);
  };

  const resetPassword = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Password reset failed');
    }
  };

  const logout = () => {
    sessionStorage.removeItem('silentsos_token');
    setToken(null);
    setState(initialState);
  };

  const updateUser = async (profile: string | { name?: string; phone?: string; bloodGroup?: string; homeAddress?: string; emergencyNotes?: string }) => {
    const payload = typeof profile === 'string' ? { name: profile } : profile;
    setState((s) => ({
      ...s,
      userName: payload.name !== undefined ? payload.name : s.userName,
      userPhone: payload.phone !== undefined ? payload.phone : s.userPhone,
      userBloodGroup: payload.bloodGroup !== undefined ? payload.bloodGroup : s.userBloodGroup,
      userHomeAddress: payload.homeAddress !== undefined ? payload.homeAddress : s.userHomeAddress,
      userEmergencyNotes: payload.emergencyNotes !== undefined ? payload.emergencyNotes : s.userEmergencyNotes
    }));

    if (!token) return;
    try {
      await fetch(`${API_BASE}/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error('Failed to update user profile:', e);
    }
  };

  const addContact = async (contact: Contact) => {
    setState((s) => ({
      ...s,
      contacts: [...s.contacts, contact].slice(0, 3)
    }));
    if (!token) return;
    try {
      await fetch(`${API_BASE}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(contact)
      });
    } catch (e) {
      console.error('Failed to add contact:', e);
    }
  };

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    setState((s) => ({
      ...s,
      contacts: s.contacts.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      )
    }));
    if (!token) return;
    try {
      await fetch(`${API_BASE}/contacts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.error('Failed to update contact:', e);
    }
  };

  const removeContact = async (id: string) => {
    setState((s) => ({
      ...s,
      contacts: s.contacts.filter((c) => c.id !== id)
    }));
    if (!token) return;
    try {
      await fetch(`${API_BASE}/contacts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Failed to remove contact:', e);
    }
  };

  const updateSettings = async (updates: Partial<Settings>) => {
    setState((s) => ({
      ...s,
      settings: { ...s.settings, ...updates }
    }));
    if (!token) return;
    try {
      await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.error('Failed to update settings:', e);
    }
  };

  const addHistoryEvent = (event: AlertEvent) => {
    setState((s) => ({
      ...s,
      history: [event, ...s.history]
    }));
  };

  const triggerAlert = async (type: string): Promise<void> => {
    // Safely acquire location via multi-tier fallback (never throws or pops browser alert dialogs)
    const loc = await getCurrentPreciseLocation();

    // Optimistically set active alert in local state
    setState((s) => ({
      ...s,
      activeAlert: {
        isActive: true,
        isCountingDown: true,
        startTime: Date.now(),
        type,
        id: undefined
      }
    }));

    if (!token) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          type,
          location: loc
        })
      });

      if (res.ok) {
        const data = await res.json();
        setState((s) => ({
          ...s,
          activeAlert: {
            isActive: true,
            isCountingDown: true,
            startTime: data.timestamp,
            type: data.type,
            id: data.id,
            contactsNotified: data.contactsNotified
          }
        }));
      } else {
        const errData = await res.json().catch(() => ({ error: 'Unknown server error' }));
        console.warn('Server error triggering alert:', errData.error);
      }
    } catch (e: any) {
      console.warn('Network error triggering alert:', e.message);
    }
  };

  const cancelAlert = async () => {
    const alertId = state.activeAlert?.id;
    setState((s) => ({ ...s, activeAlert: null }));

    if (alertId && token) {
      try {
        await fetch(`${API_BASE}/alerts/${alertId}/cancel`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        await refreshHistory();
      } catch (e) {
        console.error('Failed to cancel alert:', e);
      }
    }
  };

  const stopAlert = async () => {
    const alertId = state.activeAlert?.id;
    setState((s) => ({ ...s, activeAlert: null }));

    if (alertId && token) {
      try {
        await fetch(`${API_BASE}/alerts/${alertId}/stop`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        await refreshHistory();
      } catch (e) {
        console.error('Failed to stop alert:', e);
      }
    }
  };

  const completeSetup = async () => {
    setState((s) => ({ ...s, isSetupComplete: true }));
    if (!token) return;
    try {
      await fetch(`${API_BASE}/user/setup-complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Failed to complete setup:', e);
    }
  };

  const clearData = async () => {
    setState(initialState);
    if (!token) return;
    try {
      await fetch(`${API_BASE}/clear-all`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Failed to clear data:', e);
    }
  };

  const deleteAlert = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/alerts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await refreshHistory();
      }
    } catch (e) {
      console.error('Failed to delete alert:', e);
    }
  };

  return (
    <AppContext.Provider
      value={{
        state,
        token,
        isAuthenticated: !!token,
        login,
        register,
        resetPassword,
        logout,
        updateUser,
        addContact,
        updateContact,
        removeContact,
        updateSettings,
        addHistoryEvent,
        triggerAlert,
        cancelAlert,
        stopAlert,
        completeSetup,
        clearData,
        refreshHistory,
        deleteAlert,
        currentLocation
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}