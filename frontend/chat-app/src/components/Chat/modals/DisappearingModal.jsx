import React from 'react';
import { motion } from 'framer-motion';
import { X, Clock, Check } from 'lucide-react';

const DisappearingModal = ({
  isOpen,
  onClose,
  currentValue,
  onSelect
}) => {
  if (!isOpen) return null;

  const options = [
    { label: 'Off', value: 'off' },
    { label: '24 Hours', value: '24h' },
    { label: '7 Days', value: '7d' },
    { label: '90 Days', value: '90d' },
  ];

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
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/5 rounded-lg text-primary">
               <Clock size={20} />
             </div>
             <h3 className="text-xl font-bold tracking-tight">Disappearing</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-high rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-1">
          <p className="px-4 text-[10px] font-bold text-text-light uppercase tracking-widest mb-4">Set Timer</p>
          {options.map((opt) => {
            const isSelected = String(currentValue).toLowerCase() === String(opt.value).toLowerCase() || 
                             (opt.value === 'off' && (!currentValue || currentValue === 0));
            return (
              <button
                key={opt.value}
                onClick={() => { onSelect(opt.value); onClose(); }}
                className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${isSelected ? 'bg-primary/5 text-primary' : 'hover:bg-surface-low'}`}
              >
                <span className="font-bold text-sm tracking-tight">{opt.label}</span>
                {isSelected && <Check size={18} />}
              </button>
            );
          })}
        </div>

        <div className="p-6 bg-surface-low">
          <p className="text-[11px] text-text-soft font-medium leading-relaxed italic">
            When enabled, messages sent in this chat will disappear after the selected time. Changing this setting will notify other participants.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default DisappearingModal;
