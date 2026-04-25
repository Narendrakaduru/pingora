import { useState, useRef, useEffect, useCallback } from 'react';
import { getRoomId } from '../../../utils/chatUtils';

export const useChatCall = (user, wsRef, selectedChat) => {
  const [activeCall, setActiveCall] = useState(null); // { target, type, isCaller, signal, call_id }
  const activeCallRef = useRef(null);
  const activeCallIdRef = useRef(null);
  const [incomingCall, setIncomingCall] = useState(null); // { from, type, signal, call_id }
  const incomingCallRef = useRef(null);
  const incomingCallTimeoutRef = useRef(null);
  const isHangingUpRef = useRef(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callError, setCallError] = useState(null); // 'rejected' | 'offline' | null

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);
  
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  const persistCallLog = useCallback((target, callType, status, duration = null, isCaller = true) => {
    if (!wsRef.current || wsRef.current.readyState !== 1) return;
    const rId = getRoomId(target, user.username);
    const logMsg = {
      type: 'call_log',
      room: rId,
      username: user.username,
      text: isCaller ? `${callType.charAt(0).toUpperCase() + callType.slice(1)} call` : `Incoming ${callType} call`,
      metadata: {
        call_type: callType,
        duration: duration,
        status: status, // 'completed' | 'missed' | 'rejected' | 'cancelled'
        is_caller: isCaller,
        timestamp: new Date().toISOString()
      }
    };
    wsRef.current.send(JSON.stringify(logMsg));
  }, [user.username, wsRef]);

  const initiateCall = useCallback((type, overrideTarget = null) => {
    // Resolve target username correctly if selectedChat is an object
    const effectiveChat = overrideTarget || selectedChat;
    const isGroup = effectiveChat && typeof effectiveChat === 'object' && effectiveChat._id && !effectiveChat.username;
    const targetName = typeof effectiveChat === 'object' ? (effectiveChat.username || effectiveChat._id || effectiveChat.name) : effectiveChat;
    
    if (!targetName || targetName === 'general-chat') return;
    
    const cId = Date.now().toString() + Math.random().toString(36).substring(2, 7);
    activeCallIdRef.current = cId;
    setCallError(null);
    setIsCalling(true);
    
    wsRef.current.send(JSON.stringify({
      type: 'call_request',
      target: isGroup ? targetName : targetName.toLowerCase(),
      call_type: type,
      call_id: cId,
      is_group_call: isGroup
    }));
  }, [selectedChat, wsRef]);

  const rejectCall = useCallback((status = 'rejected') => {
    if (!incomingCallRef.current) return;
    const call = incomingCallRef.current;

    wsRef.current.send(JSON.stringify({
      type: 'call_response',
      target: call.from,
      accepted: false,
      call_id: call.call_id
    }));
    wsRef.current.send(JSON.stringify({
      type: 'call_handled',
      target: user.username,
      call_id: call.call_id
    }));
    
    persistCallLog(call.from, call.type || 'voice', status, null, false);

    if (incomingCallTimeoutRef.current) {
      clearTimeout(incomingCallTimeoutRef.current);
      incomingCallTimeoutRef.current = null;
    }
    setIncomingCall(null);
  }, [user.username, wsRef, persistCallLog]);

  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    if (incomingCallTimeoutRef.current) {
      clearTimeout(incomingCallTimeoutRef.current);
      incomingCallTimeoutRef.current = null;
    }
    wsRef.current.send(JSON.stringify({
      type: 'call_response',
      target: incomingCall.from,
      accepted: true,
      call_type: incomingCall.type,
      call_id: incomingCall.call_id
    }));
    wsRef.current.send(JSON.stringify({
      type: 'call_handled',
      target: user.username,
      call_id: incomingCall.call_id
    }));
    activeCallIdRef.current = incomingCall.call_id;
    setActiveCall({ target: incomingCall.from, type: incomingCall.type, isCaller: false, call_id: incomingCall.call_id });
    setIncomingCall(null);
  }, [incomingCall, user.username, wsRef]);

  const hangupCall = useCallback((duration, participants = null) => {
    if (isHangingUpRef.current) return;
    
    const initialTarget = activeCallRef.current?.target || (isCalling ? selectedChat : null);
    const durVal = typeof duration === 'number' ? duration : null;

    if (initialTarget) {
      isHangingUpRef.current = true;
      
      // Determine all targets for hangup and logging
      const allTargets = participants ? [...new Set([...participants, initialTarget])] : [initialTarget];

      allTargets.forEach(target => {
        // Send hangup signal
        wsRef.current.send(JSON.stringify({
          type: 'call_hangup',
          target: target,
          call_id: activeCallIdRef.current
        }));

        // Persist log for each participant
        if (activeCallRef.current) {
          if (activeCallRef.current.isCaller) {
            persistCallLog(target, activeCallRef.current.type, durVal > 0 ? 'completed' : 'missed', durVal, activeCallRef.current.isCaller);
          }
        } else if (isCalling && callError !== 'rejected') {
          persistCallLog(target, 'voice', 'cancelled', null, true);
        }
      });
    }

    if (incomingCallTimeoutRef.current) {
      clearTimeout(incomingCallTimeoutRef.current);
      incomingCallTimeoutRef.current = null;
    }
    setActiveCall(null);
    setIncomingCall(null);
    setIsCalling(false);
    setCallError(null);
    activeCallIdRef.current = null;
    
    setTimeout(() => {
      isHangingUpRef.current = false;
    }, 1000);
  }, [isCalling, selectedChat, wsRef, persistCallLog]);

  return {
    activeCall, setActiveCall,
    incomingCall, setIncomingCall,
    isCalling, setIsCalling,
    callError, setCallError,
    activeCallRef,
    activeCallIdRef,
    incomingCallRef,
    incomingCallTimeoutRef,
    initiateCall,
    acceptCall,
    rejectCall,
    hangupCall,
    persistCallLog
  };
};
