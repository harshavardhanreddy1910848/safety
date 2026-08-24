import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import {
  EyeOff,
  PhoneCall,
  Trash2,
  MessageSquare,
  LogOut,
  Lock,
  CheckCircle2,
  ChevronRight,
  X,
  LifeBuoy,
  User,
  Save,
  HeartPulse,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
  Camera,
  Video,
  Sliders,
  AlertTriangle,
  Sparkles,
  KeyRound,
  BatteryCharging,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Settings() {
  const navigate = useNavigate();
  const { state, updateUser, updateSettings, clearData, logout } = useApp();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'capture' | 'system'>('profile');
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // User Profile details state
  const [profileName, setProfileName] = useState(state.userName);
  const [profilePhone, setProfilePhone] = useState(state.userPhone || '');
  const [profileBloodGroup, setProfileBloodGroup] = useState(state.userBloodGroup || '');
  const [profileHomeAddress, setProfileHomeAddress] = useState(state.userHomeAddress || '');
  const [profileEmergencyNotes, setProfileEmergencyNotes] = useState(state.userEmergencyNotes || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  useEffect(() => {
    setProfileName(state.userName || '');
    setProfilePhone(state.userPhone || '');
    setProfileBloodGroup(state.userBloodGroup || '');
    setProfileHomeAddress(state.userHomeAddress || '');
    setProfileEmergencyNotes(state.userEmergencyNotes || '');
  }, [state.userName, state.userPhone, state.userBloodGroup, state.userHomeAddress, state.userEmergencyNotes]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateUser({
        name: profileName.trim(),
        phone: profilePhone.trim(),
        bloodGroup: profileBloodGroup,
        homeAddress: profileHomeAddress.trim(),
        emergencyNotes: profileEmergencyNotes.trim()
      });
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const appendMedicalChip = (chipText: string) => {
    if (!profileEmergencyNotes.includes(chipText)) {
      setProfileEmergencyNotes(prev => prev ? `${prev}, ${chipText}` : chipText);
    }
  };

  const insertMessageTag = (tag: string) => {
    updateSettings({
      messageTemplate: (state.settings.messageTemplate || '') + ' ' + tag
    });
  };

  // Change PIN modal states
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [pinPhase, setPinPhase] = useState<'verify' | 'new' | 'confirm' | 'success'>('verify');
  const [enteredPin, setEnteredPin] = useState('');
  const [firstNewPin, setFirstNewPin] = useState('');
  const [changePinError, setChangePinError] = useState(false);
  const [changePinErrorMessage, setChangePinErrorMessage] = useState('');

  const handlePinKeyPress = (num: string) => {
    if (pinPhase === 'success') return;
    setChangePinError(false);
    setChangePinErrorMessage('');

    if (enteredPin.length < 4) {
      const newPin = enteredPin + num;
      setEnteredPin(newPin);

      if (newPin.length === 4) {
        if (pinPhase === 'verify') {
          const targetPin = state.settings.safetyPin || '1234';
          if (newPin === targetPin) {
            setTimeout(() => {
              setPinPhase('new');
              setEnteredPin('');
            }, 300);
          } else {
            setChangePinError(true);
            setChangePinErrorMessage('Incorrect current PIN.');
            setTimeout(() => {
              setEnteredPin('');
            }, 800);
          }
        } else if (pinPhase === 'new') {
          setTimeout(() => {
            setFirstNewPin(newPin);
            setEnteredPin('');
            setPinPhase('confirm');
          }, 300);
        } else if (pinPhase === 'confirm') {
          if (newPin === firstNewPin) {
            handleSavePin(newPin);
          } else {
            setChangePinError(true);
            setChangePinErrorMessage('PINs do not match. Restarting...');
            setTimeout(() => {
              setEnteredPin('');
              setFirstNewPin('');
              setPinPhase('new');
              setChangePinError(false);
            }, 1200);
          }
        }
      }
    }
  };

  const handlePinBackspace = () => {
    if (pinPhase === 'success') return;
    setChangePinError(false);
    setChangePinErrorMessage('');
    setEnteredPin(p => p.slice(0, -1));
  };

  const handlePinClear = () => {
    if (pinPhase === 'success') return;
    setChangePinError(false);
    setChangePinErrorMessage('');
    setEnteredPin('');
  };

  const handleSavePin = async (newPin: string) => {
    setPinPhase('success');
    try {
      await updateSettings({ safetyPin: newPin });
      setTimeout(() => {
        setShowChangePinModal(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to save settings PIN:', err);
      setPinPhase('new');
      setChangePinError(true);
      setChangePinErrorMessage('Save failed. Try again.');
    }
  };

  useEffect(() => {
    if (!showChangePinModal || pinPhase === 'success') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handlePinKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handlePinBackspace();
      } else if (e.key === 'Escape') {
        setShowChangePinModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showChangePinModal, pinPhase, enteredPin, firstNewPin]);

  const handleClearData = () => {
    clearData();
    window.location.reload();
  };

  // Fake Call simulation screen
  if (showFakeCall) {
    return (
      <div
        className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-between py-16 px-6 cursor-pointer"
        onClick={() => setShowFakeCall(false)}
      >
        <div className="text-center space-y-3 mt-10">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-slate-700 to-slate-500 mx-auto flex items-center justify-center text-4xl font-bold text-white shadow-2xl border-2 border-white/20">
            M
          </div>
          <h2 className="text-3xl font-light text-white tracking-wide">Mom</h2>
          <p className="text-white/60 text-sm animate-pulse">Incoming Call • Mobile...</p>
        </div>

        <div className="flex w-full max-w-xs justify-between px-6 mb-10">
          <div className="flex flex-col items-center gap-2">
            <button className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center shadow-lg shadow-rose-900/40 transition-transform active:scale-95">
              <PhoneCall className="w-8 h-8 text-white rotate-[135deg]" />
            </button>
            <span className="text-white/80 text-xs font-medium">Decline</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/40 animate-bounce transition-transform active:scale-95">
              <PhoneCall className="w-8 h-8 text-black" />
            </button>
            <span className="text-white/80 text-xs font-medium">Accept</span>
          </div>
        </div>
      </div>
    );
  }

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  const userInitial = (state.userName && state.userName.trim() ? state.userName.trim()[0].toUpperCase() : 'U');

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] text-white p-4 md:p-6 overflow-y-auto no-scrollbar pb-28 max-w-4xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-rose-500" />
            <span>Preferences & Settings</span>
          </h1>
          <p className="text-xs text-textMuted mt-0.5">Manage distress alerts, responder profiles, and system security</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          System Operational
        </div>
      </div>

      {/* Hero Profile Status Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-950/40 via-[#18181f] to-[#121218] border border-white/10 p-5 mb-6 shadow-xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-xl font-black text-white shadow-lg shadow-rose-900/30 ring-2 ring-white/20">
                {userInitial}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#0a0a0c] flex items-center justify-center">
                <ShieldCheck className="w-3 h-3 text-black stroke-[3]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{state.userName || 'Safety User'}</h2>
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-black uppercase text-rose-300 tracking-wider">
                  {state.userRole || 'USER'}
                </span>
              </div>
              <p className="text-xs text-textMuted flex items-center gap-1.5 mt-0.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> Protected by SilentSOS Cloud Gateway
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {profileBloodGroup && (
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-black flex items-center gap-1">
                <HeartPulse className="w-3.5 h-3.5" /> {profileBloodGroup}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> PIN Protected
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-textMuted text-xs font-medium">
              {state.contacts?.length || 0}/3 Contacts
            </span>
          </div>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-[#141418] border border-white/5 rounded-2xl mb-6">
        {[
          { id: 'profile', label: 'Profile & ICE', icon: User },
          { id: 'security', label: 'Security & Stealth', icon: Lock },
          { id: 'capture', label: 'Capture & SOS', icon: Camera },
          { id: 'system', label: 'Help & System', icon: LifeBuoy }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative py-3 px-2 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs font-bold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-950/40'
                  : 'text-textMuted hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate text-[11px] sm:text-xs">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT CONTAINER */}
      <div className="space-y-6">
        {/* ======================================================== */}
        {/* TAB 1: PERSONAL & EMERGENCY (ICE) PROFILE                */}
        {/* ======================================================== */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-rose-500" />
                    Personal & Medical Distress Profile (ICE)
                  </h2>
                  <p className="text-xs text-textMuted mt-0.5">
                    This critical medical data is instantly relayed to emergency contacts & first responders during an active SOS.
                  </p>
                </div>
                <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-wider">
                  Live Dispatch Data
                </span>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Full Name & Phone Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-rose-400" /> Full Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Your full legal name"
                        className="w-full bg-[#0a0a0c] rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500 border border-white/10 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-sky-400" /> Mobile Phone Number
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="e.g. 06301712591"
                        className="w-full bg-[#0a0a0c] rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500 border border-white/10 transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Blood Group Grid Selector */}
                <div>
                  <label className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-rose-500" /> Blood Group
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {bloodGroups.map((bg) => {
                      const isSelected = profileBloodGroup === bg;
                      return (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => setProfileBloodGroup(isSelected ? '' : bg)}
                          className={`py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 border ${
                            isSelected
                              ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-950/40 scale-105'
                              : 'bg-[#0a0a0c] border-white/10 text-white/80 hover:bg-white/[0.04] hover:text-white'
                          }`}
                        >
                          {bg}
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Address */}
                <div>
                  <label className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" /> Primary Address / Landmark
                  </label>
                  <input
                    type="text"
                    value={profileHomeAddress}
                    onChange={(e) => setProfileHomeAddress(e.target.value)}
                    placeholder="e.g. SAVEETHA NAGAR, THANDALAM, CHENNAI-602105"
                    className="w-full bg-[#0a0a0c] rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500 border border-white/10 transition-all"
                  />
                </div>

                {/* ICE Emergency Medical Notes & Prompt Chips */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-textMuted uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Critical ICE / Medical Notes
                    </label>
                    <span className="text-[11px] text-amber-400/80 font-medium">Important for emergency doctors</span>
                  </div>
                  <textarea
                    rows={3}
                    value={profileEmergencyNotes}
                    onChange={(e) => setProfileEmergencyNotes(e.target.value)}
                    placeholder="Describe medical conditions, allergies, or emergency treatments (e.g. fits, asthma, diabetic, medication needs)..."
                    className="w-full bg-[#0a0a0c] rounded-xl p-3.5 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500 border border-white/10 transition-all resize-none leading-relaxed"
                  />
                  
                  {/* Quick Medical Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-textMuted font-bold uppercase mr-1">Quick Add:</span>
                    {['fits / epilepsy', 'asthma', 'diabetic', 'penicillin allergy', 'hypertension', 'blood pressure'].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => appendMedicalChip(chip)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] text-white/70 hover:text-white transition-all cursor-pointer"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-xs text-textMuted">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Saved under AES-256 cloud encryption</span>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {profileSaveSuccess && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Profile Updated!
                      </motion.span>
                    )}

                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingProfile ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Save className="w-4 h-4" /> Save Profile Details
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: SECURITY & STEALTH                                */}
        {/* ======================================================== */}
        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Stealth Mode Card */}
            <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <EyeOff className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm sm:text-base">Stealth Screen Mode</h3>
                    {state.settings.stealthMode && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-textMuted mt-1 leading-relaxed max-w-md">
                    Dims your screen to pitch black during an SOS alert. Microphones, cameras, and GPS tracking continue recording covertly in the background.
                  </p>
                </div>
              </div>

              <button
                onClick={() => updateSettings({ stealthMode: !state.settings.stealthMode })}
                className={`w-14 h-7 rounded-full transition-all relative shrink-0 p-1 cursor-pointer ${
                  state.settings.stealthMode ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-white/10'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    state.settings.stealthMode ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Fake Call Disguise Card */}
            <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">Fake Incoming Call Disguise</h3>
                  <p className="text-xs text-textMuted mt-1 leading-relaxed max-w-md">
                    Simulates a realistic incoming phone call from "Mom" to help you gracefully excuse yourself from uncomfortable or dangerous encounters.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowFakeCall(true)}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5 text-rose-400" /> Test Call
              </button>
            </div>

            {/* Safety PIN Card */}
            <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <KeyRound className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm sm:text-base">Safety Deactivation PIN</h3>
                    <span className="font-mono text-xs px-2 py-0.5 bg-white/10 rounded text-amber-300 font-bold tracking-widest">
                      ••••
                    </span>
                  </div>
                  <p className="text-xs text-textMuted mt-1 leading-relaxed max-w-md">
                    A secret 4-digit code required to stop an ongoing SOS alert, cancel emergency broadcasts, or delete evidence logs.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setPinPhase('verify');
                  setEnteredPin('');
                  setFirstNewPin('');
                  setChangePinError(false);
                  setChangePinErrorMessage('');
                  setShowChangePinModal(true);
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all shrink-0 shadow-md shadow-rose-950/40 cursor-pointer flex items-center gap-1"
              >
                Change PIN <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: CAPTURE & SOS ALERTS                              */}
        {/* ======================================================== */}
        {activeTab === 'capture' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Photo Burst Count */}
            <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Automatic Photo Burst Count</h3>
                    <p className="text-xs text-textMuted">Number of instant snapshots captured when SOS is activated</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-black font-mono">
                  {state.settings.photoBurstCount} Photos
                </span>
              </div>

              <div className="pt-2">
                <input
                  type="range"
                  min="3"
                  max="10"
                  step="1"
                  value={state.settings.photoBurstCount}
                  onChange={(e) => updateSettings({ photoBurstCount: parseInt(e.target.value) as any })}
                  className="w-full accent-emerald-400 h-2 bg-[#0a0a0c] rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-textMuted font-mono mt-1.5">
                  <span>3 Fast (Low bandwidth)</span>
                  <span>5 Balanced (Recommended)</span>
                  <span>10 Maximum Detail</span>
                </div>
              </div>
            </div>

            {/* Video Duration */}
            <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <Video className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Evidence Video Recording Duration</h3>
                  <p className="text-xs text-textMuted">Length of video buffer captured and encrypted to cloud storage</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: '30s', label: '30 Seconds', desc: 'Fast Upload' },
                  { id: '1min', label: '1 Minute', desc: 'Standard' },
                  { id: 'continuous', label: 'Continuous', desc: 'Full Loop' }
                ].map((dur) => {
                  const isSelected = state.settings.videoDuration === dur.id;
                  return (
                    <button
                      key={dur.id}
                      onClick={() => updateSettings({ videoDuration: dur.id as any })}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-950/40'
                          : 'bg-[#0a0a0c] border-white/10 text-white/70 hover:bg-white/[0.03]'
                      }`}
                    >
                      <p className="font-bold text-xs">{dur.label}</p>
                      <p className="text-[10px] text-textMuted mt-0.5">{dur.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-xs text-amber-300">
                <BatteryCharging className="w-4 h-4 shrink-0" />
                <span>Battery &lt; 20% → Video quality will automatically throttle to preserve device battery life.</span>
              </div>
            </div>

            {/* Message Template Customizer */}
            <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Emergency Dispatch SMS & Email Template</h3>
                    <p className="text-xs text-textMuted">Broadcasted automatically to all selected emergency contacts</p>
                  </div>
                </div>
              </div>

              <textarea
                value={state.settings.messageTemplate}
                onChange={(e) => updateSettings({ messageTemplate: e.target.value })}
                rows={4}
                className="w-full bg-[#0a0a0c] rounded-xl p-3.5 text-xs text-white outline-none focus:ring-2 focus:ring-rose-500 border border-white/10 resize-none font-mono leading-relaxed"
              />

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-textMuted font-bold uppercase mr-1">Insert Dynamic Tags:</span>
                {['{name}', '{time}', '{type}', '{gps_link}'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertMessageTag(tag)}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] text-rose-300 font-mono transition-all cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: HELP & SYSTEM                                     */}
        {/* ======================================================== */}
        {activeTab === 'system' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Help & Support Hub Gateway */}
            <div className="bg-gradient-to-r from-rose-950/30 to-[#141418] border border-white/10 rounded-2xl p-5 shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <LifeBuoy className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">Support & Feedback Ticket Hub</h3>
                  <p className="text-xs text-textMuted mt-1 leading-relaxed max-w-md">
                    Submit bug reports, feature requests, or message the safety moderation support team.
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/feedback')}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all shrink-0 shadow-md shadow-rose-950/40 cursor-pointer flex items-center gap-1.5"
              >
                Open Support <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* System Info Banner */}
            <div className="bg-[#141418] border border-white/10 rounded-2xl p-4 flex items-center justify-between text-xs text-textMuted">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-sky-400" />
                <span>SilentSOS Core Version 1.0.0 (PostgreSQL Cloud Synchronized)</span>
              </div>
              <span className="font-mono text-[10px] text-white/50">BUILD 2026.08</span>
            </div>

            {/* Logout Session */}
            <div className="bg-[#141418] border border-white/10 rounded-2xl p-5 shadow-xl flex items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-sm">Account Session</h3>
                <p className="text-xs text-textMuted mt-0.5">End active session on this device</p>
              </div>

              <button
                onClick={() => {
                  logout();
                  window.location.reload();
                }}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2"
              >
                <LogOut className="w-4 h-4 text-warning" /> Log Out
              </button>
            </div>

            {/* Danger Zone */}
            <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-5 shadow-xl flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <h3 className="font-bold text-rose-400 text-sm">Danger Zone</h3>
                </div>
                <p className="text-xs text-textMuted mt-1 leading-relaxed max-w-md">
                  Permanently clear local distress history, contacts, and account preferences.
                </p>
              </div>

              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Reset App Data
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Confirmation Modal for Reset App Data */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#18181f] border border-rose-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-500 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">Reset All Application Data?</h3>
              <p className="text-xs text-textMuted leading-relaxed">
                This will delete your emergency contacts, stored distress history, and local preferences permanently. This action cannot be undone.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearData}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 transition-colors shadow-lg shadow-rose-950/40 cursor-pointer"
                >
                  Yes, Reset Everything
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change PIN Modal Overlay */}
      <AnimatePresence>
        {showChangePinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="max-w-xs w-full flex flex-col items-center relative">
              {pinPhase !== 'success' && (
                <button
                  onClick={() => setShowChangePinModal(false)}
                  className="absolute -top-12 -right-2 text-white/50 hover:text-white bg-white/10 rounded-full p-2 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {pinPhase === 'success' ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-6 shadow-lg shadow-emerald-950/20">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Safety PIN Changed!
                  </h3>
                  <p className="text-xs text-emerald-400 font-bold tracking-wide uppercase">
                    Settings Saved
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="pin-phases"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full flex flex-col items-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-6 shadow-md shadow-rose-950/20">
                    <Lock className="w-6 h-6 text-rose-400" />
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">
                    {pinPhase === 'verify' && 'Verify Current PIN'}
                    {pinPhase === 'new' && 'Enter New PIN'}
                    {pinPhase === 'confirm' && 'Confirm New PIN'}
                  </h3>
                  <p className="text-xs text-textMuted mb-8 leading-relaxed max-w-[240px]">
                    {pinPhase === 'verify' && 'Enter your current 4-digit Safety PIN to verify identity.'}
                    {pinPhase === 'new' && 'Enter your new secure 4-digit Safety PIN.'}
                    {pinPhase === 'confirm' && 'Re-enter your new 4-digit Safety PIN to confirm.'}
                  </p>

                  {/* PIN Dot Indicators */}
                  <div className="flex gap-4 mb-8">
                    {[0, 1, 2, 3].map((index) => (
                      <motion.div
                        key={index}
                        animate={changePinError ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                        transition={{ duration: 0.4 }}
                        className={`w-4 h-4 rounded-full border-2 transition-all ${
                          enteredPin.length > index
                            ? changePinError
                              ? 'bg-rose-500 border-rose-500'
                              : 'bg-emerald-500 border-emerald-500 shadow-[0_0_8px_#10b981]'
                            : 'border-white/25 bg-transparent'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Keypad */}
                  <div className="grid grid-cols-3 gap-4 w-full max-w-[260px] mb-8">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                      <button
                        key={num}
                        onClick={() => handlePinKeyPress(num)}
                        className="aspect-square rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-lg font-bold text-white flex items-center justify-center transition-all active:scale-90 shadow-sm cursor-pointer"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      onClick={handlePinClear}
                      disabled={enteredPin.length === 0}
                      className="aspect-square rounded-2xl text-[10px] uppercase font-bold text-white/40 hover:text-white transition-colors flex items-center justify-center disabled:opacity-0 disabled:cursor-default cursor-pointer"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => handlePinKeyPress('0')}
                      className="aspect-square rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-lg font-bold text-white flex items-center justify-center transition-all active:scale-90 shadow-sm cursor-pointer"
                    >
                      0
                    </button>
                    <button
                      onClick={handlePinBackspace}
                      disabled={enteredPin.length === 0}
                      className="aspect-square rounded-2xl text-[10px] uppercase font-bold text-white/40 hover:text-white transition-colors flex items-center justify-center disabled:opacity-0 disabled:cursor-default cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>

                  {changePinErrorMessage && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-rose-400 font-bold animate-pulse"
                    >
                      {changePinErrorMessage}
                    </motion.p>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}