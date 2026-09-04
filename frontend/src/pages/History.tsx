import React, { useState, useMemo, useEffect } from 'react';
import { useApp, MEDIA_BASE } from '../AppContext';
import {
  History as HistoryIcon,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldAlert,
  Search,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Camera,
  Video,
  Mic,
  Trash2,
  Navigation,
  ShieldCheck,
  Filter,
  ArrowUpDown,
  Radio,
  FileSpreadsheet,
  Layers,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleMapTracker } from '../components/GoogleMapTracker';
import { AlertEvent } from '../types';

export function History() {
  const { state, refreshHistory, deleteAlert } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Sent' | 'Active' | 'Cancelled'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'photo' | 'video' | 'audio' } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    refreshHistory();
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshHistory();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = state.history.length;
    const resolved = state.history.filter((h) => h.status === 'Sent').length;
    const active = state.history.filter((h) => h.status === 'Active').length;
    const cancelled = state.history.filter((h) => h.status === 'Cancelled').length;

    const totalDuration = state.history.reduce((acc, h) => acc + (h.durationSeconds || 0), 0);
    const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0;

    const totalPhotos = state.history.reduce((acc, h) => acc + (h.evidence?.photos || 0), 0);
    const totalVideos = state.history.reduce((acc, h) => acc + (h.evidence?.videos || 0), 0);
    const totalAudio = state.history.reduce((acc, h) => acc + (h.evidence?.audio || 0), 0);

    return {
      total,
      resolved,
      active,
      cancelled,
      avgDuration,
      totalEvidence: totalPhotos + totalVideos + totalAudio,
      totalPhotos,
      totalVideos,
      totalAudio
    };
  }, [state.history]);

  // Filtering and sorting
  const filteredHistory = useMemo(() => {
    return state.history
      .filter((event) => {
        // Status filter
        if (statusFilter !== 'all' && event.status !== statusFilter) {
          return false;
        }
        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const typeMatch = (event.type || '').toLowerCase().includes(q);
          const dateMatch = format(event.timestamp, 'MMM d yyyy h:mm a').toLowerCase().includes(q);
          const idMatch = (event.id || '').toLowerCase().includes(q);
          return typeMatch || dateMatch || idMatch;
        }
        return true;
      })
      .sort((a, b) => {
        return sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
      });
  }, [state.history, statusFilter, searchQuery, sortOrder]);

  const toggleExpand = (id: string) => {
    setExpandedAlertId((prev) => (prev === id ? null : id));
  };

  const handleExportCSV = () => {
    if (state.history.length === 0) return;

    const headers = 'Alert ID,Type,Timestamp,Date Time,Status,Duration (seconds),Photos Count,Videos Count,Audio Count,GPS Points Count\n';
    const rows = state.history.map((h) => {
      const dateStr = new Date(h.timestamp).toISOString();
      return `"${h.id}","${h.type || 'General'}","${h.timestamp}","${dateStr}","${h.status}",${h.durationSeconds || 0},${h.evidence?.photos || 0},${h.evidence?.videos || 0},${h.evidence?.audio || 0},${h.gpsPath?.length || 0}`;
    });

    const blob = new Blob([headers + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SilentSOS_Alert_History_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to permanently remove this incident record and associated media evidence?')) {
      setDeletingId(id);
      try {
        await deleteAlert(id);
        if (expandedAlertId === id) setExpandedAlertId(null);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="flex-1 w-full bg-[#07070a] text-white overflow-y-auto no-scrollbar pb-32">
      {/* Lightbox Modal for Media Preview */}
      <AnimatePresence>
        {previewMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
            onClick={() => setPreviewMedia(null)}
          >
            <div
              className="relative max-w-3xl w-full max-h-[85vh] flex flex-col items-center justify-center bg-[#111116] border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewMedia(null)}
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {previewMedia.type === 'photo' && (
                <img
                  src={previewMedia.url}
                  alt="Recorded Incident Evidence"
                  className="w-full max-h-[75vh] object-contain rounded-xl"
                />
              )}

              {previewMedia.type === 'video' && (
                <video
                  src={previewMedia.url}
                  controls
                  autoPlay
                  className="w-full max-h-[75vh] rounded-xl bg-black"
                />
              )}

              {previewMedia.type === 'audio' && (
                <div className="py-12 px-6 flex flex-col items-center w-full">
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-6">
                    <Mic className="w-8 h-8 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-semibold mb-4 text-white">Audio Evidence Recording</h4>
                  <audio src={previewMedia.url} controls className="w-full max-w-md" />
                </div>
              )}

              <div className="w-full py-2.5 px-4 flex items-center justify-between text-xs text-textMuted border-t border-white/5 mt-2">
                <span>Type: <strong className="text-white uppercase">{previewMedia.type}</strong></span>
                <a
                  href={previewMedia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium underline"
                >
                  <ExternalLink className="w-3 h-3" /> Open in New Tab
                </a>
              </div>
            </div>
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
                <HistoryIcon className="w-5 h-5 text-rose-400" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Alert History & Incident Audit
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-textMuted">
              Chronological log of distress triggers, recorded evidence, and multi-channel emergency dispatches.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              title="Refresh Alert History"
              className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-white/90 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-rose-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={state.history.length === 0}
              title="Export History Report to CSV"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600/90 to-red-600/90 hover:from-rose-500 hover:to-red-500 text-xs font-bold text-white flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-md shadow-rose-950/30"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            METRIC INTELLIGENCE CARDS
        ========================================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Incidents */}
          <div className="bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-white/20 rounded-2xl p-4 transition-all duration-300 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-textMuted uppercase tracking-wider">Total Triggers</span>
              <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">{metrics.total}</span>
              <span className="text-[10px] text-textMuted font-medium">recorded</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-rose-300/80">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>{metrics.active > 0 ? `${metrics.active} active now` : 'All safe & idle'}</span>
            </div>
          </div>

          {/* Card 2: Resolved Incidents */}
          <div className="bg-gradient-to-b from-emerald-500/[0.06] to-emerald-500/[0.01] border border-emerald-500/20 hover:border-emerald-500/30 rounded-2xl p-4 transition-all duration-300 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-emerald-400/90 uppercase tracking-wider">Resolved</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">{metrics.resolved}</span>
              <span className="text-[10px] text-emerald-400/70">
                {metrics.total > 0 ? `${Math.round((metrics.resolved / metrics.total) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-300/80">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Dispatches completed</span>
            </div>
          </div>

          {/* Card 3: Avg Duration */}
          <div className="bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-white/20 rounded-2xl p-4 transition-all duration-300 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-textMuted uppercase tracking-wider">Avg Response</span>
              <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">{metrics.avgDuration}s</span>
              <span className="text-[10px] text-textMuted font-medium">active duration</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-sky-300/80">
              <Radio className="w-3 h-3 text-sky-400" />
              <span>Real-time GPS broadcast</span>
            </div>
          </div>

          {/* Card 4: Evidence Files */}
          <div className="bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-white/20 rounded-2xl p-4 transition-all duration-300 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-textMuted uppercase tracking-wider">Media Evidence</span>
              <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">{metrics.totalEvidence}</span>
              <span className="text-[10px] text-textMuted font-medium">files saved</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-amber-300/80 font-mono">
              <span>{metrics.totalPhotos}P</span> • <span>{metrics.totalVideos}V</span> • <span>{metrics.totalAudio}A</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SEARCH, FILTERS & SORTING DECK
        ========================================================================== */}
        <div className="bg-[#0f0f14] border border-white/[0.08] rounded-2xl p-3 sm:p-4 space-y-3 shadow-lg">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
              <input
                type="text"
                placeholder="Search by incident type, date, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#17171f] text-white text-xs sm:text-sm pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/50 placeholder:text-textMuted/60 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-white text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="w-full sm:w-auto px-3.5 py-2.5 bg-[#17171f] hover:bg-white/[0.08] border border-white/10 rounded-xl text-xs font-semibold text-white/90 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-rose-400" />
              <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            {[
              { id: 'all', label: 'All Incidents', count: metrics.total },
              { id: 'Sent', label: 'Resolved', count: metrics.resolved, color: 'text-emerald-400' },
              { id: 'Active', label: 'Active SOS', count: metrics.active, color: 'text-rose-400' },
              { id: 'Cancelled', label: 'Cancelled', count: metrics.cancelled, color: 'text-slate-400' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white/15 text-white border border-white/20 shadow-sm'
                    : 'bg-white/[0.02] text-textMuted hover:bg-white/[0.06] hover:text-white border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    statusFilter === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-white/[0.06] text-textMuted'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* =========================================================================
            INCIDENTS TIMELINE STREAM
        ========================================================================== */}
        {filteredHistory.length === 0 ? (
          <div className="bg-[#0f0f14] border border-white/[0.08] rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-textMuted">
              <HistoryIcon className="w-8 h-8 opacity-40" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Incidents Found</h3>
              <p className="text-xs text-textMuted max-w-sm">
                {searchQuery || statusFilter !== 'all'
                  ? 'No recorded alerts match your active search criteria. Try clearing the filter.'
                  : 'Your alert history is clean. Any distress triggers or test alerts will appear here in chronological order.'}
              </p>
            </div>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-all cursor-pointer"
              >
                Reset Search Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((event, idx) => {
              const isExpanded = expandedAlertId === event.id;
              const hasGps = event.gpsPath && event.gpsPath.length > 0;
              const latestGps = hasGps ? event.gpsPath[event.gpsPath.length - 1] : null;
              const hasEvidence =
                (event.evidence?.photos || 0) > 0 ||
                (event.evidence?.videos || 0) > 0 ||
                (event.evidence?.audio || 0) > 0;
              const isDeleting = deletingId === event.id;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.04, 0.3) }}
                  className={`bg-[#0f0f14] border rounded-2xl overflow-hidden transition-all duration-300 shadow-xl ${
                    event.status === 'Active'
                      ? 'border-rose-500/40 shadow-rose-950/20'
                      : isExpanded
                      ? 'border-white/20 ring-1 ring-white/10'
                      : 'border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  {/* Card Main Bar */}
                  <div
                    onClick={() => toggleExpand(event.id)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.015] transition-colors select-none"
                  >
                    {/* Left: Indicator & Core Details */}
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                          event.status === 'Sent'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : event.status === 'Active'
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse'
                            : 'bg-slate-500/10 border-slate-500/30 text-slate-400'
                        }`}
                      >
                        {event.status === 'Sent' ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : event.status === 'Active' ? (
                          <Radio className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                            {event.type || 'Emergency'} Alert
                          </h3>

                          {/* Status Pill */}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border flex items-center gap-1 ${
                              event.status === 'Sent'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : event.status === 'Active'
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                                : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                event.status === 'Sent'
                                  ? 'bg-emerald-400'
                                  : event.status === 'Active'
                                  ? 'bg-rose-400'
                                  : 'bg-slate-400'
                              }`}
                            />
                            {event.status === 'Sent' ? 'Resolved' : event.status}
                          </span>
                        </div>

                        {/* Timestamp & Duration */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-textMuted">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-textMuted" />
                            {format(event.timestamp, 'MMM d, yyyy • h:mm a')}
                          </span>
                          <span className="text-white/20">•</span>
                          <span>
                            Duration: <strong className="text-white/90 font-mono">{event.durationSeconds || 0}s</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Badges & Controls */}
                    <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                      {/* Evidence Pill Tags */}
                      <div className="flex items-center gap-1.5">
                        {(event.evidence?.photos || 0) > 0 && (
                          <span className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] font-mono text-white/90 flex items-center gap-1">
                            <Camera className="w-3 h-3 text-rose-400" />
                            {event.evidence.photos}
                          </span>
                        )}
                        {(event.evidence?.videos || 0) > 0 && (
                          <span className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] font-mono text-white/90 flex items-center gap-1">
                            <Video className="w-3 h-3 text-sky-400" />
                            {event.evidence.videos}
                          </span>
                        )}
                        {(event.evidence?.audio || 0) > 0 && (
                          <span className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] font-mono text-white/90 flex items-center gap-1">
                            <Mic className="w-3 h-3 text-amber-400" />
                            {event.evidence.audio}
                          </span>
                        )}
                        {hasGps && (
                          <span className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] font-mono text-emerald-300 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            {event.gpsPath.length}
                          </span>
                        )}
                      </div>

                      {/* Expand Chevron */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleDelete(event.id, e)}
                          disabled={isDeleting}
                          title="Delete incident record"
                          className="p-2 rounded-xl text-textMuted hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="w-8 h-8 rounded-xl bg-white/[0.04] flex items-center justify-center text-textMuted">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* =========================================================================
                      EXPANDED INTELLIGENCE DRAWER
                  ========================================================================== */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="border-t border-white/[0.08] bg-[#0c0c10] p-4 sm:p-6 space-y-6"
                      >
                        {/* 1. GPS Route Map & Navigation */}
                        {hasGps && latestGps ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-textMuted uppercase tracking-wider flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                                Recorded GPS Distress Route ({event.gpsPath.length} Waypoints)
                              </h4>
                              <a
                                href={`https://maps.google.com/?q=${latestGps.lat},${latestGps.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 underline"
                              >
                                <ExternalLink className="w-3 h-3" /> Full Google Maps
                              </a>
                            </div>

                            <GoogleMapTracker
                              currentCoords={{
                                lat: latestGps.lat,
                                lng: latestGps.lng,
                                accuracy: (latestGps as any).accuracy
                              }}
                              gpsPath={event.gpsPath}
                              isDistress={event.status === 'Active'}
                              title={`Incident #${event.id.slice(-6)} Track`}
                              height="260px"
                            />
                          </div>
                        ) : (
                          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-center text-xs text-textMuted">
                            No granular GPS waypoints recorded for this trigger.
                          </div>
                        )}

                        {/* 2. Media Evidence Gallery Preview */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-textMuted uppercase tracking-wider flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-amber-400" />
                            Captured Evidence Media
                          </h4>

                          {event.evidence?.files && event.evidence.files.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {event.evidence.files.map((file, fileIdx) => {
                                const fullUrl = `${MEDIA_BASE}${file.url}`;
                                return (
                                  <div
                                    key={fileIdx}
                                    onClick={() => setPreviewMedia({ url: fullUrl, type: file.type })}
                                    className="group relative aspect-video bg-black/60 rounded-xl overflow-hidden border border-white/10 hover:border-rose-500/50 transition-all cursor-pointer shadow-md"
                                  >
                                    {file.type === 'photo' && (
                                      <img
                                        src={fullUrl}
                                        alt={`Evidence ${fileIdx + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    )}

                                    {file.type === 'video' && (
                                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 group-hover:bg-zinc-800 transition-colors">
                                        <Video className="w-6 h-6 text-sky-400 mb-1" />
                                        <span className="text-[10px] font-semibold text-white/80">Play Video</span>
                                      </div>
                                    )}

                                    {file.type === 'audio' && (
                                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 group-hover:bg-zinc-800 transition-colors">
                                        <Mic className="w-6 h-6 text-amber-400 mb-1" />
                                        <span className="text-[10px] font-semibold text-white/80">Play Audio</span>
                                      </div>
                                    )}

                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <span className="px-2 py-1 rounded-md bg-black/80 text-white text-[10px] font-bold">
                                        Inspect
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-xs text-textMuted flex items-center justify-between">
                              <span>
                                Summary counts: {event.evidence?.photos || 0} Photos, {event.evidence?.videos || 0} Videos, {event.evidence?.audio || 0} Audio recordings.
                              </span>
                              <span className="text-[11px] text-textMuted/70 italic">Files archived securely</span>
                            </div>
                          )}
                        </div>

                        {/* 3. Emergency Dispatches & Public Receiver Link */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                          {/* Dispatched Contacts */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-textMuted uppercase tracking-wider">
                              Contacts Notified
                            </h4>
                            {event.contactsNotified && event.contactsNotified.length > 0 ? (
                              <div className="space-y-1.5">
                                {event.contactsNotified.map((c: any, cIdx: number) => (
                                  <div
                                    key={cIdx}
                                    className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs"
                                  >
                                    <span className="font-semibold text-white">
                                      {c.contactName || c.contactId || `Contact #${cIdx + 1}`}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                        c.status === 'Sent' || c.status === 'Delivered'
                                          ? 'bg-emerald-500/10 text-emerald-400'
                                          : 'bg-rose-500/10 text-rose-400'
                                      }`}
                                    >
                                      {c.status || 'Delivered'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-textMuted">Dispatched to user emergency circle.</p>
                            )}
                          </div>

                          {/* Live Receiver Link */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-textMuted uppercase tracking-wider">
                              Public Responder Broadcast Link
                            </h4>
                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                              <p className="text-xs text-textMuted">
                                Emergency contacts access real-time telemetry and evidence via this dedicated tracking token:
                              </p>
                              <a
                                href={`/receiver/${event.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Open Public Receiver View
                              </a>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}