import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ZoomIn, ZoomOut, MessageSquare, CornerUpLeft, 
  Star, Pin, Smile, CornerUpRight, Download, 
  ChevronLeft, ChevronRight, Maximize2 
} from 'lucide-react';

const API_BASE = '/api/chat';

const PhotoViewer = ({ 
  msg, 
  allMessages, 
  user, 
  getUser, 
  onClose, 
  onAction,
  scrollToMessage 
}) => {
  const [scale, setScale] = useState(1);
  const [activeMsgId, setActiveMsgId] = useState(msg._id || msg.id);
  const [showEmojis, setShowEmojis] = useState(false);

  // Filter out all media messages (images/videos)
  const mediaMessages = useMemo(() => {
    return allMessages.filter(m => m.type === 'image' || m.type === 'photo' || m.type === 'video');
  }, [allMessages]);

  const currentIndex = mediaMessages.findIndex(m => (m._id || m.id) === activeMsgId);
  const currentMsg = mediaMessages[currentIndex] || msg;

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    if (currentIndex < mediaMessages.length - 1) {
      setActiveMsgId(mediaMessages[currentIndex + 1]._id || mediaMessages[currentIndex + 1].id);
      setScale(1);
    }
  };

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    if (currentIndex > 0) {
      setActiveMsgId(mediaMessages[currentIndex - 1]._id || mediaMessages[currentIndex - 1].id);
      setScale(1);
    }
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

  const handleWheel = (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) handleZoomIn();
      else handleZoomOut();
    }
  };

  const isMe = currentMsg.username === user.username;
  const sender = getUser(currentMsg.username) || { fullName: currentMsg.username };
  const timestamp = currentMsg.timestamp ? new Date(currentMsg.timestamp).toLocaleString([], { 
    weekday: 'long', 
    hour: '2-digit', 
    minute: '2-digit' 
  }) : 'Just now';

  const downloadFile = async () => {
    try {
      const response = await fetch(`${API_BASE}${currentMsg.metadata?.file_url}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentMsg.metadata?.file_name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center select-none overflow-hidden"
      onWheel={handleWheel}
      onClick={onClose}
    >
      {/* Header Bar */}
      <div 
        className="absolute top-0 inset-x-0 h-20 flex items-center justify-between px-6 bg-gradient-to-b from-black/60 to-transparent z-50"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden bg-white/10">
            {sender.avatar ? (
              <img src={sender.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                {sender.fullName?.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-sm">{isMe ? 'You' : sender.fullName}</span>
            <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider">{timestamp}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ToolbarButton icon={<ZoomOut size={18} />} onClick={handleZoomOut} title="Zoom Out" />
          <ToolbarButton icon={<ZoomIn size={18} />} onClick={handleZoomIn} title="Zoom In" />
          <div className="w-px h-5 bg-white/10 mx-2" />
          <ToolbarButton 
            icon={<MessageSquare size={18} />} 
            onClick={() => { scrollToMessage(currentMsg._id || currentMsg.id); onClose(); }} 
            title="Show in Chat" 
          />
          <ToolbarButton icon={<CornerUpLeft size={18} />} onClick={() => { onAction('reply', currentMsg); onClose(); }} title="Reply" />
          <ToolbarButton 
            icon={<Star size={18} className={currentMsg.stars?.includes(user.username) ? "fill-yellow-400 text-yellow-400" : ""} />} 
            onClick={() => onAction('star', currentMsg)} 
            title="Star" 
          />
          <ToolbarButton 
            icon={<Pin size={18} className={currentMsg.is_pinned ? "text-primary fill-primary" : ""} />} 
            onClick={() => onAction('pin', currentMsg)} 
            title="Pin" 
          />
          <div className="relative">
            <ToolbarButton icon={<Smile size={18} />} onClick={() => setShowEmojis(!showEmojis)} title="React" />
            <AnimatePresence>
              {showEmojis && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  className="absolute top-full right-0 mt-2 bg-white/10 backdrop-blur-xl p-2 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-1 z-[2000]"
                >
                  {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                    <button 
                      key={emoji}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction('reaction', { ...currentMsg, emoji });
                        setShowEmojis(false);
                      }}
                      className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full text-xl transition-all"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <ToolbarButton icon={<CornerUpRight size={18} />} onClick={() => { onAction('forward', currentMsg); onClose(); }} title="Forward" />
          <ToolbarButton icon={<Download size={18} />} onClick={downloadFile} title="Download" />
          <div className="w-px h-5 bg-white/20 mx-2" />
          <button 
            onClick={onClose}
            className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Main Image View */}
      <div className="flex-1 w-full flex items-center justify-center relative p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMsgId}
            initial={{ opacity: 0, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, scale: scale, x: 0 }}
            exit={{ opacity: 0, scale: 1.05, x: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative flex items-center justify-center pointer-events-none"
            onClick={e => e.stopPropagation()}
          >
            {currentMsg.type === 'video' ? (
              <video 
                src={`${API_BASE}${currentMsg.metadata?.file_url}`} 
                controls 
                autoPlay 
                className="max-w-full max-h-[80vh] rounded-lg shadow-2xl pointer-events-auto" 
              />
            ) : (
              <img 
                src={`${API_BASE}${currentMsg.metadata?.file_url}`} 
                alt="" 
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl pointer-events-auto" 
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Side Controls */}
        {currentIndex > 0 && (
          <NavButton direction="left" onClick={handlePrev}>
            <ChevronLeft size={32} />
          </NavButton>
        )}
        {currentIndex < mediaMessages.length - 1 && (
          <NavButton direction="right" onClick={handleNext}>
            <ChevronRight size={32} />
          </NavButton>
        )}
      </div>

      {/* Media Carousel */}
      <div 
        className="absolute bottom-4 inset-x-0 h-24 px-6 flex items-center justify-center gap-2 pointer-events-none"
        onClick={e => e.stopPropagation()}
      >
        <div className="max-w-full overflow-x-auto flex items-center gap-1.5 p-2 bg-black/30 backdrop-blur-md rounded-2xl border border-white/5 pointer-events-auto no-scrollbar">
          {mediaMessages.map((m, i) => {
            const isSelected = (m._id || m.id) === activeMsgId;
            return (
              <div 
                key={m._id || m.id}
                onClick={() => { setActiveMsgId(m._id || m.id); setScale(1); }}
                className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden cursor-pointer transition-all border-2 ${isSelected ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-transparent opacity-50 hover:opacity-100'}`}
              >
                {m.type === 'video' ? (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white">
                    <Maximize2 size={20} />
                  </div>
                ) : (
                  <img src={`${API_BASE}${m.metadata?.file_url}`} alt="" className="w-full h-full object-cover" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

const ToolbarButton = ({ icon, onClick, title }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all"
    title={title}
  >
    {icon}
  </button>
);

const NavButton = ({ direction, onClick, children }) => (
  <button 
    onClick={onClick}
    className={`absolute ${direction === 'left' ? 'left-8' : 'right-8'} top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all backdrop-blur-md border border-white/5 z-[60]`}
  >
    {children}
  </button>
);

export default PhotoViewer;
