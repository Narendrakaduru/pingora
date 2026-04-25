import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ChevronDown } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { TypingIndicatorBubble } from '../components/TypingIndicator';
import { getRoomId } from '../../../utils/chatUtils';

const MessageList = ({
  messages,
  user,
  selectedChat,
  roomSettings,
  typingUsers,
  settings,
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
  containerRef,
  scrollRef,
  handleScroll,
  scrollToBottom,
  showScrollBottom,
  dmPartners,
  onlineUsers,
  lastSeenMap,
  setSelectedPollForVotes,
  showToast,
  setShowContactInfo
}) => {
  const roomId = getRoomId(selectedChat, user.username);
  const currentPartnerName = typeof selectedChat === 'string' ? selectedChat : (selectedChat?.username || null);
  const currentPartner = currentPartnerName ? (typeof selectedChat === 'object' && selectedChat.username ? selectedChat : dmPartners.find(p => p.username === currentPartnerName)) : null;
  const currentPartnerSettings = currentPartner?.settings || {};

  return (
    <div 
      className="flex-1 flex flex-col min-h-0 relative overflow-hidden"
      style={{ 
        backgroundColor: settings?.wallpaper && settings.wallpaper !== 'default' && !settings.wallpaper.includes('://') && !settings.wallpaper.startsWith('data:') ? settings.wallpaper : undefined,
        backgroundImage: settings?.wallpaper && (settings.wallpaper.includes('://') || settings.wallpaper.startsWith('data:')) 
          ? `url(${settings.wallpaper})` 
          : (!settings?.wallpaper || settings.wallpaper === 'default' 
             ? 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.02) 1px, transparent 0)' 
             : 'none'),
        backgroundSize: settings?.wallpaper && (settings.wallpaper.includes('://') || settings.wallpaper.startsWith('data:')) ? 'cover' : '24px 24px',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4 px-4 md:py-6 md:px-6 space-y-4 scroll-smooth relative bg-transparent"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <div className="w-16 h-16 bg-surface-high rounded-full flex items-center justify-center mb-4">
              <MessageSquare size={32} />
            </div>
            <p className="text-sm font-bold text-text-light uppercase tracking-widest">NO MESSAGES YET</p>
          </div>
        )}
        
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageBubble 
              key={msg._id || i}
              msg={msg}
              user={user}
              selectedChat={selectedChat}
              roomSettings={roomSettings}
              currentPartnerSettings={currentPartnerSettings}
              getUser={getUser}
              formatFileSize={formatFileSize}
              initiateCall={initiateCall}
              votePoll={votePoll}
              setFullScreenImage={setFullScreenImage}
              sendReaction={sendReaction}
              handleMessageContextMenu={handleMessageContextMenu}
              handleMessageAction={handleMessageAction}
              scrollToMessage={scrollToMessage}
              activeReactionMsg={activeReactionMsg}
              setActiveReactionMsg={setActiveReactionMsg}
              fullReactionMsg={fullReactionMsg}
              setFullReactionMsg={setFullReactionMsg}
              messageSelectionMode={messageSelectionMode}
              selectedMessages={selectedMessages}
              setSelectedMessages={setSelectedMessages}
              setSelectedPollForVotes={setSelectedPollForVotes}
              showToast={showToast}
              setShowContactInfo={setShowContactInfo}
            />
          ))}
        </AnimatePresence>

        {/* Real-time Typing Indicator Bubble */}
        <AnimatePresence mode="popLayout">
          {typingUsers[roomId]?.size > 0 && Array.from(typingUsers[roomId]).map(typer => (
            <TypingIndicatorBubble key={typer} typer={typer} />
          ))}
        </AnimatePresence>

        <div ref={scrollRef} />
      </div>

      {/* Scroll to Bottom Button */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -20, scale: 1 }}
            exit={{ opacity: 0, y: 0, scale: 0.8 }}
            onClick={scrollToBottom}
            className="absolute bottom-4 right-6 md:right-10 z-30 w-11 h-11 bg-white text-primary rounded-full shadow-2xl flex items-center justify-center hover:bg-slate-50 active:scale-90 transition-all border border-border/50 group"
          >
            <ChevronDown size={24} className="group-hover:translate-y-0.5 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageList;
