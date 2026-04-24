import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';

const ListSelectModal = ({ isOpen, onClose, currentLists, onSelect, allLabels = [] }) => {
  const [customList, setCustomList] = useState('');
  const activeLabel = currentLists && currentLists.length > 0 ? currentLists[0] : null;

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (customList.trim()) {
      onSelect(customList.trim());
      setCustomList('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative z-10"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-text-main">Select List</h2>
            <p className="text-xs text-text-light font-medium mt-1">Chat can have one list at a time</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-light hover:bg-surface-low rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onSelect(null)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${!activeLabel ? 'bg-primary text-white border-primary shadow-md' : 'bg-surface-low text-text-soft border-border/10 hover:bg-surface-high'}`}
              >
                None
              </button>
              {allLabels.map(list => (
                <button
                  key={list}
                  onClick={() => onSelect(list)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border flex items-center gap-2
                    ${activeLabel === list 
                      ? 'bg-primary text-white border-primary shadow-md' 
                      : 'bg-surface-low text-text-main hover:bg-primary/10 hover:text-primary border-border/10'}`}
                >
                  {list}
                  {activeLabel === list && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <p className="text-[10px] font-black tracking-widest text-text-light uppercase mb-3">Custom List</p>
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="Type a new list name..."
                value={customList}
                onChange={(e) => setCustomList(e.target.value)}
                className="w-full bg-surface-lowest border border-border/50 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium pr-12"
              />
              <button
                type="submit"
                disabled={!customList.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-lg disabled:opacity-50 transition-all hover:bg-primary-dark shadow-sm"
              >
                <Check size={16} />
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ListSelectModal;
