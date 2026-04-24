import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Info, CornerUpLeft, Copy, Forward, 
  Pin, Star, CheckSquare, Trash2, Pencil
} from 'lucide-react';

const MessageContextMenu = ({ 
  x, y, msg, onClose, onAction, user 
}) => {
  const menuRef = useRef(null);
  const isMe = msg?.username === user?.username;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  // Adjust position if menu goes off screen
  const menuWidth = 220;
  const menuHeight = 400;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 20);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 20);

  const menuItems = [
    { id: 'info', label: 'Message info', icon: Info },
    { id: 'reply', label: 'Reply', icon: CornerUpLeft },
    { id: 'copy', label: 'Copy', icon: Copy },
    { id: 'forward', label: 'Forward', icon: Forward },
  ];

  // Add Edit if it's mine and < 5 mins old
  if (isMe) {
    const msgTime = new Date(msg.timestamp || Date.now());
    const diff = (new Date() - msgTime) / 1000;
    if (diff <= 300) {
      // Find index of 'copy' to insert Edit nearby
      const copyIdx = menuItems.findIndex(i => i.id === 'copy');
      menuItems.splice(copyIdx, 0, { id: 'edit', label: 'Edit', icon: Pencil });
    }
  }

  const isPinned = msg.is_pinned;
  const isStarred = msg.stars?.includes(user?.username);

  menuItems.push(
    { id: 'pin', label: isPinned ? 'Unpin' : 'Pin', icon: Pin },
    { id: 'star', label: isStarred ? 'Unstar' : 'Star', icon: Star },
    { id: 'divider', isDivider: true },
    { id: 'select', label: 'Select', icon: CheckSquare },
    { id: 'divider', isDivider: true },
    { id: 'delete', label: 'Delete', icon: Trash2, isDanger: true }
  );

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1, ease: "easeOut" }}
      style={{ left: adjustedX, top: adjustedY }}
      className="fixed z-[1000] w-[220px] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border/10 overflow-hidden py-2"
    >
      {menuItems.map((item, idx) => (
        item.isDivider ? (
          <div key={`div-${idx}`} className="h-[1px] bg-border/40 my-1 mx-3" />
        ) : (
          <button
            key={item.id}
            onClick={() => {
              onAction(item.id, msg);
              onClose();
            }}
            className={`w-full flex items-center gap-4 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-low text-left ${item.isDanger ? 'text-red-500 hover:bg-red-50' : 'text-text-main'}`}
          >
            <item.icon size={18} className={item.isDanger ? 'text-red-500' : 'text-text-soft'} />
            <span>{item.label}</span>
          </button>
        )
      ))}
    </motion.div>
  );
};

export default MessageContextMenu;
