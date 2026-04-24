import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOW } from '../theme';
import { isWebRTCSupported } from '../utils/webrtc-utils';

const { width, height } = Dimensions.get('window');

// ─── Native Component Placeholder ──────────────────────────────────────────
// We define this as a separate functional component so hooks are isolated.
function CallModalActive({ call, onHangup, wsRef, WebRTC, InCallManager }) {
  const { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices, RTCView } = WebRTC;
  
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(call.type === 'voice');
  const [isSpeakerOn, setIsSpeakerOn] = useState(call.type === 'video');
  const [callStatus, setCallStatus] = useState('Connecting...');
  const [isSwapped, setIsSwapped] = useState(false);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const startTimeRef = useRef(null);
  const hasSentReady = useRef(false);
  const hasSentOffer = useRef(false);

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      {
        urls: [
          'stun:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp'
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  };

  useEffect(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    const candidateQueue = [];
    let remoteDescSet = false;
    let localStreamReady = false;
    let pendingOffer = null;
    let remoteReady = false;

    pc.oniceconnectionstatechange = (e) => {
      const state = pc.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        setCallStatus('Connected');
        if (!startTimeRef.current) startTimeRef.current = Date.now();
      } else if (state === 'failed') {
        setCallStatus('Connection Failed');
      } else if (state === 'disconnected') {
        setCallStatus('Reconnecting...');
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'webrtc_signal',
          target: call.target,
          call_id: call.call_id,
          signal: { type: 'candidate', candidate: event.candidate }
        }));
      }
    };

    pc.ontrack = (event) => {
      console.log("Remote track received:", event.track.kind);
      
      // Explicitly enable the track
      if (event.track) {
        event.track.enabled = true;
      }

      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        // Double check audio tracks in the stream
        event.streams[0].getAudioTracks().forEach(t => {
          console.log("Remote audio track from stream:", t.id, "enabled:", t.enabled);
          t.enabled = true;
        });
      } else {
        // Fallback for some implementations that don't provide a streams array
        const newStream = new MediaStream([event.track]);
        setRemoteStream(newStream);
      }
      setCallStatus('Connected');
      if (!startTimeRef.current) startTimeRef.current = Date.now();
    };

    const handleSignal = async (e) => {
      const message = JSON.parse(e.data);
      if (message.type !== 'webrtc_signal') return;
      if (message.from?.toLowerCase() !== call.target?.toLowerCase()) return;
      if (message.call_id !== call.call_id) return;
      const signal = message.signal;

      try {
        if (signal.type === 'ready') {
          if (call.isCaller && localStreamReady) {
            sendOffer();
          } else {
            remoteReady = true;
          }
          return;
        }

        if (signal.type === 'offer') {
          if (!localStreamReady) {
            pendingOffer = signal;
            return;
          }
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          remoteDescSet = true;
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          wsRef.current.send(JSON.stringify({
            type: 'webrtc_signal',
            target: call.target,
            call_id: call.call_id,
            signal: answer
          }));
          while (candidateQueue.length > 0) {
            await pc.addIceCandidate(candidateQueue.shift());
          }
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          remoteDescSet = true;
          while (candidateQueue.length > 0) {
            await pc.addIceCandidate(candidateQueue.shift());
          }
        } else if (signal.type === 'candidate') {
          const candidate = new RTCIceCandidate(signal.candidate);
          if (remoteDescSet) {
            await pc.addIceCandidate(candidate);
          } else {
            candidateQueue.push(candidate);
          }
        }
      } catch (err) {
        console.error("Signal Handling Error:", err);
      }
    };

    wsRef.current?.addEventListener('message', handleSignal);

    const startCall = async () => {
      try {
        let isFront = true;
        const sourceInfos = await mediaDevices.enumerateDevices();
        let videoSourceId;
        for (let i = 0; i < sourceInfos.length; i++) {
          const sourceInfo = sourceInfos[i];
          if (sourceInfo.kind == "videoinput" && sourceInfo.facing == (isFront ? "front" : "environment")) {
            videoSourceId = sourceInfo.deviceId;
          }
        }

        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: call.type === 'video' ? {
            width: 640,
            height: 480,
            frameRate: 30,
            facingMode: (isFront ? "user" : "environment"),
            deviceId: videoSourceId
          } : false
        });

        setLocalStream(stream);
        localStreamRef.current = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        localStreamReady = true;

        if (!hasSentReady.current && wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'webrtc_signal',
            target: call.target,
            call_id: call.call_id,
            signal: { type: 'ready' }
          }));
          hasSentReady.current = true;
        }

        if (call.isCaller && remoteReady) {
          sendOffer();
        } else if (pendingOffer) {
          await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
          remoteDescSet = true;
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          wsRef.current.send(JSON.stringify({
            type: 'webrtc_signal',
            target: call.target,
            call_id: call.call_id,
            signal: answer
          }));
          pendingOffer = null;
          while (candidateQueue.length > 0) {
            await pc.addIceCandidate(candidateQueue.shift());
          }
        }
      } catch (err) {
        setCallStatus('Media Error: ' + err.message);
      }
    };

    const sendOffer = async () => {
      if (hasSentOffer.current) return;
      hasSentOffer.current = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      wsRef.current.send(JSON.stringify({
        type: 'webrtc_signal',
        target: call.target,
        call_id: call.call_id,
        signal: offer
      }));
    };

    startCall();

    // Start InCallManager to manage audio routing
    if (InCallManager) {
      InCallManager.start({ media: call.type === 'video' ? 'video' : 'audio' });
      InCallManager.setSpeakerphoneOn(isSpeakerOn);
    }

    return () => {
      wsRef.current?.removeEventListener('message', handleSignal);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      // Ensure local tracks are stopped
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      // Stop InCallManager
      if (InCallManager) {
        InCallManager.stop();
      }
    };
  }, [call.target]);

  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [localStream]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = isCameraOff);
      setIsCameraOff(!isCameraOff);
    }
  };

  const switchCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        if (track._switchCamera) track._switchCamera();
      });
    }
  };
  
  const toggleSpeaker = () => {
    if (InCallManager) {
      const nextState = !isSpeakerOn;
      InCallManager.setSpeakerphoneOn(nextState);
      setIsSpeakerOn(nextState);
    }
  };

  const endCall = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'call_hangup',
        target: call.target,
        call_id: call.call_id
      }));
    }
    const duration = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
    onHangup(duration);
  };

  return (
    <View style={styles.container}>
      <View style={styles.remoteContainer}>
        {(!remoteStream || call.type === 'voice') ? (
          <View style={styles.fallback}>
            <Ionicons name="person-circle-outline" size={120} color={COLORS.primaryLight} />
            <Text style={styles.targetName}>{call.target}</Text>
            <Text style={styles.status}>{callStatus}</Text>
          </View>
        ) : (
          <RTCView 
            streamURL={isSwapped ? localStream.toURL() : remoteStream.toURL()} 
            style={styles.fullVideo} 
            objectFit="cover" 
          />
        )}
      </View>

      {call.type === 'video' && localStream && (
        <TouchableOpacity style={styles.pipContainer} onPress={() => setIsSwapped(!isSwapped)} activeOpacity={0.8}>
          <RTCView 
            streamURL={isSwapped && remoteStream ? remoteStream.toURL() : localStream.toURL()} 
            style={styles.pipVideo} 
            objectFit="cover" 
            zOrder={1} 
          />
        </TouchableOpacity>
      )}

      <SafeAreaView style={styles.controlsArea}>
        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            style={[styles.ctrlBtn, isMuted ? styles.ctrlActive : styles.ctrlInactive]} 
            onPress={toggleMute}
          >
            <Ionicons name={isMuted ? "mic-off" : "mic"} size={26} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.ctrlBtn, isSpeakerOn ? styles.ctrlActive : styles.ctrlInactive]} 
            onPress={toggleSpeaker}
          >
            <Ionicons name={isSpeakerOn ? "volume-high" : "volume-medium"} size={26} color="#fff" />
          </TouchableOpacity>

          {call.type === 'video' && (
            <TouchableOpacity 
              style={styles.ctrlInactive} 
              onPress={switchCamera}
            >
              <Ionicons name="camera-reverse" size={26} color="#fff" />
            </TouchableOpacity>
          )}

          {call.type === 'video' && (
            <TouchableOpacity 
              style={[styles.ctrlBtn, isCameraOff ? styles.ctrlActive : styles.ctrlInactive]} 
              onPress={toggleCamera}
            >
              <Ionicons name={isCameraOff ? "videocam-off" : "videocam"} size={26} color="#fff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.endBtn} 
            onPress={endCall}
          >
            <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Main Guard Component ──────────────────────────────────────────────────
export default function CallModal({ call, onHangup, wsRef }) {
  
  const handleClose = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'call_hangup',
        target: call.target,
        call_id: call.call_id
      }));
    }
    onHangup(0);
  };

  // 1. Check if WebRTC is supported
  const supported = isWebRTCSupported();

  // 2. If not supported, render Fallback UI immediately
  if (!supported) {
    return (
      <Modal animationType="slide" visible={true} onRequestClose={handleClose}>
        <View style={styles.container}>
          <SafeAreaView style={[styles.fallback, { flex: 1, justifyContent: 'center' }]}>
            <Ionicons name="warning-outline" size={80} color={COLORS.error} />
            <Text style={[styles.targetName, { textAlign: 'center', paddingHorizontal: 40 }]}>Native WebRTC Required</Text>
            <Text style={[styles.status, { textAlign: 'center', paddingHorizontal: 40, color: COLORS.textSub, marginTop: 16 }]}>
              Audio and Video calling requires a custom development build. This feature is not supported in the standard Expo Go app. 
            </Text>
            <TouchableOpacity 
              style={[styles.endBtn, { marginTop: 40, width: 200, borderRadius: 12, flexDirection: 'row', gap: 10, marginLeft: 0 }]} 
              onPress={handleClose}
            >
              <Ionicons name="close-circle" size={24} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    );
  }

  // 3. Only if supported, we require the library and render the active component
  // This ensure the library is NEVER required on platforms where it would crash.
  let WebRTCModules;
  let InCallManager;
  try {
     WebRTCModules = require('react-native-webrtc');
     InCallManager = require('react-native-incall-manager').default;
  } catch (e) {
     return (
        <View style={styles.container}>
           <Text style={{color: 'white', textAlign: 'center', marginTop: 100}}>Failed to load Native Bindings</Text>
        </View>
     );
  }

  return (
    <Modal 
      animationType="slide" 
      transparent={false} 
      visible={true} 
      onRequestClose={handleClose}
    >
      <CallModalActive 
        call={call} 
        onHangup={onHangup} 
        wsRef={wsRef} 
        WebRTC={WebRTCModules} 
        InCallManager={InCallManager}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  remoteContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullVideo: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    alignItems: 'center',
  },
  targetName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: 10,
  },
  status: {
    fontSize: 16,
    color: COLORS.primary,
    marginTop: 8,
  },
  pipContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 110,
    height: 150,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  pipVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  controlsArea: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 40,
    gap: 16,
    alignItems: 'center',
  },
  ctrlBtn: {
  },
  ctrlInactive: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlActive: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});
