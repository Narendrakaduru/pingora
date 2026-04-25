import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, Users as UsersIcon, Plus, X, ArrowLeft, Loader2, Sparkles, Check, Pencil, Trash2, AlertTriangle, Crown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGroups, deleteGroup } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import GroupSettingsModal from './GroupSettingsModal';
import GroupMembersPanel from './GroupMembersPanel';

const USER_API = `http://${window.location.hostname}:5001`;

// Helper: generate a deterministic HSL color from a string
const stringToHsl = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 55%, 45%)`;
};

const GroupsView = ({ onMessageGroup, getUser }) => {
    const { user } = useAuth();
    const [groups, setGroups] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Members panel state
    const [selectedGroup, setSelectedGroup] = useState(null);

    const openCreateModal = () => {
        setEditingGroup(null);
        setShowCreateModal(true);
    };

    const openEditModal = (group) => {
        setEditingGroup(group);
        setShowCreateModal(true);
    };

    const handleDeleteGroup = async () => {
        if (!showDeleteConfirm) return;
        try {
            setIsDeleting(true);
            await deleteGroup(showDeleteConfirm, user.username);
            setShowDeleteConfirm(null);
            fetchUserGroups();
        } catch (err) {
            console.error("Error deleting group:", err);
            setError("Failed to delete group.");
        } finally {
            setIsDeleting(false);
        }
    };

    const fetchUserGroups = async () => {
        try {
            setLoading(true);
            const data = await getGroups(user.username.toLowerCase());
            setGroups(data);
        } catch (err) {
            console.error("Error fetching groups:", err);
            setError("Failed to load your groups.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserGroups();
    }, [user.username]);

    const filteredGroups = groups.filter(g => 
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 p-4 md:p-12 bg-surface overflow-y-auto w-full h-full text-text-main relative custom-scrollbar">
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-7xl mx-auto space-y-8 md:space-y-12 pb-24"
            >
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 text-primary mb-2">
                            <UsersIcon size={20} />
                            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Active Groups</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-text-main leading-tight">Groups</h2>
                        <p className="text-text-soft text-base md:text-lg font-medium tracking-tight">Join communities or chat with your best friends.</p>
                    </div>
                    <button 
                        onClick={openCreateModal}
                        className="btn-premium w-full md:w-auto px-10 h-14 md:h-16 text-sm tracking-widest uppercase flex items-center justify-center gap-3"
                    >
                        <Plus size={20} />
                        Create Group
                    </button>
                </div>

                {/* Main Filter & Content Area */}
                <section className="space-y-8 md:space-y-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-light" size={20} />
                            <input 
                                type="text" 
                                placeholder="Search groups..." 
                                className="organic-input !pl-14 !h-14"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        
                        <div className="flex items-center gap-4 text-[10px] font-bold text-text-light uppercase tracking-widest px-4 py-2 bg-surface-low rounded-full">
                           <span className="flex h-2 w-2 rounded-full bg-primary" />
                           {filteredGroups.length} Active Groups Found
                        </div>
                    </div>

                    {error && (
                        <div className="p-6 bg-red-50 text-red-700 rounded-xl flex items-center gap-4 border-none shadow-soft">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">!</div>
                            <span className="font-bold tracking-tight">{error}</span>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center items-center h-96">
                            <Loader2 className="animate-spin text-primary opacity-20" size={64} />
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {filteredGroups.length === 0 ? (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-32 rounded-xl bg-surface-low border-none"
                                >
                                    <UsersIcon size={64} className="mx-auto mb-6 text-text-light opacity-20" />
                                    <p className="text-2xl font-bold tracking-tight text-text-soft">
                                        {searchQuery ? 'NO GROUPS FOUND' : 'NO GROUPS YET'}
                                    </p>
                                    <p className="text-sm font-medium mt-2 text-text-light/60 uppercase tracking-widest">
                                        {searchQuery ? 'Try a different search' : 'Create your first group'}
                                    </p>
                                </motion.div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                    {filteredGroups.map((g, idx) => (
                                        <motion.div 
                                            key={g._id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            onClick={() => {
                                                console.log("Selecting group:", g);
                                                setSelectedGroup(g);
                                            }}
                                            whileHover={{ y: -5, scale: 1.01 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="group relative bg-surface-lowest rounded-xl p-5 md:p-8 shadow-soft hover:shadow-xl transition-all duration-500 flex flex-col justify-between h-56 md:h-64 overflow-hidden cursor-pointer z-10"
                                        >
                                            {/* Decorative Pulse Accents */}
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-hover:bg-primary/10 transition-all duration-500 blur-2xl pointer-events-none" />
                                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mb-16 group-hover:bg-primary/10 transition-all duration-500 blur-3xl pointer-events-none" />
                                            
                                            <div className="relative z-20 flex flex-col h-full justify-between">
                                                <div>
                                                    <div className="w-14 h-14 rounded-xl bg-surface-low flex items-center justify-center text-primary font-bold text-xl mb-6 transition-all duration-500 group-hover:bg-primary group-hover:text-white group-hover:shadow-md">
                                                        <UsersIcon size={24} />
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-1">
                                                            <h3 className="font-bold text-xl tracking-tight text-text-main truncate pr-4" title={g.name}>{g.name}</h3>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                                <p className="text-[10px] font-bold text-text-soft uppercase tracking-[0.2em]">
                                                                    {g.members.length} MEMBERS
                                                                </p>
                                                            </div>
                                                        </div>
                                                        
                                                        {g.created_by === user.username && (
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); openEditModal(g); }}
                                                                    className="p-2 bg-surface-low rounded-lg text-text-soft hover:text-primary transition-colors"
                                                                >
                                                                    <Pencil size={14} />
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(g._id); }}
                                                                    className="p-2 bg-surface-low rounded-lg text-text-soft hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-3">
                                                    {/* Stacked member avatars preview */}
                                                    <div className="flex -space-x-2">
                                                        {g.members.slice(0, 4).map((m) => {
                                                            const memberData = getUser(m);
                                                            return (
                                                                <div
                                                                    key={m}
                                                                    className="w-7 h-7 rounded-full ring-2 ring-surface-lowest flex items-center justify-center text-white text-[10px] font-bold uppercase overflow-hidden"
                                                                    style={{ background: stringToHsl(m) }}
                                                                >
                                                                    {memberData?.profilePhoto ? (
                                                                        <img src={`/api/auth${memberData.profilePhoto}`} alt="" className="w-full h-full object-cover" />
                                                                    ) : m.charAt(0)}
                                                                </div>
                                                            );
                                                        })}
                                                        {g.members.length > 4 && (
                                                            <div className="w-7 h-7 rounded-full ring-2 ring-surface-lowest bg-surface-high flex items-center justify-center text-[9px] font-bold text-text-soft">
                                                                +{g.members.length - 4}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <ChevronRight size={14} className="ml-auto text-text-light opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </AnimatePresence>
                    )}
                </section>
            </motion.div>

            {/* ── Group Members Panel ── */}
            <AnimatePresence>
                {selectedGroup && (
                    <GroupMembersPanel 
                        group={selectedGroup}
                        currentUser={user}
                        getUser={getUser}
                        onClose={() => setSelectedGroup(null)}
                        onOpenChat={onMessageGroup}
                    />
                )}
            </AnimatePresence>

            {/* Shared Group Settings Modal */}
            <GroupSettingsModal 
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={fetchUserGroups}
                editingGroup={editingGroup}
                currentUser={user}
                userApiUrl={`${USER_API}/api/auth`}
            />

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-surface/80 backdrop-blur-xl flex items-center justify-center z-[10001] p-6"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-surface-lowest rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50" />
                            <div className="p-8 text-center space-y-6">
                                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                                    <AlertTriangle size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-text-main">Delete Group?</h3>
                                    <p className="text-sm text-text-soft font-medium leading-relaxed">
                                        Are you sure you want to delete this group? This action is permanent and all messages will be lost.
                                    </p>
                                </div>
                                <div className="flex gap-4 pt-2">
                                    <button 
                                        onClick={() => setShowDeleteConfirm(null)}
                                        className="flex-1 h-12 rounded-lg font-bold text-xs uppercase tracking-widest text-text-soft hover:bg-surface-high transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleDeleteGroup}
                                        disabled={isDeleting}
                                        className="flex-1 h-12 rounded-lg font-bold text-xs uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                                    >
                                        {isDeleting && <Loader2 className="animate-spin" size={16} />}
                                        Delete Group
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GroupsView;
