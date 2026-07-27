import { useState, useEffect } from 'react';
import { useApp, API_BASE } from '../AppContext';
import {
  MessageSquare,
  Star,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Send,
  Mail,
  Shield,
  X,
  MessageCircle,
  TrendingUp,
  Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminFeedbackItem {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  type: string;
  rating: number;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  admin_response?: string;
  created_at: number;
  updated_at: number;
}

export function AdminFeedback() {
  const { token } = useApp();
  const [feedbackList, setFeedbackList] = useState<AdminFeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Response Modal state
  const [selectedTicket, setSelectedTicket] = useState<AdminFeedbackItem | null>(null);
  const [responseText, setResponseText] = useState<string>('');
  const [responseStatus, setResponseStatus] = useState<'open' | 'in_progress' | 'resolved'>('resolved');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Delete modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAllFeedback = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/feedback`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFeedbackList(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin feedback', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllFeedback();
  }, [token]);

  const handleOpenResponseModal = (ticket: AdminFeedbackItem) => {
    setSelectedTicket(ticket);
    setResponseText(ticket.admin_response || '');
    setResponseStatus(ticket.status === 'open' ? 'resolved' : ticket.status);
  };

  const handleSaveResponse = async () => {
    if (!selectedTicket || !token) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/admin/feedback/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: responseStatus,
          adminResponse: responseText.trim()
        })
      });

      if (res.ok) {
        setSelectedTicket(null);
        setResponseText('');
        fetchAllFeedback();
      }
    } catch (err) {
      console.error('Failed to update ticket', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/admin/feedback/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDeletingId(null);
        fetchAllFeedback();
      }
    } catch (err) {
      console.error('Failed to delete feedback', err);
    }
  };

  // Filtered Items
  const filteredList = feedbackList.filter(item => {
    const matchesSearch =
      item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = typeFilter === 'all' || item.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Analytics Stats
  const totalCount = feedbackList.length;
  const openCount = feedbackList.filter(f => f.status === 'open').length;
  const resolvedCount = feedbackList.filter(f => f.status === 'resolved').length;
  const avgRating = totalCount > 0
    ? (feedbackList.reduce((acc, curr) => acc + (curr.rating || 5), 0) / totalCount).toFixed(1)
    : '5.0';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emergency" />
            Feedback & Support Tickets
          </h1>
          <p className="text-sm text-textMuted mt-1">Review user feedback, technical queries, and feature requests.</p>
        </div>
        <button
          onClick={fetchAllFeedback}
          className="self-start md:self-auto px-4 py-2 bg-surface border border-surfaceHighlight rounded-xl text-xs font-semibold hover:bg-surfaceHighlight transition-colors"
        >
          Refresh List
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-surfaceHighlight rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-textMuted font-medium uppercase">Total Tickets</p>
            <p className="text-2xl font-extrabold text-white mt-1">{totalCount}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-xl text-white">
            <Inbox className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface border border-amber-500/20 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-400 font-medium uppercase">Open Tickets</p>
            <p className="text-2xl font-extrabold text-amber-400 mt-1">{openCount}</p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface border border-emerald-500/20 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-400 font-medium uppercase">Resolved</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">{resolvedCount}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-surface border border-amber-400/20 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-300 font-medium uppercase">Average Rating</p>
            <p className="text-2xl font-extrabold text-amber-300 mt-1 flex items-center gap-1">
              {avgRating} <Star className="w-4 h-4 fill-amber-300" />
            </p>
          </div>
          <div className="p-3 bg-amber-400/10 rounded-xl text-amber-300">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-surface border border-surfaceHighlight rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-textMuted absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by user, subject or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-surfaceHighlight rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-textMuted focus:outline-none focus:border-emergency transition-colors"
          />
        </div>

        {/* Status and Type Pills */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex bg-black/40 border border-surfaceHighlight rounded-xl p-1 text-xs">
            {['all', 'open', 'in_progress', 'resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg capitalize font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-emergency text-white'
                    : 'text-textMuted hover:text-white'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-black/40 border border-surfaceHighlight rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="feedback">Feedback</option>
            <option value="support">Technical Support</option>
            <option value="bug">Bug Report</option>
            <option value="feature">Feature Request</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      {isLoading ? (
        <div className="p-12 text-center text-textMuted text-sm flex justify-center items-center gap-2">
          <div className="w-5 h-5 border-2 border-emergency border-t-transparent rounded-full animate-spin" />
          Loading tickets...
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-surface border border-surfaceHighlight rounded-2xl p-12 text-center space-y-3">
          <Inbox className="w-12 h-12 text-textMuted mx-auto opacity-40" />
          <h3 className="text-base font-bold text-white">No Tickets Found</h3>
          <p className="text-xs text-textMuted">No feedback or support tickets matching your current filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredList.map((item) => (
            <div
              key={item.id}
              className="bg-surface border border-surfaceHighlight rounded-2xl p-6 space-y-4 hover:border-white/10 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surfaceHighlight pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emergency/15 text-emergency font-bold flex items-center justify-center text-sm border border-emergency/30 shrink-0">
                    {item.user_name ? item.user_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      {item.user_name}
                      <span className="text-[10px] font-normal text-textMuted flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {item.user_email}
                      </span>
                    </h3>
                    <p className="text-[10px] text-textMuted mt-0.5">
                      Submitted: {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                  {/* Category Pill */}
                  <span className="text-[10px] uppercase font-extrabold px-2.5 py-1 rounded bg-surfaceHighlight text-textMuted border border-white/5">
                    {item.type}
                  </span>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-0.5 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s <= item.rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-textMuted/20'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      item.status === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : item.status === 'in_progress'
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Subject & Body */}
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-white">{item.subject}</h4>
                <p className="text-xs text-textMuted leading-relaxed bg-black/30 p-4 rounded-xl border border-white/5 whitespace-pre-line">
                  {item.message}
                </p>
              </div>

              {/* Admin Response Section */}
              {item.admin_response && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Admin Response Provided
                  </span>
                  <p className="text-xs text-emerald-200/90 whitespace-pre-line leading-relaxed">
                    {item.admin_response}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => handleOpenResponseModal(item)}
                  className="px-4 py-2 bg-emergency hover:bg-emergency/90 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {item.admin_response ? 'Edit Response' : 'Reply to Ticket'}
                </button>
                <button
                  onClick={() => setDeletingId(item.id)}
                  className="p-2 text-textMuted hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition-colors"
                  title="Delete Ticket"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Response Modal */}
      <AnimatePresence>
        {selectedTicket && (
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
              className="bg-surface border border-surfaceHighlight rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative"
            >
              <button
                onClick={() => setSelectedTicket(null)}
                className="absolute top-4 right-4 text-textMuted hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emergency" />
                  Reply to Support Ticket
                </h3>
                <p className="text-xs text-textMuted mt-1">
                  Ticket from <strong className="text-white">{selectedTicket.user_name}</strong> ({selectedTicket.user_email})
                </p>
              </div>

              <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1">
                <p className="text-xs font-bold text-white">{selectedTicket.subject}</p>
                <p className="text-[11px] text-textMuted line-clamp-2">{selectedTicket.message}</p>
              </div>

              {/* Status Selector */}
              <div>
                <label className="text-xs font-bold text-textMuted uppercase mb-2 block">
                  Update Ticket Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'open', label: 'Open' },
                    { id: 'in_progress', label: 'In Progress' },
                    { id: 'resolved', label: 'Resolved' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setResponseStatus(st.id as any)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition-all ${
                        responseStatus === st.id
                          ? 'border-emergency bg-emergency/20 text-white'
                          : 'border-surfaceHighlight bg-black/30 text-textMuted hover:text-white'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Response Message Textarea */}
              <div>
                <label className="text-xs font-bold text-textMuted uppercase mb-2 block">
                  Admin Reply / Resolution Message
                </label>
                <textarea
                  rows={4}
                  placeholder="Type your response to the user here..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="w-full bg-black/50 border border-surfaceHighlight rounded-xl p-3 text-xs text-white placeholder-textMuted focus:outline-none focus:border-emergency transition-colors resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-textMuted hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleSaveResponse}
                  className="px-5 py-2.5 bg-emergency hover:bg-emergency/90 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all"
                >
                  {isUpdating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Save Response
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
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
              className="bg-surface border border-surfaceHighlight rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Delete Ticket?</h3>
              <p className="text-xs text-textMuted">
                Are you sure you want to delete this feedback ticket? This action cannot be undone.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setDeletingId(null)}
                  className="px-4 py-2 bg-surfaceHighlight text-white rounded-xl text-xs font-semibold hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deletingId)}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-950/40"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
