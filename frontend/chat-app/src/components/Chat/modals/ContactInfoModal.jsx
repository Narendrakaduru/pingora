import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Video, Phone, ChevronRight, Image as ImageIcon, Link as LinkIcon, FileText, ChevronDown, Edit2, ArrowLeft } from 'lucide-react';


const USER_API = `/api/auth`;
const API_BASE = '/api/chat';

const groupMediaByMonth = (mediaList) => {
  const groups = {};
  const now = new Date();
  mediaList.forEach(m => {
    const date = new Date(m.timestamp);
    const isThisMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    const monthName = date.toLocaleString('default', { month: 'long' }).toUpperCase();
    const key = isThisMonth ? 'THIS MONTH' : monthName;
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  });
  return groups;
};

const SharedMediaGallery = ({ messages, docMessages, linkMessages, onBack, activeTab, setActiveTab, onOpenMedia, formatFileSize }) => {
  const groupedMedia = groupMediaByMonth(activeTab === 'media' ? messages : []);

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5]">
      {/* Header */}
      <div className="h-16 flex items-center gap-6 px-4 bg-white shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-surface-high rounded-full transition-all text-text-soft">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-lg font-medium text-text-main">Media, links, and docs</h2>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-border/10">
        {['Media', 'Docs', 'Links'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === tab.toLowerCase() ? 'text-[#008069]' : 'text-text-soft hover:text-text-main'}`}
          >
            {tab}
            {activeTab === tab.toLowerCase() && (
              <motion.div layoutId="activeMediaTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#008069]" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {activeTab === 'media' ? (
          Object.entries(groupedMedia).length > 0 ? (
            Object.entries(groupedMedia).map(([month, items]) => (
              <div key={month} className="mb-6">
                <h3 className="text-[#667781] text-xs font-medium px-2 py-2 mb-1">{month}</h3>
                <div className="grid grid-cols-3 gap-1">
                  {items.map((msg, i) => (
                    <div 
                      key={msg._id || i} 
                      onClick={() => onOpenMedia && onOpenMedia(msg)}
                      className="aspect-square bg-surface-low overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative"
                    >
                      {msg.type === 'video' ? (
                        <div className="w-full h-full bg-black flex flex-col items-center justify-center relative">
                          <Video size={24} className="text-white opacity-80" />
                        </div>
                      ) : (
                        <img 
                          src={`${API_BASE}${msg.metadata?.file_url}`} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-text-soft flex-col gap-2 py-20">
              <ImageIcon size={48} className="opacity-20" />
              <p className="text-sm font-medium">No media shared yet</p>
            </div>
          )
        ) : activeTab === 'docs' ? (
          docMessages.length > 0 ? (
            <div className="bg-white rounded-xl overflow-hidden divide-y divide-border/10">
              {docMessages.map((msg, i) => (
                <a 
                  key={msg._id || i}
                  href={`${API_BASE}${msg.metadata?.file_url}`}
                  download
                  className="flex items-center gap-4 p-4 hover:bg-surface-high/5 transition-colors group"
                >
                  <div className="w-12 h-12 bg-surface-high rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <FileText size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-main truncate">{msg.metadata?.file_name}</p>
                    <p className="text-[10px] text-text-light font-bold uppercase mt-0.5">
                      {formatFileSize(msg.metadata?.file_size || 0)} • {msg.metadata?.file_name?.split('.').pop().toUpperCase()}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-text-soft opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-text-soft flex-col gap-2 py-20">
              <FileText size={48} className="opacity-20" />
              <p className="text-sm font-medium">No documents shared yet</p>
            </div>
          )
        ) : activeTab === 'links' ? (
          linkMessages.length > 0 ? (
            <div className="bg-white rounded-xl overflow-hidden divide-y divide-border/10">
              {linkMessages.map((msg, i) => {
                const url = msg.text.match(/(https?:\/\/[^\s]+)/g)?.[0];
                return (
                  <a 
                    key={msg._id || i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 hover:bg-surface-high/5 transition-colors group"
                  >
                    <div className="w-12 h-12 bg-surface-high rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <LinkIcon size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-main truncate">{url}</p>
                      <p className="text-[10px] text-text-light font-bold uppercase mt-0.5">
                        Shared on {new Date(msg.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-text-soft opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-text-soft flex-col gap-2 py-20">
              <LinkIcon size={48} className="opacity-20" />
              <p className="text-sm font-medium">No links shared yet</p>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
};

const MuteNotificationsView = ({ isMuted, onToggle, onBack }) => {
  return (
    <div className="flex flex-col h-full bg-[#f0f2f5]">
      {/* Header */}
      <div className="h-16 flex items-center gap-6 px-4 bg-white shrink-0 shadow-sm z-10 relative">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-surface-high rounded-full transition-all text-text-soft">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-lg font-medium text-text-main">Mute notifications</h2>
      </div>

      {/* Content */}
      <div className="mt-4 bg-white border-y border-border/10 flex items-center justify-between px-4 py-4">
        <span className="text-base text-text-main">Mute notifications</span>
        <button
          onClick={onToggle}
          className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-1 cursor-pointer ${
            isMuted ? 'bg-[#008069]' : 'bg-gray-300'
          }`}
        >
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 700, damping: 30 }}
            className="w-4 h-4 bg-white rounded-full shadow-sm"
            style={{
              marginLeft: isMuted ? 'auto' : '0'
            }}
          />
        </button>
      </div>
      <p className="px-4 py-2 text-sm text-[#667781]">
        Other participants will not see that you muted this chat. You will still be notified if you are mentioned.
      </p>
    </div>
  );
};

