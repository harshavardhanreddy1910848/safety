import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, API_BASE } from '../AppContext';
import {
  ArrowLeft,
  MessageSquare,
  Star,
  Send,
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  Shield,
  ChevronDown,
  ChevronUp,
  LifeBuoy,
  Inbox
} from 'lucide-react';
import { motion } from 'framer-motion';

interface FeedbackItem {
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

export function FeedbackSupport() {
  const navigate = useNavigate();
  const { token } = useApp();
  const [activeTab, setActiveTab] = useState<'submit' | 'history' | 'faq'>('submit');

  // Form states
  const [type, setType] = useState<string>('feedback');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // History state
  const [myTickets, setMyTickets] = useState<FeedbackItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // FAQ state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const fetchMyTickets = async () => {
    if (!token) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/feedback/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyTickets(data);
      }
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchMyTickets();
    }
  }, [activeTab, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!subject.trim() || !message.trim()) {
      setErrorMessage('Please fill in both the subject and description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type, rating, subject, message })
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setSubject('');
        setMessage('');
        setRating(5);
        setTimeout(() => {
          setSubmitSuccess(false);
          setActiveTab('history');
        }, 1800);
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to send feedback. Please try again.');
      }
    } catch (err) {
      setErrorMessage('Network error. Could not send feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    { id: 'feedback', label: 'General Feedback' },
    { id: 'support', label: 'Technical Support' },
    { id: 'bug', label: 'Bug Report' },
    { id: 'feature', label: 'Feature Request' }
  ];

  const ratingLabels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'];

  const faqs = [
    {
      question: "How does the Silent SOS trigger work?",
      answer: "Silent SOS allows you to trigger an emergency alert silently using shake gestures, volume button combinations, or camera motion cues. When triggered, it silently records live GPS location, audio, photos, and video without alerting intruders."
    },
    {
      question: "Is my video and audio evidence stored securely?",
      answer: "Yes. All captured evidence is saved locally on your device and transmitted over SSL-encrypted channels to trusted emergency contacts. Automatically captured files can be protected with your 4-digit Safety PIN."
    },
    {
      question: "What happens if I trigger an SOS alert by accident?",
      answer: "You have a configurable countdown (default 3 seconds) to cancel the alert before notification emails are sent. You can also enter your 4-digit Safety PIN on the alert screen to instantly cancel an active alert."
    },
    {
      question: "How do emergency contacts receive my location?",
      answer: "When an SOS alert is active, live GPS coordinates are sent via automated emails and real-time WebSockets to your saved contacts with a secure interactive map link."
    },
    {
      question: "How can I change my Safety PIN?",
      answer: "Go to Settings -> Security & PIN -> Change PIN. You will verify your existing PIN and choose a new 4-digit PIN."
    }
  ];

  return (
    <div className="flex flex-col h-full bg-background p-6 overflow-y-auto no-scrollbar pb-24 text-textMain">
      {/* Top Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-surface border border-surfaceHighlight text-textMuted hover:text-white hover:bg-surfaceHighlight transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-emergency" />
            Feedback & Support
          </h1>
          <p className="text-xs text-textMuted">We value your input and are here to support your safety.</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-surface border border-surfaceHighlight rounded-xl p-1 mb-6">
        <button
          onClick={() => setActiveTab('submit')}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'submit'
              ? 'bg-emergency text-white shadow-md'
              : 'text-textMuted hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Send Ticket
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-emergency text-white shadow-md'
              : 'text-textMuted hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          My Tickets
          {myTickets.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-white/20 text-white font-bold">
              {myTickets.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('faq')}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'faq'
              ? 'bg-emergency text-white shadow-md'
              : 'text-textMuted hover:text-white'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Help & FAQ
        </button>
      </div>

      {/* Tab 1: Submit Feedback / Support Form */}
      {activeTab === 'submit' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {submitSuccess ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Thank You for Your Feedback!</h3>
              <p className="text-xs text-textMuted max-w-sm mx-auto">
                Your ticket has been submitted. Our support team will review your message promptly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Ticket Category Selection */}
              <div>
                <label className="text-xs font-bold text-textMuted uppercase mb-2 block">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setType(cat.id)}
                      className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                        type === cat.id
                          ? 'border-emergency bg-emergency/15 text-white font-bold'
                          : 'border-surfaceHighlight bg-surface text-textMuted hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Star Rating */}
              <div>
                <label className="text-xs font-bold text-textMuted uppercase mb-2 block">
                  Overall Rating
                </label>
                <div className="bg-surface border border-surfaceHighlight rounded-xl p-4 flex flex-col items-center gap-2">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            (hoverRating || rating) >= star
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-textMuted/30'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-amber-400">
                    {ratingLabels[(hoverRating || rating) - 1]}
                  </span>
                </div>
              </div>

              {/* Subject Input */}
              <div>
                <label className="text-xs font-bold text-textMuted uppercase mb-2 block">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="e.g. Issue with GPS location accuracy"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-surface border border-surfaceHighlight rounded-xl p-3 text-sm text-white placeholder-textMuted/50 focus:outline-none focus:border-emergency transition-colors"
                />
              </div>

              {/* Message Description */}
              <div>
                <label className="text-xs font-bold text-textMuted uppercase mb-2 block">
                  Description / Message
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe your issue, experience, or feature suggestion in detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-surface border border-surfaceHighlight rounded-xl p-3 text-sm text-white placeholder-textMuted/50 focus:outline-none focus:border-emergency transition-colors resize-none"
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorMessage}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-emergency hover:bg-emergency/90 text-white rounded-xl font-bold text-sm shadow-lg shadow-emergency/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Ticket
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      )}

      {/* Tab 2: My Tickets & History */}
      {activeTab === 'history' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {isLoadingHistory ? (
            <div className="p-8 text-center text-textMuted text-xs flex justify-center items-center gap-2">
              <div className="w-4 h-4 border-2 border-emergency border-t-transparent rounded-full animate-spin" />
              Loading tickets...
            </div>
          ) : myTickets.length === 0 ? (
            <div className="bg-surface border border-surfaceHighlight rounded-2xl p-8 text-center space-y-3">
              <Inbox className="w-10 h-10 text-textMuted mx-auto opacity-50" />
              <h3 className="text-sm font-semibold text-white">No Tickets Submitted</h3>
              <p className="text-xs text-textMuted">You have not submitted any feedback or support tickets yet.</p>
              <button
                onClick={() => setActiveTab('submit')}
                className="text-xs bg-emergency text-white px-4 py-2 rounded-xl font-bold hover:bg-emergency/90 transition-colors"
              >
                Submit First Ticket
              </button>
            </div>
          ) : (
            myTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-surface border border-surfaceHighlight rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-surfaceHighlight text-textMuted">
                        {ticket.type}
                      </span>
                      <span className="text-[10px] text-textMuted">
                        {new Date(ticket.created_at).toLocaleDateString()} at {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-white">{ticket.subject}</h3>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      ticket.status === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : ticket.status === 'in_progress'
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-xs text-textMuted leading-relaxed whitespace-pre-line bg-background/50 p-3 rounded-lg border border-white/5">
                  {ticket.message}
                </p>

                {/* Rating stars display */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= ticket.rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-textMuted/20'
                      }`}
                    />
                  ))}
                </div>

                {/* Admin Response Card */}
                {ticket.admin_response && (
                  <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <Shield className="w-3.5 h-3.5" />
                      Support Team Response
                    </div>
                    <p className="text-xs text-emerald-200/90 whitespace-pre-line leading-relaxed">
                      {ticket.admin_response}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </motion.div>
      )}

      {/* Tab 3: Help & FAQs */}
      {activeTab === 'faq' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Emergency Hotlines Directory */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-textMuted uppercase flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-emergency" /> Immediate Emergency Hotlines
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="tel:112"
                className="bg-surface border border-emergency/30 hover:border-emergency p-4 rounded-xl flex items-center justify-between transition-colors"
              >
                <div>
                  <p className="text-xs text-textMuted">National Emergency</p>
                  <p className="text-lg font-extrabold text-emergency">112 / 911</p>
                </div>
                <div className="p-2.5 bg-emergency/20 text-emergency rounded-xl">
                  <Phone className="w-5 h-5" />
                </div>
              </a>

              <a
                href="tel:1091"
                className="bg-surface border border-surfaceHighlight hover:border-white/20 p-4 rounded-xl flex items-center justify-between transition-colors"
              >
                <div>
                  <p className="text-xs text-textMuted">Women's Safety Helpline</p>
                  <p className="text-lg font-extrabold text-white">1091</p>
                </div>
                <div className="p-2.5 bg-surfaceHighlight text-white rounded-xl">
                  <Shield className="w-5 h-5 text-amber-400" />
                </div>
              </a>
            </div>
          </div>

          {/* Email Support Banner */}
          <div className="bg-surface border border-surfaceHighlight rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-surfaceHighlight text-sky-400 rounded-xl">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-xs text-white">Direct Email Support</p>
                <p className="text-[10px] text-textMuted">support@silentsos.org</p>
              </div>
            </div>
            <a
              href="mailto:support@silentsos.org"
              className="text-xs bg-surfaceHighlight px-3 py-1.5 rounded-lg text-white font-medium hover:bg-surface transition-colors"
            >
              Email Us
            </a>
          </div>

          {/* FAQs Accordion */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-textMuted uppercase flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-emerald-400" /> Frequently Asked Questions
            </h2>
            <div className="space-y-2">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-surface border border-surfaceHighlight rounded-xl overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full p-4 text-left text-xs font-bold text-white flex items-center justify-between gap-2"
                  >
                    <span>{faq.question}</span>
                    {expandedFaq === index ? (
                      <ChevronUp className="w-4 h-4 text-emergency shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-textMuted shrink-0" />
                    )}
                  </button>
                  {expandedFaq === index && (
                    <div className="px-4 pb-4 text-xs text-textMuted leading-relaxed border-t border-surfaceHighlight/50 pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
