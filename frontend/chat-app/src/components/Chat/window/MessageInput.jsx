import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Smile, Send, X, CornerUpLeft, Pencil, Mic, StopCircle } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useSettings } from '../../../context/SettingsContext';

const MessageInput = ({
  text,
  setText,
  sendMessage,
  handleTyping,
  showEmojiPicker,
  setShowEmojiPicker,
  showAttachMenu,
  setShowAttachMenu,
  isRecordingAudio,
  recordingTime,
  cancelAudioRecording,
  stopAudioRecording,
  replyingToMessage,
  setReplyingToMessage,
  editingMessage,
  cancelEdit,
  attachMenuItems,
  user,
  getUser,
  currentChatName,
  startAudioRecording
}) => {
  const { settings } = useSettings();
  const textareaRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 140)}px`;
    }
  }, [text]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmedText = text?.trim();
    if (!trimmedText && !editingMessage) return;

    if (editingMessage) {
      sendMessage(trimmedText, 'text', null, null, editingMessage._id || editingMessage.id);
      cancelEdit();
    } else {
      sendMessage(trimmedText, 'text', null, replyingToMessage);
      if (replyingToMessage) setReplyingToMessage(null);
    }
    
    setText('');
    handleTyping();
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && settings.chats.enterIsSend) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextChange = (e) => {
    let val = e.target.value;
    
    if (settings.chats.replaceWithEmoji) {
      const emojiMap = {
        ':)': '😃', ':(': '☹️', ':D': '😁', ';)': '😉',
        '<3': '❤️', ':p': '😛', ':P': '😛', 'B)': '😎', ':O': '😲'
      };
      const words = val.split(' ');
      const lastWord = words[words.length - 1];
      if (emojiMap[lastWord]) {
        words[words.length - 1] = emojiMap[lastWord];
        val = words.join(' ');
      }
    }

    setText(val);
    handleTyping();
  };

  const hasText = text.trim().length > 0;

  return (
    <div className="px-3 md:px-4 pb-3 md:pb-4 pt-2 bg-surface-sidebar">

      {/* ─── Recording Bar ─── */}
      <AnimatePresence>
        {isRecordingAudio && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex items-center gap-4 mb-2 px-4 py-3 bg-white rounded-2xl shadow-sm border border-primary/10"
          >
            <div className="relative flex items-center justify-center shrink-0">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-ping absolute opacity-60" />
              <div className="w-3 h-3 bg-red-500 rounded-full relative" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Recording</p>
              <p className="text-base font-bold text-text-main font-mono">
                {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
              </p>
            </div>
            <button
              type="button"
              onClick={cancelAudioRecording}
              className="text-xs font-semibold text-text-light hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={stopAudioRecording}
              className="flex items-center gap-2 text-xs font-bold text-white bg-primary hover:opacity-90 transition-all px-4 py-1.5 rounded-lg"
            >
              <StopCircle size={14} />
              Send
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Reply / Edit Banner ─── */}
      <AnimatePresence>
        {(replyingToMessage || editingMessage) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="flex items-center justify-between bg-white px-4 py-2.5 rounded-t-2xl border-l-4 border-primary mb-0 shadow-sm"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {replyingToMessage ? (
                <>
                  <CornerUpLeft size={14} className="text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-primary leading-none mb-0.5">
                      {replyingToMessage.username === user.username ? 'You' : (getUser(replyingToMessage.username)?.fullName || replyingToMessage.username)}
                    </p>
                    <p className="text-xs text-text-soft truncate max-w-[260px] md:max-w-xs">
                      {replyingToMessage.text}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Pencil size={14} className="text-primary shrink-0" />
                  <p className="text-xs font-bold text-primary">Editing message</p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={replyingToMessage ? () => setReplyingToMessage(null) : cancelEdit}
              className="p-1 text-text-soft hover:text-text-main hover:bg-surface-low rounded-full transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main Input Row ─── */}
      <div className={`flex items-end gap-2`}>

        {/* Left: Pill input (attach + textarea + emoji) */}
        <div className={`flex-1 flex items-end bg-white rounded-3xl shadow-sm transition-all duration-200 ${
          replyingToMessage || editingMessage ? 'rounded-tl-none' : ''
        } ${isFocused ? 'shadow-md' : ''}`}>

          {/* Attach Button */}
          <div className="relative shrink-0 self-end pb-1.5 pl-2">
            <button
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ${
                showAttachMenu ? 'bg-primary text-white rotate-45' : 'text-text-soft hover:bg-surface-high'
              }`}
            >
              <Plus size={22} />
            </button>

            <AnimatePresence>
              {showAttachMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className="fixed md:absolute bottom-0 left-0 right-0 md:bottom-14 md:left-0 md:right-auto bg-white rounded-t-3xl md:rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] py-4 md:py-2 min-w-full md:min-w-[180px] z-50"
                  >
                    {attachMenuItems.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={item.onClick}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#f0f2f5] transition-colors text-left group"
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${item.color}`}>
                          <item.icon size={18} />
                        </div>
                        <span className="text-sm font-medium text-text-main">{item.label}</span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            id="chat-message-input"
            name="message-spellcheck-field"
            rows="1"
            placeholder={`Message ${currentChatName}`}
            className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-[15px] font-normal py-2.5 px-2 text-text-main placeholder:text-text-light/60 resize-none min-h-[42px] max-h-[140px] leading-relaxed custom-scrollbar self-end"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            spellCheck="true"
            data-gramm="false"
            data-enable-grammarly="false"
          />

          {/* Emoji Button */}
          <div className="relative shrink-0 self-end pb-1.5 pr-2">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ${
                showEmojiPicker ? 'bg-primary text-white' : 'text-text-soft hover:bg-surface-high'
              }`}
            >
              <Smile size={22} />
            </button>

            <AnimatePresence>
              {showEmojiPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className="fixed md:absolute bottom-0 left-0 right-0 md:bottom-14 md:right-0 md:left-auto z-50 shadow-2xl rounded-t-3xl md:rounded-2xl overflow-hidden"
                  >
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        setText(prev => prev + emojiData.emoji);
                        setShowEmojiPicker(false);
                        textareaRef.current?.focus();
                      }}
                      autoFocusSearch={false}
                      theme={settings.theme === 'dark' ? 'dark' : 'light'}
                      width={320}
                      height={400}
                    />
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Send / Mic Button */}
        <motion.button
          type="button"
          onClick={hasText ? handleSubmit : startAudioRecording}
          whileTap={{ scale: 0.88 }}
          className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-200 self-end bg-primary hover:opacity-90 active:scale-95"
          title={hasText ? 'Send' : 'Voice message'}
        >
          <AnimatePresence mode="wait" initial={false}>
            {hasText ? (
              <motion.span key="send" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 30 }} transition={{ duration: 0.15 }}>
                <Send size={20} strokeWidth={2.2} />
              </motion.span>
            ) : (
              <motion.span key="mic" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }}>
                <Mic size={20} strokeWidth={2.2} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

      </div>
    </div>
  );
};

export default MessageInput;
