import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Users, Clock, Phone, Video, MoreVertical, 
  Trash2, Archive, Pencil, AlertTriangle, Search, Info, 
  CheckSquare, BellOff, Heart, LayoutList, XCircle, 
  ThumbsDown, Ban, MinusCircle, LogOut
} from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';

const USER_API = '/api/auth';

const ChatHeader = ({
  selectedChat,
  user,
  onlineUsers,
  roomSettings,
  lastSeenMap,
  dmPartners,
  getUser,
  showHeaderMenu,
  setShowHeaderMenu,
  initiateCall,
  backToList,
  handleMenuAction,
  setShowDisappearingModal,
  onShowContactInfo,
  onShowGroupInfo,
  isFriend,
  friendship
}) => {
  const { settings } = useSettings();
  const isGeneralChat = selectedChat === 'general-chat';
  const isGroup = !!selectedChat && typeof selectedChat === 'object' && selectedChat._id && !selectedChat.username;
  
  const currentPartner = !isGroup && !isGeneralChat && selectedChat 
    ? (typeof selectedChat === 'object' ? selectedChat : getUser(selectedChat)) 
    : null;
    
  const displayName = isGeneralChat 
    ? 'general-chat' 
    : (isGroup ? selectedChat.name : (currentPartner?.fullName || (typeof selectedChat === 'string' ? (selectedChat.charAt(0).toUpperCase() + selectedChat.slice(1)) : (selectedChat.username || ''))));

  const targetUser = currentPartner;
  
  // Reciprocity: If I hide my status from everyone, I can't see others' status
  const myReciprocity = settings.privacy.lastSeen !== 'nobody';
  
  // Target User's Privacy: Can I see their status?
  const targetPrivacy = targetUser?.privacy || { lastSeen: 'everyone' }; // Default to everyone if not set
  const canSeeTarget = targetPrivacy.lastSeen === 'everyone' || 
    (targetPrivacy.lastSeen === 'selected' && targetPrivacy.lastSeenSelected?.includes(user.username.toLowerCase()));

  const showStatus = myReciprocity && canSeeTarget;
  const isOnline = showStatus && !isGroup && !isGeneralChat && selectedChat && onlineUsers.has(selectedChat.toLowerCase());

  const getStatusText = () => {
    if (isGroup) return 'Group Chat';
    if (isGeneralChat) return 'Public Global Room';
    if (!showStatus || !selectedChat) return null;
    if (isOnline) return 'Online';
    
    const lowerChat = typeof selectedChat === 'string' ? selectedChat.toLowerCase() : null;
    if (!lowerChat) return 'Offline';

    const ts = lastSeenMap[lowerChat] || dmPartners.find(p => p.username.toLowerCase() === lowerChat)?.last_seen;
    if (!ts) return 'Offline';
    
    const d = new Date(ts);
    const isToday = d.toDateString() === new Date().toDateString();
    const tStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Last seen ${isToday ? 'today at ' + tStr : d.toLocaleDateString()}`;
  };

  const targetData = isGroup ? selectedChat : (typeof selectedChat === 'string' ? dmPartners.find(p => p.username.toLowerCase() === selectedChat.toLowerCase()) : null);
  const chatSettings = targetData?.settings || {};

  const menuItems = [
    ...((typeof selectedChat === 'string' || (selectedChat && selectedChat.username)) && !isGeneralChat ? [
      { id: 'contact_info', label: 'Contact info', icon: Info },
      { id: 'search', label: 'Search', icon: Search },
      { id: 'select', label: 'Select messages', icon: CheckSquare },
      { id: 'mute', label: chatSettings.is_muted ? 'Unmute notifications' : 'Mute notifications', icon: BellOff },
      { id: 'disappearing', label: 'Disappearing messages', icon: Clock },
      { id: 'favourite', label: chatSettings.is_favourite ? 'Remove from favourites' : 'Add to favourites', icon: Heart },
      { id: 'change_list', label: 'Change list', icon: LayoutList },
      { id: 'close', label: 'Close chat', icon: XCircle, isHighlighted: true },
      { type: 'divider' },
      { id: 'block', label: 'Block', icon: Ban, color: 'text-red-500' },
      { id: 'clear', label: 'Clear chat', icon: MinusCircle, color: 'text-red-500' },
      { id: 'delete', label: 'Delete chat', icon: Trash2, color: 'text-red-500' },
      ...(isFriend && friendship && !isGroup && !isGeneralChat ? [
        { id: 'unfriend', label: 'Unfriend', icon: XCircle, color: 'text-red-500' }
      ] : [])
    ] : isGroup ? [
      { id: 'group_info', label: 'Group Info', icon: Info },
      { id: 'search', label: 'Search', icon: Search },
      { id: 'select', label: 'Select messages', icon: CheckSquare },
      { id: 'mute', label: chatSettings.is_muted ? 'Unmute notifications' : 'Mute notifications', icon: BellOff },
      { id: 'disappearing', label: 'Disappearing messages', icon: Clock },
      { id: 'favourite', label: chatSettings.is_favourite ? 'Remove from favourites' : 'Add to favourites', icon: Heart },
      { id: 'change_list', label: 'Change list', icon: LayoutList },
      { id: 'edit_group', label: 'Group Settings', icon: Pencil },
      { id: 'archive', label: chatSettings.is_archived ? 'Unarchive Group' : 'Archive Group', icon: Archive },
      { id: 'close', label: 'Close chat', icon: XCircle, isHighlighted: true },
      { type: 'divider' },
      { id: 'clear', label: 'Clear chat', icon: MinusCircle, color: 'text-red-500' },
      { id: 'exit_group', label: 'Exit Group', icon: LogOut, color: 'text-red-500' },
      { id: 'delete_group', label: 'Delete Group', icon: AlertTriangle, color: 'text-red-500' }
    ] : [
      { id: 'clear', label: 'Clear Chat History', icon: Trash2 },
      { id: 'archive', label: 'Archive Conversation', icon: Archive }
    ])
  ];

  return (
    <header className="h-20 md:h-24 bg-surface-low border-b border-border flex items-center justify-between px-4 md:px-8 shrink-0 relative z-50">
      <div 
        className={`flex items-center gap-3 md:gap-5 min-w-0 cursor-pointer hover:opacity-80 transition-opacity`}
        onClick={() => {
          console.log('ChatHeader Clicked. selectedChat:', selectedChat, 'isGroup:', isGroup);
          if (isGroup) {
            onShowGroupInfo(selectedChat);
          } else if (!isGeneralChat) {
            onShowContactInfo(targetUser);
          }
        }}
      >
        <button 
          onClick={(e) => {
            e.stopPropagation();
            backToList();
          }} 
          className="md:hidden p-2 -ml-2 text-text-soft hover:text-primary transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        
        <div className="relative group">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-surface-lowest flex items-center justify-center text-primary font-bold text-xl md:text-2xl transition-all duration-500 shadow-soft border-none overflow-hidden">
            {isGroup ? (
              <Users size={32} />
            ) : (() => {
                const photoPrivacy = targetUser?.privacy?.profilePhoto || 'everyone';
                const canSeePhoto = photoPrivacy === 'everyone' || 
                  (photoPrivacy === 'selected' && targetUser?.privacy?.profilePhotoSelected?.includes(user.username.toLowerCase()));

                return currentPartner?.profilePhoto && canSeePhoto ? (
                  <img src={`${USER_API}${currentPartner.profilePhoto}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/5 flex items-center justify-center">
                    {(typeof selectedChat === 'string' ? selectedChat[0] : (selectedChat?.username?.[0] || selectedChat?.name?.[0] || 'D')).toUpperCase()}
                  </div>
                );
              })()
            }
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xl font-bold tracking-tight text-text-main truncate">
              {displayName}
            </h4>
            {!isGeneralChat && roomSettings?.disappearing_time && roomSettings.disappearing_time !== 'off' && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/5 rounded-full border border-primary/10">
                <Clock size={10} className="text-primary" />
                <span className="text-[9px] font-bold text-primary uppercase tracking-wider">
                  {roomSettings.disappearing_time}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 min-h-[12px]">
            {showStatus && (
              <span className={`flex h-2 w-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-outline-variant'}`}></span>
            )}
            <p className="text-[10px] text-text-soft font-bold tracking-widest">
              {getStatusText()}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {!isGeneralChat && (
          <div className="flex items-center bg-surface-high/30 p-1.5 rounded-xl">
            <button 
              onClick={() => initiateCall('voice')}
              className="p-2.5 rounded-lg transition-all hover:bg-surface-lowest text-text-soft hover:text-primary active:scale-95"
            >
              <Phone size={20} />
            </button>
            <button 
              onClick={() => initiateCall('video')}
              className="p-2.5 rounded-lg transition-all hover:bg-surface-lowest text-text-soft hover:text-primary active:scale-95"
            >
              <Video size={20} />
            </button>
          </div>
        )}
        
        <div className="relative">
          <button 
            onClick={() => setShowHeaderMenu(!showHeaderMenu)}
            className={`p-2.5 rounded-xl transition-all ${showHeaderMenu ? 'bg-surface-high text-primary' : 'hover:bg-surface-high text-text-soft'} active:scale-95`}
          >
            <MoreVertical size={22} />
          </button>

          <AnimatePresence>
            {showHeaderMenu && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setShowHeaderMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-72 bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-border/5 z-[70] overflow-hidden"
                >
                  <div className="px-6 py-5 border-b border-border/10">
                    <p className="text-[10px] font-black text-text-light uppercase tracking-[0.2em] mb-1">Menu Actions</p>
                    <p className="text-lg font-black text-text-main truncate leading-tight">{displayName}</p>
                  </div>
                  
                  <div className="max-h-[60vh] overflow-y-auto custom-scrollbar py-2">
                    {menuItems.map((item, i) => item.type === 'divider' ? (
                      <div key={i} className="my-2 border-t border-border/10" />
                    ) : (
                      <button
                        key={item.id}
                        onClick={() => { 
                          setShowHeaderMenu(false); 
                          if (item.id === 'group_info') {
                            onShowGroupInfo(selectedChat);
                          } else {
                            handleMenuAction(item.id); 
                          }
                        }}
                        className={`w-full flex items-center gap-4 px-6 py-3.5 transition-all text-left group ${item.isHighlighted ? 'bg-slate-50' : 'hover:bg-slate-50'} ${item.color || 'text-text-main'}`}
                      >
                        <item.icon size={20} className={`${item.color ? '' : 'text-text-soft'} group-hover:scale-110 transition-transform`} />
                        <span className="text-[13px] font-bold tracking-tight">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default ChatHeader;