const ContactInfoModal = ({ isOpen, onClose, contact, user, onlineUsers, messages = [], initiateCall, onOpenMedia, roomSettings, handleChatAction, setShowDisappearingModal, dmPartners = [] }) => {
  const [currentView, setCurrentView] = useState('main'); // 'main' | 'media' | 'mute'
  const [activeTab, setActiveTab] = useState('media'); // 'media' | 'docs' | 'links'

  if (!contact) return null;

  const partner = dmPartners.find(p => p.username.toLowerCase() === contact.username.toLowerCase());
  const settings = partner?.settings || roomSettings || {};
  const isMuted = settings?.is_muted ?? false;
  const disappearingTime = settings?.disappearing_time || 'off';
  const disappearingLabel = disappearingTime === 'off' ? 'Off' : 
                            (typeof disappearingTime === 'string' 
                              ? disappearingTime.replace(/\b\w/g, l => l.toUpperCase()) 
                              : disappearingTime);
  // Build the contact object that handleChatAction expects (with settings attached)
  const contactWithSettings = { ...contact, settings };

  const isOnline = onlineUsers.has(contact.username?.toLowerCase() || '');
  
  // Filter media from messages
  const mediaMessages = messages.filter(m => 
    (m.type === 'image' || m.type === 'photo' || m.type === 'video') && m.metadata?.file_url
  ).reverse();

  const docMessages = messages.filter(m => m.type === 'document' && m.metadata?.file_url).reverse();
  
  const linkMessages = messages.filter(m => {
    if (m.type !== 'text') return false;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return urlRegex.test(m.text);
  }).reverse();

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Privacy Logic
  const photoPrivacy = contact.privacy?.profilePhoto || 'everyone';
  const canSeePhoto = photoPrivacy === 'everyone' || 
    (photoPrivacy === 'selected' && contact.privacy?.profilePhotoSelected?.includes(user.username.toLowerCase()));

  const photoUrl = canSeePhoto && contact.profilePhoto ? `${USER_API}${contact.profilePhoto}` : null;
  const initial = (contact.username || contact.fullName || '?').charAt(0).toUpperCase();

  const aboutPrivacy = contact.privacy?.about || 'everyone';
  const canSeeAbout = aboutPrivacy === 'everyone' || 
    (aboutPrivacy === 'selected' && contact.privacy?.aboutSelected?.includes(user.username.toLowerCase()));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md h-full md:h-[calc(100vh-32px)] bg-[#f0f2f5] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {currentView === 'main' ? (
              <>
                {/* Header */}
                <div className="h-16 flex items-center justify-between px-4 bg-white border-b border-border/10 shrink-0">
              <div className="flex items-center gap-4">
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-surface-high rounded-full transition-all text-text-soft"
                >
                  <X size={24} />
                </button>
                <h2 className="text-lg font-medium text-text-main">Contact info</h2>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-8">
              
              {/* Profile Card */}
              <div className="bg-white p-8 flex flex-col items-center shadow-sm">
                <div className="w-52 h-52 rounded-full overflow-hidden shadow-soft mb-6 relative bg-primary/5 flex items-center justify-center border-4 border-white">
                  {photoUrl ? (
                    <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-6xl font-black uppercase">
                      {initial}
                    </div>
                  )}
                </div>
                
                <h3 className="text-2xl font-normal text-text-main mb-1">
                  {contact.fullName || contact.username}
                </h3>
                <p className="text-[#667781] text-lg font-normal mb-6">
                  {contact.username ? contact.username.toLowerCase() : ''}
                </p>

                {/* Quick Actions */}
                <div className="flex items-center gap-4 w-full px-4">
                  <button 
                    onClick={() => { onClose(); handleChatAction('search', contact, 'dm'); }}
                    className="flex-1 flex flex-col items-center justify-center p-3 rounded-xl border border-border/30 hover:bg-surface-high/20 transition-all gap-2 text-[#008069]"
                  >
                    <Search size={22} />
                    <span className="text-sm">Search</span>
                  </button>
                  <button 
                    onClick={() => { initiateCall('video'); onClose(); }}
                    className="flex-1 flex flex-col items-center justify-center p-3 rounded-xl border border-border/30 hover:bg-surface-high/20 transition-all gap-2 text-[#008069]"
                  >
                    <Video size={22} />
                    <span className="text-sm">Video</span>
                  </button>
                  <button 
                    onClick={() => { initiateCall('voice'); onClose(); }}
                    className="flex-1 flex flex-col items-center justify-center p-3 rounded-xl border border-border/30 hover:bg-surface-high/20 transition-all gap-2 text-[#008069]"
                  >
                    <Phone size={22} />
                    <span className="text-sm">Voice</span>
                  </button>
                </div>
              </div>

              {/* About Section */}
              <div className="bg-white p-6 shadow-sm">
                <p className="text-[#667781] text-sm font-normal mb-3">About</p>
                <p className="text-text-main text-base leading-relaxed border-b border-border/10 pb-4">
                  {canSeeAbout ? (contact.about || 'Hey there! I am using Pingora.') : 'Privacy: This information is hidden.'}
                </p>
              </div>

              {/* Media Section */}
              <div className="bg-white p-6 shadow-sm">
                <div 
                  className="flex items-center justify-between mb-4 group cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setCurrentView('media')}
                >
                  <div className="flex items-center gap-4 text-[#667781]">
                    <ImageIcon size={20} />
                    <span className="text-sm font-normal text-text-main">Media, links and docs</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#667781]">
                    <span className="text-sm">{mediaMessages.length}</span>
                    <ChevronRight size={20} />
                  </div>
                </div>
                {mediaMessages.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {mediaMessages.slice(0, 4).map((msg, i) => (
                      <div 
                        key={msg._id || msg.id || i} 
                        onClick={() => onOpenMedia && onOpenMedia(msg)}
                        className="aspect-square bg-surface-low rounded-lg overflow-hidden border border-border/10 cursor-pointer hover:opacity-90"
                      >
                        {msg.type === 'video' ? (
                          <div className="w-full h-full bg-black flex items-center justify-center relative">
                            <Video size={16} className="text-white opacity-70" />
                          </div>
                        ) : (
                          <img 
                            src={`${API_BASE}${msg.metadata?.file_url}`} 
                            alt="" 
                            className="w-full h-full object-cover" 
                          />
                        )}
                      </div>
                    ))}
                    {mediaMessages.length < 4 && Array.from({ length: 4 - mediaMessages.length }).map((_, i) => (
                       <div key={`empty-${i}`} className="aspect-square bg-surface-low/30 rounded-lg border border-dashed border-border/20" />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-4 bg-surface-low/20 rounded-xl border border-dashed border-border/10">
                    <p className="text-[10px] font-bold text-[#667781] uppercase tracking-widest">No media shared yet</p>
                  </div>
                )}
              </div>

              {/* Settings Section */}
              <div className="bg-white shadow-sm overflow-hidden">
                 <div onClick={() => setCurrentView('mute')} className="flex items-center justify-between p-4 border-b border-border/5 hover:bg-surface-high/10 cursor-pointer">
                   <div className="flex items-center gap-4">
                      <span className="text-xl">🔔</span>
                      <div className="flex flex-col">
                        <span className="text-text-main text-base">Mute notifications</span>
                        {isMuted && <span className="text-xs text-[#667781]">Muted</span>}
                      </div>
                   </div>
                   <ChevronRight size={18} className="text-[#667781]" />
                 </div>
                 
                 <div onClick={() => { onClose(); setShowDisappearingModal && setShowDisappearingModal(true); }} className="flex items-center justify-between p-4 border-b border-border/5 hover:bg-surface-high/10 cursor-pointer">
                   <div className="flex items-center gap-4">
                      <span className="text-xl">⏲️</span>
                      <div className="flex flex-col">
                        <span className="text-text-main text-base">Disappearing messages</span>
                        <span className="text-xs text-[#667781]">{disappearingLabel}</span>
                      </div>
                   </div>
                   <ChevronRight size={18} className="text-[#667781]" />
                 </div>
                 
                 <button 
                   onClick={() => handleChatAction('block', contact, 'dm')}
                   className="w-full flex items-center gap-4 p-4 text-[#ea0038] hover:bg-surface-high/10 transition-colors text-left"
                 >
                    <span className="text-xl">🚫</span>
                    <span className="font-medium text-base">Block {contact.username}</span>
                 </button>
              </div>
            </div>
            </>
            ) : currentView === 'media' ? (
              <SharedMediaGallery 
                messages={mediaMessages} 
                docMessages={docMessages}
                linkMessages={linkMessages}
                onBack={() => setCurrentView('main')}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onOpenMedia={onOpenMedia}
                formatFileSize={formatFileSize}
              />
            ) : currentView === 'mute' ? (
              <MuteNotificationsView
                isMuted={isMuted}
                onToggle={() => handleChatAction('mute', contactWithSettings, 'dm')}
                onBack={() => setCurrentView('main')}
              />
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ContactInfoModal;
