import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Crown, MessageSquare } from 'lucide-react';

const stringToHsl = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 70%, 45%)`;
};

const GroupMembersPanel = ({ group, currentUser, getUser, onClose, onOpenChat }) => {
    if (!group) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[10000] p-6"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-8 pb-6 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <Users size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-text-main">{group.name}</h2>
                            <p className="text-[10px] font-black text-text-light uppercase tracking-[0.2em]">{group.members.length} Members</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 hover:bg-surface-high rounded-full text-text-soft transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Member List */}
                <div className="flex-1 overflow-y-auto px-8 py-2 space-y-1 custom-scrollbar">
                    {group.members.map((member) => (
                        <div 
                            key={member}
                            className="flex items-center justify-between p-4 rounded-2xl hover:bg-surface-low transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div 
                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm overflow-hidden"
                                    style={{ background: stringToHsl(member) }}
                                >
                                    {(() => {
                                        const memberData = getUser(member);
                                        return memberData?.profilePhoto ? (
                                            <img src={`/api/auth${memberData.profilePhoto}`} alt="" className="w-full h-full object-cover" />
                                        ) : member.charAt(0).toUpperCase();
                                    })()}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-text-main group-hover:text-primary transition-colors">
                                        {(() => {
                                            const memberData = getUser(member);
                                            return memberData?.fullName || member;
                                        })()}
                                    </span>
                                    <span className="text-[10px] font-bold text-text-light/40 uppercase tracking-widest">@{member}</span>
                                    {member === group.created_by && (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Crown size={12} className="text-amber-500" />
                                            <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Owner</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {member === currentUser.username && (
                                <span className="px-3 py-1 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest rounded-full">
                                    You
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer Action */}
                <div className="p-8 pt-4">
                    <button 
                        onClick={() => {
                            onOpenChat(group);
                            onClose();
                        }}
                        className="w-full btn-premium py-5 uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-lg shadow-primary/30 active:scale-[0.98]"
                    >
                        <MessageSquare size={18} />
                        Open Group Chat
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default GroupMembersPanel;
