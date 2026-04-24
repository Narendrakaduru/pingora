import { useEffect } from 'react';

export const useKeyboardShortcuts = ({
  activeView,
  setActiveView,
  selectedChat,
  setSelectedChat,
  msgContextMenu,
  setMsgContextMenu,
  activeReactionMsg,
  setActiveReactionMsg,
  confirmModal,
  setConfirmModal,
  forwardingMessage,
  setForwardingMessage,
  messageSelectionMode,
  setMessageSelectionMode,
  setSelectedMessages,
  replyingToMessage,
  setReplyingToMessage,
  showGroupSettingsModal,
  setShowGroupSettingsModal,
  showNewDM,
  setShowNewDM,
  searchInputRef
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable;
      
      if (!isInput) {
        // Alt+Shift+N: New DM
        if (e.altKey && e.shiftKey && e.code === 'KeyN') {
          e.preventDefault();
          e.stopPropagation();
          setShowNewDM(prev => !prev);
        }
        // Alt+Shift+F: Search / Chat
        if (e.altKey && e.shiftKey && e.code === 'KeyF') {
          e.preventDefault();
          e.stopPropagation();
          if (activeView !== 'chat') {
            setActiveView('chat');
            setTimeout(() => {
              searchInputRef.current?.focus();
            }, 100);
          } else {
            searchInputRef.current?.focus();
          }
        }
        // Alt+Shift+C: Calendar
        if (e.altKey && e.shiftKey && e.code === 'KeyC') {
          e.preventDefault();
          e.stopPropagation();
          setActiveView(prev => prev === 'calendar' ? 'chat' : 'calendar');
        }
        // Alt+Shift+H: Home
        if (e.altKey && e.shiftKey && e.code === 'KeyH') {
          e.preventDefault();
          e.stopPropagation();
          setActiveView(prev => prev === 'home' ? 'chat' : 'home');
        }
        // Alt+Shift+S: Settings
        if (e.altKey && e.shiftKey && e.code === 'KeyS') {
          e.preventDefault();
          e.stopPropagation();
          setActiveView(prev => prev === 'settings' ? 'chat' : 'settings');
        }
      }

      // Esc dismisses modals and states
      if (e.key === 'Escape') {
        if (msgContextMenu?.visible) setMsgContextMenu({ visible: false, x: 0, y: 0, msg: null });
        else if (activeReactionMsg) setActiveReactionMsg(null);
        else if (confirmModal?.visible) setConfirmModal({ visible: false, title: '', message: '', onConfirm: null });
        else if (forwardingMessage) setForwardingMessage(null);
        else if (messageSelectionMode) { setMessageSelectionMode(false); setSelectedMessages([]); }
        else if (replyingToMessage) setReplyingToMessage(null);
        else if (showGroupSettingsModal) setShowGroupSettingsModal(false);
        else if (showNewDM) setShowNewDM(false);
        else if (activeView !== 'chat') setActiveView('chat');
        else if (selectedChat !== 'general-chat') setSelectedChat('general-chat');
        
        if (isInput) e.target.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
      activeView, setActiveView, selectedChat, setSelectedChat, 
      msgContextMenu, setMsgContextMenu, activeReactionMsg, setActiveReactionMsg, 
      confirmModal, setConfirmModal, forwardingMessage, setForwardingMessage, 
      messageSelectionMode, setMessageSelectionMode, setSelectedMessages, 
      replyingToMessage, setReplyingToMessage, showGroupSettingsModal, 
      setShowGroupSettingsModal, showNewDM, setShowNewDM, searchInputRef
  ]);
};
