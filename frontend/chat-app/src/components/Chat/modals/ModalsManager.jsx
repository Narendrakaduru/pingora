import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, CheckCircle2 } from 'lucide-react';
import { getRoomId } from '../../../utils/chatUtils';

// Modals
import NewDMModal from './NewDMModal';
import PollModal from './PollModal';
import PollVotesModal from './PollVotesModal';
import DisappearingModal from './DisappearingModal';
import ForwardModal from './ForwardModal';
import ConfirmModal from './ConfirmModal';
import ListSelectModal from './ListSelectModal';
import MessageInfoModal from './MessageInfoModal';
import ContactInfoModal from './ContactInfoModal';
import GroupSettingsModal from '../../Groups/GroupSettingsModal';
import PhotoViewer from '../window/PhotoViewer';
import EventModal from '../window/EventModal';

// Context Menus
import MessageContextMenu from '../window/MessageContextMenu';
import ChatContextMenu from '../window/ChatContextMenu';

const ModalsManager = ({
  // States
  showNewDM, setShowNewDM,
  newDMMode,
  newDMSearch, setNewDMSearch,
  showPollModal, setShowPollModal,
  pollQuestion, setPollQuestion,
  pollOptions, setPollOptions,
  allowMultiple, setAllowMultiple,
  showDisappearingModal, setShowDisappearingModal,
  forwardingMessage, setForwardingMessage,
  confirmModal, setConfirmModal,
  listModal, setListModal,
  showInfoModal, setShowInfoModal,
  showContactInfo, setShowContactInfo,
  selectedInfoMsg,
  messages,
  showGroupSettingsModal, setShowGroupSettingsModal,
  editingGroupSettings,
  fullScreenImage, setFullScreenImage,
  msgContextMenu, setMsgContextMenu,
  chatContextMenu, setChatContextMenu,
  selectedPollForVotes, setSelectedPollForVotes,
  toast,
  
  // Data
  user, onlineUsers, allUsers, dmPartners, userGroups, roomSettings, selectedChat, allLabels, setCustomLabels,
  
  // Handlers
  startDM, updateDisappearingTime, handleForward, initiateCall,
  updateChatLabel, refreshPartners, getUser,
  handleMessageAction, handleChatAction, scrollToMessage, showToast, onCreatePoll,
  showEventModal, setShowEventModal, handleCreateEvent
}) => {
  return (
    <>
      <AnimatePresence>
        {showNewDM && (
          <NewDMModal 
            isOpen={showNewDM} 
            onClose={() => setShowNewDM(false)} 
            searchQuery={newDMSearch} 
            setSearchQuery={setNewDMSearch} 
            allUsers={allUsers} 
            onStartDM={startDM} 
            user={user} 
            newDMMode={newDMMode}
            onlineUsers={onlineUsers} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPollModal && (
          <PollModal 
            isOpen={showPollModal} 
            onClose={() => setShowPollModal(false)} 
            pollQuestion={pollQuestion} 
            setPollQuestion={setPollQuestion} 
            pollOptions={pollOptions} 
            setPollOptions={setPollOptions} 
            allowMultiple={allowMultiple}
            setAllowMultiple={setAllowMultiple}
            onCreatePoll={onCreatePoll} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPollForVotes && (
          <PollVotesModal 
            isOpen={!!selectedPollForVotes} 
            onClose={() => setSelectedPollForVotes(null)} 
            pollMsg={selectedPollForVotes} 
            getUser={getUser}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDisappearingModal && (
          <DisappearingModal 
            isOpen={showDisappearingModal} 
            onClose={() => setShowDisappearingModal(false)} 
            currentValue={(() => {
              if (showContactInfo) {
                const partner = dmPartners.find(p => p.username.toLowerCase() === showContactInfo.username.toLowerCase());
                return partner?.settings?.disappearing_time || (showContactInfo.username === selectedChat ? roomSettings?.disappearing_time : null) || 'off';
              }
              return roomSettings?.disappearing_time || 'off';
            })()} 
            onSelect={updateDisappearingTime} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {forwardingMessage && (
          <ForwardModal 
            isOpen={!!forwardingMessage} 
            onClose={() => setForwardingMessage(null)} 
            onForward={handleForward} 
            dmPartners={dmPartners} 
            userGroups={userGroups} 
            user={user} 
            getUser={getUser}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModal.visible && (
          <ConfirmModal 
            isOpen={confirmModal.visible} 
            onClose={() => setConfirmModal({ ...confirmModal, visible: false })} 
            title={confirmModal.title} 
            message={confirmModal.message} 
            onConfirm={confirmModal.onConfirm} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {listModal.visible && (
          <ListSelectModal
            isOpen={listModal.visible}
            onClose={() => setListModal({ visible: false, roomId: null, currentLabels: [] })}
            currentLists={listModal.currentLabels}
            allLabels={allLabels}
            onSelect={async (listName) => {
              if (!listModal.roomId) {
                showToast('No chat selected to add to this list', 'error');
                return;
              }
              try {
                if (listName === null) {
                  await updateChatLabel(user.username, listModal.roomId, null, 'clear');
                  showToast('Removed from all lists');
                } else {
                  // Add to persistent custom labels if it's new
                  if (!allLabels.includes(listName)) {
                    setCustomLabels(prev => [...new Set([...prev, listName])]);
                  }
                  
                  // First clear existing to ensure "one list at a time"
                  await updateChatLabel(user.username, listModal.roomId, null, 'clear');
                  // Then add the new one
                  await updateChatLabel(user.username, listModal.roomId, listName, 'add');
                  showToast(`Updated list to "${listName}"`);
                }
                try {
                  await refreshPartners();
                } catch (e) {
                  console.error("Refresh failed:", e);
                }
                setListModal({ visible: false, roomId: null, currentLabels: [] });
              } catch (e) {
                showToast('Failed to update list', 'error');
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInfoModal && (
          <MessageInfoModal 
            isOpen={showInfoModal}
            onClose={() => setShowInfoModal(false)}
            msg={selectedInfoMsg}
            getUser={getUser}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showContactInfo && (
          <ContactInfoModal 
            isOpen={!!showContactInfo}
            onClose={() => setShowContactInfo(false)}
            contact={showContactInfo}
            user={user}
            onlineUsers={onlineUsers}
            messages={messages}
            initiateCall={initiateCall}
            onOpenMedia={(msg) => setFullScreenImage(msg)}
            roomSettings={roomSettings}
            handleChatAction={handleChatAction}
            updateDisappearingTime={updateDisappearingTime}
            showToast={showToast}
            setShowDisappearingModal={setShowDisappearingModal}
            dmPartners={dmPartners}
          />
        )}
      </AnimatePresence>

      <GroupSettingsModal 
        isOpen={showGroupSettingsModal}
        onClose={() => setShowGroupSettingsModal(false)}
        onSuccess={refreshPartners}
        editingGroup={editingGroupSettings}
        currentUser={user}
        userApiUrl="/api/auth"
      />

      <AnimatePresence>
        {fullScreenImage && (
          <PhotoViewer 
            msg={fullScreenImage}
            allMessages={messages}
            user={user}
            getUser={getUser}
            onClose={() => setFullScreenImage(null)}
            onAction={handleMessageAction}
            scrollToMessage={scrollToMessage}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast.visible && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl shadow-2xl font-bold text-sm text-white flex items-center gap-2.5 ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}
          >
            {toast.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {msgContextMenu.visible && (
          <MessageContextMenu 
            {...msgContextMenu} 
            user={user}
            onClose={() => setMsgContextMenu({ ...msgContextMenu, visible: false })}
            onAction={handleMessageAction}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chatContextMenu.visible && (
          <ChatContextMenu 
            {...chatContextMenu} 
            onClose={() => setChatContextMenu(prev => ({ ...prev, visible: false }))}
            onAction={handleChatAction}
            user={user}
          />
        )}
      </AnimatePresence>

      <EventModal 
        show={showEventModal}
        onClose={() => setShowEventModal(false)}
        onCreate={handleCreateEvent}
        roomId={getRoomId(selectedChat, user.username)}
        currentChatName={
          typeof selectedChat === 'string' 
            ? (getUser(selectedChat)?.fullName || selectedChat) 
            : (selectedChat?.name || selectedChat?.username || '')
        }
      />
    </>
  );
};

export default ModalsManager;
