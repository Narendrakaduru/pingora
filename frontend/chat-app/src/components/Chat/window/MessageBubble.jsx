import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../../../context/SettingsContext';
import { 
  Calendar, FileText, Download, BarChart3, PhoneMissed, 
  PhoneOutgoing, PhoneIncoming, CornerUpLeft, Check, 
  CheckCheck, Star, Pin, Clock, Smile, Plus, Pencil, CornerUpRight,
  Video, Circle, CheckCircle2
} from 'lucide-react';
import { VoicePlayer } from '../components/VoicePlayer';
import EmojiPicker from 'emoji-picker-react';

const API_BASE = '/api/chat';

const MessageBubble = ({
  msg,
  user,
  selectedChat,
  roomSettings,
  currentPartnerSettings,
  getUser,
  formatFileSize,
  initiateCall,
  votePoll,
  setFullScreenImage,
  sendReaction,
  handleMessageContextMenu,
  handleMessageAction,
  scrollToMessage,
  activeReactionMsg,
  setActiveReactionMsg,
  fullReactionMsg,
  setFullReactionMsg,
  messageSelectionMode,
  selectedMessages,
  setSelectedMessages,
  setSelectedPollForVotes,
  showToast
}) => {
  const { settings } = useSettings();
  const [isDownloaded, setIsDownloaded] = useState(false);
  
  const isMe = msg.username === user.username;
  const isGeneralChat = selectedChat === 'general-chat';
  const isDeleted = msg.is_deleted;
  
  const shouldShowMedia = settings.chats.autoDownload || isMe || isDownloaded;
  
  const isSystem = msg.type === 'system' || msg.text?.toLowerCase().includes('disappearing messages turned');
  
  const handleSelection = () => {
    const id = msg._id || msg.id;
    setSelectedMessages(prev => 
      prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
    );
  };

  const renderContent = () => {
    if (isDeleted) {
      return (
        <div className="p-2.5 px-4 bg-surface-low/30 border border-border/5 rounded-[20px] flex items-center gap-3 italic text-text-light/40 text-[11px] font-medium tracking-tight group/deleted transition-all hover:bg-surface-low/50">
           <Clock size={12} className="opacity-20 group-hover/deleted:opacity-40 transition-opacity" />
           This message was deleted
        </div>
      );
    }

    if (isSystem) {
      return (
        <div className="w-full flex justify-center my-4 px-4 text-center">
           <span className="text-[8px] font-black text-text-soft/60 uppercase tracking-[0.2em] leading-relaxed">
              {msg.text}
           </span>
        </div>
      );
    }

    switch (msg.type) {
// ... existing cases ...
      case 'meeting_card':
        return (
          <div className="flex flex-col gap-4 p-6 bg-surface-lowest rounded-xl shadow-soft min-w-[280px]">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/5 rounded-xl text-primary"><Calendar size={24} /></div>
              <div>
                <h4 className="font-bold text-text-main text-base tracking-tight">{msg.metadata?.meeting_title || 'MEETING'}</h4>
                <p className="text-xs text-text-light mt-1 font-medium">
                  {msg.metadata?.start_time && msg.metadata?.end_time ? 
                    `${new Date(msg.metadata.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date(msg.metadata.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` 
                    : 'ACTIVE NOW'}
                </p>
              </div>
            </div>
            <button onClick={() => initiateCall('video')} className="btn-premium py-2.5 text-xs tracking-widest uppercase">JOIN MEETING</button>
          </div>
        );

      case 'calendar_event':
        return (
          <div className="flex flex-col gap-3 p-5 bg-surface-lowest rounded-xl shadow-premium min-w-[280px] border border-primary/5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary flex-shrink-0">
                <Calendar size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-black text-text-main text-[15px] tracking-tight truncate leading-tight">{msg.metadata?.title}</h4>
                <div className="flex items-center gap-2 mt-1.5 text-text-light">
                  <Clock size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {msg.metadata?.start_time ? new Date(msg.metadata.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''} 
                    {' • '}
                    {msg.metadata?.start_time ? new Date(msg.metadata.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              </div>
            </div>
            {msg.metadata?.description && (
              <p className="text-xs text-text-soft font-medium leading-relaxed bg-surface-low/30 p-3 rounded-lg border border-border/50">
                {msg.metadata.description}
              </p>
            )}
            <div className="pt-2">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60 text-center py-2 bg-primary/5 rounded-lg border border-primary/10">
                Shared Calendar Event
              </div>
            </div>
          </div>
        );

      case 'document':
        return (
          <div className="flex items-center gap-4 p-4 bg-surface-lowest rounded-xl shadow-soft min-w-[240px]">
            <div className="p-3 bg-surface-high rounded-xl text-primary"><FileText size={24} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-text-main">{msg.metadata?.file_name}</p>
              <p className="text-[10px] text-text-light font-bold mt-0.5">{formatFileSize(msg.metadata?.file_size || 0)} • DOC</p>
            </div>
            <a href={`${API_BASE}${msg.metadata?.file_url}`} download className="p-2 hover:bg-surface-high rounded-lg text-primary transition-colors"><Download size={20} /></a>
          </div>
        );

      case 'image':
      case 'photo':
        if (!shouldShowMedia) {
          return (
            <div 
              onClick={() => setIsDownloaded(true)}
              className="flex flex-col items-center justify-center gap-3 p-8 bg-surface-low rounded-xl border border-border/10 cursor-pointer hover:bg-surface-high transition-all min-w-[200px]"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Download size={24} />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-text-main">Tap to download</p>
                <p className="text-[10px] text-text-light font-black uppercase tracking-widest mt-0.5">{formatFileSize(msg.metadata?.file_size || 0)} • IMAGE</p>
              </div>
            </div>
          );
        }
        return (
          <motion.div 
            layoutId={`img-${msg._id || msg.id}`}
            onClick={() => setFullScreenImage(msg)}
            className="rounded-xl overflow-hidden shadow-soft max-w-[240px] md:max-w-[400px] cursor-pointer"
          >
            <img src={`${API_BASE}${msg.metadata?.file_url}`} alt={msg.metadata?.file_name} className="w-full object-cover" />
          </motion.div>
        );

      case 'video':
        if (!shouldShowMedia) {
          return (
            <div 
              onClick={() => setIsDownloaded(true)}
              className="flex flex-col items-center justify-center gap-3 p-8 bg-surface-low rounded-xl border border-border/10 cursor-pointer hover:bg-surface-high transition-all min-w-[200px]"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black">
                <Download size={24} />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-text-main">Tap to download</p>
                <p className="text-[10px] text-text-light font-black uppercase tracking-widest mt-0.5">{formatFileSize(msg.metadata?.file_size || 0)} • VIDEO</p>
              </div>
            </div>
          );
        }
        return (
          <div className="rounded-xl overflow-hidden shadow-soft max-w-[240px] md:max-w-[400px]">
            <video src={`${API_BASE}${msg.metadata?.file_url}`} controls className="w-full" />
          </div>
        );

      case 'audio':
        return <VoicePlayer url={`${API_BASE}${msg.metadata?.file_url}`} isMine={isMe} />;

      case 'poll':
        const totalVotes = msg.metadata.options.reduce((s, o) => s + (o.votes?.length || 0), 0);
        const USER_API_AUTH = '/api/auth';
        
        return (
          <div className="flex flex-col gap-0 bg-surface-lowest rounded-2xl shadow-premium border border-border/10 overflow-hidden min-w-[280px] max-w-[320px]">
            {/* Poll Header */}
            <div className="p-4 bg-surface-low/30">
              <h4 className="font-bold text-text-main text-[15px] leading-snug tracking-tight">
                {msg.metadata?.question}
              </h4>
              <p className="text-[10px] font-bold text-text-light mt-1 opacity-60">
                {msg.metadata?.allow_multiple ? 'Select one or more!' : 'You can only pick one!'}
              </p>
            </div>

            {/* Poll Options */}
            <div className="p-2 space-y-1">
              {msg.metadata?.options?.map((opt, idx) => {
                const pct = totalVotes > 0 ? Math.round((opt.votes?.length || 0) / totalVotes * 100) : 0;
                const voted = opt.votes?.includes(user.username);
                const votesCount = opt.votes?.length || 0;
                
                return (
                  <button 
                    key={idx} 
                    onClick={() => votePoll(msg._id || msg.id, idx)} 
                    className="w-full text-left p-3 rounded-xl transition-all hover:bg-surface-low group/poll-opt relative overflow-hidden"
                  >
                    <div className="flex items-start gap-3 relative z-10">
                      {/* Checkbox Icon */}
                      <div className={`mt-0.5 shrink-0 ${voted ? 'text-primary' : 'text-text-light/30'}`}>
                        {voted ? <CheckCircle2 size={20} className="fill-primary/10" /> : <Circle size={20} />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-[13px] truncate ${voted ? 'font-bold text-text-main' : 'font-medium text-text-main/80'}`}>
                            {opt.text}
                          </span>
                          
                          {/* Voter Avatars & Count */}
                          {votesCount > 0 && (
                            <div className="flex items-center gap-1.5 shrink-0">
                                <div className="flex items-center -space-x-1.5">
                                    {opt.votes.slice(0, 2).map((voter) => {
                                        const voterData = getUser(voter);
                                        return (
                                            <div key={voter} className="w-5 h-5 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                                                {voterData?.profile_photo ? (
                                                    <img src={`${USER_API_AUTH}${voterData.profile_photo}`} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-primary text-white text-[7px] font-bold">
                                                        {voter.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                                <span className="text-[11px] font-bold text-text-light">{votesCount}</span>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1.5 w-full bg-surface-high rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            className={`h-full transition-all duration-500 ${voted ? 'bg-primary' : 'bg-primary/40'}`}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* View Votes Footer */}
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (user.accountType === 'pro') {
                  setSelectedPollForVotes(msg);
                } else {
                  showToast("Upgrade to Pro to view detailed votes!", "info");
                }
              }}
              className="w-full py-3 bg-surface-low/50 hover:bg-surface-high border-t border-border/50 text-xs font-bold text-primary transition-colors"
            >
              View votes
            </button>
          </div>
        );

      case 'call_log':
        const isMissed = !msg.metadata?.duration || msg.metadata?.duration === 0 || msg.metadata?.status === 'rejected';
        // Correct logic: if (I sent it AND I was the caller) OR (I didn't send it AND the sender wasn't the caller) -> Outgoing
        const isOutgoing = isMe === (msg.metadata?.is_caller ?? true);
        
        return (
          <div className={`p-3 pb-1.5 flex flex-col gap-3 min-w-[200px] md:min-w-[240px] relative ${isMe ? 'bubble-sent' : 'bubble-received'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isMe ? 'bg-black/10' : 'bg-primary/10 text-primary'}`}>
                {isMissed ? (
                  <PhoneMissed size={20} className={isMe ? 'text-red-700' : 'text-red-500'} />
                ) : (
                  msg.metadata?.call_type === 'video' ? (
                    <Video size={20} className={isMe ? 'text-primary-dark/80' : ''} />
                  ) : (
                    isOutgoing ? <PhoneOutgoing size={20} className={isMe ? 'text-primary-dark/80' : ''} /> : <PhoneIncoming size={20} className={isMe ? 'text-primary-dark/80' : ''} />
                  )
                )}
              </div>
              <div className="flex-1">
                <h4 className={`font-bold text-[13px] tracking-tight ${isMe ? 'text-black/80' : 'text-text-main'}`}>
                  {msg.metadata?.call_type === 'video' ? 'Video Call' : 'Voice Call'}
                </h4>
                <p className={`text-[11px] font-medium mt-0.5 ${isMe ? 'text-black/50' : 'text-text-soft'}`}>
                  {msg.metadata?.duration && msg.metadata.duration > 0 
                    ? `${Math.floor(msg.metadata.duration / 60)}m ${msg.metadata.duration % 60}s` 
                    : (msg.metadata?.status === 'rejected' ? 'Declined' : 'Missed')}
                </p>
              </div>
            </div>

            <div 
              className="flex items-center justify-end gap-1.5 text-[9px] font-black tracking-wider whitespace-nowrap mt-1"
              style={{ color: `rgba(var(${isMe ? '--bubble-sent-meta' : '--bubble-received-meta'}))` }}
            >
              <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'just now'}</span>
              {isMe && !isGeneralChat && (
                (!currentPartnerSettings?.partner_last_read_timestamp || new Date(msg.timestamp || Date.now()) > new Date(currentPartnerSettings.partner_last_read_timestamp)) ? (
                  <Check size={12} className="opacity-40" />
                ) : (
                  <CheckCheck size={12} className="text-blue-400" />
                )
              )}
            </div>
          </div>
        );



      default:
        return (
          <motion.div 
            layout
            className={`text-[13px] md:text-sm leading-relaxed relative w-fit max-w-[90%] ${isMe ? 'bubble-sent ml-auto' : 'bubble-received mr-auto'}`}
          >
            {msg.reply_to && (
              <div 
                onClick={() => scrollToMessage(msg.reply_to.id)}
                className="mb-2 p-2 bg-black/5 rounded-lg border-l-2 border-primary/50 text-[11px] leading-snug cursor-pointer group/reply hover:bg-black/10 transition-colors"
              >
                <span className="font-bold text-primary block mb-0.5">{msg.reply_to.username === user.username ? 'You' : (getUser(msg.reply_to.username)?.fullName || msg.reply_to.username)}</span>
                <span className="opacity-80 line-clamp-2">{msg.reply_to.text}</span>
              </div>
            )}
            <div className="flex flex-row flex-wrap items-end justify-end gap-x-4 gap-y-1">
              <div className="break-words leading-relaxed text-left flex-grow min-w-[20px] pr-1">{msg.text}</div>
              <div 
                className="flex items-center gap-1.5 flex-nowrap text-[9px] font-black tracking-wider whitespace-nowrap opacity-60 mb-0.5 shrink-0"
                style={{ color: `rgba(var(${isMe ? '--bubble-sent-meta' : '--bubble-received-meta'}))` }}
              >
                {msg.stars?.includes(user.username) && <Star size={10} className="fill-current text-current" />}
                {msg.is_pinned && <Pin size={10} />}
                {msg.is_edited && <span className="font-bold italic mr-0.5">Edited</span>}
                <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'just now'}</span>
                {isMe && !isGeneralChat && (
                  (!currentPartnerSettings?.partner_last_read_timestamp || new Date(msg.timestamp || Date.now()) > new Date(currentPartnerSettings.partner_last_read_timestamp)) ? (
                    <Check size={12} className="opacity-40" />
                  ) : (
                    <CheckCheck size={12} className="text-blue-400" />
                  )
                )}
                {!isGeneralChat && roomSettings?.disappearing_time && roomSettings.disappearing_time !== 'off' && (
                  <Clock size={10} className="ml-0.5 opacity-40 shrink-0" />
                )}
              </div>
            </div>
          </motion.div>
        );
    }
  };

  if (isSystem) return renderContent();

  return (
    <motion.div 
      id={msg._id || msg.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end group/msg relative`}
      onContextMenu={(e) => handleMessageContextMenu(e, msg)}
    >
      {messageSelectionMode && (
         <div className="mr-4 mb-4 shrink-0">
             <button 
               onClick={handleSelection}
               className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 shadow-sm ${selectedMessages.includes(msg._id || msg.id) ? 'bg-primary border-primary text-white scale-110' : 'border-slate-300 bg-white hover:border-primary/50 hover:shadow-md'}`}
             >
                {selectedMessages.includes(msg._id || msg.id) && <Check size={14} strokeWidth={4} />}
             </button>
         </div>
      )}

      <div className={`max-w-[85%] md:max-w-[70%] flex ${isMe ? 'flex-row' : 'flex-row-reverse'} items-center gap-1 ${isSystem ? 'w-full !max-w-full' : 'w-fit'}`}>
        {/* Quick Share Button (WhatsApp Style) */}
        {!isDeleted && !isSystem && (['image', 'photo', 'video'].includes(msg.type)) && !messageSelectionMode && (
          <div className="opacity-0 group-hover/msg:opacity-100 transition-all duration-300 flex items-center justify-center shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); handleMessageAction('forward', msg); }}
              className="w-10 h-10 rounded-full bg-surface-lowest shadow-premium border border-border/10 flex items-center justify-center text-primary hover:bg-surface-low hover:scale-110 active:scale-95 transition-all"
              title="Forward"
            >
              <CornerUpRight size={20} />
            </button>
          </div>
        )}

        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} min-w-0`}>
          {!isMe && !isDeleted && !isSystem && (typeof selectedChat === 'object' || isGeneralChat) && (
            <span className="text-[10px] text-text-soft font-bold mb-1.5 tracking-[0.1em] uppercase">
              {getUser(msg.username)?.fullName || (msg.username.charAt(0).toUpperCase() + msg.username.slice(1))}
            </span>
          )}
          
          <motion.div layout className={`relative group/bubble ${isSystem ? 'w-full flex justify-center' : 'w-fit'}`}>
            {renderContent()}

            {!isDeleted && !isSystem && (
              <div className={`absolute -top-3 ${isMe ? '-left-8' : '-right-8'} opacity-0 group-hover/msg:opacity-100 transition-all duration-300 z-40 flex items-center gap-1`}>
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveReactionMsg(activeReactionMsg === msg._id ? null : msg._id); }}
                  className={`p-2 rounded-full shadow-lg border border-border/10 transition-all hover:scale-110 active:scale-95 ${activeReactionMsg === msg._id ? 'bg-primary text-white' : 'bg-white text-text-soft hover:text-primary'}`}
                >
                  <Smile size={16} />
                </button>
  
              <AnimatePresence>
                {activeReactionMsg === msg._id && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    className={`absolute -top-16 ${isMe ? 'right-0' : 'left-0'} w-fit flex items-center gap-1 bg-white p-1.5 rounded-full shadow-premium border border-border/50 z-[60] whitespace-nowrap`}
                  >
                    <div className="flex items-center gap-0.5 px-1 py-0.5 flex-nowrap">
                      {['👍', '❤️', '😂', '😮', '😟', '🔥'].map(emoji => (
                        <button 
                          key={emoji}
                          onClick={() => { sendReaction(msg._id, emoji); setActiveReactionMsg(null); }}
                          className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center hover:bg-surface-high rounded-full text-base md:text-lg transition-all hover:scale-125 active:scale-90"
                        >
                          {emoji}
                        </button>
                      ))}
                      <div className="w-[1px] h-4 bg-border/50 mx-1 shrink-0" />
                      <button 
                        onClick={() => { setFullReactionMsg(msg._id); setActiveReactionMsg(null); }}
                        className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center hover:bg-surface-high rounded-full text-text-soft hover:text-primary transition-all active:scale-90 shrink-0"
                        title="More emojis"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <AnimatePresence>
            {fullReactionMsg === msg._id && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/20 backdrop-blur-sm" 
                  onClick={() => setFullReactionMsg(null)} 
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative z-[110] shadow-premium rounded-3xl overflow-hidden border border-border/50 bg-white"
                >
                  <EmojiPicker 
                    onEmojiClick={(emojiData) => {
                      sendReaction(msg._id, emojiData.emoji);
                      setFullReactionMsg(null);
                    }}
                    autoFocusSearch={true}
                    theme="light"
                    width={window.innerWidth < 480 ? window.innerWidth - 40 : 350}
                    height={400}
                  />
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {!isDeleted && msg.reactions && msg.reactions.length > 0 && (
            <div className={`absolute -bottom-4 ${isMe ? 'right-2' : 'left-2'} flex flex-wrap gap-1 z-20`}>
              {Object.entries(
                msg.reactions.reduce((acc, r) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                  return acc;
                }, {})
              ).map(([emoji, count]) => (
                <div key={emoji} className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-full text-[11px] font-bold shadow-soft border border-border/50 animate-in zoom-in duration-300">
                  <span className="scale-110">{emoji}</span>
                  {count > 1 && <span className="text-text-soft">{count}</span>}
                </div>
              ))}
            </div>
          )}
          </motion.div>
      </div>
    </div>
  </motion.div>
  );
};

export default MessageBubble;
