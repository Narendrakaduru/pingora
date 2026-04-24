import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, Lock, MessageSquare, Video, Bell, Keyboard, HelpCircle, LogOut, 
  ChevronRight, Laptop, Monitor, Speaker, Camera, Mic, Check, Moon, Sun, 
  Wallpaper, Palette, Volume2, Globe, Shield, CreditCard, UserX, Clock, 
  ExternalLink, Mail, Info, RefreshCw, Smartphone, Trash2, UserPlus, X,
  ArrowLeft, Search, FileText, MapPin
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { deleteAccount as apiDeleteAccount } from '../../services/api';
import ConfirmModal from '../Chat/modals/ConfirmModal';

const USER_API = '/api/auth';

const SettingsView = ({ onBack, allUsers = [] }) => {
  const { user, logout } = useAuth();
  const { settings, updateSettings, blockContact, unblockContact, togglePrivacyUser } = useSettings();
  const [activeCategory, setActiveCategory] = useState('account');
  const [devices, setDevices] = useState({ video: [], audio: [] });
  const [selectedDevices, setSelectedDevices] = useState({ video: '', audio: '' });
  
  const [newBlockUsername, setNewBlockUsername] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [subView, setSubView] = useState(null);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [tempTheme, setTempTheme] = useState(settings.theme);
  const [activePrivacyDetail, setActivePrivacyDetail] = useState(null);
  const [privacySearch, setPrivacySearch] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const suggestionRef = useRef(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await apiDeleteAccount();
      if (res.success) {
        logout();
      } else {
        alert(res.message || "Failed to delete account");
      }
    } catch (err) {
      console.error("Delete account error:", err);
      alert("An error occurred while deleting your account");
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
    { id: 'logout', icon: LogOut, title: 'Log out', subtitle: '', variant: 'danger' },
  ];

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

                <div className="flex items-center justify-between group cursor-pointer" onClick={() => {/* Open Wallpaper Subview if needed */}}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface-low flex items-center justify-center text-primary">
                      <Wallpaper size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-main">Wallpaper</p>
                      <p className="text-[10px] text-text-soft font-medium uppercase tracking-widest">Custom background</p>
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
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
             <div className="bg-surface-lowest p-6 rounded-2xl border border-border/50 space-y-4">
                <button className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-surface-low transition-colors group text-left">
                  <div className="flex items-center gap-4">
                    <HelpCircle size={18} className="text-primary/70" />
                    <div>
                      <p className="text-sm font-bold">Help Centre</p>
                      <p className="text-[10px] text-text-soft font-medium uppercase tracking-widest">Get support and read FAQs</p>
                    </div>
                  </div>
                  <ExternalLink size={16} className="text-text-light opacity-40 group-hover:opacity-100 transition-opacity" />
                </button>
                <button className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-surface-low transition-colors group text-left">
                  <div className="flex items-center gap-4">
                    <Mail size={18} className="text-primary/70" />
                    <div>
                      <p className="text-sm font-bold">Contact Us</p>
                      <p className="text-[10px] text-text-soft font-medium uppercase tracking-widest">Speak to our support team</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-text-light group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="border-t border-border/30 pt-4 mt-2">
                  <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-surface-low transition-colors text-left">
                    <Info size={18} className="text-text-soft opacity-60" />
                    <span className="text-sm font-bold text-text-main">Privacy Policy & Terms</span>
                  </button>
                  <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-surface-low transition-colors text-left">
                    <RefreshCw size={18} className="text-text-soft opacity-60" />
                    <span className="text-sm font-bold text-text-main">Check for Updates</span>
                  </button>
                </div>
             </div>
             <p className="text-center text-[9px] font-black text-text-light uppercase tracking-[0.3em] opacity-30 mt-8">Pingora Chat v1.4.0 • Made with Passion</p>
          </motion.div>
        );

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
                   <p className="text-[10px] font-black uppercase text-text-light tracking-widest leading-none mb-1">PRO ACCOUNT</p>
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
