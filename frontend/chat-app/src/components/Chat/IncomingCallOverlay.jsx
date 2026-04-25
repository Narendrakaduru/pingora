import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Phone, X, Video, Activity } from 'lucide-react';
import ringtone from '../../assets/notifications/teams_call.mp3';

const IncomingCallOverlay = ({ call, onAccept, onReject, getUser }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(ringtone);
    audio.loop = true;
    let playPromise = null;

    const playAudio = () => {
      playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          if (err.name !== 'AbortError') {
            console.warn("Autoplay blocked or audio error:", err);
          }
        });
      }
    };

    playAudio();

    return () => {
      if (playPromise !== null) {
        playPromise.then(() => {
          audio.pause();
          audio.currentTime = 0;
        }).catch(() => {
          audio.pause();
        });
      } else {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, []);

  return (
    <motion.div 
      initial={{ y: -120, x: "-50%", opacity: 0, scale: 0.9 }}
      animate={{ y: 0, x: "-50%", opacity: 1, scale: 1 }}
      exit={{ y: -120, x: "-50%", opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="fixed top-4 md:top-8 left-1/2 z-[250] w-full max-w-lg px-3 md:px-6"
    >
      <div className="bg-surface-lowest border border-primary/5 rounded-[24px] md:rounded-[32px] shadow-soft p-3 md:p-5 flex items-center gap-3 md:gap-6 relative overflow-hidden group">
        {/* Subtle Background Interaction */}
        <div className="absolute inset-0 bg-primary/2 cursor-default pointer-events-none" />
        
        {/* Pulse Visualizer */}
        <div className="relative">
           <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-20" />
           <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-surface-low border border-primary/10 flex items-center justify-center text-primary relative z-10 duration-500 overflow-hidden">
             {getUser && getUser(call.from)?.profilePhoto ? (
                <img src={`/api/auth${getUser(call.from).profilePhoto}`} alt="" className="w-full h-full object-cover" />
             ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center font-bold text-lg md:text-2xl text-primary uppercase">
                   {call.from[0]}
                </div>
             )}
           </div>
        </div>
        
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 text-primary mb-1">
             <Activity size={14} className="animate-pulse" />
             <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Incoming Call</p>
          </div>
          <h4 className="text-xl font-bold tracking-tight text-text-main truncate">@{call.from}</h4>
          <p className="text-[10px] font-bold text-text-soft uppercase tracking-[0.1em] opacity-60 mt-0.5">Incoming {call.type} Call...</p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button 
            onClick={onReject}
            className="w-12 h-12 md:w-14 md:h-14 bg-surface-high hover:bg-red-50 hover:text-red-600 text-text-soft rounded-full transition-all duration-300 flex items-center justify-center active:scale-90"
            title="Terminate Link"
          >
            <X size={24} />
          </button>
          <button 
            onClick={onAccept}
            className="w-14 h-14 md:w-16 md:h-16 bg-primary hover:bg-primary-dark text-white rounded-2xl md:rounded-[24px] transition-all duration-500 shadow-xl shadow-primary/20 active:scale-95 flex items-center justify-center"
            title="Initialize Synchronization"
          >
            {call.type === 'video' ? <Video size={24} /> : <Phone size={24} className="fill-current" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default IncomingCallOverlay;
