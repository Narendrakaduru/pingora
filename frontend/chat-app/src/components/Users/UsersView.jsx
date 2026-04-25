import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, Mail, User as UserIcon, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
    sendFriendRequest, acceptFriendRequest, rejectFriendRequest,
    getAllFriendships, getAllUsers, unfriendUser
} from '../../services/api';
import ConfirmModal from '../Chat/modals/ConfirmModal';

const USER_API = '/api/auth';

const UsersView = ({ onMessageUser }) => {
    const { user } = useAuth();
    const [allUsers, setAllUsers] = useState([]);
    const [friendships, setFriendships] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: null });

    const fetchData = async () => {
        try {
            // Fetch users
            const usersData = await getAllUsers();
            
            // Fetch friendships
            const friendsData = await getAllFriendships();
            
            if (usersData.success || Array.isArray(usersData)) {
                const usersList = usersData.success ? usersData.users : usersData;
                setAllUsers(usersList.filter(u => u.username !== user.username));
            }

            setFriendships(friendsData.friendships || []);

        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user.username]);

    const [loadingStates, setLoadingStates] = useState({}); // { username: 'sending' | 'accepting' | 'rejecting' }
    const [feedbackMsg, setFeedbackMsg] = useState(null);

    const showFeedback = (msg, type = 'success') => {
        setFeedbackMsg({ msg, type });
        setTimeout(() => setFeedbackMsg(null), 3000);
    };

    const handleSendRequest = async (targetUsername) => {
        setLoadingStates(prev => ({ ...prev, [targetUsername]: 'sending' }));
        try {
            const res = await sendFriendRequest(targetUsername);
            if (res.success) {
                showFeedback(`Friend request sent to ${targetUsername}!`);
                fetchData();
            } else {
                showFeedback(res.message || 'Failed to send request', 'error');
            }
        } catch (err) {
            console.error('sendFriendRequest error:', err);
            showFeedback(err.response?.data?.message || 'Failed to send request. Try again.', 'error');
        } finally {
            setLoadingStates(prev => ({ ...prev, [targetUsername]: null }));
        }
    };

    const handleAcceptRequest = async (friendshipId, username) => {
        setLoadingStates(prev => ({ ...prev, [username]: 'accepting' }));
        try {
            const res = await acceptFriendRequest(friendshipId);
            if (res.success) {
                showFeedback('Friend request accepted!');
                fetchData();
            } else {
                showFeedback(res.message || 'Failed to accept request', 'error');
            }
        } catch (err) {
            console.error('acceptFriendRequest error:', err);
            showFeedback('Failed to accept request. Try again.', 'error');
        } finally {
            setLoadingStates(prev => ({ ...prev, [username]: null }));
        }
    };

    const handleRejectRequest = async (friendshipId, username) => {
        setLoadingStates(prev => ({ ...prev, [username]: 'rejecting' }));
        try {
            const res = await rejectFriendRequest(friendshipId);
            if (res.success) {
                showFeedback('Request rejected.');
                fetchData();
            } else {
                showFeedback(res.message || 'Failed to reject request', 'error');
            }
        } catch (err) {
            console.error('rejectFriendRequest error:', err);
            showFeedback('Failed to reject request. Try again.', 'error');
        } finally {
            setLoadingStates(prev => ({ ...prev, [username]: null }));
        }
    };

    const handleUnfriend = async (friendshipId, username) => {
        setConfirmModal({
            visible: true,
            title: 'Unfriend User',
            message: `Are you sure you want to unfriend ${username}? This will remove them from your contacts.`,
            onConfirm: async () => {
                setLoadingStates(prev => ({ ...prev, [username]: 'unfriending' }));
                try {
                    const res = await unfriendUser(friendshipId);
                    if (res.success) {
                        showFeedback(`Unfriended ${username}.`);
                        fetchData();
                    } else {
                        showFeedback(res.message || 'Failed to unfriend', 'error');
                    }
                } catch (err) {
                    console.error('unfriend error:', err);
                    showFeedback('Failed to unfriend. Try again.', 'error');
                } finally {
                    setLoadingStates(prev => ({ ...prev, [username]: null }));
                }
            }
        });
    };

    const filteredUsers = allUsers.filter(u => 
        (u.username?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
        (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 p-4 md:p-12 bg-surface overflow-y-auto w-full h-full text-text-main custom-scrollbar">
            <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="max-w-7xl mx-auto"
            >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-12">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider mb-2">
                            <ShieldCheck size={12} /> Privacy Guaranteed
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-text-main leading-tight">
                            Connect
                        </h2>
                        <p className="text-text-soft text-base font-medium max-w-md leading-relaxed">
                            Find friends and start chatting instantly. Secure, private, and always connected.
                        </p>
                    </div>

                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-primary transition-colors duration-300" size={20} />
                        <input 
                            type="text" 
                            placeholder="Find by name or email..." 
                            className="w-full h-14 bg-surface-lowest border border-border/50 rounded-2xl pl-12 pr-4 text-sm font-semibold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all duration-300 shadow-sm"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {error && (
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mb-8 p-5 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-3 font-bold text-sm shadow-sm"
                    >
                        <span className="text-lg">⚠️</span> {error}
                    </motion.div>
                )}

                {feedbackMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`mb-4 p-4 rounded-2xl border flex items-center gap-3 font-bold text-sm shadow-sm ${
                            feedbackMsg.type === 'error' 
                                ? 'bg-red-50 text-red-600 border-red-100' 
                                : 'bg-green-50 text-green-700 border-green-100'
                        }`}
                    >
                        <span className="text-lg">{feedbackMsg.type === 'error' ? '❌' : '✅'}</span>
                        {feedbackMsg.msg}
                    </motion.div>
                )}

                {loading ? (
                    <div className="flex flex-col justify-center items-center h-80 gap-4">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full border-4 border-primary/10"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                        </div>
                        <p className="text-xs font-bold text-text-light uppercase tracking-widest animate-pulse">Synchronizing Directory...</p>
                    </div>
                ) : (
                    <>
                        {filteredUsers.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-24 bg-surface-lowest rounded-[40px] border border-dashed border-border/50"
                            >
                                <div className="w-24 h-24 bg-surface-high rounded-full flex items-center justify-center mx-auto mb-8">
                                    <UserIcon size={40} className="text-text-light opacity-40" />
                                </div>
                                <h3 className="text-2xl font-bold text-text-main mb-2">No users found</h3>
                                <p className="text-text-soft font-medium max-w-xs mx-auto">We couldn't find anyone matching "{searchQuery}" in our directory.</p>
                            </motion.div>
                        ) : (
                            <div className="flex flex-col gap-3 max-w-5xl mx-auto">
                                    {filteredUsers.map((u, index) => {
                                        const friendship = friendships.find(f => 
                                            (f.user1Id === u.id || f.user2Id === u.id)
                                        );
                                        const isFriend = friendship?.status === 'accepted';
                                        const isPending = friendship?.status === 'pending';
                                        const iSentRequest = isPending && friendship?.requestSenderId === user.id;

                                        return (
                                            <motion.div 
                                                key={u.id || u.username}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.03 }}
                                                className="group relative bg-surface-lowest border border-border/40 rounded-2xl p-3 md:p-5 transition-all duration-300 flex items-center gap-3 md:gap-6 overflow-hidden"
                                            >
                                                {/* Avatar Column */}
                                                <div className="relative shrink-0">
                                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary font-black text-xl shadow-inner duration-500 overflow-hidden">
                                                        {u.profilePhoto ? (
                                                            <img 
                                                                src={`${USER_API}${u.profilePhoto}`} 
                                                                alt={u.username} 
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            u.username[0].toUpperCase()
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Info Column */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-black text-lg text-text-main truncate transition-colors duration-300">
                                                        {u.username.charAt(0).toUpperCase() + u.username.slice(1)}
                                                    </h3>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <p className="text-[10px] md:text-xs font-bold text-text-light truncate tracking-tight flex items-center gap-1.5">
                                                            <Mail size={12} className="opacity-50" /> {u.email}
                                                        </p>
                                                        {isFriend && (
                                                            <>
                                                                <div className="h-1 w-1 rounded-full bg-border" />
                                                                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1">
                                                                    <ShieldCheck size={10} /> Friend
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Action Column */}
                                                <div className="shrink-0 flex items-center gap-2">
                                                    {isFriend ? (
                                                        <div className="flex gap-1.5 md:gap-2">
                                                            <button 
                                                                onClick={() => onMessageUser(u.username)}
                                                                className="px-3 md:px-6 py-2.5 md:py-3 bg-primary text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary-dark transition-all duration-300 flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.95]"
                                                            >
                                                                <MessageSquare size={14} fill="currentColor" />
                                                                <span className="hidden sm:inline">Message</span>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleUnfriend(friendship.id, u.username)}
                                                                disabled={loadingStates[u.username] === 'unfriending'}
                                                                className="px-3 md:px-6 py-2.5 md:py-3 bg-red-50 text-red-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50 flex items-center shadow-lg shadow-red-500/10"
                                                            >
                                                                {loadingStates[u.username] === 'unfriending' ? '...' : (
                                                                    <>
                                                                        <span className="hidden sm:inline">Unfriend</span>
                                                                        <span className="sm:hidden">Remove</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    ) : isPending ? (
                                                        iSentRequest ? (
                                                            <span className="px-3 py-2 bg-surface-high text-text-soft text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl">
                                                                Sent
                                                            </span>
                                                        ) : (
                                                            <div className="flex gap-1.5 md:gap-2">
                                                                <button 
                                                                    onClick={() => handleAcceptRequest(friendship.id, u.username)}
                                                                    disabled={loadingStates[u.username] === 'accepting'}
                                                                    className="px-3 py-2 bg-green-500 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-green-600 transition-all disabled:opacity-60"
                                                                >
                                                                    {loadingStates[u.username] === 'accepting' ? '...' : 'Accept'}
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleRejectRequest(friendship.id, u.username)}
                                                                    disabled={loadingStates[u.username] === 'rejecting'}
                                                                    className="px-3 py-2 bg-red-500 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-all disabled:opacity-60"
                                                                >
                                                                    {loadingStates[u.username] === 'rejecting' ? '...' : 'Reject'}
                                                                </button>
                                                            </div>
                                                        )
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleSendRequest(u.username)}
                                                            disabled={loadingStates[u.username] === 'sending'}
                                                            className="px-4 md:px-6 py-2.5 md:py-3 border-2 border-primary text-primary text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/5 transition-all duration-300 active:scale-[0.95] disabled:opacity-60 disabled:cursor-not-allowed"
                                                        >
                                                            {loadingStates[u.username] === 'sending' ? '...' : 'Add'}
                                                            <span className="hidden sm:inline ml-1">Friend</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                            </div>
                        )}
                    </>
                )}
            </motion.div>

            <AnimatePresence>
                {confirmModal.visible && (
                    <ConfirmModal 
                        isOpen={confirmModal.visible}
                        onClose={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
                        title={confirmModal.title}
                        message={confirmModal.message}
                        onConfirm={confirmModal.onConfirm}
                        confirmText="Unfriend"
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default UsersView;
