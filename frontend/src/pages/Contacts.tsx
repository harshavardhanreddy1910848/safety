import React, { useState } from 'react';
import { useApp } from '../AppContext';
import {
  Users,
  Plus,
  Trash2,
  BellRing,
  ChevronDown,
  ChevronUp,
  Check,
  Phone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Edit3,
  Copy,
  CheckCheck,
  Radio,
  Camera,
  Video,
  Mic,
  MessageSquare,
  MapPin,
  X,
  AlertTriangle,
  HeartHandshake,
  Star,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Contact } from '../types';

const RELATIONSHIP_OPTIONS = [
  'Parent / Guardian',
  'Spouse / Partner',
  'Sibling',
  'Close Friend',
  'Family Member',
  'Doctor / Medic',
  'Colleague / Mentor',
  'Security / Police'
];

export function Contacts() {
  const { state, addContact, removeContact, updateContact } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [testAlertNotice, setTestAlertNotice] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    email: string;
    relationship: string;
    isPrimary: boolean;
    preferences: {
      gps: boolean;
      photos: boolean;
      video: boolean;
      audio: boolean;
      message: boolean;
    };
  }>({
    name: '',
    phone: '',
    email: '',
    relationship: 'Family Member',
    isPrimary: false,
    preferences: {
      gps: true,
      photos: true,
      video: true,
      audio: true,
      message: true
    }
  });

  const [formError, setFormError] = useState<string | null>(null);

  const openAddModal = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      relationship: 'Family Member',
      isPrimary: state.contacts.length === 0,
      preferences: {
        gps: true,
        photos: true,
        video: true,
        audio: true,
        message: true
      }
    });
    setFormError(null);
    setModalMode('add');
  };

  const openEditModal = (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    const prefs = contact.preferences || {
      gps: true,
      photos: true,
      video: true,
      audio: true,
      message: true
    };
    setFormData({
      name: contact.name,
      phone: contact.phone || '',
      email: contact.email || '',
      relationship: (prefs as any).relationship || 'Family Member',
      isPrimary: (prefs as any).isPrimary ?? false,
      preferences: {
        gps: prefs.gps !== false,
        photos: prefs.photos !== false,
        video: prefs.video !== false,
        audio: prefs.audio !== false,
        message: prefs.message !== false
      }
    });
    setEditingContactId(contact.id);
    setFormError(null);
    setModalMode('edit');
  };

  const handleSaveContact = () => {
    if (!formData.name.trim()) {
      setFormError('Please enter the contact name.');
      return;
    }
    if (!formData.phone.trim() && !formData.email.trim()) {
      setFormError('Please provide at least a phone number or email address.');
      return;
    }

    if (modalMode === 'add') {
      if (state.contacts.length >= 5) {
        setFormError('Maximum 5 emergency contacts permitted.');
        return;
      }
      addContact({
        id: Date.now().toString(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        preferences: {
          ...formData.preferences,
          relationship: formData.relationship,
          isPrimary: formData.isPrimary
        } as any
      });
    } else if (modalMode === 'edit' && editingContactId) {
      updateContact(editingContactId, {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        preferences: {
          ...formData.preferences,
          relationship: formData.relationship,
          isPrimary: formData.isPrimary
        } as any
      });
    }

    setModalMode(null);
    setEditingContactId(null);
  };

  const togglePref = (contactId: string, prefKey: keyof Contact['preferences']) => {
    const contact = state.contacts.find((c) => c.id === contactId);
    if (contact) {
      updateContact(contactId, {
        preferences: {
          ...contact.preferences,
          [prefKey]: !contact.preferences[prefKey]
        }
      });
    }
  };

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleTestDispatch = (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    const channel = contact.phone && contact.email ? 'SMS & Email' : contact.phone ? 'SMS' : 'Email';
    setTestAlertNotice(`Simulated SOS test dispatched to ${contact.name} via ${channel}. In an active emergency, they receive live GPS telemetry.`);
    setTimeout(() => setTestAlertNotice(null), 5000);
  };

  // Metrics
  const hasValidNetwork = state.contacts.length > 0 && state.contacts.some((c) => c.phone || c.email);
  const smsCount = state.contacts.filter((c) => c.phone && c.preferences?.message !== false).length;
  const gpsReceivers = state.contacts.filter((c) => c.preferences?.gps !== false).length;

  return (
    <div className="flex-1 w-full bg-[#07070a] text-white overflow-y-auto no-scrollbar pb-32">
      {/* Toast Notice */}
      <AnimatePresence>
        {testAlertNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90%] bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{testAlertNotice}</span>
            </div>
            <button onClick={() => setTestAlertNotice(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add / Edit Contact Modal */}
      <AnimatePresence>
        {modalMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setModalMode(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-lg w-full bg-[#111117] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    {modalMode === 'add' ? <Plus className="w-5 h-5" /> : <Edit3 className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {modalMode === 'add' ? 'Register Emergency Responder' : 'Update Contact Information'}
                    </h3>
                    <p className="text-xs text-textMuted">
                      Add a trusted person who receives automated SOS distress telemetry.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setModalMode(null)}
                  className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-textMuted hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-textMuted mb-1.5">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe / Mom / Dr. Sarah"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#181822] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 placeholder:text-textMuted/50"
                  />
                </div>

                {/* Relationship & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-textMuted mb-1.5">Relationship</label>
                    <select
                      value={formData.relationship}
                      onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                      className="w-full bg-[#181822] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500/50"
                    >
                      {RELATIONSHIP_OPTIONS.map((opt) => (
                        <option key={opt} value={opt} className="bg-[#181822] text-white">
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-textMuted mb-1.5">Priority Tier</label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isPrimary: !formData.isPrimary })}
                      className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        formData.isPrimary
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                          : 'bg-[#181822] border-white/10 text-textMuted hover:text-white'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${formData.isPrimary ? 'text-amber-400 fill-amber-400' : ''}`} />
                      <span>{formData.isPrimary ? 'Primary Responder (Starred)' : 'Standard Responder'}</span>
                    </button>
                  </div>
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-textMuted mb-1.5">
                      Phone Number (SMS & Calls)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
                      <input
                        type="tel"
                        placeholder="+1 555-0199 / 9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-[#181822] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500/50 placeholder:text-textMuted/50 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-textMuted mb-1.5">
                      Email Address (Evidence Delivery)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
                      <input
                        type="email"
                        placeholder="contact@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-[#181822] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500/50 placeholder:text-textMuted/50"
                      />
                    </div>
                  </div>
                </div>

                {/* What they receive on SOS */}
                <div className="pt-2 border-t border-white/10">
                  <span className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">
                    Emergency Data Dispatched to this Contact:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { key: 'gps', label: 'Live GPS Route', icon: MapPin },
                      { key: 'photos', label: 'Photo Bursts', icon: Camera },
                      { key: 'video', label: 'Video Footage', icon: Video },
                      { key: 'audio', label: 'Audio Records', icon: Mic },
                      { key: 'message', label: 'SMS & Email Alert', icon: MessageSquare }
                    ].map(({ key, label, icon: Icon }) => {
                      const active = (formData.preferences as any)[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              preferences: {
                                ...formData.preferences,
                                [key]: !active
                              }
                            })
                          }
                          className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                            active
                              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                              : 'bg-white/[0.02] border-white/5 text-textMuted/60 hover:text-textMuted'
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                              active ? 'bg-rose-500 border-rose-500 text-black' : 'border-white/20'
                            }`}
                          >
                            {active && <Check className="w-3 h-3" />}
                          </div>
                          <Icon className="w-3 h-3 shrink-0" />
                          <span className="truncate">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveContact}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-xs font-bold text-white shadow-lg shadow-rose-950/40 transition-all cursor-pointer"
                >
                  {modalMode === 'add' ? 'Save Contact' : 'Update Contact'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* =========================================================================
            HEADER & ACTIONS
        ========================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-red-600/10 border border-rose-500/30 flex items-center justify-center shadow-lg shadow-rose-950/20">
                <Users className="w-5 h-5 text-rose-400" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Emergency Contacts & Responders
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-textMuted">
              Trusted individuals who receive instant SMS distress dispatches, phone alerts, live GPS tracking, and recorded evidence files.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {state.contacts.length < 5 && (
              <button
                onClick={openAddModal}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-xs font-bold text-white flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-rose-950/30 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Responder</span>
              </button>
            )}
          </div>
        </div>

        {/* =========================================================================
            SAFETY NETWORK READINESS CARD
        ========================================================================== */}
        <div
          className={`border rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
            hasValidNetwork
              ? 'bg-gradient-to-r from-emerald-950/30 via-[#0f0f14] to-[#0f0f14] border-emerald-500/30'
              : 'bg-gradient-to-r from-amber-950/30 via-[#0f0f14] to-[#0f0f14] border-amber-500/30'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                hasValidNetwork
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-400 animate-pulse'
              }`}
            >
              {hasValidNetwork ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {hasValidNetwork ? 'Emergency Response Network: Active & Armed' : 'Incomplete Safety Circle'}
                </h3>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    hasValidNetwork ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {hasValidNetwork ? 'Protected' : 'Action Needed'}
                </span>
              </div>
              <p className="text-xs text-textMuted max-w-xl leading-relaxed">
                {hasValidNetwork
                  ? `Your network contains ${state.contacts.length} trusted contact${state.contacts.length > 1 ? 's' : ''}. In a distress situation, automated SMS gateways and email transports will dispatch concurrently within seconds.`
                  : 'You have not registered any emergency contacts yet. Please register at least one primary responder so emergency notifications can be dispatched.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center font-mono text-xs text-textMuted bg-white/[0.03] px-3.5 py-2 rounded-xl border border-white/5">
            <Users className="w-3.5 h-3.5 text-rose-400" />
            <span>
              Capacity: <strong className="text-white">{state.contacts.length}/5</strong> Responders
            </span>
          </div>
        </div>

        {/* =========================================================================
            QUICK STATS ROW
        ========================================================================== */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0f0f14] border border-white/[0.08] rounded-2xl p-3 sm:p-4">
            <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">
              Registered Responders
            </span>
            <span className="text-xl sm:text-2xl font-black text-white">{state.contacts.length}</span>
            <span className="text-xs text-textMuted ml-1">/ 5 max</span>
          </div>

          <div className="bg-[#0f0f14] border border-white/[0.08] rounded-2xl p-3 sm:p-4">
            <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">
              SMS & Voice Dispatches
            </span>
            <span className="text-xl sm:text-2xl font-black text-rose-400">{smsCount}</span>
            <span className="text-xs text-textMuted ml-1">recipients</span>
          </div>

          <div className="bg-[#0f0f14] border border-white/[0.08] rounded-2xl p-3 sm:p-4">
            <span className="text-[10px] font-bold text-textMuted uppercase tracking-wider block mb-1">
              Live GPS Receivers
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400">{gpsReceivers}</span>
            <span className="text-xs text-textMuted ml-1">recipients</span>
          </div>
        </div>

        {/* =========================================================================
            CONTACTS LIST
        ========================================================================== */}
        {state.contacts.length === 0 ? (
          <div className="bg-[#0f0f14] border border-white/[0.08] rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <HeartHandshake className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Emergency Contacts Configured</h3>
              <p className="text-xs text-textMuted max-w-sm">
                Add trusted family members, friends, or security personnel who should be alerted automatically whenever you trigger an SOS.
              </p>
            </div>
            <button
              onClick={openAddModal}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-rose-950/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Your First Contact</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {state.contacts.map((contact, idx) => {
              const isExpanded = expandedId === contact.id;
              const prefs = contact.preferences || {
                gps: true,
                photos: true,
                video: true,
                audio: true,
                message: true
              };
              const relationship = (prefs as any).relationship || (idx === 0 ? 'Primary Guardian' : 'Trusted Contact');
              const isPrimary = (prefs as any).isPrimary ?? (idx === 0);

              return (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className={`bg-[#0f0f14] border rounded-2xl overflow-hidden transition-all duration-300 shadow-xl ${
                    isPrimary
                      ? 'border-amber-500/30 shadow-amber-950/10'
                      : isExpanded
                      ? 'border-white/20 ring-1 ring-white/10'
                      : 'border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  {/* Card Main Bar */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : contact.id)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.015] transition-colors select-none"
                  >
                    {/* Left Details */}
                    <div className="flex items-start sm:items-center gap-3.5">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/20 via-red-600/10 to-transparent border border-white/10 flex items-center justify-center font-bold text-lg text-white shadow-inner">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        {isPrimary && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 border-2 border-black flex items-center justify-center shadow-md">
                            <Star className="w-2.5 h-2.5 text-black fill-black" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-white">{contact.name}</h3>

                          {/* Relationship Badge */}
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.06] text-white/80 border border-white/10">
                            {relationship}
                          </span>

                          {isPrimary && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-amber-300" />
                              Primary Responder
                            </span>
                          )}
                        </div>

                        {/* Contact details row */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-textMuted">
                          {contact.phone && (
                            <div className="flex items-center gap-1 font-mono text-white/90">
                              <Phone className="w-3 h-3 text-rose-400" />
                              <span>{contact.phone}</span>
                              <button
                                onClick={(e) => handleCopy(contact.phone, e)}
                                title="Copy phone number"
                                className="text-textMuted hover:text-white ml-0.5 cursor-pointer"
                              >
                                {copiedText === contact.phone ? (
                                  <CheckCheck className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          )}

                          {contact.phone && contact.email && <span className="text-white/20">•</span>}

                          {contact.email && (
                            <div className="flex items-center gap-1 text-white/90">
                              <Mail className="w-3 h-3 text-sky-400" />
                              <span>{contact.email}</span>
                              <button
                                onClick={(e) => handleCopy(contact.email, e)}
                                title="Copy email address"
                                className="text-textMuted hover:text-white ml-0.5 cursor-pointer"
                              >
                                {copiedText === contact.email ? (
                                  <CheckCheck className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Action Tools */}
                    <div className="flex items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                      {/* Native Call / SMS Links */}
                      {contact.phone && (
                        <>
                          <a
                            href={`tel:${contact.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            title="Call Contact Directly"
                            className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer shadow-sm"
                          >
                            <Phone className="w-4 h-4" />
                          </a>

                          <a
                            href={`sms:${contact.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            title="Send SMS to Contact"
                            className="p-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 transition-all cursor-pointer shadow-sm"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </a>
                        </>
                      )}

                      {/* Edit Button */}
                      <button
                        onClick={(e) => openEditModal(contact, e)}
                        title="Edit Contact"
                        className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/90 border border-white/10 transition-all cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to remove ${contact.name} from your emergency responders?`)) {
                            removeContact(contact.id);
                          }
                        }}
                        title="Remove Contact"
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Expand Chevron */}
                      <div className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center text-textMuted ml-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* =========================================================================
                      EXPANDED PREFERENCES & TEST ACTIONS
                  ========================================================================== */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="border-t border-white/[0.08] bg-[#0c0c10] p-4 sm:p-6 space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-textMuted uppercase tracking-wider">
                              SOS Dispatch Permissions for {contact.name}
                            </h4>
                            <p className="text-[11px] text-textMuted/70">
                              Choose which safety data channels are transmitted automatically during a distress alert.
                            </p>
                          </div>

                          <button
                            onClick={(e) => handleTestDispatch(contact, e)}
                            className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-xs font-bold text-rose-300 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-all active:scale-95"
                          >
                            <BellRing className="w-3.5 h-3.5 text-rose-400" />
                            <span>Simulate Test Alert</span>
                          </button>
                        </div>

                        {/* Interactive Toggle Pills */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                          {[
                            { key: 'gps', label: 'Live GPS Track', icon: MapPin, desc: 'Breadcrumb coordinates' },
                            { key: 'photos', label: 'Photo Burst', icon: Camera, desc: 'Covert camera snapshots' },
                            { key: 'video', label: 'Video Clip', icon: Video, desc: 'Front/rear recordings' },
                            { key: 'audio', label: 'Audio Feed', icon: Mic, desc: 'Microphone stream' },
                            { key: 'message', label: 'SMS / Email', icon: MessageSquare, desc: 'Instant warning text' }
                          ].map(({ key, label, icon: Icon, desc }) => {
                            const active = (contact.preferences as any)[key] !== false;
                            return (
                              <button
                                key={key}
                                onClick={() => togglePref(contact.id, key as any)}
                                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                  active
                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                    : 'bg-white/[0.02] border-white/5 text-textMuted/50 hover:border-white/10'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <Icon className="w-4 h-4" />
                                  <div
                                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                      active ? 'bg-rose-500 border-rose-500 text-black' : 'border-white/20'
                                    }`}
                                  >
                                    {active && <Check className="w-3 h-3" />}
                                  </div>
                                </div>
                                <div>
                                  <span className="block text-xs font-bold text-white">{label}</span>
                                  <span className="block text-[9px] text-textMuted/70">{desc}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* =========================================================================
            ONE-TAP PUBLIC EMERGENCY HOTLINES DIRECTORY
        ========================================================================== */}
        <div className="bg-[#0f0f14] border border-white/[0.08] rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Immediate Public Emergency Hotlines (India & International)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="tel:112"
              className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-rose-500/30 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-sm">
                  112
                </div>
                <div>
                  <span className="block text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                    National Emergency
                  </span>
                  <span className="block text-[10px] text-textMuted">Police, Fire & Medical Unified</span>
                </div>
              </div>
              <Phone className="w-4 h-4 text-textMuted group-hover:text-rose-400 transition-colors" />
            </a>

            <a
              href="tel:1091"
              className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-rose-500/30 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-sm">
                  1091
                </div>
                <div>
                  <span className="block text-xs font-bold text-white group-hover:text-sky-300 transition-colors">
                    Women Helpline
                  </span>
                  <span className="block text-[10px] text-textMuted">Dedicated 24/7 Safety Dispatch</span>
                </div>
              </div>
              <Phone className="w-4 h-4 text-textMuted group-hover:text-sky-400 transition-colors" />
            </a>

            <a
              href="tel:108"
              className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-emerald-500/30 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  108
                </div>
                <div>
                  <span className="block text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Ambulance & Trauma
                  </span>
                  <span className="block text-[10px] text-textMuted">Medical Emergency Services</span>
                </div>
              </div>
              <Phone className="w-4 h-4 text-textMuted group-hover:text-emerald-400 transition-colors" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}