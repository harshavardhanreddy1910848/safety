import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { AppState, Contact, Settings, AlertEvent } from './types';
import { initPushNotifications } from './utils/push';



const getMediaBase = () => {
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }
  return window.location.origin.includes('localhost') ? 'http://localhost:3001' : window.location.origin;
};

export const MEDIA_BASE = getMediaBase();
export const API_BASE   = `${MEDIA_BASE}/api`;
export const WS_BASE    = MEDIA_BASE.startsWith('https')
  ? MEDIA_BASE.replace(/^https/, 'wss')
  : MEDIA_BASE.replace(/^http/, 'ws');


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
  userEmail: '',
  userId: '',
  userAddress: '',
  userBloodGroup: '',
  userFatherName: '',
  userMotherName: '',
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
  loadingToken: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  sendResetCode: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (
    nameOrUpdates: string | { name?: string; password?: string; address?: string; bloodGroup?: string; fatherName?: string; motherName?: string },
    password?: string
  ) => Promise<void>;
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
  const [token, setToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);

  // Sync token from sessionStorage/localStorage on mount
  useEffect(() => {
    const initToken = () => {
      try {
        const savedToken = sessionStorage.getItem('silentsos_token') || localStorage.getItem('silentsos_token');
        setToken(savedToken);
      } catch (e) {
        console.error('Failed to load token:', e);
      } finally {
        setLoadingToken(false);
      }
    };
    initToken();
  }, []);


  // Background geolocation tracker
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number | null;
    lng: number | null;
    accuracy: number;
    timestamp: number;
  }>({
    lat: null,
    lng: null,
    accuracy: Infinity,
    timestamp: 0
  });

  useEffect(() => {
    let watchId: number | null = null;

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setCurrentLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp || Date.now()
          });
        },
        (err) => {
          console.warn('[Web Geolocation] Error:', err);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000
        }
      );
    }

    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);


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
          userEmail: data.user.email,
          userId: data.user.id,
          userAddress: data.user.address || '',
          userBloodGroup: data.user.bloodGroup || '',
          userFatherName: data.user.fatherName || '',
          userMotherName: data.user.motherName || '',
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
      initPushNotifications(token);
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
    localStorage.setItem('silentsos_token', data.token);
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
    localStorage.setItem('silentsos_token', data.token);
    setToken(data.token);
  };

  const sendResetCode = async (email: string) => {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send verification code');
    }
  };

  const resetPassword = async (email: string, code: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Password reset failed');
    }
  };

  const logout = async () => {
    sessionStorage.removeItem('silentsos_token');
    localStorage.removeItem('silentsos_token');
    setToken(null);
    setState(initialState);
  };


  const updateUser = async (
    nameOrUpdates: string | { name?: string; password?: string; address?: string; bloodGroup?: string; fatherName?: string; motherName?: string },
    password?: string
  ) => {
    let payload: any = {};
    if (typeof nameOrUpdates === 'string') {
      payload = { name: nameOrUpdates, password };
      setState((s) => ({ ...s, userName: nameOrUpdates }));
    } else {
      payload = nameOrUpdates;
      setState((s) => ({
        ...s,
        userName: nameOrUpdates.name !== undefined ? nameOrUpdates.name : s.userName,
        userAddress: nameOrUpdates.address !== undefined ? nameOrUpdates.address : s.userAddress,
        userBloodGroup: nameOrUpdates.bloodGroup !== undefined ? nameOrUpdates.bloodGroup : s.userBloodGroup,
        userFatherName: nameOrUpdates.fatherName !== undefined ? nameOrUpdates.fatherName : s.userFatherName,
        userMotherName: nameOrUpdates.motherName !== undefined ? nameOrUpdates.motherName : s.userMotherName,
      }));
    }

    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to update user profile');
      }
      const updatedUser = await res.json();
      if (updatedUser) {
        setState((s) => ({
          ...s,
          userName: updatedUser.name !== undefined ? updatedUser.name : s.userName,
          userAddress: updatedUser.address !== undefined ? updatedUser.address : s.userAddress,
          userBloodGroup: updatedUser.bloodGroup !== undefined ? updatedUser.bloodGroup : s.userBloodGroup,
          userFatherName: updatedUser.fatherName !== undefined ? updatedUser.fatherName : s.userFatherName,
          userMotherName: updatedUser.motherName !== undefined ? updatedUser.motherName : s.userMotherName,
        }));
      }
    } catch (e) {
      console.error('Failed to update user profile:', e);
      throw e;
    }
  };

  const addContact = async (contact: Contact) => {
    setState((s) => ({
      ...s,
      contacts: [...s.contacts, contact].slice(0, 5)
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
    return new Promise<void>(async (resolve, reject) => {
      let loc;

      if (currentLocation.lat !== null && currentLocation.lng !== null) {
        loc = {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          accuracy: currentLocation.accuracy,
          timestamp: currentLocation.timestamp || Date.now(),
          googleMapsLink: `https://maps.google.com/?q=${currentLocation.lat},${currentLocation.lng}`
        };
      } else {
        try {
          const pos = await new Promise<GeolocationPosition>((resolvePos, rejectPos) => {
            navigator.geolocation.getCurrentPosition(resolvePos, rejectPos, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 10000
            });
          });
          loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp || Date.now(),
            googleMapsLink: `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`
          };
        } catch (e) {
          loc = {
            lat: 13.0827,
            lng: 80.2707,
            accuracy: 100,
            timestamp: Date.now(),
            googleMapsLink: `https://maps.google.com/?q=13.0827,80.2707`
          };
        }
      }

      // Set activeAlert with pending status
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
        resolve();
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
          resolve();
        } else {
          const errData = await res.json().catch(() => ({ error: 'Unknown server error' }));
          const errMsg = errData.error || 'Server error triggering alert';
          setState((s) => ({ ...s, activeAlert: null }));
          alert(`🚨 Trigger Failed: ${errMsg}`);
          reject(new Error(errMsg));
        }
      } catch (e: any) {
        setState((s) => ({ ...s, activeAlert: null }));
        alert(`🚨 Network Error: ${e.message}`);
        reject(e);
      }
    });
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
        loadingToken,
        login,
        register,
        sendResetCode,
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