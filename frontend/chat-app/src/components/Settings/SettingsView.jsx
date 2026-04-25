import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, Lock, MessageSquare, Video, Bell, Keyboard, HelpCircle, LogOut, 
  ChevronRight, ChevronDown, Laptop, Monitor, Speaker, Camera, Mic, Check, Moon, Sun, 
  Wallpaper, Palette, Volume2, Globe, Shield, CreditCard, UserX, Clock, 
  ExternalLink, Mail, Info, RefreshCw, Smartphone, Trash2, UserPlus, X,
  ArrowLeft, Search, FileText, MapPin, ShieldCheck, Ticket
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { 
  deleteAccount as apiDeleteAccount, submitSupportTicket, getMyTickets,
  getAllTickets, updateTicketStatus, getAllProRequests, handleProRequest,
  requestPro, getProRequestStatus
} from '../../services/api';
import ConfirmModal from '../Chat/modals/ConfirmModal';

const USER_API = '/api/auth';

/** Accordion item used in the Help Centre FAQ list */
const HelpFaqItem = ({ question, answer }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`bg-surface-lowest rounded-2xl border transition-all overflow-hidden ${open ? 'border-primary/20' : 'border-border/50'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 text-left group"
      >
        <span className="text-sm font-bold text-text-main pr-4">{question}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={`shrink-0 transition-colors ${open ? 'text-primary' : 'text-text-light'}`}
        >
          <ChevronDown size={18} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="faq-answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
          >
            <div className="px-5 pb-5 text-sm text-text-soft font-medium leading-relaxed border-t border-border/20 pt-4">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Sub-component for individual ticket management in Admin Panel */
const AdminTicketItem = ({ ticket, onUpdate }) => {
  const [feedback, setFeedback] = useState(ticket.adminFeedback || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async (newStatus) => {
    setIsUpdating(true);
    await onUpdate(ticket.id, newStatus, feedback);
    setIsUpdating(false);
  };

  return (
    <div className="bg-surface-lowest p-6 rounded-2xl border border-border/50 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between gap-6 mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
              ticket.topic === 'Bug report' ? 'bg-red-100 text-red-700' : 
              ticket.topic === 'Feature request' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
            }`}>{ticket.topic}</span>
            <span className="text-[10px] text-text-light font-bold">#TKT-{String(ticket.id).padStart(4, '0')}</span>
          </div>
          <h4 className="text-base font-black text-text-main">@{ticket.username}</h4>
          <p className="text-xs text-text-soft font-semibold">{ticket.email}</p>
        </div>
        <select 
          value={ticket.status}
          onChange={(e) => handleUpdate(e.target.value)}
          disabled={isUpdating}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all outline-none disabled:opacity-50 ${
            ticket.status === 'open' ? 'border-yellow-200 bg-yellow-50 text-yellow-700' :
            ticket.status === 'in_progress' ? 'border-blue-200 bg-blue-50 text-blue-700' :
            ticket.status === 'resolved' ? 'border-green-200 bg-green-50 text-green-700' : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}
        >
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      
      <div className="p-4 bg-surface-low rounded-xl mb-4">
        <p className="text-sm text-text-main font-medium leading-relaxed italic">"{ticket.message}"</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-light">Admin Feedback / Response</label>
          {ticket.adminFeedback && feedback === ticket.adminFeedback && (
            <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-1">
              <Check size={10} /> Saved
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <textarea 
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Add internal notes or a response to the user..."
            rows={2}
            className="flex-1 bg-surface-low rounded-xl px-4 py-3 text-sm font-medium outline-none border border-transparent focus:border-primary/30 transition-all resize-none"
          />
          <button 
            onClick={() => handleUpdate(ticket.status)}
            disabled={isUpdating || feedback === (ticket.adminFeedback || '')}
            className="px-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed h-fit py-3"
          >
            Save Note
          </button>
        </div>
        {ticket.status !== 'closed' && (
          <button 
            onClick={() => handleUpdate('closed')}
            disabled={isUpdating}
            className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all"
          >
            Resolve & Close Ticket
          </button>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border/10 flex items-center justify-between text-[10px] text-text-light font-bold uppercase tracking-widest">
        <span>Submitted {new Date(ticket.createdAt).toLocaleString()}</span>
      </div>
    </div>
  );
};

/** Admin Panel View for managing support tickets and pro requests */

const AdminPanel = ({ loading, error, tickets, proRequests, onUpdateTicket, onHandlePro, onRefresh }) => {
  const [tab, setTab] = useState('tickets');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[32px] text-white shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
            <ShieldCheck size={200} />
         </div>
         <div className="relative z-10">
            <h3 className="text-3xl font-black tracking-tighter mb-2">Admin Dashboard</h3>
            <p className="text-slate-300 text-sm font-medium">Manage system-wide support tickets and user upgrade requests.</p>
         </div>
      </div>

      <div className="flex p-1.5 bg-surface-low rounded-2xl border border-border/10 w-fit">
         {[
           { id: 'tickets', label: 'Support Tickets', icon: Ticket },
           { id: 'pro_requests', label: 'Pro Requests', icon: UserPlus },
         ].map(t => (
           <button
             key={t.id}
             onClick={() => setTab(t.id)}
             className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === t.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-soft hover:text-text-main'}`}
           >
             <t.icon size={14} />
             {t.label}
           </button>
         ))}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-40">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-xs font-black uppercase tracking-[0.2em]">Synchronizing data...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 text-red-600 rounded-2xl flex items-center gap-4">
          <X size={24} />
          <p className="text-sm font-bold">{error}</p>
          <button onClick={onRefresh} className="ml-auto px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Retry</button>
        </div>
      ) : tab === 'tickets' ? (
        <div className="space-y-4">
          {tickets.length === 0 ? (
            <div className="py-20 text-center opacity-30">
              <Ticket size={48} className="mx-auto mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">No tickets to display</p>
            </div>
          ) : (
            tickets.map(ticket => (
              <AdminTicketItem 
                key={ticket.id} 
                ticket={ticket} 
                onUpdate={onUpdateTicket} 
              />
            ))
          )}
        </div>

      ) : (
        <div className="space-y-4">
          {proRequests.length === 0 ? (
            <div className="py-20 text-center opacity-30">
              <UserPlus size={48} className="mx-auto mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">No pro requests</p>
            </div>
          ) : (
            proRequests.map(req => (
              <div key={req.id} className="bg-surface-lowest p-6 rounded-2xl border border-border/50 flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {req.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-black text-text-main truncate">@{req.username}</h4>
                  <p className="text-xs text-text-soft font-medium truncate">{req.message || 'No message provided'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {req.status === 'pending' ? (
                    <>
                      <button 
                        onClick={() => onHandlePro(req.id, 'approved')}
                        className="px-4 py-2 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-all"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => onHandlePro(req.id, 'rejected')}
                        className="px-4 py-2 bg-surface-low text-text-soft rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {req.status}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
};

/** Toast notification for feedback */
const Toast = ({ message, type, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: -20, x: '-50%' }}
      className={`fixed top-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[320px] backdrop-blur-md border ${
        type === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 'bg-red-500/90 border-red-400 text-white'
      }`}
    >
      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
        {type === 'success' ? <Check size={18} /> : <X size={18} />}
      </div>
      <p className="text-sm font-bold flex-1">{message}</p>
      <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
        <X size={16} />
      </button>
    </motion.div>
  );
};

const SettingsView = ({ onBack, allUsers = [] }) => {


  const { user, logout, toggleProStatus } = useAuth();
  const { settings, updateSettings, blockContact, unblockContact, togglePrivacyUser } = useSettings();
  const [activeCategory, setActiveCategory] = useState(() => localStorage.getItem(`pingora_settings_cat_${user?.username}`) || 'account');
  const [devices, setDevices] = useState({ video: [], audio: [] });
  const [selectedDevices, setSelectedDevices] = useState({ video: '', audio: '' });
  
  const [newBlockUsername, setNewBlockUsername] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [subView, setSubView] = useState(() => localStorage.getItem(`pingora_settings_sub_${user?.username}`) || null);

  // Persist settings navigation
  useEffect(() => {
    if (user?.username) {
      localStorage.setItem(`pingora_settings_cat_${user.username}`, activeCategory);
      if (subView) {
        localStorage.setItem(`pingora_settings_sub_${user.username}`, subView);
      } else {
        localStorage.removeItem(`pingora_settings_sub_${user.username}`);
      }
    }
  }, [activeCategory, subView, user?.username]);

  const [showThemeModal, setShowThemeModal] = useState(false);
  const [tempTheme, setTempTheme] = useState(settings.theme);
  const [activePrivacyDetail, setActivePrivacyDetail] = useState(null);
  const [privacySearch, setPrivacySearch] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const suggestionRef = useRef(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Notification state
  const [notification, setNotification] = useState(null); // { message, type }
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };


  // Contact / Support form state
  const [supportTopic, setSupportTopic] = useState('Bug report');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportResult, setSupportResult] = useState(null); // { success, message }

  // My Tickets state
  const [myTickets, setMyTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState(null);

  const fetchMyTickets = async () => {
    setTicketsLoading(true);
    setTicketsError(null);
    try {
      const res = await getMyTickets();
      setMyTickets(res.tickets || []);
    } catch (err) {
      setTicketsError('Could not load tickets. Please try again.');
    } finally {
      setTicketsLoading(false);
    }
  };

  // Admin state
  const [adminTickets, setAdminTickets] = useState([]);
  const [adminProRequests, setAdminProRequests] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState(null);

  const fetchAdminData = async () => {
    if (user.role !== 'admin') return;
    setAdminLoading(true);
    setAdminError(null);
    try {
      const [ticketsRes, proRes] = await Promise.all([
        getAllTickets(),
        getAllProRequests()
      ]);
      setAdminTickets(ticketsRes.tickets || []);
      setAdminProRequests(proRes.requests || []);
    } catch (err) {
      setAdminError('Failed to load administrative data.');
    } finally {
      setAdminLoading(false);
    }
  };



  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await apiDeleteAccount();
      if (res.success) {
        logout();
      } else {
        showNotification(res.message || "Failed to delete account", 'error');
      }
    } catch (err) {
      console.error("Delete account error:", err);
      showNotification("An error occurred while deleting your account", 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };


  const categories = [
    { id: 'account', icon: Key, title: 'Account', subtitle: 'Security notifications, account info' },
    { id: 'privacy', icon: Lock, title: 'Privacy', subtitle: 'Personal info, blocked contacts, disappearing messages' },
    { id: 'chats', icon: MessageSquare, title: 'Chats', subtitle: 'Theme, wallpaper, chat settings' },
    { id: 'video_voice', icon: Video, title: 'Video & voice', subtitle: 'Camera, microphone & speakers' },
    { id: 'notifications', icon: Bell, title: 'Notifications', subtitle: 'Messages, groups, sounds' },
    { id: 'shortcuts', icon: Keyboard, title: 'Keyboard shortcuts', subtitle: 'Quick actions' },
    { id: 'help', icon: HelpCircle, title: 'Help and feedback', subtitle: 'Help centre, contact us, privacy policy' },
    ...(user.role === 'admin' ? [{ id: 'admin', icon: ShieldCheck, title: 'Admin Panel', subtitle: 'Manage tickets and requests' }] : []),
    { id: 'logout', icon: LogOut, title: 'Log out', subtitle: '', variant: 'danger' },
  ];

  // Pro request state
  const [proRequestStatus, setProRequestStatus] = useState(null);
  const [proRequestSubmitting, setProRequestSubmitting] = useState(false);

  const fetchProStatus = async () => {
    try {
      const res = await getProRequestStatus();
      setProRequestStatus(res.status);
    } catch (err) {
      console.error("Failed to fetch pro status", err);
    }
  };

  const handleRequestPro = async () => {
    setProRequestSubmitting(true);
    try {
      await requestPro("User requested pro account upgrade.");
      setProRequestStatus('pending');
      showNotification("Pro request submitted successfully! An admin will review it soon.", 'success');
    } catch (err) {
      showNotification("Failed to submit pro request.", 'error');
    } finally {
      setProRequestSubmitting(false);
    }
  };


  useEffect(() => {
    fetchProStatus();
    // Auto-fetch if we loaded from localStorage
    if (activeCategory === 'admin') fetchAdminData();
    if (subView === 'my_tickets') fetchMyTickets();
  }, []);



  useEffect(() => {
    if (activeCategory === 'video_voice') {
      enumerateDevices();
      startPreview();
    } else {
      stopPreview();
    }
    return () => stopPreview();
  }, [activeCategory]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const enumerateDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const video = allDevices.filter(d => d.kind === 'videoinput');
      const audio = allDevices.filter(d => d.kind === 'audioinput');
      setDevices({ video, audio });
      if (video.length > 0 && !selectedDevices.video) setSelectedDevices(prev => ({ ...prev, video: video[0].deviceId }));
      if (audio.length > 0 && !selectedDevices.audio) setSelectedDevices(prev => ({ ...prev, audio: audio[0].deviceId }));
    } catch (err) {
      console.error("Error enumerating devices:", err);
    }
  };

  const startPreview = async () => {
    try {
      if (streamRef.current) stopPreview();
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: selectedDevices.video ? { deviceId: { exact: selectedDevices.video } } : true,
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Error starting camera preview:", err);
    }
  };

  const stopPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const suggestions = useMemo(() => {
    if (!newBlockUsername.trim()) return [];
    const query = newBlockUsername.toLowerCase();
    return allUsers.filter(u => 
      u.username.toLowerCase() !== user.username.toLowerCase() &&
      !settings.privacy.blockedContacts.includes(u.username.toLowerCase()) &&
      (u.username.toLowerCase().includes(query) || (u.fullName && u.fullName.toLowerCase().includes(query)))
    ).slice(0, 5);
  }, [newBlockUsername, allUsers, user.username, settings.privacy.blockedContacts]);

  const getBlockedUserDetails = (username) => {
    return allUsers.find(u => u.username.toLowerCase() === username.toLowerCase()) || { username };
  };

  const renderContent = () => {
    switch (activeCategory) {
      case 'account':
        if (subView === 'security_notifications') {
          return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div className="flex items-center gap-4 mb-2">
                <button 
                  onClick={() => setSubView(null)}
                  className="p-2 hover:bg-surface-low rounded-xl transition-colors text-primary"
                >
                  <ArrowLeft size={20} />
                </button>
                <h3 className="text-xl font-black tracking-tight text-text-main">Security</h3>
              </div>

              <div className="bg-surface-lowest p-8 rounded-3xl border border-border/50 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
                  <Shield size={120} />
                </div>
                
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                   <Shield size={18} className="text-primary" /> Security Notifications
                </h4>
                <p className="text-sm text-text-soft leading-relaxed mb-6 font-medium">
                  Pingora protects your chats with end-to-end encryption. This means your messages, calls and status updates stay between you and the people you choose. Not even Pingora can read or listen to them.
                </p>

                <div className="flex items-center justify-between p-5 bg-surface-low rounded-2xl border border-border/10 mb-8 hover:bg-white transition-all group">
                  <div className="flex-1">
                    <p className="text-sm font-bold tracking-tight text-text-main">Show security notifications</p>
                    <p className="text-[10px] text-text-light font-bold uppercase tracking-widest mt-0.5">On this device</p>
                  </div>
                  <button 
                    onClick={() => updateSettings('privacy.securityNotifications', !settings.privacy.securityNotifications)}
                    className={`w-11 h-6 rounded-full relative transition-all duration-300 shadow-inner ${settings.privacy.securityNotifications ? 'bg-primary' : 'bg-slate-300'}`}
                  >
                    <motion.div 
                      animate={{ x: settings.privacy.securityNotifications ? 22 : 4 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" 
                    />
                  </button>
                </div>

                <div className="space-y-6">
                  <p className="text-[10px] font-black uppercase text-text-light tracking-[0.2em] mb-4">What's Encrypted?</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { icon: MessageSquare, label: 'Text and voice messages' },
                      { icon: Video, label: 'Audio and video calls' },
                      { icon: FileText, label: 'Photos, videos and docs' },
                      { icon: MapPin, label: 'Location sharing' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-surface-low/50 border border-border/5">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                          <item.icon size={18} />
                        </div>
                        <span className="text-xs font-bold text-text-main">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-10 pt-8 border-t border-border/10">
                  <p className="text-[11px] text-text-soft font-medium leading-relaxed italic">
                    Learn more about our <span className="text-primary font-bold">Privacy Standards</span> and how your data is protected at every step.
                  </p>
                </div>
              </div>
            </motion.div>
          );
        }

        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div className="bg-surface-lowest p-6 rounded-2xl border border-border/50">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl">
                  {user.username[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-main">{user.username}</h3>
                  <p className="text-sm text-text-soft">{user.email || 'No email provided'}</p>
                </div>
              </div>
              
              {/* Upgrade to Pro Section */}
              <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-primary via-primary-dim to-primary/80 text-white shadow-premium relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <ShieldCheck size={120} />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={20} className="text-white" />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Pingora Premium</span>
                  </div>
                  
                  <h4 className="text-2xl font-black mb-2 tracking-tight">
                    {user.accountType === 'pro' ? 'You are a Pro User!' : 'Upgrade to Pro Account'}
                  </h4>
                  
                  <p className="text-sm font-medium text-white/80 mb-6 max-w-[80%] leading-relaxed">
                    {user.accountType === 'pro' 
                      ? 'Enjoy your premium features including detailed poll analytics and exclusive badges.' 
                      : proRequestStatus === 'pending'
                        ? 'Your request for a Pro account is currently under review by an admin.'
                        : 'Unlock advanced poll analytics, profile badges, and high-speed media sharing.'}
                  </p>

                  {user.accountType !== 'pro' && (
                    <button 
                      onClick={handleRequestPro}
                      disabled={proRequestStatus === 'pending' || proRequestSubmitting}
                      className="px-6 py-3 bg-white text-primary rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {proRequestSubmitting ? 'Sending...' : proRequestStatus === 'pending' ? 'Request Pending' : 'Request Pro Upgrade'}
                    </button>
                  )}
                  {user.accountType === 'pro' && (
                    <div className="px-4 py-2 bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] w-fit">
                       Pro Active
                    </div>
                  )}
                </div>
              </div>


              <div className="space-y-4">
                <button 
                  onClick={() => setSubView('security_notifications')}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-surface-low transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <Shield size={18} className="text-primary/70" />
                    <span className="text-sm font-semibold">Security Notifications</span>
                  </div>
                  <ChevronRight size={16} className="text-text-light group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-surface-low transition-colors group">
                  <div className="flex items-center gap-4">
                    <CreditCard size={18} className="text-primary/70" />
                    <span className="text-sm font-semibold">Two-step Verification</span>
                  </div>
                  <ChevronRight size={16} className="text-text-light group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
            
            <div className="bg-surface-lowest p-6 rounded-2xl border border-red-100/50">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-4">Danger Zone</p>
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isDeleting}
                  className="w-full flex items-center gap-4 p-4 rounded-xl text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserX size={18} />
                  <span className="text-sm font-semibold">{isDeleting ? 'Deleting...' : 'Delete Account'}</span>
                </button>
            </div>
          </motion.div>
        );

      case 'privacy':
        if (subView === 'privacy_details') {
          const selectedUsersKey = `${activePrivacyDetail}Selected`;
          const selectedUsers = settings.privacy[selectedUsersKey] || [];
          const detailTitle = {
            lastSeen: 'Last seen & online',
            profilePhoto: 'Profile photo',
            about: 'About',
            groups: 'Groups',
            status: 'Status'
          }[activePrivacyDetail];
          
          const filteredUsers = allUsers.filter(u => 
            u.username.toLowerCase() !== user.username.toLowerCase() &&
            (u.username.toLowerCase().includes(privacySearch.toLowerCase()) || 
             (u.fullName && u.fullName.toLowerCase().includes(privacySearch.toLowerCase())))
          );

          return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 pb-12">
              <div className="flex items-center gap-4 mb-2">
                <button 
                  onClick={() => { setSubView(null); setPrivacySearch(''); }}
                  className="p-2 hover:bg-surface-low rounded-xl transition-colors text-primary"
                >
                  <ArrowLeft size={20} />
                </button>
                <h3 className="text-xl font-black tracking-tight text-text-main">{detailTitle}</h3>
              </div>

              <div className="bg-surface-lowest p-6 rounded-2xl border border-border/50 space-y-4">
                <p className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-4">Who can see my {detailTitle.toLowerCase()}</p>
                {[
                  { id: 'everyone', label: 'Everyone' },
                  { id: 'nobody', label: 'Nobody' },
                  { id: 'selected', label: 'Selected profiles' }
                ].map((option) => (
                  <button 
                    key={option.id}
                    onClick={() => updateSettings(`privacy.${activePrivacyDetail}`, option.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${settings.privacy[activePrivacyDetail] === option.id ? 'bg-primary/5 border border-primary/20' : 'hover:bg-surface-low border border-transparent'}`}
                  >
                    <span className="text-sm font-bold">{option.label}</span>
                    {settings.privacy[activePrivacyDetail] === option.id && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white">
                        <Check size={12} strokeWidth={4} />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {settings.privacy[activePrivacyDetail] === 'selected' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface-lowest p-6 rounded-2xl border border-border/50 space-y-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-text-light uppercase tracking-widest">Select profiles</p>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                      {selectedUsers.length} selected
                    </span>
                  </div>

                  <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
                    <input 
                      type="text"
                      placeholder="Search users..."
                      value={privacySearch}
                      onChange={(e) => setPrivacySearch(e.target.value)}
                      className="w-full h-11 pl-11 pr-4 bg-surface-low rounded-xl text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredUsers.length === 0 ? (
                      <div className="py-8 text-center opacity-40">
                        <p className="text-xs font-bold uppercase tracking-widest">No users found</p>
                      </div>
                    ) : (
                      filteredUsers.map(u => {
                        const isSelected = selectedUsers.includes(u.username.toLowerCase());
                        return (
                          <button
                            key={u.username}
                            onClick={() => togglePrivacyUser(selectedUsersKey, u.username)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${isSelected ? 'bg-primary/5 border border-primary/10' : 'hover:bg-surface-low border border-transparent'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-surface-lowest shadow-sm flex items-center justify-center text-primary font-bold overflow-hidden border border-border/10">
                                {u.profilePhoto ? (
                                  <img 
                                    src={`${USER_API}${u.profilePhoto}`} 
                                    alt="" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                  />
                                ) : null}
                                <div 
                                  className="w-full h-full items-center justify-center" 
                                  style={{ display: u.profilePhoto ? 'none' : 'flex' }}
                                >
                                  {(u.fullName || u.username)[0].toUpperCase()}
                                </div>
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-bold text-text-main">@{u.username}</p>
                                {u.fullName && <p className="text-[10px] text-text-soft font-medium">{u.fullName}</p>}
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-border'}`}>
                              {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}

              {activePrivacyDetail === 'lastSeen' && (
                <div className="p-6 bg-surface-low rounded-2xl border border-border/5">
                  <p className="text-[10px] text-text-soft font-medium leading-relaxed italic">
                    If you don't share your last seen and online, you won't be able to see other people's last seen and online.
                  </p>
                </div>
              )}
            </motion.div>
          );
        }

        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            {/* Personal Info Privacy */}
            <div>
              <p className="text-[10px] font-black uppercase text-text-light tracking-[0.2em] mb-4 ml-1">Who can see my personal info</p>
              <div className="bg-surface-lowest p-6 rounded-2xl border border-border/50 space-y-2">
                {[
                  { id: 'lastSeen', label: 'Last seen & online', icon: Clock },
                  { id: 'profilePhoto', label: 'Profile photo', icon: Camera },
                  { id: 'about', label: 'About', icon: Info },
                  { id: 'groups', label: 'Groups', icon: UserPlus },
                  { id: 'status', label: 'Status', icon: ExternalLink }
                ].map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => {
                      setActivePrivacyDetail(item.id);
                      setSubView('privacy_details');
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-surface-low transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <item.icon size={18} className="text-primary/70" />
                      <span className="text-sm font-semibold">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-light font-bold uppercase">
                        {settings.privacy[item.id] === 'everyone' ? 'Everyone' : (settings.privacy[item.id] === 'nobody' ? 'Nobody' : 'Selected')}
                      </span>
                      <ChevronRight size={16} className="text-text-light group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Blocked Contacts Manager */}
            <div className="bg-surface-lowest p-6 rounded-2xl border border-border/50">
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                   <Shield size={18} className="text-primary" /> Blocked Contacts
                </h4>
                <div className="relative flex gap-2 mb-4" ref={suggestionRef}>
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      placeholder="Enter username to block..."
                      className="w-full h-11 px-4 bg-surface-low rounded-xl text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/30 transition-all font-sans"
                      value={newBlockUsername}
                      onChange={(e) => { setNewBlockUsername(e.target.value); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                    />
                    <AnimatePresence>
                      {showSuggestions && suggestions.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-surface-lowest rounded-2xl shadow-premium border border-border/10 overflow-hidden z-50 transition-colors"
                        >
                          {suggestions.map(u => (
                            <button
                              key={u.username}
                              onClick={() => {
                                blockContact(u.username);
                                setNewBlockUsername('');
                                setShowSuggestions(false);
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-surface-sidebar transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0 overflow-hidden">
                      {u.profilePhoto ? (
                        <img 
                          src={`${USER_API}${u.profilePhoto}`} 
                          alt="" 
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                        />
                      ) : null}
                      <div 
                        className="w-full h-full items-center justify-center" 
                        style={{ display: u.profilePhoto ? 'none' : 'flex' }}
                      >
                        {(u.fullName || u.username)[0].toUpperCase()}
                      </div>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-text-main truncate">@{u.username}</p>
                                {u.fullName && <p className="text-[10px] text-text-soft truncate">{u.fullName}</p>}
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button 
                    onClick={() => { blockContact(newBlockUsername); setNewBlockUsername(''); setShowSuggestions(false); }}
                    className="h-11 px-6 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:shadow-lg transition-all active:scale-95"
                  >
                    Block
                  </button>
                </div>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {settings.privacy.blockedContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 opacity-40">
                       <UserX size={32} className="mb-2" />
                       <p className="text-xs text-text-light font-bold uppercase tracking-widest">No contacts blocked</p>
                    </div>
                  ) : (
                    settings.privacy.blockedContacts.map(username => {
                      const u = getBlockedUserDetails(username);
                      return (
                        <div key={username} className="flex items-center justify-between p-4 bg-surface-low rounded-2xl group border border-border/5 hover:border-border/20 transition-all hover:bg-surface-lowest">
                           <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-2xl bg-surface-lowest shadow-sm flex items-center justify-center text-primary font-bold overflow-hidden border border-border/10">
                               {u.profilePhoto ? (
                                 <img 
                                   src={`${USER_API}${u.profilePhoto}`} 
                                   alt="" 
                                   className="w-full h-full object-cover"
                                   onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                 />
                               ) : null}
                               <div 
                                 className="w-full h-full items-center justify-center" 
                                 style={{ display: u.profilePhoto ? 'none' : 'flex' }}
                               >
                                 {(u.fullName || u.username)[0].toUpperCase()}
                               </div>
                             </div>
                             <div>
                               <p className="text-sm font-bold text-text-main">@{username}</p>
                               {u.fullName && <p className="text-[10px] text-text-soft font-medium">{u.fullName}</p>}
                             </div>
                           </div>
                           <button 
                             onClick={() => unblockContact(username)}
                             className="p-2.5 text-text-light hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                             title="Unblock user"
                           >
                             <X size={18} />
                           </button>
                        </div>
                      );
                    })
                  )}
                </div>
            </div>

            {/* Disappearing Messages Settings */}
            <div className="bg-surface-lowest p-6 rounded-2xl border border-border/50">
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                   <Clock size={18} className="text-primary" /> Disappearing Messages
                </h4>
                <p className="text-[10px] text-text-soft font-medium uppercase tracking-[0.15em] mb-4">Default Message Timer</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['off', '24h', '7d', '90d'].map(time => (
                    <button
                      key={time}
                      onClick={() => updateSettings('privacy.disappearingTime', time)}
                      className={`py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${settings.privacy.disappearingTime === time ? 'border-primary bg-primary/5 text-primary' : 'border-transparent bg-surface-low text-text-light hover:bg-surface-high'}`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-text-light mt-4 font-semibold leading-relaxed">
                  When enabled, all new messages will disappear from this chat for everyone after they're sent. This doesn't affect existing chats.
                </p>
            </div>
          </motion.div>
        );

      case 'chats':
        if (subView === 'wallpaper') {
          const WALLPAPER_OPTIONS = [
            { id: 'default', name: 'Default Pattern', type: 'pattern', value: 'default' },
            { id: 'slate', name: 'Dark Slate', type: 'color', value: '#1e293b' },
            { id: 'blue', name: 'Soft Blue', type: 'color', value: '#e0f2fe' },
            { id: 'rose', name: 'Rose', type: 'color', value: '#fff1f2' },
            { id: 'emerald', name: 'Emerald', type: 'color', value: '#ecfdf5' },
            { id: 'midnight', name: 'Midnight', type: 'color', value: '#0f172a' },
            { id: 'whatsapp_light', name: 'WhatsApp Light', type: 'color', value: '#e5ddd5' },
            { id: 'whatsapp_dark', name: 'WhatsApp Dark', type: 'color', value: '#0b141a' },
          ];

          return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => setSubView(null)} className="p-2 hover:bg-surface-low rounded-xl transition-colors text-primary">
                  <ArrowLeft size={20} />
                </button>
                <h3 className="text-xl font-black tracking-tight text-text-main">Chat Wallpaper</h3>
              </div>

              <div className="bg-surface-lowest p-6 rounded-2xl border border-border/50 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {WALLPAPER_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => updateSettings('wallpaper', opt.value)}
                      className={`relative aspect-[9/16] rounded-2xl overflow-hidden border-4 transition-all ${settings.wallpaper === opt.value ? 'border-primary shadow-lg scale-105' : 'border-transparent hover:border-border/50 hover:scale-[1.02]'}`}
                    >
                      {opt.type === 'pattern' ? (
                        <div className="w-full h-full bg-surface-high flex flex-col items-center justify-center gap-2">
                           <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.5) 1px, transparent 0)', backgroundSize: '12px 12px' }} />
                           <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                             <Wallpaper size={24} className="text-text-light mb-2" />
                             <span className="text-[10px] font-bold text-text-soft uppercase text-center">{opt.name}</span>
                           </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-end p-3" style={{ backgroundColor: opt.value }}>
                          <span className={`text-[10px] font-bold uppercase ${['#e0f2fe', '#fff1f2', '#ecfdf5', '#fffbeb', '#e5ddd5'].includes(opt.value) ? 'text-slate-800' : 'text-white/80'}`}>{opt.name}</span>
                        </div>
                      )}
                      {settings.wallpaper === opt.value && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-md">
                          <Check size={14} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-border/50">
                  <p className="text-[10px] font-black uppercase text-text-light tracking-[0.2em] mb-4">Custom Image URL</p>
                  <div className="flex gap-3">
                    <input 
                      type="text"
                      placeholder="Paste image URL (http://... or data:...)"
                      defaultValue={settings.wallpaper?.includes('://') ? settings.wallpaper : ''}
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          updateSettings('wallpaper', e.target.value.trim());
                        }
                      }}
                      className="flex-1 h-12 bg-surface-low rounded-xl px-4 text-sm font-medium outline-none border border-transparent focus:border-primary/30 transition-all"
                    />
                    <button 
                      className="px-6 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
                      onClick={(e) => {
                        const input = e.currentTarget.previousSibling;
                        if (input.value.trim()) {
                          updateSettings('wallpaper', input.value.trim());
                        }
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        }

        if (subView === 'media_quality') {
          return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => setSubView(null)} className="p-2 hover:bg-surface-low rounded-xl transition-colors text-primary">
                  <ArrowLeft size={20} />
                </button>
                <h3 className="text-xl font-black tracking-tight text-text-main">Media upload quality</h3>
              </div>
              <div className="bg-surface-lowest p-6 rounded-2xl border border-border/50 space-y-4">
                {['auto', 'best', 'saver'].map(quality => (
                  <button 
                    key={quality}
                    onClick={() => updateSettings('chats.mediaQuality', quality)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${settings.chats.mediaQuality === quality ? 'bg-primary/5 border border-primary/20' : 'hover:bg-surface-low border border-transparent'}`}
                  >
                    <span className="text-sm font-bold capitalize">{quality === 'saver' ? 'Data saver' : (quality === 'best' ? 'Best quality' : 'Auto (recommended)')}</span>
                    {settings.chats.mediaQuality === quality && <Check size={16} className="text-primary" />}
                  </button>
                ))}
              </div>
            </motion.div>
          );
        }

        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 pb-12">
            <div>
              <p className="text-[10px] font-black uppercase text-text-light tracking-[0.2em] mb-4 ml-1">Display</p>
              <div className="bg-surface-lowest p-6 rounded-2xl border border-border/50 space-y-6">
                <div 
                  className="flex items-center justify-between group cursor-pointer" 
                  onClick={() => {
                    setTempTheme(settings.theme);
                    setShowThemeModal(true);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface-low flex items-center justify-center text-primary">
                      {settings.theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-main">Theme</p>
                      <p className="text-[10px] text-text-soft font-medium uppercase tracking-widest">
                        {settings.theme === 'light' ? 'Light' : (settings.theme === 'dark' ? 'Dark' : 'System default')}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-text-light opacity-40 group-hover:translate-x-1 transition-all" />
                </div>

                <div className="flex items-center justify-between group cursor-pointer" onClick={() => setSubView('wallpaper')}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface-low flex items-center justify-center text-primary overflow-hidden relative">
                      {settings.wallpaper !== 'default' ? (
                        <div className="absolute inset-0" style={{ 
                          backgroundColor: !settings.wallpaper?.includes('://') ? settings.wallpaper : undefined,
                          backgroundImage: settings.wallpaper?.includes('://') ? `url(${settings.wallpaper})` : 'none',
                          backgroundSize: 'cover',
                          opacity: 0.2
                        }} />
                      ) : null}
                      <Wallpaper size={20} className="relative z-10" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-main">Wallpaper</p>
                      <p className="text-[10px] text-text-soft font-medium uppercase tracking-widest">
                        {settings.wallpaper === 'default' ? 'Default' : (settings.wallpaper?.includes('://') ? 'Custom Image' : 'Solid Color')}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-text-light opacity-40 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase text-text-light tracking-[0.2em] mb-4 ml-1">Chat settings</p>
              <div className="bg-surface-lowest p-6 rounded-2xl border border-border/50 space-y-2">
                <button onClick={() => setSubView('media_quality')} className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-surface-low transition-colors group">
                  <div className="flex items-center gap-4">
                    <Palette size={18} className="text-text-soft" />
                    <span className="text-sm font-bold text-text-main">Media upload quality</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-light font-bold uppercase">{settings.chats.mediaQuality}</span>
                    <ChevronRight size={16} className="text-text-light opacity-40 group-hover:translate-x-1 transition-all" />
                  </div>
                </button>

                <div className="flex items-center justify-between p-4 hover:bg-surface-low rounded-xl transition-colors">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-text-main">Media auto-download</p>
                    <p className="text-[10px] text-text-light font-bold uppercase tracking-widest mt-0.5">Automatically download media</p>
                  </div>
                  <button 
                    onClick={() => updateSettings('chats.autoDownload', !settings.chats.autoDownload)}
                    className={`w-11 h-6 rounded-full relative transition-all duration-300 shadow-inner ${settings.chats.autoDownload ? 'bg-primary' : 'bg-slate-300'}`}
                  >
                    <motion.div animate={{ x: settings.chats.autoDownload ? 22 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 hover:bg-surface-low rounded-xl transition-colors">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-text-main">Spell check</p>
                    <p className="text-[10px] text-text-light font-bold uppercase tracking-widest mt-0.5">Check spelling while typing</p>
                  </div>
                  <button 
                    onClick={() => updateSettings('chats.spellCheck', !settings.chats.spellCheck)}
                    className={`w-11 h-6 rounded-full relative transition-all duration-300 shadow-inner ${settings.chats.spellCheck ? 'bg-primary' : 'bg-slate-300'}`}
                  >
                    <motion.div animate={{ x: settings.chats.spellCheck ? 22 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 hover:bg-surface-low rounded-xl transition-colors">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-text-main">Replace text with emoji</p>
                    <p className="text-[10px] text-text-light font-bold uppercase tracking-widest mt-0.5">Emoji will replace specific text as you type</p>
                  </div>
                  <button 
                    onClick={() => updateSettings('chats.replaceWithEmoji', !settings.chats.replaceWithEmoji)}
                    className={`w-11 h-6 rounded-full relative transition-all duration-300 shadow-inner ${settings.chats.replaceWithEmoji ? 'bg-primary' : 'bg-slate-300'}`}
                  >
                    <motion.div animate={{ x: settings.chats.replaceWithEmoji ? 22 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 hover:bg-surface-low rounded-xl transition-colors">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-text-main">Enter is send</p>
                    <p className="text-[10px] text-text-light font-bold uppercase tracking-widest mt-0.5">Enter key will send your message</p>
                  </div>
                  <button 
                    onClick={() => updateSettings('chats.enterIsSend', !settings.chats.enterIsSend)}
                    className={`w-11 h-6 rounded-full relative transition-all duration-300 shadow-inner ${settings.chats.enterIsSend ? 'bg-primary' : 'bg-slate-300'}`}
                  >
                    <motion.div animate={{ x: settings.chats.enterIsSend ? 22 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'video_voice':
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div className="bg-surface-lowest p-4 rounded-2xl overflow-hidden shadow-soft border border-border/50 relative aspect-video bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover rounded-xl" />
              <div className="absolute top-4 left-4 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-[10px] text-white font-bold tracking-widest uppercase">
                Camera Preview
              </div>
            </div>

            <div className="bg-surface-lowest p-6 rounded-2xl border border-border/50 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-light uppercase tracking-widest flex items-center gap-2">
                  <Camera size={12} /> Camera Input
                </label>
                <select 
                  value={selectedDevices.video}
                  onChange={(e) => { setSelectedDevices({...selectedDevices, video: e.target.value}); setTimeout(startPreview, 10); }}
                  className="w-full h-12 bg-surface-low rounded-xl px-4 text-sm font-bold outline-none border border-transparent focus:border-primary/50"
                >
                  {devices.video.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0,5)}...`}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-light uppercase tracking-widest flex items-center gap-2">
                  <Mic size={12} /> Microphone Input
                </label>
                <select 
                  value={selectedDevices.audio}
                  onChange={(e) => setSelectedDevices({...selectedDevices, audio: e.target.value})}
                  className="w-full h-12 bg-surface-low rounded-xl px-4 text-sm font-bold outline-none border border-transparent focus:border-primary/50"
                >
                  {devices.audio.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0,5)}...`}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-low rounded-xl">
                 <div className="flex items-center gap-4">
                   <Volume2 size={18} className="text-primary/70" />
                   <span className="text-sm font-bold">Audio Output (Speakers)</span>
                 </div>
                 <span className="text-[10px] text-text-soft font-bold uppercase tracking-widest">System Default</span>
               </div>
            </div>
          </motion.div>
        );

      case 'notifications':
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
             <div className="bg-surface-lowest p-6 rounded-2xl border border-border/50 space-y-4">
                {[
                  { key: 'notifications.messages', label: 'Message Notifications', desc: 'Show alerts for new messages' },
                  { key: 'notifications.groups', label: 'Group Notifications', desc: 'Show alerts for group messages' },
                  { key: 'notifications.preview', label: 'Show Preview', desc: 'Display message text in notifications' },
                  { key: 'notifications.sounds', label: 'Play Sounds', desc: 'Play sounds for incoming calls and messages' }
                ].map((n, i) => {
                  const val = n.key.includes('.') ? settings.notifications[n.key.split('.')[1]] : settings[n.key];
                  return (
                  <div key={i} className="flex items-center justify-between p-4 bg-surface-low rounded-xl">
                    <div className="flex-1">
                      <p className="text-sm font-bold tracking-tight">{n.label}</p>
                      <p className="text-[10px] text-text-light font-bold uppercase tracking-widest mt-0.5">{n.desc}</p>
                    </div>
                    <button 
                      onClick={() => updateSettings(n.key, !val)}
                      className={`w-11 h-6 rounded-full relative transition-all duration-300 shadow-inner ${val ? 'bg-primary' : 'bg-slate-300'}`}
                    >
                      <motion.div 
                        animate={{ x: val ? 22 : 4 }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" 
                      />
                    </button>
                  </div>
                )})}
             </div>
          </motion.div>
        );

      case 'shortcuts':
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="bg-surface-lowest p-6 rounded-2xl border border-border/50">
              <div className="space-y-6">
                {[
                  { keys: ['Alt', 'Shift', 'N'], desc: 'New DM' },
                  { keys: ['Alt', 'Shift', 'F'], desc: 'Search Conversations' },
                  { keys: ['Alt', 'Shift', 'C'], desc: 'Open Calendar' },
                  { keys: ['Alt', 'Shift', 'H'], desc: 'Go to Home' },
                  { keys: ['Alt', 'Shift', 'S'], desc: 'Open Settings' },
                  { keys: ['Esc'], desc: 'Close Modal / Back' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <span className="text-sm font-bold text-text-main group-hover:text-primary transition-colors">{s.desc}</span>
                    <div className="flex gap-1">
                      {s.keys.map(k => (
                        <kbd key={k} className="px-2 py-1 bg-surface-low border border-border/50 rounded-lg text-[10px] font-black font-mono shadow-sm">
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        );

      case 'help':
        if (subView === 'help_centre') {
          const faqs = [
            { q: 'How do I send a message?', a: 'Open any chat from your conversation list and type in the message box at the bottom. Press Enter or click the send button to deliver your message instantly.' },
            { q: 'How do I start a video call?', a: 'Open a conversation and click the video camera icon in the top-right corner of the chat header. The other person will receive a call notification.' },
            { q: 'Can I send files and images?', a: 'Yes! Click the paperclip or attachment icon in the message bar. You can share images, videos, documents and other files up to 100 MB.' },
            { q: 'How do I pin a message?', a: 'Hover over any message and click the ⋯ menu, then choose "Pin". Pinned messages appear at the top of your chat so you can find them quickly. Pro users can pin up to 20 messages per chat.' },
            { q: 'How do I block someone?', a: 'Go to Settings → Privacy → Blocked Contacts and type the username you want to block. You can also block from a chat by clicking the contact\'s name in the header.' },
            { q: 'How do I delete my account?', a: 'Go to Settings → Account, scroll to the Danger Zone section and click "Delete Account". This is permanent and cannot be undone.' },
            { q: 'What is Pingora Premium?', a: 'Pingora Premium (Pro) unlocks advanced features including up to 20 pinned messages per chat, detailed poll analytics, and exclusive profile badges. Toggle it from Settings → Account.' },
            { q: 'Are my messages encrypted?', a: 'Yes. Pingora uses end-to-end encryption for all messages, calls, photos, videos, and documents. Not even our servers can read your messages.' },
          ];
          return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-12">
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => setSubView(null)} className="p-2 hover:bg-surface-low rounded-xl transition-colors text-primary">
                  <ArrowLeft size={20} />
                </button>
                <h3 className="text-xl font-black tracking-tight text-text-main">Help Centre</h3>
              </div>

              <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-2xl border border-primary/10">
                <div className="flex items-center gap-3 mb-2">
                  <HelpCircle size={20} className="text-primary" />
                  <span className="text-sm font-black uppercase tracking-widest text-primary">Frequently Asked Questions</span>
                </div>
                <p className="text-xs text-text-soft font-medium">Everything you need to know about using Pingora.</p>
              </div>

              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <HelpFaqItem key={i} question={faq.q} answer={faq.a} />
                ))}
              </div>

              <div className="p-6 bg-surface-lowest rounded-2xl border border-border/50 text-center">
                <p className="text-sm font-bold text-text-main mb-1">Still need help?</p>
                <p className="text-xs text-text-soft mb-4">Our support team is ready to assist you.</p>
                <button
                  onClick={() => setSubView('contact_us')}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-lg transition-all active:scale-95"
                >
                  Contact Support
                </button>
              </div>
            </motion.div>
          );
        }

        if (subView === 'contact_us') {
          const handleSupportSubmit = async () => {
            if (!supportMessage.trim() || supportMessage.trim().length < 10) {
              setSupportResult({ success: false, message: 'Please write at least 10 characters describing your issue.' });
              return;
            }
            setSupportSubmitting(true);
            setSupportResult(null);
            try {
              const res = await submitSupportTicket({ topic: supportTopic, message: supportMessage });
              if (res.success) {
                setSupportResult({ success: true, message: res.message });
                setSupportMessage('');
                setSupportTopic('Bug report');
              } else {
                setSupportResult({ success: false, message: res.message || 'Failed to submit. Please try again.' });
              }
            } catch (err) {
              setSupportResult({ success: false, message: 'Network error. Please check your connection and try again.' });
            } finally {
              setSupportSubmitting(false);
            }
          };

          return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-12">
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => { setSubView(null); setSupportResult(null); }} className="p-2 hover:bg-surface-low rounded-xl transition-colors text-primary">
                  <ArrowLeft size={20} />
                </button>
                <h3 className="text-xl font-black tracking-tight text-text-main">Contact Us</h3>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-primary/5 p-6 rounded-2xl border border-blue-500/10">
                <div className="flex items-center gap-3 mb-2">
                  <Mail size={20} className="text-blue-500" />
                  <span className="text-sm font-black uppercase tracking-widest text-blue-500">Support Team</span>
                </div>
                <p className="text-xs text-text-soft font-medium">We typically respond within 24–48 hours on business days.</p>
              </div>

              <div className="bg-surface-lowest p-6 rounded-2xl border border-border/50 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: MessageSquare, label: 'Chat support', desc: 'Mon–Fri, 9am–6pm' },
                    { icon: Mail, label: 'Email support', desc: 'support@pingora.in' },

                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-xl bg-surface-low border border-border/5 flex flex-col gap-2">
                      <item.icon size={16} className="text-primary" />
                      <p className="text-xs font-bold text-text-main">{item.label}</p>
                      <p className="text-[10px] text-text-soft">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border/20 pt-5 space-y-4">
                  <p className="text-[10px] font-black uppercase text-text-light tracking-widest">Send us a message</p>

                  <AnimatePresence>
                    {supportResult && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className={`flex items-start gap-3 p-4 rounded-xl text-sm font-medium ${supportResult.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600'}`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${supportResult.success ? 'bg-green-500' : 'bg-red-500'} text-white mt-0.5`}>
                          {supportResult.success ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                        </div>
                        <span>{supportResult.message}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Topic</label>
                    <select
                      value={supportTopic}
                      onChange={(e) => setSupportTopic(e.target.value)}
                      disabled={supportSubmitting}
                      className="w-full h-11 bg-surface-low rounded-xl px-4 text-sm font-semibold outline-none border border-transparent focus:border-primary/30 transition-all disabled:opacity-60"
                    >
                      <option>Bug report</option>
                      <option>Feature request</option>
                      <option>Account issue</option>
                      <option>Billing question</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-soft uppercase tracking-widest">Your message</label>
                    <textarea
                      rows={5}
                      placeholder="Describe your issue in detail (min. 10 characters)..."
                      value={supportMessage}
                      onChange={(e) => { setSupportMessage(e.target.value); if (supportResult) setSupportResult(null); }}
                      disabled={supportSubmitting}
                      className="w-full bg-surface-low rounded-xl px-4 py-3 text-sm font-medium outline-none border border-transparent focus:border-primary/30 transition-all resize-none disabled:opacity-60"
                    />
                    <p className={`text-[10px] font-bold text-right transition-colors ${supportMessage.trim().length >= 10 ? 'text-green-500' : 'text-text-light'}`}>
                      {supportMessage.trim().length} / 10 min
                    </p>
                  </div>
                  <button
                    onClick={handleSupportSubmit}
                    disabled={supportSubmitting || supportMessage.trim().length < 10}
                    className="w-full h-12 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    {supportSubmitting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full"
                        />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail size={15} />
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        }

        if (subView === 'privacy_terms') {
          const sections = [
            {
              title: 'Privacy Policy',
              icon: Shield,
              content: [
                { heading: 'Information We Collect', body: 'We collect information you provide when you create an account (username, email) and information generated when you use Pingora (messages, media, call logs). We do NOT store the content of your end-to-end encrypted messages on our servers in decryptable form.' },
                { heading: 'How We Use Your Information', body: 'Your information is used to operate the service, provide customer support, improve reliability, and prevent abuse. We do not sell your personal data to third parties.' },
                { heading: 'Data Retention', body: 'Your messages are stored only until delivered. If a message cannot be delivered (e.g., the recipient is offline), it is queued for up to 30 days before deletion.' },
                { heading: 'Your Rights', body: 'You have the right to access, correct, and delete your personal data at any time. You can delete your account from Settings → Account → Delete Account.' },
              ]
            },
            {
              title: 'Terms of Service',
              icon: FileText,
              content: [
                { heading: 'Acceptable Use', body: 'Pingora may only be used for lawful purposes. You agree not to use Pingora to send spam, engage in harassment, distribute malware, or violate any applicable laws.' },
                { heading: 'Intellectual Property', body: 'You retain ownership of the content you share via Pingora. By using the service you grant Pingora a limited licence to store and transmit your content solely to provide the service.' },
                { heading: 'Account Termination', body: 'We reserve the right to suspend or terminate accounts that violate these terms. You may also delete your own account at any time from Settings.' },
                { heading: 'Limitation of Liability', body: 'Pingora is provided "as is" without warranties of any kind. To the maximum extent permitted by law, Pingora shall not be liable for indirect or consequential damages.' },
              ]
            },
          ];

          return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-12">
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => setSubView(null)} className="p-2 hover:bg-surface-low rounded-xl transition-colors text-primary">
                  <ArrowLeft size={20} />
                </button>
                <h3 className="text-xl font-black tracking-tight text-text-main">Privacy & Terms</h3>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-primary/5 p-6 rounded-2xl border border-purple-500/10">
                <div className="flex items-center gap-3 mb-2">
                  <Info size={20} className="text-purple-500" />
                  <span className="text-sm font-black uppercase tracking-widest text-purple-500">Legal Documents</span>
                </div>
                <p className="text-xs text-text-soft font-medium">Last updated: 1 April 2025 • Effective: 1 April 2025</p>
              </div>

              {sections.map((sec, si) => (
                <div key={si} className="bg-surface-lowest p-6 rounded-2xl border border-border/50 space-y-5">
                  <div className="flex items-center gap-3 pb-3 border-b border-border/20">
                    <sec.icon size={18} className="text-primary" />
                    <h4 className="text-base font-black tracking-tight text-text-main">{sec.title}</h4>
                  </div>
                  {sec.content.map((item, ii) => (
                    <div key={ii} className="space-y-1">
                      <p className="text-xs font-black uppercase tracking-widest text-primary">{item.heading}</p>
                      <p className="text-sm text-text-soft font-medium leading-relaxed">{item.body}</p>
                    </div>
                  ))}
                </div>
              ))}

              <p className="text-center text-[9px] font-black text-text-light uppercase tracking-[0.2em] opacity-40">Questions? Email legal@pingora.in</p>

            </motion.div>
          );
        }

        if (subView === 'check_updates') {
          return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-12">
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => setSubView(null)} className="p-2 hover:bg-surface-low rounded-xl transition-colors text-primary">
                  <ArrowLeft size={20} />
                </button>
                <h3 className="text-xl font-black tracking-tight text-text-main">App Info</h3>
              </div>

              <div className="bg-surface-lowest p-8 rounded-2xl border border-border/50 text-center space-y-4">
                <div className="w-24 h-24 mx-auto mb-2 drop-shadow-xl">
                  <img src="/pingora_logo.png" alt="Pingora Logo" className="w-full h-full object-contain" />
                </div>

                <div>
                  <h4 className="text-2xl font-black tracking-tight text-text-main">Pingora</h4>
                  <p className="text-xs text-text-soft font-medium">Secure messaging, reimagined</p>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-600 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-widest">Up to date</span>
                </div>
              </div>

              <div className="bg-surface-lowest p-6 rounded-2xl border border-border/50 space-y-4">
                <p className="text-[10px] font-black uppercase text-text-light tracking-widest">Version Information</p>
                {[
                  { label: 'App Version', value: 'v1.4.0' },
                  { label: 'Build', value: '20260401-stable' },
                  { label: 'Platform', value: 'Web (React)' },
                  { label: 'Released', value: '1 April 2025' },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-border/10 last:border-0">
                    <span className="text-sm font-semibold text-text-soft">{row.label}</span>
                    <span className="text-sm font-black text-text-main">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-surface-lowest p-6 rounded-2xl border border-border/50 space-y-4">
                <p className="text-[10px] font-black uppercase text-text-light tracking-widest">What's New in v1.4.0</p>
                {[
                  '📌 Pinned messages with per-user subscription limits',
                  '📊 Poll analytics for Pro users',
                  '🖼️ Custom chat wallpapers',
                  '👁️ Story viewer tracking',
                  '🔒 Improved end-to-end encryption indicators',
                  '⚡ Performance improvements and bug fixes',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 shrink-0" />
                    <p className="text-sm text-text-soft font-medium">{item}</p>
                  </div>
                ))}
              </div>

              <button className="w-full h-12 bg-surface-lowest border border-border/50 text-text-main rounded-xl text-xs font-black uppercase tracking-widest hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2">
                <RefreshCw size={15} />
                Check for Updates
              </button>
            </motion.div>
          );
        }

        if (subView === 'my_tickets') {
          const statusConfig = {
            open:        { label: 'Open',        bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400' },
            in_progress: { label: 'In Progress',  bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-400'   },
            resolved:    { label: 'Resolved',     bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500'  },
            closed:      { label: 'Closed',       bg: 'bg-slate-100',  text: 'text-slate-500',  dot: 'bg-slate-400'  },
          };

          return (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-12">
              <div className="flex items-center gap-4 mb-2">
                <button onClick={() => setSubView(null)} className="p-2 hover:bg-surface-low rounded-xl transition-colors text-primary">
                  <ArrowLeft size={20} />
                </button>
                <h3 className="text-xl font-black tracking-tight text-text-main">My Tickets</h3>
                <button
                  onClick={fetchMyTickets}
                  disabled={ticketsLoading}
                  className="ml-auto p-2 hover:bg-surface-low rounded-xl transition-colors text-primary disabled:opacity-50"
                  title="Refresh"
                >
                  <motion.div animate={{ rotate: ticketsLoading ? 360 : 0 }} transition={{ duration: 0.8, repeat: ticketsLoading ? Infinity : 0, ease: 'linear' }}>
                    <RefreshCw size={17} />
                  </motion.div>
                </button>
              </div>

              <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-2xl border border-primary/10">
                <div className="flex items-center gap-3 mb-1">
                  <Ticket size={18} className="text-primary" />
                  <span className="text-sm font-black uppercase tracking-widest text-primary">Support Tickets</span>
                </div>
                <p className="text-xs text-text-soft font-medium">Track the status of your submitted requests. Hit refresh to see the latest updates.</p>
              </div>

              {ticketsError && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
                  <X size={16} />
                  {ticketsError}
                </div>
              )}

              {ticketsLoading && myTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 opacity-40">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mb-3" />
                  <p className="text-xs font-bold uppercase tracking-widest">Loading tickets...</p>
                </div>
              ) : myTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 opacity-40">
                  <Ticket size={36} className="mb-3" />
                  <p className="text-xs font-bold uppercase tracking-widest">No tickets yet</p>
                  <p className="text-[10px] mt-1 text-text-soft">Submit a request via Contact Us</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myTickets.map((ticket) => {
                    const cfg = statusConfig[ticket.status] || statusConfig.open;
                    const date = new Date(ticket.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                    const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';
                    return (
                      <div
                        key={ticket.id}
                        className={`bg-surface-lowest rounded-2xl border p-5 space-y-3 transition-all ${isResolved ? 'border-green-200/70' : 'border-border/50'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-black text-text-main">{ticket.topic}</span>
                              <span className="text-[9px] text-text-light font-bold">#TKT-{String(ticket.id).padStart(4, '0')}</span>
                            </div>
                            <p className="text-[11px] text-text-soft font-medium line-clamp-2 leading-relaxed">{ticket.message}</p>
                          </div>
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 ${cfg.bg}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${ticket.status === 'open' ? 'animate-pulse' : ''}`} />
                            <span className={`text-[10px] font-black uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
                          </div>
                        </div>

                        {ticket.adminFeedback && (
                          <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 space-y-1.5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                              <ShieldCheck size={24} />
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-primary">Admin Response</p>
                            <p className="text-[11px] text-text-main font-medium leading-relaxed italic">"{ticket.adminFeedback}"</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-border/10">
                          <span className="text-[10px] text-text-light font-semibold">Submitted {date}</span>
                          {isResolved && (
                            <div className="flex items-center gap-1.5 text-green-600">
                              <Check size={12} strokeWidth={3} />
                              <span className="text-[10px] font-black uppercase tracking-wide">
                                {ticket.status === 'resolved' ? 'Issue Resolved' : 'Ticket Closed'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          );
        }

        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
             <div className="bg-surface-lowest p-6 rounded-2xl border border-border/50 space-y-4">
                <button
                  onClick={() => setSubView('help_centre')}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-surface-low transition-colors group text-left"
                >
                  <div className="flex items-center gap-4">
                    <HelpCircle size={18} className="text-primary/70" />
                    <div>
                      <p className="text-sm font-bold">Help Centre</p>
                      <p className="text-[10px] text-text-soft font-medium uppercase tracking-widest">Get support and read FAQs</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-text-light group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => setSubView('contact_us')}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-surface-low transition-colors group text-left"
                >
                  <div className="flex items-center gap-4">
                    <Mail size={18} className="text-primary/70" />
                    <div>
                      <p className="text-sm font-bold">Contact Us</p>
                      <p className="text-[10px] text-text-soft font-medium uppercase tracking-widest">Speak to our support team</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-text-light group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => { setSubView('my_tickets'); fetchMyTickets(); }}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-surface-low transition-colors group text-left"
                >
                  <div className="flex items-center gap-4">
                    <Ticket size={18} className="text-primary/70" />
                    <div>
                      <p className="text-sm font-bold">My Tickets</p>
                      <p className="text-[10px] text-text-soft font-medium uppercase tracking-widest">Track your support requests</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-text-light group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="border-t border-border/30 pt-4 mt-2">
                  <button
                    onClick={() => setSubView('privacy_terms')}
                    className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-surface-low transition-colors group text-left"
                  >
                    <div className="flex items-center gap-4">
                      <Info size={18} className="text-text-soft opacity-60" />
                      <span className="text-sm font-bold text-text-main">Privacy Policy & Terms</span>
                    </div>
                    <ChevronRight size={16} className="text-text-light group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => setSubView('check_updates')}
                    className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-surface-low transition-colors group text-left"
                  >
                    <div className="flex items-center gap-4">
                      <RefreshCw size={18} className="text-text-soft opacity-60" />
                      <span className="text-sm font-bold text-text-main">Check for Updates</span>
                    </div>
                    <ChevronRight size={16} className="text-text-light group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
             </div>
             <p className="text-center text-[9px] font-black text-text-light uppercase tracking-[0.3em] opacity-30 mt-8">Pingora Chat v1.4.0 • Made with Passion</p>
          </motion.div>
        );

      case 'admin':
        return <AdminPanel 
          loading={adminLoading}
          error={adminError}
          tickets={adminTickets}
          proRequests={adminProRequests}
          onUpdateTicket={async (id, status, adminFeedback) => {
            try {
              await updateTicketStatus(id, status, adminFeedback);
              setAdminTickets(prev => prev.map(t => t.id === id ? { ...t, status, adminFeedback } : t));
              showNotification(`Ticket #${id} updated to ${status}`, 'success');
            } catch (err) { showNotification('Failed to update ticket', 'error'); }
          }}

          onHandlePro={async (id, status) => {
            try {
              await handleProRequest(id, status);
              setAdminProRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
              showNotification(`Pro request ${status}`, 'success');
            } catch (err) { showNotification('Failed to handle request', 'error'); }
          }}

          onRefresh={fetchAdminData}
        />;

      default:

        return <div className="text-text-soft italic text-sm">Feature coming soon...</div>;
    }
  };



  return (
    <div className="flex-1 w-full h-full bg-surface overflow-hidden flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Settings Sidebar */}
        <aside className="w-full md:w-[380px] lg:w-[420px] bg-surface-low border-r border-border/10 flex flex-col shrink-0 relative z-20">
          <div className="p-8 pb-4">
             <div className="flex items-center gap-4 mb-2">
                <button 
                  onClick={onBack}
                  className="p-3 bg-surface-lowest rounded-2xl md:hidden text-text-main"
                >
                  <ArrowLeft size={20} />
                </button>
                <img src="/pingora_logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                <h2 className="text-3xl font-black tracking-tighter text-text-main">Settings</h2>

             </div>
             <p className="text-[10px] font-bold text-text-light uppercase tracking-widest ml-1">Configure your workspace</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                   if (cat.id === 'logout') { logout(); return; }
                   if (cat.id === 'admin') fetchAdminData();
                   setActiveCategory(cat.id);
                   setSubView(null);
                }}
                className={`w-full flex items-start gap-5 p-5 rounded-2xl transition-all group border border-transparent ${activeCategory === cat.id ? 'bg-surface-lowest shadow-premium border-border/5' : 'hover:bg-surface-high/20'}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm ${activeCategory === cat.id ? 'bg-primary text-white shadow-lg shadow-primary/30 rotate-3' : 'bg-surface-lowest text-text-light group-hover:bg-white group-hover:text-primary'}`}>
                  <cat.icon size={22} className={activeCategory === cat.id ? 'scale-110' : ''} />
                </div>
                <div className="flex-1 text-left min-w-0 pt-1">
                  <p className={`text-base font-bold tracking-tight mb-0.5 ${cat.variant === 'danger' ? 'text-red-500' : (activeCategory === cat.id ? 'text-primary' : 'text-text-main')}`}>
                    {cat.title}
                  </p>
                  {cat.subtitle && (
                    <p className="text-[11px] font-medium text-text-soft truncate opacity-80 group-hover:opacity-100 transition-opacity">
                      {cat.subtitle}
                    </p>
                  )}
                </div>
                {activeCategory === cat.id && (
                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-5 shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]" />
                )}
              </button>
            ))}
          </div>

          <div className="p-6 border-t border-border/10 bg-surface-low/50">
             <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-lowest shadow-sm border border-border/5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                   {user.username?.[0].toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                   {user.accountType === 'pro' ? (
                     <span className="inline-block px-1.5 py-0.5 rounded-md bg-yellow-400 text-yellow-900 text-[9px] font-black uppercase tracking-widest leading-none mb-1">PRO ACCOUNT</span>
                   ) : (
                     <p className="text-[10px] font-black uppercase text-text-light tracking-widest leading-none mb-1">Normal Account</p>
                   )}
                   <h4 className="text-sm font-bold text-text-main truncate">@{user.username}</h4>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
             </div>
          </div>
        </aside>

        {/* Settings Detail Content */}
        <main className="hidden md:flex flex-1 flex-col bg-surface overflow-hidden relative">
           <div className="absolute top-0 right-0 p-32 opacity-[0.03] pointer-events-none">
              {React.createElement(categories.find(c => c.id === activeCategory)?.icon || MessageSquare, { size: 400 })}
           </div>

           <header className="h-24 flex items-center px-12 glass-header border-b border-border/10 z-20 transition-all">
              <h3 className="text-xl font-bold tracking-tight text-text-main">
                {categories.find(c => c.id === activeCategory)?.title}
              </h3>
           </header>

           <div className="flex-1 overflow-y-auto p-12 relative z-10 custom-scrollbar max-w-4xl">
              {renderContent()}
           </div>
        </main>
      </div>

      {/* Theme Selection Modal */}
      <AnimatePresence>
        {showThemeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowThemeModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-surface-lowest rounded-[32px] overflow-hidden shadow-2xl border border-border/10 p-8"
            >
              <h3 className="text-xl font-bold text-text-main mb-8">Theme</h3>
              
              <div className="space-y-6 mb-10">
                {[
                  { id: 'light', label: 'Light' },
                  { id: 'dark', label: 'Dark' },
                  { id: 'system', label: 'System default' }
                ].map((option) => (
                  <label key={option.id} className="flex items-center justify-between cursor-pointer group">
                    <span className="text-base font-medium text-text-main group-hover:text-primary transition-colors">
                      {option.label}
                    </span>
                    <div className="relative">
                      <input 
                        type="radio" 
                        name="theme-choice"
                        className="sr-only"
                        checked={tempTheme === option.id}
                        onChange={() => setTempTheme(option.id)}
                      />
                      <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${tempTheme === option.id ? 'border-primary' : 'border-text-light/30'}`}>
                        {tempTheme === option.id && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-end gap-6">
                <button 
                  onClick={() => setShowThemeModal(false)}
                  className="text-sm font-bold text-[#00a884] hover:opacity-70 transition-opacity px-2 py-1"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    updateSettings('theme', tempTheme);
                    setShowThemeModal(false);
                  }}
                  className="px-8 py-2.5 bg-[#00a884] hover:bg-[#008f70] text-white rounded-full text-sm font-bold shadow-md shadow-[#00a884]/20 active:scale-95 transition-all"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
          <Toast 
            message={notification.message} 
            type={notification.type} 
            onClose={() => setNotification(null)} 
          />
        )}
      </AnimatePresence>

      {/* Mobile Nav Overlay */}
      <ConfirmModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
        message="Are you absolutely sure you want to delete your account? This action is permanent and all your data including messages, profile, and settings will be permanently removed. This cannot be undone."
        onConfirm={handleDeleteAccount}
        confirmText={isDeleting ? "Deleting..." : "Delete Permanently"}
        type="danger"
      />

    </div>
  );
};

export default SettingsView;
