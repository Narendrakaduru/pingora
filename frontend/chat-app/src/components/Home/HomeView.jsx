import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MessageSquare, Users, Clock, ArrowRight, Hash, User, Sparkles, Activity } from 'lucide-react';
import { getSchedules, getGroups } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const HomeView = ({ onNavigate }) => {
    const { user } = useAuth();
    const [upcomingSchedules, setUpcomingSchedules] = useState([]);
    const [userGroups, setUserGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [scheds, groups] = await Promise.all([
                    getSchedules(user.username),
                    getGroups(user.username)
                ]);
                
                const now = new Date();
                const upcoming = scheds
                    .filter(s => new Date(s.start_time) > now)
                    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                    .slice(0, 5);
                setUpcomingSchedules(upcoming);
                setUserGroups(groups.slice(0, 4));
            } catch (err) {
                console.error("Error fetching home data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user.username]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const quickActions = [
        { id: 'chat', icon: MessageSquare, label: 'Chat', desc: 'Message your contacts', color: 'bg-primary' },
        { id: 'calendar', icon: Calendar, label: 'Calendar', desc: 'Plan your next hangout', color: 'bg-primary-container text-primary' },
        { id: 'groups', icon: Users, label: 'Groups', desc: 'Chat in communities', color: 'bg-surface-high text-primary' },
    ];

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        if (d.toDateString() === today.toDateString()) return 'Today';
        if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
        return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    };

    return (
        <div className="flex-1 p-6 md:p-12 bg-surface overflow-y-auto w-full h-full text-text-main shadow-inner">
            <motion.div 
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-6xl mx-auto space-y-16 pb-24"
            >
                {/* Hero Header: Pingora Banner */}
                <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary-dark p-8 md:p-16 text-white shadow-soft">
                    {/* Abstract Shapes */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/5 rounded-full -ml-32 -mb-32 blur-2xl pointer-events-none" />
                    
                    <motion.div 
                        initial={{ opacity: 0, x: -30 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="relative z-10 space-y-4"
                    >
                        <div className="flex items-center gap-3 text-white/60 mb-2">
                           <Activity size={18} />
                           <span className="text-[10px] font-bold uppercase tracking-[0.4em]">{getGreeting()}</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-none">
                            Welcome, <span className="opacity-80">{user.username}</span>
                        </h1>
                        <p className="text-white/70 text-lg md:text-xl font-medium max-w-xl leading-relaxed">
                            Welcome back. Your messages and schedule are up to date and ready for you.
                        </p>
                    </motion.div>
                </section>

                {/* Grid Layout for Home Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                    {/* Left Column: Actions & Groups */}
                    <div className="lg:col-span-2 space-y-16">
                        {/* Quick Actions */}
                        <section className="space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="w-1.5 h-6 bg-primary rounded-full opacity-60" />
                                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-text-soft">Quick Actions</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                                {quickActions.map((action, idx) => (
                                    <motion.button
                                        key={action.id}
                                        onClick={() => onNavigate(action.id)}
                                        whileHover={{ y: -8, scale: 1.02 }}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 * idx, duration: 0.4 }}
                                        className="group bg-surface-lowest rounded-xl p-8 text-left shadow-soft hover:shadow-xl transition-all duration-500 overflow-hidden relative"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                           <action.icon size={80} />
                                        </div>
                                        <div className={`w-14 h-14 ${action.color} rounded-xl flex items-center justify-center mb-6 shadow-sm transition-transform duration-500 group-hover:rotate-12`}>
                                            <action.icon size={28} />
                                        </div>
                                        <h3 className="font-bold text-xl tracking-tight mb-1">{action.label}</h3>
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-text-light opacity-60">{action.desc}</p>
                                    </motion.button>
                                ))}
                            </div>
                        </section>

                        {/* Clusters (Groups) */}
                        <section className="space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-6 bg-primary rounded-full opacity-60" />
                                    <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-text-soft">Your Groups</h2>
                                </div>
                                <button onClick={() => onNavigate('groups')} className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary-dark transition-colors">View All</button>
                            </div>

                            {loading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    {[1, 2].map(i => <div key={i} className="h-28 bg-surface-low rounded-xl animate-pulse" />)}
                                </div>
                            ) : userGroups.length === 0 ? (
                                <div className="bg-surface-lowest rounded-xl p-12 text-center text-text-light shadow-soft">
                                    <Users size={48} className="mx-auto mb-4 opacity-10" />
                                    <p className="text-sm font-bold uppercase tracking-widest">No Active Groups</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    {userGroups.map((group, idx) => (
                                        <motion.div
                                            key={group._id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.2 + (0.1 * idx) }}
                                            className="bg-surface-lowest rounded-xl p-6 hover:shadow-xl transition-all duration-500 cursor-pointer group flex items-center gap-6"
                                            onClick={() => onNavigate('groups')}
                                        >
                                            <div className="w-14 h-14 bg-surface-low rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                                <Users size={24} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-lg tracking-tight truncate">{group.name}</h4>
                                                <p className="text-[10px] font-bold text-text-light uppercase tracking-widest">{group.members.length} Members</p>
                                            </div>
                                            <ArrowRight size={20} className="text-text-light opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-500" />
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right Column: Timeline (Schedules) */}
                    <aside className="space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-1.5 h-6 bg-primary rounded-full opacity-60" />
                            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-text-soft">Upcoming Events</h2>
                        </div>

                        <div className="bg-surface-lowest rounded-xl overflow-hidden shadow-soft p-1">
                            {loading ? (
                                <div className="space-y-4 p-6">
                                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-surface-low rounded-lg animate-pulse" />)}
                                </div>
                            ) : upcomingSchedules.length === 0 ? (
                                <div className="text-center py-20 text-text-light bg-surface-lowest">
                                    <Calendar size={48} className="mx-auto mb-4 opacity-10" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">No upcoming events</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {upcomingSchedules.map((sched, idx) => (
                                        <motion.div 
                                            key={sched._id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.4 + (0.05 * idx) }}
                                            className="flex items-start gap-5 p-6 hover:bg-surface-low transition-colors rounded-lg group"
                                        >
                                            <div className="w-14 h-14 bg-surface-low flex flex-col items-center justify-center rounded-xl group-hover:bg-white transition-all duration-300 border border-text-light/5 px-1 shadow-sm">
                                               <span className="text-[8px] font-black uppercase text-primary/70 tracking-tighter leading-none mb-1">{formatDate(sched.start_time).split(',')[0]}</span>
                                               <span className="text-sm font-black text-text-main leading-none">{new Date(sched.start_time).getDate()}</span>
                                            </div>
                                            <div className="flex-1 min-w-0 pt-1">
                                                <h4 className="font-bold text-sm tracking-tight truncate pr-2" title={sched.title}>{sched.title}</h4>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                   <Clock size={12} className="text-primary/40" />
                                                   <p className="text-[10px] font-bold text-text-light uppercase tracking-widest">
                                                       {new Date(sched.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                   </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                    <button 
                                        onClick={() => onNavigate('calendar')}
                                        className="w-full p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-primary hover:bg-primary/5 transition-all text-center border-t border-text-light/5"
                                    >
                                        Open Calendar
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* User Micro-Card */}
                        <div className="bg-surface-lowest rounded-xl p-6 shadow-soft flex items-center gap-5 border border-primary/5">
                           <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {user.username.charAt(0).toUpperCase()}
                           </div>
                           <div className="flex-1">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-text-light opacity-60 line-height-none">Active Account</p>
                              <h4 className="font-bold text-sm tracking-tight">@{user.username}</h4>
                           </div>
                           <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        </div>
                    </aside>
                </div>
            </motion.div>
        </div>
    );
};

export default HomeView;
