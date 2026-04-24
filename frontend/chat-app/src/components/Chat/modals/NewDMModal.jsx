import React from 'react';
import { motion } from 'framer-motion';
import { X, Search, User } from 'lucide-react';

const NewDMModal = ({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  allUsers,
  onStartDM,
  user,
  newDMMode
}) => {
  if (!isOpen) return null;

  const filteredUsers = allUsers.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) && 
    u.username.toLowerCase() !== user.username.toLowerCase()
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
          <h3 className="text-xl font-bold tracking-tight">
            {newDMMode === 'call' ? 'Start Audio Call' : 'Direct Message'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-high rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" size={18} />
            <input 
              type="text" 
              placeholder="Search people..." 
              className="w-full bg-surface-low border border-border/50 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-1">
            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-bold text-text-light uppercase tracking-widest">No people found</p>
              </div>
            ) : (
              filteredUsers.map((u) => (
                <button
                  key={u.username}
                  onClick={() => onStartDM(u.username)}
                  className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-surface-low transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all font-bold text-lg shadow-sm">
                    {u.profilePhoto ? (
                       <img src={`/api/auth${u.profilePhoto}`} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : u.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-text-main tracking-tight group-hover:text-primary transition-colors">{u.fullName || u.username}</p>
                    <p className="text-[10px] text-text-light font-black uppercase tracking-widest mt-0.5">@{u.username}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NewDMModal;
