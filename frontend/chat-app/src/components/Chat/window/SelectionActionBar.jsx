import React from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Star, Trash2, Forward, Download } from 'lucide-react';

const SelectionActionBar = ({ 
  selectedMessages, 
  onClose, 
  onBulkCopy, 
  onBulkStar, 
  onBulkDelete, 
  onBulkForward,
  onBulkDownload 
}) => {
  const count = selectedMessages.length;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="p-4 md:p-8 bg-surface border-t border-border/10 flex items-center justify-between"
    >
      <div className="flex items-center gap-6">
        <button 
          onClick={onClose}
          className="p-3 text-text-soft hover:bg-surface-high rounded-xl transition-all active:scale-90"
        >
          <X size={24} />
        </button>
        <span className="text-xl font-bold text-text-main">
          {count} selected
        </span>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button 
          onClick={onBulkCopy}
          className="p-3 text-text-soft hover:bg-surface-high rounded-xl transition-all active:scale-95 group"
          title="Copy"
        >
          <Copy size={24} className="group-hover:scale-110 transition-transform" />
        </button>
        <button 
          onClick={onBulkStar}
          className="p-3 text-text-soft hover:bg-surface-high rounded-xl transition-all active:scale-95 group"
          title="Star"
        >
          <Star size={24} className="group-hover:scale-110 group-hover:text-yellow-500 transition-all" />
        </button>
        <button 
          onClick={onBulkDelete}
          className="p-3 text-text-soft hover:bg-red-50 rounded-xl transition-all active:scale-95 group"
          title="Delete"
        >
          <Trash2 size={24} className="group-hover:scale-110 group-hover:text-red-500 transition-all" />
        </button>
        <button 
          onClick={onBulkForward}
          className="p-3 text-text-soft hover:bg-surface-high rounded-xl transition-all active:scale-95 group"
          title="Forward"
        >
          <Forward size={24} className="group-hover:scale-110 transition-transform" />
        </button>
        <button 
          onClick={onBulkDownload}
          className="p-3 text-text-soft hover:bg-surface-high rounded-xl transition-all active:scale-95 group"
          title="Download"
        >
          <Download size={24} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
};

export default SelectionActionBar;
