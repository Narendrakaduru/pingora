import { useCallback, useRef } from 'react';
import { getRoomId } from '../../../utils/chatUtils';
import { useSettings } from '../../../context/SettingsContext';

const API_BASE = '/api/chat';

export const useChatActions = ({
  user,
  selectedChat,
  wsRef,
  setMessages,
  showToast,
  refreshPartners,
  setIsRecordingAudio,
  setRecordingTime,
  setShowAttachMenu,
  setShowCameraModal,
  videoRef
}) => {
  const { settings } = useSettings();
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const cameraStreamRef = useRef(null);

  // NOTE: roomId must be computed fresh inside callbacks to avoid stale closure bugs

  const compressImage = useCallback((file, quality) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Configuration based on quality setting
        const config = {
          saver: { maxWidth: 1000, quality: 0.5 },
          auto: { maxWidth: 1600, quality: 0.8 },
          best: { maxWidth: Infinity, quality: 1.0 }
        };

        const { maxWidth, quality: q } = config[quality] || config.auto;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
          URL.revokeObjectURL(img.src);
        }, 'image/jpeg', q);
      };
      img.onerror = () => resolve(file);
    });
  }, []);

  const uploadFile = useCallback(async (file, fileType) => {
    // Compute roomId fresh at call time to avoid stale closure
    const currentRoomId = getRoomId(selectedChat, user.username);
    let fileToUpload = file;

    // Apply compression for images if quality is not 'best'
    if (fileType === 'image' && settings.chats.mediaQuality !== 'best') {
      fileToUpload = await compressImage(file, settings.chats.mediaQuality);
      console.log(`Original: ${file.size}B, Compressed: ${fileToUpload.size}B`);
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('room', currentRoomId);
    formData.append('username', user.username);
    formData.append('user_id', user.id);
    formData.append('file_type', fileType);
    
    try {
      const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
    } catch (err) {
      console.error('Upload failed:', err);
      showToast('Upload failed', 'error');
    }
  }, [selectedChat, user, showToast, compressImage, settings.chats.mediaQuality]);

  const handleFileSelect = useCallback((e, type) => {
    const file = e.target.files[0];
    if (file) {
      let actualType = type;
      if (type === 'image' && file.type.startsWith('video/')) {
        actualType = 'video';
      }
      uploadFile(file, actualType);
    }
    e.target.value = '';
    setShowAttachMenu(false);
  }, [uploadFile, setShowAttachMenu]);

  const startAudioRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `web_voice_${Date.now()}.webm`, { type: 'audio/webm' });
        await uploadFile(file, 'audio');
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingAudio(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Mic access denied:', err);
      showToast('Microphone access denied', 'error');
    }
    setShowAttachMenu(false);
  }, [uploadFile, setIsRecordingAudio, setRecordingTime, setShowAttachMenu, showToast]);

  const stopAudioRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      clearInterval(recordingIntervalRef.current);
    }
  }, [setIsRecordingAudio]);

  const cancelAudioRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Remove onstop handler so audio is NOT uploaded
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      // Stop all mic tracks to release the mic indicator
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
      audioChunksRef.current = [];
    }
    setIsRecordingAudio(false);
    setRecordingTime(0);
    clearInterval(recordingIntervalRef.current);
  }, [setIsRecordingAudio, setRecordingTime]);

  const votePoll = useCallback((msgId, optionIdx) => {
    const currentRoomId = getRoomId(selectedChat, user.username);
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        type: 'poll_vote',
        room: currentRoomId,
        message_id: msgId,
        username: user.username,
        option_index: optionIdx
      }));
    }
  }, [selectedChat, user.username, wsRef]);

  const createPoll = useCallback((question, options) => {
    const currentRoomId = getRoomId(selectedChat, user.username);
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        message_type: 'poll',
        room: currentRoomId,
        username: user.username,
        text: question,
        metadata: {
          question: question,
          options: options.filter(o => o.trim()).map(o => ({ text: o, votes: [] }))
        }
      }));
      showToast('Poll created');
    }
  }, [selectedChat, user.username, wsRef, showToast]);

  const sendReaction = useCallback((msgId, emoji) => {
    const currentRoomId = getRoomId(selectedChat, user.username);
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        type: 'reaction',
        room: currentRoomId,
        message_id: msgId,
        username: user.username,
        emoji: emoji
      }));
    }
  }, [selectedChat, user.username, wsRef]);

  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStreamRef.current = stream;
      setShowCameraModal(true);
      setShowAttachMenu(false);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch (err) {
      console.error('Camera access denied:', err);
      showToast('Camera access denied', 'error');
    }
  }, [setShowCameraModal, setShowAttachMenu, showToast, videoRef]);

  const closeCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setShowCameraModal(false);
  }, [setShowCameraModal]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
          uploadFile(file, 'image');
          closeCamera();
        }
      }, 'image/jpeg');
    }
  }, [uploadFile, closeCamera, videoRef]);

  return {
    uploadFile,
    handleFileSelect,
    startAudioRecording,
    stopAudioRecording,
    cancelAudioRecording,
    votePoll,
    createPoll,
    sendReaction,
    openCamera,
    closeCamera,
    capturePhoto
  };
};
