import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, Check, Users as UsersIcon } from 'lucide-react';
import { createGroup, updateGroup } from '../../services/api';

const GroupSettingsModal = ({ 
    isOpen, 
    onClose, 
    onSuccess, 
    editingGroup = null, 
    currentUser,
    userApiUrl // e.g. http://localhost:5001
}) => {
    const [groupName, setGroupName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchAllUsers();
            if (editingGroup) {
                setGroupName(editingGroup.name);
                // Exclude current user from selection list as they are always included anyway
                setSelectedUsers(editingGroup.members.filter(u => u !== currentUser.username));
            } else {
                setGroupName('');
                setSelectedUsers([]);
            }
        }
    }, [isOpen, editingGroup]);

    const fetchAllUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${userApiUrl}/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                // Filter out current user from potential selections
                setAllUsers(data.users.filter(u => u.username !== currentUser.username));
            }
        } catch (err) {
            console.error("Error fetching users:", err);
            setError("Failed to load users");
        }
    };

    const toggleUserSelection = (username) => {
        setSelectedUsers(prev => 
            prev.includes(username) 
                ? prev.filter(u => u !== username) 
                : [...prev, username]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!groupName.trim()) return;
        
        setIsProcessing(true);
        setError(null);

        try {
            const payload = {
                name: groupName.trim(),
                members: [currentUser.username, ...selectedUsers]
            };
            
            if (editingGroup) {
                await updateGroup(editingGroup._id, payload, currentUser.username);
            } else {
                await createGroup({ ...payload, created_by: currentUser.username });
            }
            
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Group action failed:", err);
            setError(`Failed to ${editingGroup ? 'update' : 'create'} group`);
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredAllUsers = allUsers.filter(u => 
        u.username.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-surface/80 backdrop-blur-xl flex items-center justify-center z-[10001] p-6"
                >
                    <motion.form 
                        initial={{ scale: 0.95, y: 40, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.95, y: 40, opacity: 0 }}
                        onSubmit={handleSubmit}
                        className="bg-surface-lowest rounded-xl shadow-xl w-full max-w-2xl overflow-hidden relative"
                    >
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-primary-container opacity-60" />
                        
                        <div className="p-10 pb-0 flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-3xl font-bold tracking-tight text-text-main">
                                    {editingGroup ? 'Edit Group Settings' : 'New Group Settings'}
                                </h3>
                                <p className="text-xs font-bold text-text-soft uppercase tracking-widest">
                                    {editingGroup ? 'Update your group configuration' : 'Configure your group details'}
                                </p>
                            </div>
                            <button type="button" onClick={onClose} className="p-3 bg-surface-high/50 rounded-xl text-text-soft hover:text-text-main transition-all active:scale-90">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-10 space-y-10">
                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-lg text-xs font-bold uppercase tracking-widest">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-text-light uppercase tracking-[0.2em] ml-1">Group Name</label>
                                <input 
                                    type="text" 
                                    autoFocus
                                    required
                                    placeholder="Enter group name..." 
                                    className="organic-input !h-14 font-bold"
                                    value={groupName}
                                    onChange={e => setGroupName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[11px] font-bold text-text-light uppercase tracking-[0.2em]">Add Members</label>
                                    <span className="text-[10px] font-bold text-primary bg-primary/5 px-3 py-1 rounded-full uppercase tracking-widest">
                                        {selectedUsers.length} Selected
                                    </span>
                                </div>
                                
                                <div className="relative group/search">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within/search:text-primary transition-colors" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Search users..." 
                                        className="w-full h-11 bg-surface-low border border-border/50 rounded-xl pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        value={memberSearchQuery}
                                        onChange={e => setMemberSearchQuery(e.target.value)}
                                    />
                                </div>

                                <div className="bg-surface-low rounded-xl h-64 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                                    {filteredAllUsers.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full opacity-20 py-10">
                                            <UsersIcon size={32} className="mb-2" />
                                            <p className="text-[10px] uppercase font-bold tracking-tighter">No users found</p>
                                        </div>
                                    ) : (
                                        filteredAllUsers.map(u => (
                                            <label 
                                                key={u.id || u.username} 
                                                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-300 ${selectedUsers.includes(u.username) ? 'bg-surface-lowest shadow-soft ring-1 ring-primary/20' : 'hover:bg-surface-high/50'}`}
                                            >
                                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200 shadow-sm ${selectedUsers.includes(u.username) ? 'bg-primary border-primary text-white scale-110' : 'bg-white border-slate-300 hover:border-primary/50'}`}>
                                                    {selectedUsers.includes(u.username) && <Check size={12} strokeWidth={4} />}
                                                </div>
                                                <input 
                                                    type="checkbox" 
                                                    className="hidden"
                                                    checked={selectedUsers.includes(u.username)}
                                                    onChange={() => toggleUserSelection(u.username)}
                                                />
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold overflow-hidden shadow-inner">
                                                    {u.profilePhoto ? (
                                                        <img src={`${userApiUrl}${u.profilePhoto}`} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        u.username[0].toUpperCase()
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className={`font-bold text-sm tracking-tight truncate ${selectedUsers.includes(u.username) ? 'text-primary' : 'text-text-main'}`}>
                                                            {u.fullName || u.username}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-text-light/40 uppercase tracking-widest truncate ml-2">@{u.username}</span>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-text-light/60 uppercase tracking-widest truncate">{u.email}</p>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-10 pt-0 flex flex-col md:flex-row justify-end gap-6">
                            <button 
                                type="button" 
                                onClick={onClose}
                                className="px-8 h-14 text-text-soft font-bold uppercase tracking-widest text-xs hover:text-text-main transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={!groupName.trim() || isProcessing}
                                className="btn-premium px-10 h-14 text-xs tracking-widest uppercase flex items-center gap-4 disabled:opacity-40"
                            >
                                {isProcessing && <Loader2 className="animate-spin" size={18} />}
                                {editingGroup ? 'Save Changes' : 'Create Group'}
                            </button>
                        </div>
                    </motion.form>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GroupSettingsModal;
