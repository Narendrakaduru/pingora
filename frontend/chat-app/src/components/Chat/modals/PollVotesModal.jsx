import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users } from 'lucide-react';

const PollVotesModal = ({
  isOpen,
  onClose,
  pollMsg,
  getUser
}) => {
  if (!isOpen || !pollMsg) return null;

  const { options, question } = pollMsg.metadata;
  const USER_API_AUTH = '/api/auth';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        onClick={onClose} 
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="p-6 border-b border-border flex items-center justify-between bg-surface-low/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-text-main">Poll Details</h3>
              <p className="text-[11px] font-bold text-text-light">{options.reduce((s, o) => s + (o.votes?.length || 0), 0)} Total Votes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-surface-high rounded-xl transition-all active:scale-90">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 bg-primary/5 border-b border-primary/10">
            <h4 className="font-bold text-primary text-sm leading-relaxed px-2">
                {question}
            </h4>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {options.map((opt, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="font-bold text-sm text-text-main">{opt.text}</span>
                <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full">
                    {opt.votes?.length || 0}
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {opt.votes && opt.votes.length > 0 ? (
                  opt.votes.map(voter => {
                    const voterData = getUser(voter);
                    return (
                      <div key={voter} className="flex items-center gap-3 p-2 rounded-2xl bg-surface-low border border-border/50 hover:bg-surface-high transition-colors">
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 border-2 border-white shadow-sm">
                          {voterData?.profile_photo ? (
                            <img 
                              src={`${USER_API_AUTH}${voterData.profile_photo}`} 
                              alt={voter} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary text-white text-[10px] font-bold">
                              {voter.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-text-main truncate">{voterData?.fullName || voter}</p>
                          <p className="text-[9px] text-text-soft font-medium">Voted</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-4 text-center">
                    <p className="text-[11px] font-bold text-text-light opacity-50">No votes yet</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 bg-surface-low border-t border-border">
          <button 
            onClick={onClose} 
            className="w-full py-4 bg-text-main text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-black active:scale-95 transition-all"
          >
            Close Details
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PollVotesModal;
