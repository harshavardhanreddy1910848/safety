import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { useGeolocation } from '../hooks/useGeolocation';
import {
  Mail,
  Shield,
  Lock,
  Users,
  Folder,
  MapPin,
  Edit3,
  Check,
  X,
  LogOut,
  ChevronRight,
  ShieldCheck,
  KeyRound,
  ExternalLink,
  Heart,
  Home,
  UserCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

export function Profile() {
  const { state, updateUser, logout } = useApp();
  const navigate = useNavigate();
  const location = useGeolocation();

  // Emergency Info Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: state.userName || '',
    address: state.userAddress || '',
    bloodGroup: state.userBloodGroup || '',
    fatherName: state.userFatherName || '',
    motherName: state.userMotherName || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const openEditModal = () => {
    setEditForm({
      name: state.userName || '',
      address: state.userAddress || '',
      bloodGroup: state.userBloodGroup || '',
      fatherName: state.userFatherName || '',
      motherName: state.userMotherName || '',
    });
    setShowEditModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await updateUser({
        name: editForm.name.trim(),
        address: editForm.address.trim(),
        bloodGroup: editForm.bloodGroup,
        fatherName: editForm.fatherName.trim(),
        motherName: editForm.motherName.trim(),
      });
      setProfileSuccess(true);
      setTimeout(() => {
        setProfileSuccess(false);
        setShowEditModal(false);
      }, 1200);
    } catch (e: any) {
      alert(e.message || 'Failed to update emergency profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await updateUser({ name: state.userName, password: newPassword });
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowPasswordModal(false);
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const totalEvidenceFiles = state.history.reduce((acc, curr) => {
    const files = curr.evidence?.files?.length || 0;
    return acc + files;
  }, 0);

  return (
    <div className="flex flex-col h-full bg-background p-6 overflow-y-auto no-scrollbar pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-safe" />
          <h1 className="text-2xl font-black tracking-tight text-white">USER PROFILE</h1>
        </div>
        <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ACTIVE
        </span>
      </div>

      {/* User Identity Card */}
      <div className="bg-surface border border-surfaceHighlight rounded-2xl p-5 mb-5 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-32 h-32 bg-safe/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4">
          {/* Avatar Icon */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-black font-black text-xl shadow-lg border border-white/20">
              {getInitials(state.userName)}
            </div>
            <span className="absolute -bottom-1 -right-1 bg-background border-2 border-surface p-1 rounded-full text-safe">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white truncate">{state.userName || 'Safety User'}</h2>
              <button
                onClick={openEditModal}
                className="p-1.5 bg-surfaceHighlight hover:bg-safe/20 text-textMuted hover:text-safe rounded-lg border border-white/5 transition-colors flex items-center gap-1 text-[11px] font-bold"
                title="Edit Profile"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>

            <p className="text-xs text-textMuted flex items-center gap-1.5 truncate mt-0.5 font-mono">
              <Mail className="w-3.5 h-3.5 text-safe/80 shrink-0" />
              <span className="truncate">{state.userEmail || 'harshavardhanreddy1910848@gmail.com'}</span>
            </p>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-surfaceHighlight border border-white/10 rounded text-textMuted">
                Role: {state.userRole || 'User'}
              </span>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-safe/10 text-safe border border-safe/20 rounded">
                Cloud Sync: Neon DB
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Medical & Family ID Card */}
      <div className="bg-surface border border-surfaceHighlight rounded-2xl p-5 mb-5 shadow-lg">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-emergency animate-pulse" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Emergency & Medical Information
            </h3>
          </div>
          <button
            onClick={openEditModal}
            className="text-[10px] font-bold text-safe hover:underline flex items-center gap-1"
          >
            Update Info →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {/* Blood Group */}
          <div className="bg-background border border-surfaceHighlight rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emergency/15 text-emergency">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-textMuted uppercase font-bold">Blood Group</p>
                <p className="text-sm font-black text-white">
                  {state.userBloodGroup || <span className="text-textMuted font-normal italic">Not specified</span>}
                </p>
              </div>
            </div>
            {state.userBloodGroup && (
              <span className="px-2 py-0.5 bg-emergency/20 text-emergency border border-emergency/30 rounded font-black text-xs">
                {state.userBloodGroup}
              </span>
            )}
          </div>

          {/* Parents / Guardian Names */}
          <div className="bg-background border border-surfaceHighlight rounded-xl p-3 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/15 text-blue-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-textMuted uppercase font-bold">Parents / Guardians</p>
              <div className="mt-0.5 space-y-0.5">
                <p className="text-xs font-semibold text-white truncate">
                  <span className="text-textMuted font-normal">Father: </span>
                  {state.userFatherName || <span className="text-textMuted font-normal italic">Not provided</span>}
                </p>
                <p className="text-xs font-semibold text-white truncate">
                  <span className="text-textMuted font-normal">Mother: </span>
                  {state.userMotherName || <span className="text-textMuted font-normal italic">Not provided</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Home Address */}
          <div className="bg-background border border-surfaceHighlight rounded-xl p-3 col-span-1 md:col-span-2 flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/15 text-safe shrink-0 mt-0.5">
              <Home className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-textMuted uppercase font-bold">Residential / Home Address</p>
              <p className="text-xs font-medium text-white/90 mt-0.5 leading-relaxed">
                {state.userAddress || <span className="text-textMuted font-normal italic">No residential address registered. Tap "Update Info" to add.</span>}
              </p>
              {state.userAddress && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(state.userAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-safe hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> View Address in Google Maps
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Safety & System Statistics */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          onClick={() => navigate('/contacts')}
          className="bg-surface border border-surfaceHighlight rounded-xl p-3.5 text-left hover:border-safe/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <Users className="w-4 h-4 text-safe" />
            <span className="text-[10px] text-textMuted font-mono">MAX 3</span>
          </div>
          <p className="text-xl font-black text-white">{state.contacts.length}</p>
          <p className="text-[10px] font-bold text-textMuted uppercase mt-0.5">Emergency Contacts</p>
        </button>

        <button
          onClick={() => navigate('/evidence')}
          className="bg-surface border border-surfaceHighlight rounded-xl p-3.5 text-left hover:border-emergency/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <Folder className="w-4 h-4 text-emergency" />
            <span className="text-[10px] text-textMuted font-mono">{state.history.length} ALERTS</span>
          </div>
          <p className="text-xl font-black text-white">{totalEvidenceFiles}</p>
          <p className="text-[10px] font-bold text-textMuted uppercase mt-0.5">Evidence Files</p>
        </button>
      </div>

      {/* Security & Access Section */}
      <div className="space-y-3 mb-6">
        <h3 className="text-xs font-bold text-textMuted uppercase tracking-wider px-1">
          Security & Access
        </h3>

        <div className="bg-surface border border-surfaceHighlight rounded-xl overflow-hidden divide-y divide-white/5">
          {/* Change Account Password */}
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full p-4 flex items-center justify-between hover:bg-surfaceHighlight/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Change Account Password</p>
                <p className="text-[11px] text-textMuted">Update your account login password</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-textMuted" />
          </button>

          {/* Safety PIN Status */}
          <button
            onClick={() => navigate('/settings')}
            className="w-full p-4 flex items-center justify-between hover:bg-surfaceHighlight/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Emergency Safety PIN</p>
                <p className="text-[11px] text-textMuted">
                  Required to cancel alerts & delete evidence ({state.settings?.safetyPin ? '••••' : 'Not set'})
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-textMuted" />
          </button>

          {/* GPS Tracking Details */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Live GPS Location</p>
                <p className="text-[11px] text-textMuted font-mono">
                  {location.lat && location.lng
                    ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                    : 'Searching for GPS signal...'}
                </p>
              </div>
            </div>
            {location.lat && location.lng && (
              <a
                href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-safe/10 hover:bg-safe/20 text-safe rounded-lg border border-safe/20 transition-colors"
                title="Open in Google Maps"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Logout Action */}
      <button
        onClick={() => {
          if (window.confirm('Are you sure you want to sign out of SilentSOS?')) {
            logout();
            navigate('/auth');
          }
        }}
        className="w-full bg-emergency/10 border border-emergency/30 hover:bg-emergency/20 text-emergency font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>

      {/* ── Edit Emergency Profile Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-surfaceHighlight rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-safe" />
                  <h3 className="font-bold text-white text-base">Edit Emergency Profile</h3>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 text-textMuted hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {profileSuccess ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-safe/20 text-safe flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-white text-base">Profile Saved!</p>
                  <p className="text-xs text-textMuted mt-1">Your emergency details are synchronized with Neon DB.</p>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                  {/* Full Name */}
                  <div>
                    <label className="font-bold text-textMuted uppercase block mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="e.g. John Doe"
                      required
                      className="w-full bg-background border border-surfaceHighlight rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-safe"
                    />
                  </div>

                  {/* Blood Group */}
                  <div>
                    <label className="font-bold text-textMuted uppercase block mb-1 flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-emergency" /> Blood Group
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {BLOOD_GROUPS.map((bg) => (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, bloodGroup: bg })}
                          className={`py-2 rounded-xl border text-xs font-bold transition-colors ${
                            editForm.bloodGroup === bg
                              ? 'bg-emergency text-white border-emergency'
                              : 'bg-background border-surfaceHighlight text-textMuted hover:text-white'
                          }`}
                        >
                          {bg}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Father's Name */}
                  <div>
                    <label className="font-bold text-textMuted uppercase block mb-1">
                      Father's Name
                    </label>
                    <input
                      type="text"
                      value={editForm.fatherName}
                      onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
                      placeholder="Father / Guardian Full Name"
                      className="w-full bg-background border border-surfaceHighlight rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-safe"
                    />
                  </div>

                  {/* Mother's Name */}
                  <div>
                    <label className="font-bold text-textMuted uppercase block mb-1">
                      Mother's Name
                    </label>
                    <input
                      type="text"
                      value={editForm.motherName}
                      onChange={(e) => setEditForm({ ...editForm, motherName: e.target.value })}
                      placeholder="Mother / Guardian Full Name"
                      className="w-full bg-background border border-surfaceHighlight rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-safe"
                    />
                  </div>

                  {/* Residential Address */}
                  <div>
                    <label className="font-bold text-textMuted uppercase block mb-1 flex items-center gap-1">
                      <Home className="w-3.5 h-3.5 text-safe" /> Residential Address
                    </label>
                    <textarea
                      rows={3}
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      placeholder="Door No, Street, Landmark, City, State, Pincode"
                      className="w-full bg-background border border-surfaceHighlight rounded-xl p-3 text-sm text-white focus:outline-none focus:border-safe resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="flex-1 py-3 bg-surfaceHighlight hover:bg-white/10 text-textMuted hover:text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="flex-1 py-3 bg-safe hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                      {profileSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Change Password Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-surfaceHighlight rounded-2xl p-6 w-full max-w-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-safe" />
                  <h3 className="font-bold text-white">Change Password</h3>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="p-1 text-textMuted hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {passwordSuccess ? (
                <div className="py-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-safe/20 text-safe flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-white">Password Updated!</p>
                  <p className="text-xs text-textMuted mt-1">Your new password is now active in Neon DB.</p>
                </div>
              ) : (
                <form onSubmit={handleSavePassword} className="space-y-4">
                  {passwordError && (
                    <div className="p-3 bg-emergency/15 border border-emergency/30 text-emergency text-xs rounded-xl">
                      {passwordError}
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      className="w-full bg-background border border-surfaceHighlight rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-safe"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      className="w-full bg-background border border-surfaceHighlight rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-safe"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      className="flex-1 py-2.5 bg-surfaceHighlight hover:bg-white/10 text-textMuted hover:text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="flex-1 py-2.5 bg-safe hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                      {passwordSaving ? 'Updating...' : 'Save Password'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
