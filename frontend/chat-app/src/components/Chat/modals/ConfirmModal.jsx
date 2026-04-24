import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({
  isOpen,
  onClose,
  title,
  message,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger' // 'danger' | 'info'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
        <div className="p-6 text-center">
          <div className={`w-16 h-16 ${type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-primary/5 text-primary'} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
            {type === 'danger' ? <AlertTriangle size={32} /> : <X size={32} />}
          </div>
          <h3 className="text-xl font-bold tracking-tight mb-2">{title}</h3>
          <p className="text-sm text-text-soft leading-relaxed font-medium">
            {message}
          </p>
        </div>

        <div className="p-4 bg-surface-low flex gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 py-3 font-bold text-text-soft hover:text-text-main transition-colors text-xs uppercase tracking-widest"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-soft active:scale-95 transition-all text-white ${type === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary-dark'}`}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ConfirmModal;
