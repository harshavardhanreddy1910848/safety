import { useState } from 'react';
import { useApp } from '../AppContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { getSmsUrl, getWhatsAppUrl, buildEmergencyText } from '../utils/sms';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  MessageSquare,
  Send,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Contacts() {
  const { state, addContact, removeContact, updateContact } = useApp();
  const location = useGeolocation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: ''
  });

  const emergencyMessage = buildEmergencyText({
    userName: state.userName,
    alertType: 'Emergency Test',
    lat: location.lat,
    lng: location.lng
  });

  const allPhones = state.contacts.map(c => c.phone).filter(Boolean);

  const handleAdd = () => {
    if (
      newContact.name &&
      (newContact.phone || newContact.email) &&
      state.contacts.length < 3
    ) {
      addContact({
        id: Date.now().toString(),
        ...newContact,
        preferences: {
          gps: true,
          photos: true,
          video: true,
          audio: true,
          message: true
        }
      });
      setNewContact({
        name: '',
        phone: '',
        email: ''
      });
      setIsAdding(false);
    }
  };

  const togglePref = (
    contactId: string,
    pref: keyof (typeof state.contacts)[0]['preferences']
  ) => {
    const contact = state.contacts.find((c) => c.id === contactId);
    if (contact) {
      updateContact(contactId, {
        preferences: {
          ...contact.preferences,
          [pref]: !contact.preferences[pref]
        }
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background p-6 overflow-y-auto no-scrollbar pb-24">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Emergency Contacts</h1>
          <p className="text-xs text-textMuted mt-0.5">Dispatched automatically on SOS trigger</p>
        </div>
        <span className="text-sm text-textMuted bg-surface px-3 py-1 rounded-full">
          {state.contacts.length}/3
        </span>
      </div>

      {allPhones.length > 0 && (
        <div className="mb-4 bg-surface border border-surfaceHighlight rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-sky-400" /> Native SMS Broadcast
            </p>
            <p className="text-[10px] text-textMuted">Free direct carrier SMS with GPS link</p>
          </div>
          <a
            href={getSmsUrl(allPhones, emergencyMessage)}
            className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-black text-xs font-bold rounded-lg flex items-center gap-1 transition-all"
          >
            <Send className="w-3 h-3" /> Send SMS (All)
          </a>
        </div>
      )}

      <div className="space-y-4">
        {state.contacts.map((contact) => (
          <div
            key={contact.id}
            className="bg-surface border border-surfaceHighlight rounded-xl overflow-hidden"
          >
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-surfaceHighlight transition-colors"
              onClick={() => setExpandedId(expandedId === contact.id ? null : contact.id)}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-surfaceHighlight rounded-full flex items-center justify-center mr-3 font-bold text-lg text-safe">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold">{contact.name}</p>
                  <p className="text-xs text-textMuted font-mono">
                    {contact.phone || contact.email}
                  </p>
                </div>
              </div>
              {expandedId === contact.id ? (
                <ChevronUp className="w-5 h-5 text-textMuted" />
              ) : (
                <ChevronDown className="w-5 h-5 text-textMuted" />
              )}
            </div>

            <AnimatePresence>
              {expandedId === contact.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-surfaceHighlight bg-background/50"
                >
                  <div className="p-4">
                    {contact.phone && (
                      <div className="flex gap-2 mb-4">
                        <a
                          href={getSmsUrl(contact.phone, emergencyMessage)}
                          className="flex-1 py-2 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Send SMS
                        </a>
                        <a
                          href={getWhatsAppUrl(contact.phone, emergencyMessage)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Send className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      </div>
                    )}

                    <p className="text-xs font-bold text-textMuted uppercase mb-3">
                      What they receive
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {Object.entries(contact.preferences).map(([key, value]) => (
                        <button
                          key={key}
                          onClick={() => togglePref(contact.id, key as any)}
                          className={`flex items-center p-2 rounded-lg text-sm transition-colors ${
                            value ? 'bg-safe/20 text-safe' : 'bg-surfaceHighlight text-textMuted'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${
                              value ? 'border-safe bg-safe text-black' : 'border-textMuted'
                            }`}
                          >
                            {value && <Check className="w-3 h-3" />}
                          </div>
                          <span className="capitalize">{key}</span>
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => removeContact(contact.id)}
                        className="px-3 py-1.5 bg-emergency/10 text-emergency hover:bg-emergency/20 border border-emergency/20 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Contact
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {state.contacts.length < 3 && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-4 border-2 border-dashed border-surfaceHighlight rounded-xl text-textMuted font-medium flex items-center justify-center hover:border-textMuted hover:text-white transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" /> Add Contact
          </button>
        )}

        {isAdding &&
        <motion.div
          initial={{
            opacity: 0,
            y: 10
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          className="bg-surface p-4 rounded-xl border border-surfaceHighlight space-y-3">
          
            <input
            type="text"
            placeholder="Contact Name"
            value={newContact.name}
            onChange={(e) =>
            setNewContact({
              ...newContact,
              name: e.target.value
            })
            }
            className="w-full bg-background rounded-lg p-3 outline-none focus:ring-1 focus:ring-emergency" />
          
            <input
            type="tel"
            placeholder="Phone Number"
            value={newContact.phone}
            onChange={(e) =>
            setNewContact({
              ...newContact,
              phone: e.target.value
            })
            }
            className="w-full bg-background rounded-lg p-3 outline-none focus:ring-1 focus:ring-emergency" />
          
            <input
            type="email"
            placeholder="Email (Optional)"
            value={newContact.email}
            onChange={(e) =>
            setNewContact({
              ...newContact,
              email: e.target.value
            })
            }
            className="w-full bg-background rounded-lg p-3 outline-none focus:ring-1 focus:ring-emergency" />
          
            <div className="flex gap-2 pt-2">
              <button
              onClick={() => setIsAdding(false)}
              className="flex-1 py-3 bg-surfaceHighlight rounded-lg font-medium">
              
                Cancel
              </button>
              <button
              onClick={handleAdd}
              disabled={
              !newContact.name || !newContact.phone && !newContact.email
              }
              className="flex-1 py-3 bg-safe text-black rounded-lg font-bold disabled:opacity-50">
              
                Save
              </button>
            </div>
          </motion.div>
        }
      </div>
    </div>);

}