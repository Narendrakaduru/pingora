import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2, Eye, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { USER_API, STATUS_API } from '../../utils/chatUtils';

const StatusPlayer = ({ group, onClose, onNextUser, onPrevUser, isOwn, onDelete, initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  
  // Reset index when group changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setProgress(0);
    setShowViewers(false);
    setViewers([]);
  }, [group.user.username, initialIndex]);

  const currentStatus = group.statuses[currentIndex];

  useEffect(() => {
    if (!currentStatus) return;
    // Mark as viewed (only if not own)
    if (!isOwn) {
      const markViewed = async () => {
        try {
          const token = localStorage.getItem('token');
          await fetch(`${STATUS_API}/${currentStatus.id}/view`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } catch (err) {
          console.error('Error marking status viewed:', err);
        }
      };
      markViewed();
    }
  }, [currentStatus?.id, isOwn]);

  const duration = currentStatus?.type === 'video' ? 30000 : 5000;

  useEffect(() => {
    if (paused || showViewers) return;

    const step = 100 / (duration / 50); // Update every 50ms
    timerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, 50);

    return () => clearInterval(timerRef.current);
  }, [currentIndex, paused, duration, showViewers]);

  const fetchViewers = async () => {
    if (!currentStatus || !isOwn) return;
    setLoadingViewers(true);
    setPaused(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${STATUS_API}/${currentStatus.id}/viewers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setViewers(data.viewers);
      }
    } catch (err) {
      console.error('Error fetching viewers:', err);
    } finally {
      setLoadingViewers(false);
      setShowViewers(true);
    }
  };

  const handleNext = () => {
    if (currentIndex < group.statuses.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
      setShowViewers(false);
      setViewers([]);
    } else {
      onNextUser();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
      setShowViewers(false);
      setViewers([]);
    } else {
      onPrevUser();
    }
  };

  const onVideoEnd = () => {
    handleNext();
  };

  const onVideoMetadata = (e) => {
    // If video is shorter than 30s, we might want to adjust, but let's stick to simple logic for now
  };

  if (!currentStatus) return null;

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="fixed inset-0 z-[150] bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/60 to-transparent">
        {/* Progress Bars */}
        <div className="flex gap-1 mb-4">
          {group.statuses.map((s, idx) => (
            <div key={s.id} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-75 ease-linear"
                style={{ 
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
              {group.user.profilePhoto ? (
                <img src={`${USER_API}${group.user.profilePhoto}`} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-white/10 backdrop-blur-md flex items-center justify-center font-bold text-white text-xs border border-white/10">
                  {group.user.username[0].toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h4 className="text-white font-bold text-sm">{group.user.fullName || group.user.username}</h4>
              <p className="text-white/60 text-[10px] uppercase tracking-widest">
                {new Date(currentStatus.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwn && (
              <button 
                onClick={() => onDelete(currentStatus.id)}
                className="p-2 text-white/80 hover:text-red-500 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-white/80 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className="w-full h-full flex items-center justify-center relative"
        onMouseDown={() => !showViewers && setPaused(true)}
        onMouseUp={() => !showViewers && setPaused(false)}
        onTouchStart={() => !showViewers && setPaused(true)}
        onTouchEnd={() => !showViewers && setPaused(false)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStatus.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full h-full flex items-center justify-center"
          >
            {currentStatus.type === 'text' && (
              <div 
                className="w-full h-full flex items-center justify-center p-12 text-center"
                style={{ backgroundColor: currentStatus.backgroundColor }}
              >
                <h1 className="text-white text-4xl font-bold leading-tight max-w-2xl whitespace-pre-wrap">
                  {currentStatus.content}
                </h1>
              </div>
            )}

            {currentStatus.type === 'image' && (
              <img 
                src={`${USER_API}${currentStatus.content}`} 
                className="max-w-full max-h-full object-contain"
                alt=""
              />
            )}

            {currentStatus.type === 'video' && (
              <video
                ref={videoRef}
                src={`${USER_API}${currentStatus.content}`}
                className="max-w-full max-h-full"
                autoPlay
                playsInline
                muted={false}
                onEnded={onVideoEnd}
                onLoadedMetadata={onVideoMetadata}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Overlays */}
        {!showViewers && (
          <>
            <div className="absolute inset-y-0 left-0 w-1/4 z-10 cursor-pointer" onClick={handlePrev} />
            <div className="absolute inset-y-0 right-0 w-1/4 z-10 cursor-pointer" onClick={handleNext} />
          </>
        )}
      </div>

      {/* Viewers Indicator */}
      {isOwn && !showViewers && (
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-8 left-0 right-0 flex justify-center z-[60]"
        >
          <button 
            onClick={fetchViewers}
            className="flex flex-col items-center gap-1 text-white transition-all group active:scale-95"
          >
            <div className="flex items-center gap-2 px-6 py-2 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 shadow-2xl group-hover:bg-white/20 transition-all">
              <Eye size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold">{currentStatus.viewers?.length || 0}</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 group-hover:opacity-100 transition-opacity drop-shadow-md">
              Viewers
            </span>
          </button>
        </motion.div>
      )}

      {/* Viewers List Drawer */}
      <AnimatePresence>
        {showViewers && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowViewers(false);
                setPaused(false);
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 max-h-[60%] bg-[#121212] rounded-t-3xl z-50 flex flex-col border-t border-white/10"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto my-4" />
              <div className="px-6 pb-2 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-white font-bold text-lg">Viewed by</h3>
                <span className="bg-white/10 px-3 py-1 rounded-full text-xs text-white/60">
                  {viewers.length} people
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto px-4 py-2">
                {loadingViewers ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                ) : viewers.length > 0 ? (
                  <div className="space-y-1">
                    {viewers.map(viewer => (
                      <div key={viewer.id} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-colors">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-white/5">
                          {viewer.profilePhoto ? (
                            <img src={`${USER_API}${viewer.profilePhoto}`} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/40">
                              <User size={24} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-semibold">{viewer.fullName || viewer.username}</h4>
                          <p className="text-white/40 text-xs">@{viewer.username}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-white/40">
                    <Eye size={48} className="mb-4 opacity-20" />
                    <p>No views yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hidden Navigation Buttons (Desktop) */}
      {!showViewers && (
        <div className="hidden md:flex absolute inset-x-0 top-1/2 -translate-y-1/2 justify-between px-10 pointer-events-none">
          <button 
            onClick={handlePrev}
            className="p-4 bg-white/10 hover:bg-white/20 rounded-full text-white pointer-events-auto transition-all active:scale-90"
          >
            <ChevronLeft size={32} />
          </button>
          <button 
            onClick={handleNext}
            className="p-4 bg-white/10 hover:bg-white/20 rounded-full text-white pointer-events-auto transition-all active:scale-90"
          >
            <ChevronRight size={32} />
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default StatusPlayer;
