import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, CheckCheck, User, MessageCircle } from 'lucide-react';

const MessageInfoModal = ({ isOpen, onClose, msg, getUser }) => {
  if (!isOpen || !msg) return null;

  const sender = getUser(msg.username);
  const date = new Date(msg.timestamp);

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden p-8"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <MessageCircle size={22} />
             </div>
             <h3 className="text-xl font-bold text-text-main">Message Info</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-surface-low rounded-full transition-colors text-text-soft"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-surface-low rounded-2xl border border-border/5 transition-all hover:border-primary/20 group">
            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
              <User size={12} /> SENDER
            </p>
            <p className="text-base font-bold text-text-main group-hover:text-primary transition-colors">{sender?.fullName || msg.username}</p>
          </div>

          <div className="p-4 bg-surface-low rounded-2xl border border-border/5 transition-all hover:border-primary/20 group">
            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
              <Clock size={12} /> TIMESTAMP
            </p>
            <p className="text-base font-bold text-text-main group-hover:text-primary transition-colors">{date.toLocaleDateString()} {date.toLocaleTimeString()}</p>
          </div>

          <div className="p-4 bg-surface-low rounded-2xl border border-border/5 transition-all hover:border-primary/20 group">
            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
              <CheckCheck size={12} className="text-blue-500" /> STATUS
            </p>
            <div className="flex items-center gap-2">
               <span className="text-base font-bold text-text-main group-hover:text-blue-500 transition-colors">Read</span>
               <div className="w-1 h-1 rounded-full bg-text-light" />
               <span className="text-sm font-medium text-text-soft">Delivered successfully</span>
            </div>
          </div>
        </div>

        <div className="mt-8">
           <button 
             onClick={onClose}
             className="w-full py-4 bg-surface-high font-bold text-text-main rounded-2xl hover:bg-surface-higher active:scale-95 transition-all"
           >
             Close
           </button>
        </div>
      </motion.div>
    </div>
  );
};

export default MessageInfoModal;
