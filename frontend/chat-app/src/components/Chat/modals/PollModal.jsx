import React from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';

const PollModal = ({
  isOpen,
  onClose,
  pollQuestion,
  setPollQuestion,
  pollOptions,
  setPollOptions,
  allowMultiple,
  setAllowMultiple,
  onCreatePoll
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight">Create Poll</h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-high rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-text-light uppercase tracking-widest block mb-2 px-1">Question</label>
            <input 
              type="text" 
              placeholder="What are we deciding?" 
              className="w-full bg-surface-low border border-border/50 rounded-xl py-3 px-4 outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-text-light uppercase tracking-widest block mb-1 px-1">Options</label>
            {pollOptions.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder={`Option ${i + 1}`} 
                  className="flex-1 bg-surface-low border border-border/50 rounded-xl py-2.5 px-4 outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...pollOptions];
                    newOpts[i] = e.target.value;
                    setPollOptions(newOpts);
                  }}
                />
                {pollOptions.length > 2 && (
                  <button 
                    onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                    className="p-2.5 text-text-light hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
            
            <button 
              onClick={() => setPollOptions([...pollOptions, ''])}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 border-dashed border-border hover:border-primary/30 hover:bg-primary/5 text-text-soft hover:text-primary transition-all text-sm font-bold"
            >
              <Plus size={16} />
              <span>Add Option</span>
            </button>
          </div>

          <div className="pt-2">
            <button 
              onClick={() => setAllowMultiple(!allowMultiple)}
              className="w-full flex items-center justify-between p-4 bg-surface-low rounded-2xl border border-border/50 hover:bg-surface-high transition-all group"
            >
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-bold text-text-main group-hover:text-primary transition-colors">Allow multiple answers</span>
                <span className="text-[10px] text-text-light font-medium mt-0.5">Users can select more than one option</span>
              </div>
              <div className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${allowMultiple ? 'bg-primary' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${allowMultiple ? 'left-6' : 'left-1'}`} />
              </div>
            </button>
          </div>
        </div>

        <div className="p-6 bg-surface-low flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 font-bold text-text-soft hover:text-text-main transition-colors text-sm uppercase tracking-widest">Cancel</button>
          <button 
            onClick={onCreatePoll}
            disabled={!pollQuestion || pollOptions.filter(o => o.trim()).length < 2}
            className="flex-1 btn-premium py-3 text-sm tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Poll
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PollModal;
