import React from 'react';
import { X } from 'lucide-react';

const CameraModal = ({ videoRef, onClose, onCapture }) => {
  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center p-4">
      <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-2xl rounded-3xl border-4 border-white/20 shadow-2xl" />
      <div className="flex gap-6 mt-8">
        <button onClick={onClose} className="p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
          <X size={32} />
        </button>
        <button onClick={onCapture} 
          className="w-20 h-20 rounded-full bg-white bg-opacity-90 border-[4px] border-white/20 active:scale-95 transition-all outline outline-offset-4 outline-white/50">
          <div className="w-[66px] h-[66px] rounded-full border-2 border-slate-200 mx-auto"></div>
        </button>
      </div>
      <p className="text-white/60 font-medium mt-4 text-sm">Take Photo</p>
    </div>
  );
};

export default CameraModal;
