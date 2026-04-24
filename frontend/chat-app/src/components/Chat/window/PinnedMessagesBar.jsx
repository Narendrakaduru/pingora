import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, ChevronLeft, ChevronRight } from 'lucide-react';

const PinnedMessagesBar = ({ pinnedMessages, onScrollToMessage }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset index if it goes out of bounds (e.g. message unpinned)
  useEffect(() => {
    if (currentIndex >= pinnedMessages.length && pinnedMessages.length > 0) {
      setCurrentIndex(0);
    }
  }, [pinnedMessages.length, currentIndex]);

  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  const currentMsg = pinnedMessages[currentIndex] || pinnedMessages[0];
  if (!currentMsg) return null;
  
  const handleNext = (e) => {
    e.stopPropagation();
    const nextIdx = (currentIndex + 1) % pinnedMessages.length;
    setCurrentIndex(nextIdx);
    const msg = pinnedMessages[nextIdx];
    onScrollToMessage(msg._id || msg.id);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    const prevIdx = (currentIndex - 1 + pinnedMessages.length) % pinnedMessages.length;
    setCurrentIndex(prevIdx);
    const msg = pinnedMessages[prevIdx];
    onScrollToMessage(msg._id || msg.id);
  };

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-white/80 backdrop-blur-md border-b border-border/10 flex items-center px-4 py-2 gap-3 cursor-pointer hover:bg-white transition-colors relative z-20"
      onClick={() => onScrollToMessage(currentMsg._id || currentMsg.id)}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        <Pin size={16} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase text-primary tracking-widest">Pinned Message</span>
          {pinnedMessages.length > 1 && (
            <span className="text-[10px] font-bold text-text-light">
              {currentIndex + 1} of {pinnedMessages.length}
            </span>
          )}
        </div>
        <p className="text-xs text-text-main font-medium truncate">
          {currentMsg.text || (currentMsg.attachment ? `[${currentMsg.attachment.type}]` : 'Message')}
        </p>
      </div>

      {pinnedMessages.length > 1 && (
        <div className="flex items-center gap-1">
          <button 
            onClick={handlePrev}
            className="p-1 hover:bg-surface-low rounded-lg transition-colors text-text-soft"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={handleNext}
            className="p-1 hover:bg-surface-low rounded-lg transition-colors text-text-soft"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default PinnedMessagesBar;
