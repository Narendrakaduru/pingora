import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Maximize2, Minimize2, User, RefreshCw, Shield, Activity, AlertCircle,
  UserPlus, X
} from 'lucide-react';

const CallModal = ({ call, onHangup, ws, dmPartners = [], onlineUsers = new Set(), getUser, user, allUsers = [] }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(call.type === 'voice');
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [startTime, setStartTime] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isSwapped, setIsSwapped] = useState(false);
  const [isRemoteCameraOff, setIsRemoteCameraOff] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); 
  const [updateTick, setUpdateTick] = useState(0);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [participants, setParticipants] = useState([call.target]);
  const [remoteStreams, setRemoteStreams] = useState({}); // { username: MediaStream }
  const [remoteStates, setRemoteStates] = useState({}); // { username: { cameraOff, muted } }
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [speakingUsers, setSpeakingUsers] = useState({}); // { username: boolean }
  
  const peersRef = useRef({}); // { username: RTCPeerConnection }
  const remoteStreamsRef = useRef({}); // { username: MediaStream }
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const startTimeRef = useRef(null);
  const participantsRef = useRef([call.target]); // live ref so event handlers avoid stale closure

  // Keep ref in sync so event handlers always see current participants
  useEffect(() => { participantsRef.current = participants; }, [participants]);

  const localStreamReadyRef = useRef(false);
  const remoteReadyRef = useRef(false); 
  const pendingOfferRef = useRef(null);
  const candidateQueueRef = useRef([]);
  const remoteDescSetRef = useRef(false);
  const hasSentReady = useRef(false);
  const hasSentOffer = useRef(false);
  const hasCalledHangup = useRef(false);
  const onHangupRef = useRef(onHangup);
  const wsRefLocal = useRef(ws);

  // Audio analysis for speaking indicators
  useEffect(() => {
    const audioContexts = {};
    const analyzers = {};
    const animationIds = {};

    const setupAnalyzer = (username, stream) => {
      if (!stream || stream.getAudioTracks().length === 0) return;
      
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyzer = audioCtx.createAnalyser();
        analyzer.fftSize = 256;
        source.connect(analyzer);
        
        audioContexts[username] = audioCtx;
        analyzers[username] = analyzer;

        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkAudio = () => {
          analyzer.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
          const average = sum / bufferLength;
          
          setSpeakingUsers(prev => ({
            ...prev,
            [username]: average > 20 // Threshold for "speaking"
          }));
          
          animationIds[username] = requestAnimationFrame(checkAudio);
        };
        
        checkAudio();
      } catch (e) {
        console.error("Audio analyzer setup failed for", username, e);
      }
    };

    // Setup for all remote streams
    Object.entries(remoteStreams).forEach(([username, stream]) => {
      if (!analyzers[username]) setupAnalyzer(username, stream);
    });

    return () => {
      Object.values(animationIds).forEach(id => cancelAnimationFrame(id));
      Object.values(audioContexts).forEach(ctx => ctx.close());
    };
  }, [remoteStreams]);

  useEffect(() => { onHangupRef.current = onHangup; }, [onHangup]);
  useEffect(() => { wsRefLocal.current = ws; }, [ws]);

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { 
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      { 
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  };

  const attemptPlay = async (el) => {
    if (!el) return;
    try {
      await el.play();
      setIsAutoplayBlocked(false);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setIsAutoplayBlocked(true);
      }
    }
  };

  const assignRemoteStream = (stream) => {
    if (remoteVideoRef.current && stream) {
      if (remoteVideoRef.current.srcObject !== stream) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.muted = false;
        attemptPlay(remoteVideoRef.current);
      }
    }
  };

  const createPeer = useCallback((targetUsername) => {
    if (peersRef.current[targetUsername]) return peersRef.current[targetUsername];

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[targetUsername] = pc;

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setCallStatus('Connected');
        setStartTime(prev => prev || Date.now());
      } else if (pc.iceConnectionState === 'failed') {
        setCallStatus('Connection Failed');
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'webrtc_signal', target: targetUsername, call_id: call.call_id,
          signal: { type: 'candidate', candidate: event.candidate }
        }));
      }
    };

    pc.ontrack = (event) => {
      let stream = event.streams[0];
      if (!stream) {
        if (!remoteStreamsRef.current[targetUsername]) remoteStreamsRef.current[targetUsername] = new MediaStream();
        stream = remoteStreamsRef.current[targetUsername];
        stream.addTrack(event.track);
      } else {
        remoteStreamsRef.current[targetUsername] = stream;
      }
      setRemoteStreams(prev => ({ ...prev, [targetUsername]: stream }));
      setUpdateTick(prev => prev + 1);
    };

    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    return pc;
  }, [localStream, ws, call.call_id]);

  useEffect(() => {
    const handleSignal = async (e) => {
      const message = e.detail;
      const from = (message.from || '').toLowerCase();
      if (message.call_id !== call.call_id) return;
      
      console.log(`[WebRTC] Signal from ${from}:`, message.signal.type);
      const signal = message.signal;
      try {
        if (from !== 'system' && from !== call.target && !participantsRef.current.includes(from)) {
            setParticipants(prev => [...new Set([...prev, from])]);
        }

        if (signal.type === 'ready') {
          const isTarget = from === call.target;
          let shouldSendOffer = false;
          
          if (isTarget && call.isCaller) {
              shouldSendOffer = true;
          } else if (!isTarget) {
              shouldSendOffer = true;
          }

          if (shouldSendOffer) {
              const checkReadyAndSend = () => {
                  if (localStreamReadyRef.current) sendOffer(from);
                  else setTimeout(checkReadyAndSend, 500);
              };
              checkReadyAndSend();
          }
        } else if (signal.type === 'offer') {
          const handleOffer = () => {
              if (localStreamReadyRef.current) processOffer(from, signal);
              else setTimeout(handleOffer, 500);
          };
          handleOffer();
        } else if (signal.type === 'answer') {
          const pc = peersRef.current[from];
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            processIceQueue(from);
          }
        } else if (signal.type === 'candidate') {
          if (signal.candidate) {
            const candidate = new RTCIceCandidate(signal.candidate);
            const pc = peersRef.current[from];
            if (pc && pc.remoteDescription) {
              await pc.addIceCandidate(candidate).catch(() => {});
            } else {
              if (!candidateQueueRef.current[from]) candidateQueueRef.current[from] = [];
              candidateQueueRef.current[from].push(candidate);
            }
          }
        } else if (signal.type === 'camera_toggle') {
          setRemoteStates(prev => ({ ...prev, [from]: { ...prev[from], cameraOff: signal.enabled === false } }));
        } else if (signal.type === 'mic_toggle') {
          setRemoteStates(prev => ({ ...prev, [from]: { ...prev[from], muted: signal.enabled === false } }));
        } else if (signal.type === 'add_participant') {
          const newParticipant = signal.participant;
          // Add to UI if not already present
          setParticipants(prev => [...new Set([...prev, newParticipant])]);
          // Send a 'ready' signal to the new participant so they know we exist
          // and will respond with an offer to us (standard handshake)
          const pingWhenReady = () => {
              if (ws?.readyState === WebSocket.OPEN && localStreamReadyRef.current) {
                 ws.send(JSON.stringify({
                   type: 'webrtc_signal',
                   target: newParticipant,
                   call_id: call.call_id,
                   signal: { type: 'ready' }
                 }));
              } else {
                 setTimeout(pingWhenReady, 500);
              }
          };
          pingWhenReady();
        }
      } catch (err) { console.error("[WebRTC] Signal error:", err); }
    };

    const processOffer = async (from, offer) => {
      const pc = createPeer(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify({
        type: 'webrtc_signal', target: from, call_id: call.call_id, signal: answer
      }));
      processIceQueue(from);
    };

    const processIceQueue = async (from) => {
      const queue = candidateQueueRef.current[from] || [];
      const pc = peersRef.current[from];
      while (queue.length > 0 && pc) {
        try { await pc.addIceCandidate(queue.shift()); } catch(e) {}
      }
    };

    const sendOffer = async (from) => {
      const pc = createPeer(from);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({
          type: 'webrtc_signal', target: from, call_id: call.call_id, signal: offer
        }));
      } catch (err) { console.error("[WebRTC] Offer error:", err); }
    };

    const handleHangupEvent = (e) => {
      const message = e.detail;
      const targetToRemove = message.from || message.username || message.target; // Depending on how the message is structured
      if (!targetToRemove) return;
      
      const pName = targetToRemove.toLowerCase();
      if (peersRef.current[pName]) {
          peersRef.current[pName].close();
          delete peersRef.current[pName];
      }
      
      setParticipants(prev => {
          const next = prev.filter(p => p !== pName);
          if (next.length === 0) {
              handleManualHangup();
          }
          return next;
      });
    };

    const handleParticipantJoined = (e) => {
      const { participant } = e.detail;
      console.log(`[WebRTC] Participant joined event: ${participant}`);
       // 1. Add to our UI
       setParticipants(prev => {
           const next = [...new Set([...prev, participant])];
           participantsRef.current = next; 
           return next;
       });

      // 2. Send a 'ready' to the new participant to kick off our peer handshake with them
      const sendReadyToNew = () => {
          if (ws?.readyState === WebSocket.OPEN && localStreamReadyRef.current) {
              ws.send(JSON.stringify({
                  type: 'webrtc_signal',
                  target: participant,
                  call_id: call.call_id,
                  signal: { type: 'ready' }
              }));
          } else {
              setTimeout(sendReadyToNew, 500);
          }
      };
      sendReadyToNew();

      // 3. Tell all OTHER existing participants so they also connect to the new joiner
      participantsRef.current.forEach(p => {
          if (p !== participant && ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                  type: 'webrtc_signal',
                  target: p,
                  call_id: call.call_id,
                  signal: { type: 'add_participant', participant }
              }));
          }
      });
    };

    window.addEventListener('webrtc_signal', handleSignal);
    window.addEventListener('call_hangup_event', handleHangupEvent);
    window.addEventListener('call_rejected_event', handleHangupEvent);
    window.addEventListener('call_participant_joined', handleParticipantJoined);

    // Initial peer
    if (localStreamReadyRef.current) {
        if (!peersRef.current[call.target]) {
            createPeer(call.target);
        }
        if (ws?.readyState === WebSocket.OPEN && !hasSentReady.current) {
            ws.send(JSON.stringify({
              type: 'webrtc_signal', target: call.target, call_id: call.call_id, signal: { type: 'ready' }
            }));
            hasSentReady.current = true;
        }
    }

    return () => {
      window.removeEventListener('webrtc_signal', handleSignal);
      window.removeEventListener('call_hangup_event', handleHangupEvent);
      window.removeEventListener('call_rejected_event', handleHangupEvent);
      window.removeEventListener('call_participant_joined', handleParticipantJoined);
    };
  }, [localStream, createPeer, call.target, call.call_id, ws]);

  useEffect(() => {
    const startCall = async () => {
      try {
        const constraints = {
          audio: true,
          video: call.type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
        };
        
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (mediaErr) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setIsCameraOff(true);
        }

        setLocalStream(stream);
        localStreamReadyRef.current = true;

        if (pendingOfferRef.current) {
          const { from, signal } = pendingOfferRef.current;
          // processOffer will be handled by the signal listener once localStreamReadyRef is true
        }

      } catch (err) {
        console.error("Media access error:", err);
        if (!window.isSecureContext) {
          setCallStatus('Secure Context Required (HTTPS)');
        } else if (err.name === 'NotAllowedError') {
          setCallStatus('Permission Denied');
        } else {
          setCallStatus('Media Error');
        }
      }
    };

    startCall();

    return () => {
        Object.values(peersRef.current).forEach(pc => pc.close());
    };
  }, []);

  useEffect(() => {
    let interval;
    if (startTime) {
      interval = setInterval(() => setDuration(Math.floor((Date.now() - startTime) / 1000)), 1000);
    }
    return () => clearInterval(interval);
  }, [startTime]);

  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);

  useEffect(() => {
    return () => {
      if (!hasCalledHangup.current) {
        hasCalledHangup.current = true;
        console.log("[WebRTC] CallModal unmounting, sending final hangup...");
        // Broadcast hangup to all participants before unmounting
        if (wsRefLocal.current?.readyState === WebSocket.OPEN) {
          participantsRef.current.forEach(p => {
             if (p !== call.target) {
                 wsRefLocal.current.send(JSON.stringify({
                    type: 'call_hangup',
                    target: p,
                    call_id: call.call_id
                 }));
             }
          });
        }
        if (onHangupRef.current) {
           onHangupRef.current(startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0, participantsRef.current);
        }
      }
    };
  }, []); // Truly only on mount/unmount

  const handleManualHangup = () => {
    if (hasCalledHangup.current) return;
    hasCalledHangup.current = true;
    
    if (ws?.readyState === WebSocket.OPEN) {
      participants.forEach(p => {
         if (p !== call.target) {
             ws.send(JSON.stringify({
                type: 'call_hangup',
                target: p,
                call_id: call.call_id
             }));
         }
      });
    }

    onHangup(startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0, participants);
  };

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
          localVideoRef.current.srcObject = localStream;
      }
      attemptPlay(localVideoRef.current);
    }
    const mainRemoteStream = participants.length === 1 ? remoteStreams[participants[0]] : null;
    if (remoteVideoRef.current && mainRemoteStream) {
      if (remoteVideoRef.current.srcObject !== mainRemoteStream) {
         remoteVideoRef.current.srcObject = mainRemoteStream;
      }
      attemptPlay(remoteVideoRef.current);
    }
  }, [localStream, remoteStreams, participants, updateTick]);

  useEffect(() => {
    return () => { if (localStream) localStream.getTracks().forEach(t => t.stop()); };
  }, [localStream]);

  const toggleMute = () => {
    if (!localStream) return;
    const newMuted = !isMuted;
    localStream.getAudioTracks().forEach(t => t.enabled = isMuted);
    setIsMuted(newMuted);
    participantsRef.current.forEach(p => {
      ws.send(JSON.stringify({ type: 'webrtc_signal', target: p, call_id: call.call_id, signal: { type: 'mic_toggle', enabled: !newMuted } }));
    });
  };

  const toggleCamera = () => {
    if (!localStream) return;
    const newCameraOff = !isCameraOff;
    localStream.getVideoTracks().forEach(t => t.enabled = isCameraOff);
    setIsCameraOff(newCameraOff);
    participantsRef.current.forEach(p => {
      ws.send(JSON.stringify({ type: 'webrtc_signal', target: p, call_id: call.call_id, signal: { type: 'camera_toggle', enabled: !newCameraOff } }));
    });
  };

  const toggleCameraFacing = async () => {
    if (!localStream || isCameraOff) return;
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacingMode }, audio: false });
      const newVideoTrack = newStream.getVideoTracks()[0];
      Object.values(peersRef.current).forEach(async (pc) => {
        const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (videoSender) await videoSender.replaceTrack(newVideoTrack);
      });
      localStream.getVideoTracks().forEach(t => t.stop());
      setLocalStream(new MediaStream([...localStream.getAudioTracks(), newVideoTrack]));
    } catch (err) {}
  };

  const formatDuration = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const inviteParticipant = (username) => {
    if (participants.includes(username)) return;
    setShowAddParticipant(false);

    if (ws?.readyState === WebSocket.OPEN) {
        // Invite the new user — DO NOT pre-notify existing participants here.
        // Existing participants will be notified AFTER the new user accepts,
        // via the call_response handler in useChatSocket.js dispatching add_participant.
        ws.send(JSON.stringify({
            type: 'call_request',
            target: username.toLowerCase(),
            call_type: call.type,
            call_id: call.call_id
        }));
    }
  };

  const hasLocalVideo = !isCameraOff && localStream?.getVideoTracks()?.some(t => t.enabled);
  const mainRemoteParticipant = participants[0];
  const mainRemoteStream = remoteStreams[mainRemoteParticipant];
  const mainRemoteState = remoteStates[mainRemoteParticipant] || {};
  const hasRemoteVideo = !mainRemoteState.cameraOff && mainRemoteStream?.getVideoTracks()?.some(t => t.enabled);
  const showMainVideo = isSwapped ? hasLocalVideo : hasRemoteVideo;

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-black overflow-hidden"
    >
      <div className="relative w-full h-full">
        
        {participants.length === 1 ? (
           <>
              {/* Main Video View (Full Screen) */}
              <div className="absolute inset-0 bg-surface-lowest overflow-hidden">
                <video 
                  ref={isSwapped ? localVideoRef : remoteVideoRef} 
                  autoPlay playsInline muted={isSwapped}
                  style={isSwapped ? { transform: 'scaleX(-1)' } : {}}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 bg-black ${showMainVideo ? 'z-10 opacity-100' : 'opacity-0'}`} 
                />

                {/* Avatar View if Video is Off */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center space-y-12 transition-all duration-700 ${showMainVideo ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'}`}>
                  <div className="relative">
                     {callStatus === 'Connected' && (
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-20" style={{ animationDuration: '3s' }} />
                     )}
                      <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-surface-low p-2 shadow-soft border border-primary/10 overflow-hidden relative z-10">
                        <div className="w-full h-full rounded-full bg-surface-high flex items-center justify-center overflow-hidden">
                           {getUser && getUser(participants[0])?.profilePhoto ? (
                              <img src={`/api/auth${getUser(participants[0]).profilePhoto}`} alt="" className="w-full h-full object-cover" />
                           ) : (
                              <div className="w-full h-full bg-primary/5 flex items-center justify-center font-black text-5xl text-primary/40 uppercase">
                                 {participants[0]?.[0] || '?'}
                              </div>
                           )}
                        </div>
                      </div>
                  </div>
                  <div className="text-center space-y-4">
                     <div className="flex items-center justify-center gap-3 text-primary/60 mb-1">
                        <Activity size={18} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.4em]">{call.type.toUpperCase()} CALL</span>
                     </div>
                     <h2 className="text-2xl md:text-5xl font-bold tracking-tighter text-text-main">@{participants[0]}</h2>
                     <div className="flex items-center justify-center">
                        <span className={`flex items-center gap-2 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] px-4 md:px-6 py-2 rounded-full ${callStatus.includes('Error') || callStatus.includes('Failed') ? 'bg-red-50 text-red-600' : 'bg-primary/5 text-primary'} border border-primary/10`}>
                          {callStatus.includes('Error') && <AlertCircle size={12} md:size={14} />}
                          {callStatus}
                        </span>
                     </div>
                  </div>
                </div>
              </div>

              {/* Floating PiP View - Only for Video Calls */}
              {call.type === 'video' && (
                <motion.div 
                  layout onClick={() => setIsSwapped(!isSwapped)}
                  className="absolute top-4 right-4 md:top-6 md:right-6 w-24 md:w-56 aspect-[3/4] md:aspect-video rounded-full overflow-hidden border border-white/20 shadow-2xl z-30 cursor-pointer transition-all duration-500 hover:shadow-primary/20 group bg-surface-low"
                >
                  <video 
                    ref={isSwapped ? remoteVideoRef : localVideoRef} 
                    autoPlay playsInline muted={!isSwapped}
                    style={!isSwapped ? { transform: 'scaleX(-1)' } : {}}
                    className={`w-full h-full object-cover transition-opacity ${ (isSwapped ? hasRemoteVideo : hasLocalVideo) ? 'opacity-100' : 'opacity-0' }`} 
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <RefreshCw size={20} className="text-white drop-shadow-md" />
                  </div>
                  {!(isSwapped ? hasRemoteVideo : hasLocalVideo) && (
                    <div className="absolute inset-0 bg-surface-high flex items-center justify-center">
                        <VideoOff size={20} className="text-primary/20" />
                    </div>
                  )}
                </motion.div>
              )}
           </>
        ) : (
           <div className="absolute inset-0 bg-surface-lowest overflow-hidden p-4 md:p-8 pb-32">
              {/* Grid View for Multiple Participants */}
              <div className={`w-full h-full grid gap-4 ${
                 participants.length === 2 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 
                 'grid-cols-2 md:grid-cols-2 lg:grid-cols-4'
              }`}>
                 
                 {/* Local User Tile */}
                 <div className="relative rounded-3xl overflow-hidden bg-surface-low border border-white/10 shadow-2xl h-full w-full">
                    <video 
                       ref={localVideoRef} 
                       autoPlay playsInline muted
                       style={{ transform: 'scaleX(-1)' }}
                       className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 bg-black ${hasLocalVideo ? 'opacity-100' : 'opacity-0'}`} 
                     />
                      {!hasLocalVideo && (
                         <div className="absolute inset-0 flex items-center justify-center bg-surface-high overflow-hidden">
                            {user?.profilePhoto ? (
                               <img src={`/api/auth${user.profilePhoto}`} alt="" className="w-full h-full object-cover opacity-50 blur-sm scale-110" />
                            ) : null}
                            <div className="relative z-10 w-24 h-24 rounded-full bg-surface-lowest/50 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/20">
                               {user?.profilePhoto ? (
                                  <img src={`/api/auth${user.profilePhoto}`} alt="" className="w-full h-full object-cover rounded-full" />
                               ) : (
                                  <span className="text-3xl font-black text-primary/40 uppercase tracking-tighter">
                                     {user?.username?.[0] || 'Y'}
                                  </span>
                               )}
                            </div>
                         </div>
                      )}
                     <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-medium flex items-center gap-2">
                        You {isMuted && <MicOff size={12} className="text-red-400" />}
                     </div>
                 </div>

                 {/* Remote Users Tiles */}
                 {participants.map(p => {
                    const stream = remoteStreams[p];
                    const state = remoteStates[p] || {};
                    const hasVideo = stream ? stream.getVideoTracks()?.some(t => t.enabled) && !state.cameraOff : false;
                    const isSpeaking = speakingUsers[p];
                    
                    return (
                      <div key={p} className="relative rounded-3xl overflow-hidden bg-surface-low border border-white/10 shadow-2xl h-full w-full group">
                          <video 
                             autoPlay playsInline
                             ref={el => { 
                                if (el && stream && el.srcObject !== stream) {
                                  el.srcObject = stream;
                                }
                                if (el) attemptPlay(el);
                             }}
                             className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 bg-black ${hasVideo ? 'opacity-100' : 'opacity-0'}`} 
                           />
                           
                            <div className={`absolute inset-0 flex items-center justify-center bg-surface-high transition-opacity duration-500 ${!hasVideo ? 'opacity-100' : 'opacity-0'} overflow-hidden`}>
                               {getUser && getUser(p)?.profilePhoto && (
                                  <img src={`/api/auth${getUser(p).profilePhoto}`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-xl scale-150" />
                               )}
                               <div className={`w-24 h-24 rounded-full bg-surface-lowest/40 backdrop-blur-xl flex items-center justify-center text-primary/40 border border-white/10 transition-all duration-500 relative z-10 overflow-hidden shadow-2xl ${isSpeaking ? 'scale-110 ring-4 ring-primary/30' : ''}`}>
                                  {getUser && getUser(p)?.profilePhoto ? (
                                     <img src={`/api/auth${getUser(p).profilePhoto}`} alt="" className="w-full h-full object-cover rounded-full" />
                                  ) : (
                                     <span className="text-2xl font-black text-primary/40 uppercase">
                                        {p?.[0] || '?'}
                                     </span>
                                  )}
                               </div>
                            </div>

                           {isSpeaking && (
                              <div className="absolute inset-0 border-2 border-primary/50 rounded-3xl animate-pulse pointer-events-none z-20" />
                           )}

                           <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-30">
                              <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 border border-white/5">
                                 @{p} {state.muted && <MicOff size={10} className="text-red-400" />}
                              </div>
                              {isSpeaking && (
                                 <div className="bg-primary px-2 py-1 rounded-md text-white text-[8px] font-black uppercase tracking-tighter animate-bounce">
                                    Speaking
                                 </div>
                              )}
                           </div>
                      </div>
                    );
                 })}
              </div>
           </div>
        )}

        {/* Floating Encryption Badge */}
        <div className="absolute top-6 left-6 z-30">
           <div className="flex items-center gap-2 px-3 py-1.5 bg-black/20 backdrop-blur-md rounded-full border border-white/10 shadow-sm">
              <Shield size={12} className="text-emerald-400" />
              <span className="text-[9px] font-bold text-white uppercase tracking-widest">Encrypted</span>
           </div>
        </div>

        {/* Floating Centered Toolbar */}
        <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-40 w-[90%] md:w-auto">
           <div className="h-[64px] md:h-[50px] px-4 md:px-6 flex items-center justify-center gap-4 md:gap-10 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-2xl shadow-2xl transition-all duration-300">
              <button onClick={() => setShowAddParticipant(true)} className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-white hover:text-primary transition-all duration-300">
                <UserPlus size={20} />
              </button>
              
              <button onClick={toggleMute} className={`w-8 h-8 md:w-9 md:h-9 flex items-center justify-center transition-all duration-300 ${isMuted ? 'text-red-500' : 'text-white hover:text-primary'}`}>
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              
              <button onClick={handleManualHangup} className="w-10 h-10 md:w-11 md:h-11 bg-red-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20 hover:bg-red-700 active:scale-90 transition-all duration-300">
                <PhoneOff size={20} />
              </button>
              
              {call.type === 'video' && (
                 <>
                   <button onClick={toggleCameraFacing} className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center text-white hover:text-primary transition-all duration-300 active:rotate-180">
                    <RefreshCw size={20} />
                   </button>
                   <button onClick={toggleCamera} className={`w-8 h-8 md:w-9 md:h-9 flex items-center justify-center transition-all duration-300 ${isCameraOff ? 'text-red-500' : 'text-white hover:text-primary'}`}>
                    {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
                   </button>
                 </>
              )}
              
              <div className="pl-2 border-l border-white/10 hidden md:block">
                 <p className="text-[10px] font-mono font-bold tracking-tight text-white/90">{formatDuration(duration)}</p>
              </div>
           </div>
        </div>

        {/* Add Participant Modal Overlay */}
        <AnimatePresence>
          {showAddParticipant && (
             <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="absolute inset-0 bg-surface/40 backdrop-blur-md" 
                   onClick={() => setShowAddParticipant(false)} 
                />
                <motion.div 
                   initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }}
                   transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                   className="relative w-full max-w-sm bg-surface-lowest/80 backdrop-blur-2xl border border-white/20 rounded-[32px] p-8 shadow-premium overflow-hidden"
                >
                   {/* Decorative background glow */}
                   <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                   <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                   <div className="relative z-10">
                      <div className="flex justify-between items-center mb-6">
                         <div>
                            <h3 className="text-2xl font-black text-text-main tracking-tight">Add Participant</h3>
                            <p className="text-[10px] font-bold text-text-soft uppercase tracking-[0.2em] mt-1">Multi-party Call</p>
                         </div>
                         <button 
                            onClick={() => setShowAddParticipant(false)} 
                            className="w-10 h-10 flex items-center justify-center text-text-soft hover:text-text-main transition-all bg-surface-high/50 hover:bg-surface-high rounded-2xl shadow-sm"
                         >
                            <X size={20} />
                         </button>
                      </div>

                      <div className="relative mb-6">
                          <div className="relative group">
                             <input 
                                name="username" type="text" placeholder="Search by username..." autoFocus
                                value={searchQuery}
                                onChange={(e) => {
                                   const val = e.target.value;
                                   setSearchQuery(val);
                                   if (!val.trim()) {
                                      setSearchResults([]);
                                      return;
                                   }
                                   // Combine dmPartners and allUsers for search, excluding current participants and self
                                   const combined = [...dmPartners, ...allUsers].filter((obj, index, self) => 
                                      index === self.findIndex((t) => t.username?.toLowerCase() === obj.username?.toLowerCase())
                                   );

                                   const filtered = combined.filter(p => 
                                      p.username?.toLowerCase() !== user?.username?.toLowerCase() &&
                                      p.username?.toLowerCase().includes(val.toLowerCase()) &&
                                      !participants.map(part => part.toLowerCase()).includes(p.username.toLowerCase())
                                   );
                                   setSearchResults(filtered);
                                }}
                                className="w-full bg-surface-high/40 border border-white/10 rounded-2xl px-5 py-4 text-text-main focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all placeholder:text-text-light/40 pl-12 shadow-sm"
                             />
                             <UserPlus size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-soft group-focus-within:text-primary transition-colors" />
                          </div>

                          <AnimatePresence>
                             {searchResults.length > 0 && (
                                <motion.div 
                                   initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                   className="absolute top-full left-0 right-0 mt-4 bg-surface-lowest/90 backdrop-blur-3xl border border-white/20 rounded-[24px] shadow-premium overflow-hidden z-[100] max-h-72 overflow-y-auto custom-scrollbar"
                                >
                                   <div className="p-3 border-b border-white/5 bg-white/5">
                                       <p className="text-[10px] font-black text-text-soft uppercase tracking-[0.2em] px-2">Suggestions</p>
                                   </div>
                                   <div className="p-2 space-y-1">
                                      {searchResults.map(p => {
                                         const isOnline = onlineUsers.has(p.username.toLowerCase());
                                         return (
                                            <button 
                                               key={p.username}
                                               onClick={() => {
                                                  inviteParticipant(p.username);
                                                  setSearchQuery('');
                                                  setSearchResults([]);
                                                  setShowAddParticipant(false);
                                               }}
                                               className="w-full flex items-center gap-4 p-3 hover:bg-primary/5 rounded-2xl transition-all group text-left"
                                            >
                                                <div className="relative">
                                                   <div className="w-11 h-11 rounded-xl bg-surface-high flex items-center justify-center text-text-soft font-bold text-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors overflow-hidden">
                                                      {getUser && getUser(p.username)?.profilePhoto ? (
                                                         <img src={`/api/auth${getUser(p.username).profilePhoto}`} alt="" className="w-full h-full object-cover" />
                                                      ) : (
                                                         p.username[0].toUpperCase()
                                                      )}
                                                   </div>
                                                  {isOnline && (
                                                     <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-surface-lowest rounded-full shadow-sm" />
                                                  )}
                                               </div>
                                               <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-bold text-text-main group-hover:text-primary transition-colors truncate">@{p.username}</p>
                                                  <p className="text-[10px] font-bold text-text-soft uppercase tracking-wider">
                                                     {isOnline ? 'Available to join' : 'Offline'}
                                                  </p>
                                               </div>
                                               <div className="w-8 h-8 rounded-lg bg-surface-high flex items-center justify-center text-text-soft opacity-0 group-hover:opacity-100 transition-all">
                                                  <UserPlus size={16} />
                                               </div>
                                            </button>
                                         );
                                      })}
                                   </div>
                                </motion.div>
                             )}
                          </AnimatePresence>
                      </div>

                      <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                         <p className="text-xs text-primary/80 font-medium leading-relaxed">
                            Once invited, the participant will receive a call request. They can join the current session immediately after accepting.
                         </p>
                      </div>
                   </div>

                    <form onSubmit={(e) => { 
                       e.preventDefault(); 
                       const val = searchQuery.trim(); 
                       if(val) {
                          inviteParticipant(val);
                          setSearchQuery('');
                          setSearchResults([]);
                          setShowAddParticipant(false);
                       }
                    }} className="relative z-0">
                       <button type="submit" className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center justify-center gap-3">
                          <Phone size={18} />
                          Invite @{searchQuery || '...'}
                       </button>
                    </form>
                </motion.div>
             </div>
          )}
        </AnimatePresence>

        {/* Autoplay Blocked Overlay */}
        <AnimatePresence>
          {isAutoplayBlocked && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-[200] bg-black/40 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center cursor-pointer"
              onClick={() => {
                setIsAutoplayBlocked(false);
                // Attempt to play all known video elements
                if (localVideoRef.current) attemptPlay(localVideoRef.current);
                if (remoteVideoRef.current) attemptPlay(remoteVideoRef.current);
                // Grid videos will be handled by their own autoPlay, but we can nudge them via a state update
                setUpdateTick(prev => prev + 1);
              }}
            >
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Activity size={40} className="text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Join Audio</h3>
              <p className="text-white/60 max-w-xs">Your browser blocked the audio. Click anywhere to join the conversation.</p>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
};

export default CallModal;
