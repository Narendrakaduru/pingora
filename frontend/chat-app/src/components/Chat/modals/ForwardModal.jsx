import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Send, Users, Hash } from 'lucide-react';

const USER_API = '/api/auth';

const ForwardModal = ({ 
  isOpen, 
  onClose, 
  onForward, 
  dmPartners, 
  userGroups, 
  user,
  getUser
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredPartners = dmPartners.filter(p => 
    p.username.toLowerCase().includes(search.toLowerCase())
  );
  const filteredGroups = userGroups.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase())
  );

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
          <h3 className="text-xl font-bold tracking-tight">Forward Message</h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-high rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" size={18} />
            <input 
              type="text" 
              placeholder="Search people or groups..." 
              className="w-full bg-surface-high/50 border-none rounded-xl py-2.5 pl-10 pr-4 outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="max-h-[350px] overflow-y-auto space-y-1 pr-1">
             {/* General Chat Option */}
             <button
              onClick={() => onForward('general-chat')}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-low transition-all group"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <Hash size={20} />
              </div>
              <span className="flex-1 text-left text-sm font-bold truncate">General Chat</span>
              <Send size={16} className="text-primary opacity-0 group-hover:opacity-100" />
            </button>

            {filteredGroups.length > 0 && (
              <p className="text-[10px] font-bold text-text-light uppercase tracking-widest px-3 pt-4 pb-2">Groups</p>
            )}
            {filteredGroups.map(g => (
              <button
                key={g._id}
                onClick={() => onForward(g)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-low transition-all group"
              >
                <div className="w-10 h-10 bg-surface-high rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <Users size={20} />
                </div>
                <span className="flex-1 text-left text-sm font-bold truncate">{g.name}</span>
                <Send size={16} className="text-primary opacity-0 group-hover:opacity-100" />
              </button>
            ))}

            {filteredPartners.length > 0 && (
              <p className="text-[10px] font-bold text-text-light uppercase tracking-widest px-3 pt-4 pb-2">Recent Chats</p>
            )}
            {filteredPartners.map(p => {
              const partner = getUser?.(p.username);
              return (
                <button
                  key={p.username}
                  onClick={() => onForward(p.username)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-low transition-all group"
                >
                  {partner?.profilePhoto ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-border/10 shrink-0">
                      <img src={`${USER_API}${partner.profilePhoto}`} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-primary/5 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all font-black text-sm shrink-0">
                      {p.username[0].toUpperCase()}
                    </div>
                  )}
                  <span className="flex-1 text-left text-sm font-bold truncate">
                    {partner?.fullName || (p.username.charAt(0).toUpperCase() + p.username.slice(1))}
                  </span>
                  <Send size={16} className="text-primary opacity-0 group-hover:opacity-100" />
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForwardModal;
