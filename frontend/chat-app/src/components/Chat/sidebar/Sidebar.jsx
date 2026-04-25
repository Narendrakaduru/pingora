import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Plus, Hash, Users, Clock, BellOff, Pin, Home, Calendar, 
  MessageSquare, Archive, Settings, User, LogOut, ChevronDown, Heart,
  MessageCircle, CircleDashed
} from 'lucide-react';
import { TypingIndicatorDots } from '../components/TypingIndicator';
import { getRoomId } from '../../../utils/chatUtils';

const USER_API = '/api/auth';

const Sidebar = ({
  user,
  logout,
  settings,
  activeView,
  setActiveView,
  searchQuery,
  setSearchQuery,
  dmPartners,
  userGroups,
  onlineUsers,
  typingUsers,
  selectedChat,
  setSelectedChat,
  openNewDM,
  showMobileChat,
  setShowMobileChat,
  handleContextMenu,
  getUser,
  searchInputRef,
  onShowGroupInfo,
  onNewList
}) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [showListDropdown, setShowListDropdown] = useState(false);
  const isArchiveView = activeView === 'archive';

  // Collect all unique labels from all chats
  const allLabels = [...new Set([
    ...dmPartners.flatMap(p => p.settings?.labels || []),
    ...userGroups.flatMap(g => g.settings?.labels || [])
  ])];

  const checkUnread = (chat, type) => {
    const lastMsgTime = chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp).getTime() : 0;
    const lastReadTime = chat.settings?.last_read_timestamp ? new Date(chat.settings.last_read_timestamp).getTime() : 0;
    return chat.lastMessage?.username !== user.username && lastMsgTime > lastReadTime;
  };
  
  // Compute counts for chips
  const nonArchivedPartners = dmPartners.filter(p => !p.settings?.is_archived);
  const nonArchivedGroups = userGroups.filter(g => !g.settings?.is_archived);
  const unreadCount = nonArchivedPartners.filter(p => checkUnread(p, 'dm')).length + nonArchivedGroups.filter(g => checkUnread(g, 'group')).length;
  const favouritesCount = nonArchivedPartners.filter(p => p.settings?.is_favourite).length + nonArchivedGroups.filter(g => g.settings?.is_favourite).length;
  const groupsCount = nonArchivedGroups.length;

  const labelColors = {
    'Work': 'bg-blue-500/10 text-blue-600 border-blue-200/50',
    'Family': 'bg-pink-500/10 text-pink-600 border-pink-200/50',
    'Friends': 'bg-green-500/10 text-green-600 border-green-200/50',
    'Important': 'bg-amber-500/10 text-amber-600 border-amber-200/50',
    'Urgent': 'bg-red-500/10 text-red-600 border-red-200/50',
    'Private': 'bg-purple-500/10 text-purple-600 border-purple-200/50'
  };

  const getLabelStyle = (label) => {
    return labelColors[label] || 'bg-primary/10 text-primary border-primary/20';
  };

  const navItems = [
    { id: 'home', icon: Home },
    { id: 'calendar', icon: Calendar },
    { id: 'chat', icon: MessageSquare },
    { id: 'status', icon: CircleDashed },
    { id: 'archive', icon: Archive },
    { id: 'groups', icon: Users },
    { id: 'settings', icon: Settings },
    { id: 'contacts', icon: MessageCircle },
  ];

  const mobileNavItems = [
    { id: 'chat', icon: MessageSquare },
    { id: 'status', icon: CircleDashed },
    { id: 'groups', icon: Users },
    { id: 'contacts', icon: MessageCircle },
    { id: 'settings', icon: Settings },
  ];

  const filteredPartners = dmPartners.filter(p => {
    const searchMatch = (p.username?.toLowerCase() || '').includes(searchQuery?.toLowerCase() || '');
    const blockedList = settings?.privacy?.blockedContacts || [];
    const isBlocked = blockedList.includes(p.username.toLowerCase());
    
    if (!searchMatch || isBlocked) return false;
    if (isArchiveView ? !p.settings?.is_archived : p.settings?.is_archived) return false;

    // Chip Filters
    if (activeFilter === 'unread' && !checkUnread(p, 'dm')) return false;
    if (activeFilter === 'favourites' && !p.settings?.is_favourite) return false;
    if (activeFilter === 'groups') return false; // Hide DMs in Group filter
    if (activeFilter.startsWith('list:') && !(p.settings?.labels || []).includes(activeFilter.replace('list:', ''))) return false;

    return true;
  });

  const filteredGroups = userGroups.filter(g => {
    const searchMatch = (g.name?.toLowerCase() || '').includes(searchQuery?.toLowerCase() || '');
    
    if (!searchMatch) return false;
    if (isArchiveView ? !g.settings?.is_archived : g.settings?.is_archived) return false;

    // Chip Filters
    if (activeFilter === 'unread' && !checkUnread(g, 'group')) return false;
    if (activeFilter === 'favourites' && !g.settings?.is_favourite) return false;
    if (activeFilter.startsWith('list:') && !(g.settings?.labels || []).includes(activeFilter.replace('list:', ''))) return false;

    return true;
  });

  const formatLastMessage = (lastMsg, defaultText) => {
    if (!lastMsg) return defaultText;
    if (lastMsg.is_deleted) return 'Message deleted';
    
    // Handle reaction summaries (both virtual and server-side)
    if ((lastMsg.is_reaction_snippet || lastMsg.type === 'reaction_summary') && lastMsg.text) {
       const isMe = lastMsg.username === user.username;
       // Replace the raw username with "You" or formatted name
       const formattedText = lastMsg.text.replace(new RegExp(`^${lastMsg.username}`, 'i'), isMe ? 'You' : lastMsg.username.charAt(0).toUpperCase() + lastMsg.username.slice(1));
       return formattedText;
    }

    // Handle system messages
    if (lastMsg.type === 'system') return lastMsg.text;

    // Construct the type-based prefix
    let prefix = lastMsg.username === user.username ? 'You: ' : '';
    
    // Check message type for non-text content
    const msgType = lastMsg.message_type || lastMsg.type;
    if (['image', 'photo'].includes(msgType)) return `${prefix}🖼️ Photo`;
    if (msgType === 'video') return `${prefix}🎥 Video`;
    if (msgType === 'audio') return `${prefix}🎵 Voice Message`;
    if (msgType === 'document') return `${prefix}📄 Document`;
    if (msgType === 'poll') return `${prefix}📊 Poll: ${lastMsg.metadata?.question || 'Untitled'}`;
    
    return `${prefix}${lastMsg.text || defaultText}`;
  };

  return (
    <>
      {/* 1a. Slim Nav Sidebar - DESKTOP ONLY */}
      <div className="hidden md:flex w-20 bg-white border-r border-border flex-col items-center py-6 gap-8">
        <button 
          onClick={() => setActiveView('profile')}
          className={`w-12 h-12 rounded-2xl overflow-hidden border-2 transition-all active:scale-95 shadow-sm ${activeView === 'profile' ? 'border-primary shadow-lg shadow-primary/30 rotate-3' : 'border-primary/10 hover:border-primary/30'}`}
        >
          {user.profilePhoto ? (
            <img src={`${USER_API}${user.profilePhoto}`} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center font-bold text-primary text-lg">
              {user.username[0].toUpperCase()}
            </div>
          )}
        </button>

        <div className="w-8 h-[1px] bg-border opacity-50 -my-2" />
        
        <nav className="flex-1 flex flex-col gap-6">
          {navItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => setActiveView(item.id)}
              className={`p-3 rounded-xl transition-all ${activeView === item.id ? 'bg-primary/10 text-primary' : 'text-text-light hover:text-text-soft'}`}
            >
              <item.icon size={24} />
            </button>
          ))}
        </nav>
      </div>

      {/* 1b. Bottom Nav Bar - MOBILE ONLY */}
      {!showMobileChat && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[200] bg-surface-lowest/95 backdrop-blur-xl border-t border-border/50 flex items-center justify-around px-4 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)]">
          {mobileNavItems.map((item) => {
            const isActive = activeView === item.id || (item.id === 'chat' && activeView === 'archive');
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`relative flex flex-col items-center p-3 rounded-2xl transition-all active:scale-90 ${isActive ? 'text-primary bg-primary/5' : 'text-text-light hover:text-text-soft'}`}
              >
                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <motion.div 
                    layoutId="activeNav"
                    className="absolute -top-1 w-1 h-1 bg-primary rounded-full"
                  />
                )}
              </button>
            );
          })}
          
          <button
            onClick={() => setActiveView('profile')}
            className={`flex flex-col items-center p-1 rounded-full transition-all active:scale-90 border-2 ${activeView === 'profile' ? 'border-primary' : 'border-transparent'}`}
          >
            {user.profilePhoto ? (
              <img src={`${USER_API}${user.profilePhoto}`} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${activeView === 'profile' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                {user.username[0].toUpperCase()}
              </div>
            )}
          </button>
        </div>
      )}

      {/* 2. Chat Sidebar (List) */}
      <div className={`${(activeView === 'chat' || activeView === 'archive') ? (showMobileChat ? 'hidden md:flex' : 'flex') : 'hidden'} flex-col w-full md:w-[380px] lg:w-[420px] bg-surface-low border-r border-border relative z-20`}>
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center overflow-hidden">
                <img src="/pingora_logo.png" alt="Logo" className="w-9 h-9 object-contain" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Conversations</h2>
            </div>
            <button 
              onClick={openNewDM}
              className="w-10 h-10 bg-surface-lowest rounded-xl flex items-center justify-center text-text-soft hover:text-primary hover:shadow-soft transition-all duration-300"
            >
              <Plus size={20} />
            </button>
          </div>
      
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" size={18} />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search or start a new chat" 
              className="w-full bg-surface-high/50 border-none rounded-xl py-3 pl-12 pr-4 outline-none focus:bg-surface-lowest focus:shadow-soft transition-all duration-300 text-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {[
                { id: 'all', label: 'All', count: null },
                { id: 'unread', label: 'Unread', count: unreadCount },
                { id: 'favourites', label: 'Favourites', count: favouritesCount },
                { id: 'groups', label: 'Groups', count: groupsCount }
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setActiveFilter(chip.id)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-all shrink-0 border flex items-center gap-2
                  ${activeFilter === chip.id 
                    ? 'bg-green-100 text-green-700 border-green-200 shadow-sm shadow-green-100' 
                    : 'bg-surface-lowest text-text-soft border-border/10 hover:bg-surface-high hover:border-border/30'}`}
                >
                  {chip.label}
                  {chip.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black border
                      ${activeFilter === chip.id ? 'bg-green-600 text-white border-green-700/20' : 'bg-surface-high text-text-soft border-border/10'}`}>
                      {chip.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="relative shrink-0">
              <button 
                onClick={() => setShowListDropdown(!showListDropdown)}
                className={`p-1.5 rounded-full border transition-all ${showListDropdown || activeFilter.startsWith('list:') ? 'bg-green-100 text-green-700 border-green-200' : 'bg-surface-lowest text-text-soft border-border/10 hover:bg-surface-high'}`}
              >
                <ChevronDown size={16} className={`transition-transform ${showListDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showListDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowListDropdown(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-border/10 z-[100] overflow-hidden py-1">
                    {allLabels.map(label => (
                      <button
                        key={label}
                        onClick={() => { setActiveFilter(`list:${label}`); setShowListDropdown(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-all flex items-center gap-2
                          ${activeFilter === `list:${label}` ? 'bg-green-50 text-green-700' : 'text-text-main hover:bg-surface-low'}`}
                      >
                        {label}
                      </button>
                    ))}
                    <div className="border-t border-border/10 mt-1 pt-1">
                      <button
                        onClick={() => { setShowListDropdown(false); onNewList?.(); }}
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 transition-all flex items-center gap-2"
                      >
                        <Plus size={14} />
                        New list
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-[calc(100px+env(safe-area-inset-bottom))] md:pb-4">
          <div className="space-y-1">
            <div 
              onClick={() => setSelectedChat('general-chat')}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer group border border-transparent ${selectedChat === 'general-chat' ? 'bg-surface-lowest shadow-premium border-border/5' : 'hover:bg-surface-high/20 hover:border-border/5'}`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${selectedChat === 'general-chat' ? 'bg-primary text-white shadow-lg shadow-primary/20 rotate-3' : 'bg-surface-high text-primary/70 group-hover:bg-white group-hover:rotate-6'}`}>
                <Hash size={26} />
              </div>
              <div className="flex-1 overflow-hidden">
                <h3 className={`font-black text-[15px] tracking-tight truncate ${selectedChat === 'general-chat' ? 'text-primary' : 'text-text-main'}`}>general-chat</h3>
                {typingUsers['general-chat']?.size > 0 ? (
                  <div className="flex items-center gap-2 text-primary font-bold italic text-xs mt-0.5">
                    <span>Typing</span>
                    <TypingIndicatorDots />
                  </div>
                ) : (
                  <p className="text-[10px] text-text-light font-black uppercase tracking-widest mt-0.5">Public Global Room</p>
                )}
              </div>
            </div>

            {(filteredPartners.length > 0 || filteredGroups.length > 0) && (
              <div className="pt-6 pb-2 px-3">
                <p className="text-[10px] font-bold text-text-light uppercase tracking-[0.2em]">{isArchiveView ? 'Archived' : 'Recent'} Conversations</p>
              </div>
            )}

            {filteredGroups.map((group) => {
              const isSelectedGroup = typeof selectedChat === 'object' && selectedChat._id === group._id;
              const lastMsgTime = group.lastMessage?.timestamp ? new Date(group.lastMessage.timestamp).getTime() : 0;
              const lastReadTime = group.settings?.last_read_timestamp ? new Date(group.settings.last_read_timestamp).getTime() : 0;
              const isUnreadGroup = group.lastMessage?.username !== user.username && lastMsgTime > lastReadTime;

              return (
                <div 
                  key={group._id}
                  onClick={() => { setSelectedChat(group); if (window.innerWidth < 768) setShowMobileChat(true); }}
                  onContextMenu={(e) => handleContextMenu(e, group, 'group')}
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer group border border-transparent ${isSelectedGroup ? 'bg-surface-lowest shadow-premium border-border/5' : 'hover:bg-surface-high/20 hover:border-border/5'}`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold relative transition-all duration-300 group-hover:bg-primary group-hover:text-white">
                    <Users size={26} />
                    {isUnreadGroup && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary border-4 border-surface-low rounded-full animate-pulse shadow-sm" />
                    )}
                    {group.settings?.disappearing_time && group.settings.disappearing_time !== 'off' && (
                      <div className="absolute -top-1 -right-1 bg-primary text-white p-1 rounded-full border-2 border-surface-low shadow-sm">
                        <Clock size={8} />
                      </div>
                    )}
                    {group.settings?.is_favourite && (
                      <div className="absolute -top-1 -left-1 bg-red-500 text-white p-1 rounded-full border-2 border-surface-low shadow-sm">
                        <Heart size={8} fill="currentColor" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className={`font-black text-[15px] tracking-tight truncate ${isSelectedGroup ? 'text-primary' : 'text-text-main'}`}>{group.name}</h3>
                        {group.settings?.labels?.map(label => (
                          <span key={label} className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-lg shrink-0 border ${getLabelStyle(label)}`}>
                            {label}
                          </span>
                        ))}
                      </div>
                      {group.lastMessage?.timestamp && (
                        <span className="text-[9px] font-black text-text-light uppercase tracking-widest shrink-0">
                          {new Date(group.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      {typingUsers[group._id]?.size > 0 ? (
                        <div className="flex items-center gap-2 text-primary font-bold italic text-xs">
                          <span>Typing</span>
                          <TypingIndicatorDots />
                        </div>
                      ) : (
                        <p className={`text-xs truncate font-medium max-w-[85%] ${isUnreadGroup ? 'text-text-main font-bold' : 'text-text-soft'}`}>
                          {formatLastMessage(group.lastMessage, `${group.members.length} participants`)}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {group.settings?.is_muted && <BellOff size={12} className="text-text-light opacity-50" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredPartners.map((p) => {
              const partner = getUser(p.username);
              const isSelected = selectedChat === p.username;
              const lastMsgTime = p.lastMessage?.timestamp ? new Date(p.lastMessage.timestamp).getTime() : 0;
              const lastReadTime = p.settings?.last_read_timestamp ? new Date(p.settings.last_read_timestamp).getTime() : 0;
              const isUnread = p.lastMessage?.username !== user.username && lastMsgTime > lastReadTime;
              const roomId = getRoomId(p.username, user.username);

              return (
                <button
                  key={p.username}
                  onClick={() => { setSelectedChat(p.username); setShowMobileChat(true); }}
                  onContextMenu={(e) => handleContextMenu(e, p, 'dm')}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group border border-transparent ${isSelected ? 'bg-surface-lowest shadow-premium border-border/5' : 'hover:bg-surface-high/20 hover:border-border/5'}`}
                >
                  <div className="relative shrink-0 w-14 h-14">
                    {(() => {
                      const partnerUser = getUser(p.username);
                      const photoPrivacy = partnerUser?.privacy?.profilePhoto || 'everyone';
                      const canSeePhoto = photoPrivacy === 'everyone' || 
                        (photoPrivacy === 'selected' && partnerUser?.privacy?.profilePhotoSelected?.includes(user.username.toLowerCase()));
                      
                      return partner?.profilePhoto && canSeePhoto ? (
                        <div className="w-full h-full rounded-2xl overflow-hidden shadow-sm border border-border/10">
                          <img src={`${USER_API}${partner.profilePhoto}`} alt="" className="w-full h-full object-cover transition-transform duration-500" />
                        </div>
                      ) : (
                        <div className={`w-full h-full rounded-2xl flex items-center justify-center font-black text-xl transition-all duration-300 ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/20 rotate-3' : 'bg-surface-high text-primary/70 group-hover:bg-white group-hover:rotate-6'}`}>
                          {p.username[0].toUpperCase()}
                        </div>
                      );
                    })()}
                    {(() => {
                      const partnerUser = getUser(p.username);
                      const myReciprocity = settings.privacy?.lastSeen !== 'nobody';
                      const targetPrivacy = partnerUser?.privacy || { lastSeen: 'everyone' };
                      const canSeeTarget = targetPrivacy.lastSeen === 'everyone' || 
                        (targetPrivacy.lastSeen === 'selected' && targetPrivacy.lastSeenSelected?.includes(user.username.toLowerCase()));
                      
                      return myReciprocity && canSeeTarget && onlineUsers.has(p.username.toLowerCase());
                    })() && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-4 border-surface-low rounded-full shadow-sm" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className={`font-black text-[15px] tracking-tight truncate ${isSelected ? 'text-primary' : 'text-text-main'}`}>
                          {partner?.fullName || (p.username.charAt(0).toUpperCase() + p.username.slice(1))}
                        </h3>
                        {p.settings?.is_favourite && <Heart size={12} className="text-red-500 shrink-0" fill="currentColor" />}
                        {p.settings?.labels?.map(label => (
                          <span key={label} className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-lg shrink-0 border ${getLabelStyle(label)}`}>
                            {label}
                          </span>
                        ))}
                      </div>
                      {p.lastMessage?.timestamp && (
                        <span className="text-[9px] font-black text-text-light uppercase tracking-widest shrink-0 mt-0.5">
                          {new Date(p.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      {typingUsers[roomId]?.size > 0 ? (
                        <div className="flex items-center gap-2 text-primary font-bold italic text-xs">
                          <span>Typing</span>
                          <TypingIndicatorDots />
                        </div>
                      ) : (
                        <p className={`text-xs truncate font-medium max-w-[85%] ${isUnread ? 'text-text-main font-bold' : 'text-text-soft'}`}>
                          {formatLastMessage(p.lastMessage, 'No messages yet')}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {p.settings?.is_pinned && <Pin size={12} className="text-primary rotate-45" />}
                        {p.settings?.is_muted && <BellOff size={12} className="text-text-light opacity-50" />}
                        {p.settings?.disappearing_time && p.settings.disappearing_time !== 'off' && <Clock size={12} className="text-primary opacity-80" />}
                        {isUnread && (
                          <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse shadow-sm" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
