import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Archive, BellOff, Pin, MessageSquareText, Heart, List, 
  UserX, Eraser, Trash2, Bell, PinOff, ArchiveRestore
} from 'lucide-react';

const ChatContextMenu = ({ 
  x, y, visible, onClose, chat, type, onAction, user 
}) => {
  if (!visible || !chat) return null;

  const isDM = type === 'dm';
  const settings = chat.settings || {};
  
  const menuItems = [
    { 
      id: 'archive', 
      label: settings.is_archived ? 'Unarchive chat' : 'Archive chat', 
      icon: settings.is_archived ? ArchiveRestore : Archive 
    },
    { 
      id: 'mute', 
      label: settings.is_muted ? 'Unmute notifications' : 'Mute notifications', 
      icon: settings.is_muted ? Bell : BellOff 
    },
    { 
      id: 'pin', 
      label: settings.is_pinned ? 'Unpin chat' : 'Pin chat', 
      icon: settings.is_pinned ? PinOff : Pin 
    },
    { 
      id: 'unread', 
      label: 'Mark as unread', 
      icon: MessageSquareText 
    },
    { id: 'divider-1', isDivider: true },
    { 
      id: 'favourite', 
      label: settings.is_favourite ? 'Remove from favourites' : 'Add to favourites', 
      icon: Heart 
    },
    { id: 'list', label: 'Add to list', icon: List },
    { id: 'divider-2', isDivider: true },
  ];

  if (isDM) {
    menuItems.push({ id: 'block', label: 'Block', icon: UserX, variant: 'danger' });
  }

  menuItems.push(
    { id: 'clear', label: 'Clear chat', icon: Eraser, variant: 'danger' },
    { id: 'delete', label: type === 'group' ? 'Delete group' : 'Delete chat', icon: Trash2, variant: 'danger' }
  );

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[100]" 
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        style={{ top: y, left: x }}
        className="fixed z-[101] min-w-[220px] bg-surface-lowest rounded-2xl shadow-premium border border-border/10 py-2 overflow-hidden"
      >
        {menuItems.map((item, index) => {
          if (item.isDivider) {
            return <div key={`divider-${index}`} className="my-1 border-t border-border/50" />;
          }

          const isDanger = item.variant === 'danger';

          return (
            <button
              key={item.id}
              disabled={item.disabled}
              onClick={(e) => {
                e.stopPropagation();
                if (!item.disabled) onAction(item.id, chat, type);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-all text-left
                ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface-high'}
                ${isDanger ? 'text-red-500 hover:bg-red-50' : 'text-text-main'}
              `}
            >
              <item.icon size={18} className={isDanger ? 'text-red-500' : 'text-text-soft'} />
              <span className="flex-1">{item.label}</span>
            </button>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
};

export default ChatContextMenu;
