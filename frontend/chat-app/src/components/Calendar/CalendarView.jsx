import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, Clock, Hash, MessageSquare, AlertCircle, CheckCircle2, Copy, Search, User, Users } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getSchedules, createSchedule, updateSchedule, getRooms, getGroups } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CalendarView = ({ onEventCreated }) => {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [schedules, setSchedules] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [groups, setGroups] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Dropdown state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [participantSearch, setParticipantSearch] = useState('');
    const dropdownRef = useRef(null);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: new Date().toLocaleDateString('en-CA'),
        start_time: '12:00',
        end_time: '13:00',
        room_id: 'general-chat',
        participants: []
    });

    const [editingScheduleId, setEditingScheduleId] = useState(null);
    const [showToast, setShowToast] = useState(false);
    const [activeMobileView, setActiveMobileView] = useState('calendar'); // 'calendar' or 'agenda'

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const copyMeetingLink = () => {
        const roomName = (typeof formData.room_id === 'string') ? formData.room_id : 'general-chat';
        const link = `${window.location.origin}/?room=${encodeURIComponent(roomName)}&action=join_meeting`;
        navigator.clipboard.writeText(link);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingScheduleId(null);
        setFormData({
            title: '',
            description: '',
            date: new Date().toLocaleDateString('en-CA'),
            start_time: '12:00',
            end_time: '13:00',
            room_id: 'general-chat',
            participants: []
        });
    };

    const handleEditClick = (s) => {
        if (s.created_by !== user.username) return;
        
        const startDate = new Date(s.start_time);
        const endDate = new Date(s.end_time);
        
        setFormData({
            title: s.title,
            description: s.description || '',
            date: startDate.getFullYear() + '-' + String(startDate.getMonth() + 1).padStart(2, '0') + '-' + String(startDate.getDate()).padStart(2, '0'),
            start_time: startDate.toLocaleTimeString([], {hour12: false, hour: '2-digit', minute: '2-digit'}),
            end_time: endDate.toLocaleTimeString([], {hour12: false, hour: '2-digit', minute: '2-digit'}),
            room_id: s.room_id || 'general-chat',
            participants: s.participants || []
        });
        setEditingScheduleId(s._id);
        setShowModal(true);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [scheds, partners, userGroups, usersRes] = await Promise.all([
                getSchedules(user.username),
                getRooms(user.username),
                getGroups(user.username),
                fetch('/api/auth/users', { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
            ]);
            
            setSchedules(scheds);
            setRooms(partners);
            setGroups(userGroups);
            
            let users = [];
            if (usersRes.success) users = usersRes.users;
            else if (Array.isArray(usersRes)) users = usersRes;
            setAllUsers(users.filter(u => u.username !== user.username));
        } catch (err) {
            console.error("Error fetching calendar data:", err);
            setError("Failed to load calendar data.");
        }
    };

    // Filter participants based on search
    const filteredOptions = {
        general: participantSearch === '' || 'general chat'.includes(participantSearch.toLowerCase()) ? [{ id: 'general-chat', name: 'General Chat', type: 'system' }] : [],
        groups: groups.filter(g => g.name.toLowerCase().includes(participantSearch.toLowerCase())),
        dms: rooms.filter(r => r.username.toLowerCase().includes(participantSearch.toLowerCase())),
        users: allUsers.filter(u => !rooms.some(r => r.username === u.username) && u.username.toLowerCase().includes(participantSearch.toLowerCase()))
    };

    const toggleParticipant = (id, type, roomId = null) => {
        if (type === 'system' || type === 'group' || (type === 'user' && roomId)) {
            // Room-based selection: setting a specific room for the notification
            setFormData({ ...formData, room_id: roomId || id, participants: [] });
        } else {
            // Individual user selection (not from an active chat)
            const isSelected = formData.participants.includes(id);
            const newParticipants = isSelected 
                ? formData.participants.filter(p => p !== id)
                : [...formData.participants, id];
            
            setFormData({ 
                ...formData, 
                participants: newParticipants,
                room_id: '' // No specific chat room yet
            });
        }
    };

    const getSelectionLabel = () => {
        if (formData.room_id === 'general-chat') return 'General Chat';
        if (formData.room_id && formData.room_id !== 'general-chat') {
            const group = groups.find(g => g._id === formData.room_id);
            if (group) return group.name;
            const partner = rooms.find(r => r.room_id === formData.room_id);
            if (partner) return partner.username;
        }
        if (formData.participants.length > 0) {
            return `${formData.participants.length} User${formData.participants.length > 1 ? 's' : ''} Selected`;
        }
        return 'Private Event';
    };

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const renderHeader = () => {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary">
                        <CalendarIcon size={14} />
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Calendar</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-text-main">
                        {monthNames[currentDate.getMonth()]} <span className="text-text-soft font-normal">{currentDate.getFullYear()}</span>
                    </h2>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex bg-surface-lowest rounded-lg p-1 shadow-sm border border-primary/5">
                        <button 
                            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                            className="p-1.5 hover:bg-surface-high rounded transition-all active:scale-90 text-text-soft"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button 
                            onClick={() => setCurrentDate(new Date())}
                            className="px-4 text-[9px] uppercase font-black tracking-widest hover:text-primary transition-colors"
                        >
                            Today
                        </button>
                        <button 
                            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                            className="p-1.5 hover:bg-surface-high rounded transition-all active:scale-90 text-text-soft"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    
                    <button 
                        onClick={() => setShowModal(true)}
                        className="btn-premium h-10 px-6 text-[10px] tracking-widest uppercase flex items-center gap-2"
                    >
                        <Plus size={16} />
                        New Event
                    </button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return (
            <div className="grid grid-cols-7 mb-2 px-1 shrink-0">
                {days.map(day => (
                    <div key={day} className="text-center text-[9px] font-bold text-text-light uppercase tracking-[0.2em] py-1">
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const [selectedDate, setSelectedDate] = useState(new Date());

    const isSameDay = (d1, d2) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    const renderDayTimeline = () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const dayEvents = schedules.filter(s => isSameDay(new Date(s.start_time), selectedDate));
        
        return (
            <div className="flex flex-col h-full bg-surface-lowest rounded-xl shadow-soft border border-primary/5 overflow-hidden">
                <div className="p-4 border-b border-surface-high shrink-0">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-0.5">Agenda</h4>
                    <p className="text-xs font-bold text-text-main">
                        {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 min-h-0">
                    {hours.map(hour => {
                        const hourEvents = dayEvents.filter(e => new Date(e.start_time).getHours() === hour);
                        const isCurrentHour = isSameDay(new Date(), selectedDate) && new Date().getHours() === hour;
                        
                        return (
                            <div key={hour} className="relative pl-10 min-h-[40px]">
                                <div className="absolute left-0 top-0 text-[8px] font-bold text-text-light uppercase tracking-tighter opacity-50">
                                    {String(hour).padStart(2, '0')}:00
                                </div>
                                <div className={`absolute left-8 top-1.5 bottom-0 w-[1.5px] rounded-full ${isCurrentHour ? 'bg-primary' : 'bg-surface-high'}`} />
                                
                                <div className="space-y-1.5 pb-2">
                                    {hourEvents.length > 0 ? (
                                        hourEvents.map(event => (
                                            <motion.div 
                                                key={event._id}
                                                initial={{ opacity: 0, x: 5 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={`p-2 rounded-lg text-[10px] font-bold shadow-sm cursor-pointer transition-all hover:scale-[1.01] ${event.created_by?.toLowerCase() === user.username?.toLowerCase() ? 'bg-primary text-white' : 'bg-primary/5 text-primary border border-primary/20'}`}
                                                onClick={() => event.created_by?.toLowerCase() === user.username?.toLowerCase() && handleEditClick(event)}
                                            >
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className="truncate pr-2">{event.title}</span>
                                                    <Clock size={8} className="opacity-60 shrink-0" />
                                                </div>
                                                <div className="text-[8px] opacity-70 font-medium">
                                                    {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </motion.div>
                                        ))
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderCells = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysCount = daysInMonth(year, month);
        const firstDay = firstDayOfMonth(year, month);
        const today = new Date();
        const cells = [];

        for (let i = 0; i < firstDay; i++) {
            cells.push(<div key={`empty-${i}`} className="bg-surface-low/20 h-full" />);
        }

        for (let d = 1; d <= daysCount; d++) {
            const dateObj = new Date(year, month, d);
            const isToday = isSameDay(today, dateObj);
            const isSelected = isSameDay(selectedDate, dateObj);
            const daySchedules = schedules.filter(s => isSameDay(new Date(s.start_time), dateObj));

            cells.push(
                <div 
                    key={d} 
                    onClick={() => setSelectedDate(dateObj)}
                    className={`p-2 transition-all duration-200 relative group cursor-pointer h-full min-h-0 flex flex-col ${isSelected ? 'ring-1 ring-primary ring-inset bg-primary/5' : isToday ? 'bg-primary/5' : 'bg-surface-lowest hover:bg-surface-low/30'}`}
                >
                    <span className={`text-[11px] font-bold ${isSelected ? 'text-primary' : isToday ? 'text-primary' : 'text-text-soft opacity-60'}`}>{d}</span>
                    <div className="mt-1 space-y-1 flex-1 overflow-y-auto custom-scrollbar-mini pr-0.5">
                        {daySchedules.map(s => (
                            <React.Fragment key={s._id}>
                                <div 
                                     className={`hidden md:block text-[8px] p-1 rounded border shadow-sm font-bold truncate ${s.created_by?.toLowerCase() === user.username?.toLowerCase() ? 'bg-primary text-white border-primary' : 'bg-primary/5 text-primary border-primary/20'}`}
                                     title={s.title}
                                >
                                    {s.title}
                                </div>
                                <div className="md:hidden w-1.5 h-1.5 rounded-full bg-primary mx-auto" />
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            );
        }

        const totalCells = Math.ceil((daysCount + firstDay) / 7) * 7;
        for (let i = cells.length; i < totalCells; i++) {
             cells.push(<div key={`empty-end-${i}`} className="bg-surface-low/20 h-full" />);
        }

        return (
            <div className="flex-1 overflow-hidden rounded-lg shadow-sm border border-primary/5">
                <div className="grid grid-cols-7 gap-[1px] bg-surface-high h-full">
                    {cells}
                </div>
            </div>
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const localStartDateTime = new Date(`${formData.date}T${formData.start_time}`);
            const startTime = localStartDateTime.toISOString();
            
            const localEndDateTime = new Date(`${formData.date}T${formData.end_time}`);
            const endTime = localEndDateTime.toISOString();
            
            const payload = {
                title: formData.title,
                description: formData.description,
                start_time: startTime,
                end_time: endTime,
                room_id: formData.room_id,
                participants: formData.participants,
                created_by: user.username
            };
            
            if (editingScheduleId) {
                await updateSchedule(editingScheduleId, payload);
            } else {
                await createSchedule(payload);
                if (onEventCreated && payload.room_id) {
                    onEventCreated(payload);
                }
            }
            closeModal();
            fetchData();
        } catch (err) {
            console.error("Error creating schedule:", err);
            setError("Failed to create schedule. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 p-4 md:p-8 bg-surface overflow-hidden w-full h-full text-text-main flex flex-col">
            <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-[1600px] mx-auto w-full h-full flex flex-col"
            >
                {/* Compact Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
                    <div className="flex items-center justify-between w-full md:w-auto">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-primary">
                                <CalendarIcon size={14} />
                                <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Calendar</span>
                            </div>
                            <h2 className="text-xl md:text-3xl font-bold tracking-tight text-text-main">
                                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][currentDate.getMonth()]} <span className="text-text-soft font-normal">{currentDate.getFullYear()}</span>
                            </h2>
                        </div>
                        
                        <div className="md:hidden flex bg-surface-lowest rounded-lg p-1 border border-primary/10 shadow-sm">
                            <button 
                                onClick={() => setActiveMobileView('calendar')}
                                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${activeMobileView === 'calendar' ? 'bg-primary text-white shadow-lg' : 'text-text-soft'}`}
                            >
                                Calendar
                            </button>
                            <button 
                                onClick={() => setActiveMobileView('agenda')}
                                className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${activeMobileView === 'agenda' ? 'bg-primary text-white shadow-lg' : 'text-text-soft'}`}
                            >
                                Agenda
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end gap-3">
                        <div className="flex bg-surface-lowest rounded-lg p-1 shadow-sm border border-primary/5">
                            <button 
                                onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                                className="p-1.5 hover:bg-surface-high rounded transition-all active:scale-90 text-text-soft"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button 
                                onClick={() => setCurrentDate(new Date())}
                                className="px-4 text-[9px] uppercase font-black tracking-widest hover:text-primary transition-colors"
                            >
                                Today
                            </button>
                            <button 
                                onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                                className="p-1.5 hover:bg-surface-high rounded transition-all active:scale-90 text-text-soft"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                        
                        <button 
                            onClick={() => setShowModal(true)}
                            className="btn-premium h-10 px-4 md:px-6 text-[9px] md:text-[10px] tracking-widest uppercase flex items-center gap-2"
                        >
                            <Plus size={16} />
                            <span className="hidden sm:inline">New Event</span>
                            <span className="sm:hidden">New</span>
                        </button>
                    </div>
                </div>
                
                {/* Main Body - Split Layout */}
                <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                    <div className={`${activeMobileView === 'calendar' ? 'flex' : 'hidden lg:flex'} lg:w-3/4 flex-col min-h-0`}>
                        <section className="bg-surface-lowest p-2 md:p-4 rounded-xl shadow-soft border border-primary/5 flex flex-col flex-1 min-h-0">
                            {renderDays()}
                            {renderCells()}
                        </section>
                    </div>
                    <div className={`${activeMobileView === 'agenda' ? 'flex' : 'hidden lg:flex'} lg:w-1/4 flex-col min-h-0`}>
                        {renderDayTimeline()}
                    </div>
                </div>
            </motion.div>

            <AnimatePresence>
                {showModal && (
                    <motion.div 
                        className="fixed inset-0 z-50 flex items-center justify-center p-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="absolute inset-0 bg-surface/80 backdrop-blur-xl" onClick={closeModal} />
                        <motion.div 
                            className="bg-surface-lowest rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 max-h-[90vh] flex flex-col"
                            initial={{ scale: 0.95, y: 40, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 40, opacity: 0 }}
                        >
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-primary-container opacity-60" />
                            <div className="p-6 md:p-8 overflow-y-auto">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="w-12 h-12 bg-surface-low rounded-lg flex items-center justify-center text-primary shadow-sm">
                                        <CalendarIcon size={24} />
                                    </div>
                                    <button onClick={closeModal} className="p-2 bg-surface-high/50 rounded-lg text-text-soft hover:text-text-main transition-all active:scale-90">
                                        <X size={20} />
                                    </button>
                                </div>
                                <h3 className="text-2xl font-bold tracking-tight text-text-main mb-8">
                                    {editingScheduleId ? "Edit Event" : "Create Event"}
                                </h3>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-text-light uppercase tracking-widest ml-1">Event Title</label>
                                        <input 
                                            required
                                            type="text" 
                                            placeholder="e.g. Project Sync"
                                            className="organic-input !h-12 text-sm font-bold"
                                            value={formData.title}
                                            onChange={e => setFormData({...formData, title: e.target.value})}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-text-light uppercase tracking-widest ml-1">Participants</label>
                                        <div className="relative group" ref={dropdownRef}>
                                            <div 
                                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                className={`organic-input !h-12 flex items-center cursor-pointer transition-all ${isDropdownOpen ? 'border-primary ring-1 ring-primary/20' : ''}`}
                                            >
                                                <Users className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDropdownOpen ? 'text-primary' : 'text-text-light'}`} size={16} />
                                                <span className={`text-xs ml-8 font-bold ${getSelectionLabel() === 'Private Event' ? 'text-text-light font-medium' : 'text-text-main'}`}>
                                                    {getSelectionLabel()}
                                                </span>
                                            </div>

                                            <AnimatePresence>
                                                {isDropdownOpen && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                                                        className="absolute top-full left-0 w-full mt-2 bg-surface-lowest border border-primary/10 rounded-xl shadow-2xl z-[100] overflow-hidden flex flex-col max-h-[300px]"
                                                    >
                                                        <div className="p-3 border-b border-surface-high bg-surface-lowest sticky top-0">
                                                            <div className="relative">
                                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" size={12} />
                                                                <input 
                                                                    autoFocus
                                                                    type="text"
                                                                    placeholder="Search..."
                                                                    className="w-full h-9 pl-9 pr-4 bg-surface-low rounded-lg text-[11px] font-bold outline-none"
                                                                    value={participantSearch}
                                                                    onChange={(e) => setParticipantSearch(e.target.value)}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                                            {/* Restored dropdown logic */}
                                                            {filteredOptions.general.map(opt => (
                                                                <div key={opt.id} onClick={() => { toggleParticipant(opt.id, 'system'); setIsDropdownOpen(false); }} className={`p-2 rounded-lg flex items-center justify-between cursor-pointer text-[11px] font-bold ${formData.room_id === opt.id ? 'bg-primary text-white' : 'hover:bg-surface-low'}`}>
                                                                    <div className="flex items-center gap-2"><Hash size={14} />{opt.name}</div>
                                                                    {formData.room_id === opt.id && <CheckCircle2 size={12} />}
                                                                </div>
                                                            ))}
                                                            {filteredOptions.groups.map(group => (
                                                                <div key={group._id} onClick={() => { toggleParticipant(group._id, 'group'); setIsDropdownOpen(false); }} className={`p-2 rounded-lg flex items-center justify-between cursor-pointer text-[11px] font-bold ${formData.room_id === group._id ? 'bg-primary text-white' : 'hover:bg-surface-low'}`}>
                                                                    <div className="flex items-center gap-2"><Users size={14} />{group.name}</div>
                                                                    {formData.room_id === group._id && <CheckCircle2 size={12} />}
                                                                </div>
                                                            ))}
                                                            {filteredOptions.dms.map(dm => (
                                                                <div key={dm.room_id} onClick={() => { toggleParticipant(dm.username, 'user', dm.room_id); setIsDropdownOpen(false); }} className={`p-2 rounded-lg flex items-center justify-between cursor-pointer text-[11px] font-bold ${formData.room_id === dm.room_id ? 'bg-primary text-white' : 'hover:bg-surface-low'}`}>
                                                                    <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-surface-high flex items-center justify-center text-[8px]">{dm.username.charAt(0)}</div>{dm.username}</div>
                                                                    {formData.room_id === dm.room_id && <CheckCircle2 size={12} />}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-text-light uppercase tracking-widest ml-1">Date</label>
                                            <DatePicker 
                                                selected={formData.date ? new Date(formData.date + 'T00:00:00') : new Date()}
                                                onChange={date => setFormData({...formData, date: date.toLocaleDateString('en-CA')})}
                                                className="organic-input !h-12 text-xs font-bold w-full"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-text-light uppercase tracking-widest ml-1">Start</label>
                                                <DatePicker 
                                                    selected={new Date(`1970-01-01T${formData.start_time}:00`)}
                                                    onChange={time => setFormData({...formData, start_time: time.toTimeString().slice(0,5)})}
                                                    showTimeSelect showTimeSelectOnly timeIntervals={15} dateFormat="h:mm aa"
                                                    className="organic-input !h-12 text-xs font-bold w-full"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-text-light uppercase tracking-widest ml-1">End</label>
                                                <DatePicker 
                                                    selected={new Date(`1970-01-01T${formData.end_time}:00`)}
                                                    onChange={time => setFormData({...formData, end_time: time.toTimeString().slice(0,5)})}
                                                    showTimeSelect showTimeSelectOnly timeIntervals={15} dateFormat="h:mm aa"
                                                    className="organic-input !h-12 text-xs font-bold w-full"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <button type="submit" disabled={loading} className="w-full h-12 btn-premium tracking-widest uppercase text-xs">
                                        {loading ? 'SAVING...' : 'SAVE EVENT'}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CalendarView;

