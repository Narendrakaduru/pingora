import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, PhoneOff } from 'lucide-react';
import CallModal from '../CallModal';
import IncomingCallOverlay from '../IncomingCallOverlay';

const CallUIManager = ({ 
  incomingCall, acceptCall, rejectCall,
  isCalling, callError, hangupCall,
  activeCall, ws, selectedChat, dmPartners, onlineUsers, getUser, user, allUsers
}) => {
  const chatName = typeof selectedChat === 'string' ? selectedChat : (selectedChat?.username || selectedChat?.name || 'User');

  return (
    <>
      <AnimatePresence>
        {incomingCall && (
          <IncomingCallOverlay 
            call={incomingCall} 
            onAccept={acceptCall} 
            onReject={rejectCall} 
            getUser={getUser} 
            dmPartners={dmPartners} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCalling && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6"
          >
            <div className="bg-white rounded-3xl p-6 md:p-10 text-center max-w-sm w-full shadow-2xl relative overflow-hidden">
              {callError === 'rejected' && <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />}
              <div className={`w-24 h-24 rounded-full ${callError === 'rejected' ? 'bg-red-50' : 'bg-primary/10'} flex items-center justify-center mx-auto mb-6 ${callError === 'rejected' ? 'text-red-500' : 'text-primary animate-bounce'}`}>
                {callError === 'rejected' ? <PhoneOff size={48} /> : <Phone size={48} />}
              </div>
              <h3 className="text-2xl font-bold text-text-main mb-2">
                {callError === 'rejected' ? 'Call Rejected' : `Calling ${chatName}...`}
              </h3>
              <p className={`${callError === 'rejected' ? 'text-red-500 font-medium' : 'text-text-soft'} mb-8`}>
                {callError === 'rejected' ? `${chatName} declined the call` : 'Waiting for answer'}
              </p>
              <button 
                onClick={hangupCall}
                className={`w-full py-4 ${callError === 'rejected' ? 'btn-premium' : 'bg-red-500 hover:bg-red-600'} text-white rounded-2xl font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3`}
              >
                {callError === 'rejected' ? <><X size={20} /> Close</> : <><PhoneOff size={20} /> Cancel Call</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeCall && (
        <CallModal 
          call={activeCall} onHangup={hangupCall} ws={ws} 
          dmPartners={dmPartners} onlineUsers={onlineUsers} 
          getUser={getUser} user={user} allUsers={allUsers}
        />
      )}
    </>
  );
};

export default CallUIManager;
