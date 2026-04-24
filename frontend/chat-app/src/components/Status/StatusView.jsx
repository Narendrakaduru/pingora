import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Camera, Type, X, ChevronLeft, MoreVertical, 
  Play, Pause, Volume2, VolumeX, ChevronRight, Trash2, Smile, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { USER_API, STATUS_API } from '../../utils/chatUtils';
import StatusPlayer from './StatusPlayer';
import EmojiPicker from 'emoji-picker-react';
import { useSettings } from '../../context/SettingsContext';

const StatusView = ({ user, onBack }) => {
  const { settings } = useSettings();
  const [groupedStatuses, setGroupedStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatusUser, setActiveStatusUser] = useState(null);
  const [showTextCreator, setShowTextCreator] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [textStatus, setTextStatus] = useState('');
  const [bgColor, setBgColor] = useState('#128C7E');
  const fileInputRef = useRef(null);

  const colors = [
    '#128C7E', '#075E54', '#34B7F1', '#25D366', 
    '#7E57C2', '#EC407A', '#FF7043', '#263238'
  ];

  const fetchStatuses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(STATUS_API, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setGroupedStatuses(data.grouped);
      }
    } catch (err) {
      console.error('Error fetching statuses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('media', file);
    formData.append('type', file.type.startsWith('video/') ? 'video' : 'image');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(STATUS_API, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        fetchStatuses();
      }
    } catch (err) {
      console.error('Error uploading status:', err);
    }
  };

  const handleTextStatusSubmit = async () => {
    if (!textStatus.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(STATUS_API, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'text',
          content: textStatus,
          backgroundColor: bgColor
        })
      });
      const data = await response.json();
      if (data.success) {
        setTextStatus('');
        setShowTextCreator(false);
        fetchStatuses();
      }
    } catch (err) {
      console.error('Error posting text status:', err);
    }
  };

  const myStatusGroup = groupedStatuses.find(g => g.user.username === user.username);
  const otherStatuses = groupedStatuses.filter(g => g.user.username !== user.username);

  const getStatusBorderClass = (group) => {
    if (!group) return 'border-dashed border-text-light/30';
    const allViewed = group.statuses.every(s => s.viewers && s.viewers.map(String).includes(String(user.id)));
    return allViewed ? 'border-text-light/30' : 'border-primary';
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="p-6 flex items-center gap-4 border-b border-border/10">
        <button onClick={onBack} className="md:hidden p-2 hover:bg-surface-high rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold tracking-tight">Status</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* My Status */}
        <section>
          <h3 className="text-sm font-bold text-text-light uppercase tracking-widest mb-4">My Status</h3>
          <div className="flex items-center gap-4">
            <div 
              className="relative cursor-pointer"
              onClick={() => myStatusGroup && setActiveStatusUser(myStatusGroup)}
            >
              <div className={`w-16 h-16 rounded-full p-1 border-2 ${getStatusBorderClass(myStatusGroup)}`}>
                {user.profilePhoto ? (
                  <img src={`${USER_API}${user.profilePhoto}`} className="w-full h-full rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xl">
                    {user.username[0].toUpperCase()}
                  </div>
                )}
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center border-2 border-surface shadow-sm"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-text-main">My status</h4>
              <p className="text-sm text-text-soft">
                {myStatusGroup ? `Last updated ${new Date(myStatusGroup.statuses[myStatusGroup.statuses.length - 1].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Tap to add status update'}
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowTextCreator(true)}
                className="p-3 bg-surface-high/50 hover:bg-surface-high rounded-full text-text-soft transition-all"
              >
                <Type size={20} />
              </button>
              <button 
                onClick={() => fileInputRef.current.click()}
                className="p-3 bg-surface-high/50 hover:bg-surface-high rounded-full text-text-soft transition-all"
              >
                <Camera size={20} />
              </button>
            </div>
          </div>
        </section>

        {/* Recent Updates */}
        {otherStatuses.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-text-light uppercase tracking-widest mb-4">Recent updates</h3>
            <div className="space-y-4">
              {otherStatuses.map((group) => (
                <button
                  key={group.user.username}
                  onClick={() => setActiveStatusUser(group)}
                  className="w-full flex items-center gap-4 p-2 hover:bg-surface-high/20 rounded-2xl transition-all text-left group"
                >
                  <div className={`w-16 h-16 rounded-full p-1 border-2 ${getStatusBorderClass(group)}`}>
                    {group.user.profilePhoto ? (
                      <img src={`${USER_API}${group.user.profilePhoto}`} className="w-full h-full rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xl">
                        {group.user.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-text-main group-hover:text-primary transition-colors">{group.user.fullName || group.user.username}</h4>
                    <p className="text-sm text-text-soft">
                      {new Date(group.statuses[group.statuses.length - 1].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {loading && <div className="text-center py-10 text-text-soft">Loading statuses...</div>}
        {!loading && groupedStatuses.length === 0 && (
          <div className="text-center py-20">
            <p className="text-text-soft">No status updates yet</p>
          </div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*,video/*" 
        onChange={handleFileUpload}
      />

      {/* Text Status Creator Modal */}
      <AnimatePresence>
        {showTextCreator && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6"
            style={{ backgroundColor: bgColor }}
          >
            <button 
              onClick={() => setShowTextCreator(false)}
              className="absolute top-6 right-6 p-2 text-white/80 hover:text-white"
            >
              <X size={32} />
            </button>

            <textarea
              autoFocus
              className="w-full max-w-2xl bg-transparent border-none outline-none text-white text-4xl font-bold text-center placeholder:text-white/30 resize-none"
              placeholder="Type a status"
              value={textStatus}
              onChange={(e) => setTextStatus(e.target.value)}
            />

            <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-6">
              <div className="flex gap-3 overflow-x-auto p-2 no-scrollbar">
                {colors.map(c => (
                  <button
                    key={c}
                    onClick={() => setBgColor(c)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${bgColor === c ? 'border-white scale-125' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <button 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all"
                  >
                    <Smile size={24} />
                  </button>
                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute bottom-full left-0 mb-4 z-[110] shadow-2xl"
                      >
                        <EmojiPicker 
                          onEmojiClick={(emoji) => {
                            setTextStatus(prev => prev + emoji.emoji);
                            setShowEmojiPicker(false);
                          }}
                          theme={settings.theme === 'dark' ? 'dark' : 'light'}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={handleTextStatusSubmit}
                  disabled={!textStatus.trim()}
                  className="px-10 py-4 bg-white text-black font-black rounded-full shadow-xl disabled:opacity-50 active:scale-95 transition-all"
                >
                  Post Status
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Player Overlay */}
      <AnimatePresence>
        {activeStatusUser && (
          <StatusPlayer 
            group={activeStatusUser} 
            onClose={() => {
              setActiveStatusUser(null);
              fetchStatuses(); // Refresh statuses to update 'viewed' states
            }}
            onNextUser={() => {
              const nextIdx = groupedStatuses.findIndex(g => g.user.username === activeStatusUser.user.username) + 1;
              if (nextIdx < groupedStatuses.length) setActiveStatusUser(groupedStatuses[nextIdx]);
              else setActiveStatusUser(null);
            }}
            onPrevUser={() => {
              const prevIdx = groupedStatuses.findIndex(g => g.user.username === activeStatusUser.user.username) - 1;
              if (prevIdx >= 0) setActiveStatusUser(groupedStatuses[prevIdx]);
              else setActiveStatusUser(null);
            }}
            isOwn={activeStatusUser.user.username.toLowerCase() === user.username.toLowerCase()}
            onDelete={async (statusId) => {
              try {
                const token = localStorage.getItem('token');
                await fetch(`${STATUS_API}/${statusId}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                fetchStatuses();
                setActiveStatusUser(null);
              } catch (err) {
                console.error('Error deleting status:', err);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StatusView;
