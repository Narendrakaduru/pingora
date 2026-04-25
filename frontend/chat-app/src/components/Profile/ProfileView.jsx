import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, User, Mail, Shield, Check, ArrowLeft, Loader2, Edit2, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useSettings } from '../../context/SettingsContext';

const USER_API = `/api/auth`;

const ProfileView = ({ onBack }) => {
  const { user, updateProfile } = useAuth();
  const { settings } = useSettings();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [about, setAbout] = useState(user?.about || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(user?.profilePhoto ? `${USER_API}${user.profilePhoto}` : null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [shouldRemovePhoto, setShouldRemovePhoto] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);

  // Initial values are handled in useState. 
  // We don't want to re-sync in useEffect because it can overwrite 
  // the user's typing during background updates (like privacy sync).

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setShouldRemovePhoto(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPhotoPreview(null);
    setShouldRemovePhoto(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('about', about);
      if (selectedFile) {
        formData.append('profilePhoto', selectedFile);
      } else if (shouldRemovePhoto) {
        formData.append('removePhoto', 'true');
      }
      const res = await updateProfile(formData);
      if (res.success) {
        setShouldRemovePhoto(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(res.message || 'Failed to update profile');
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      console.error('Update profile failed:', err);
      setError(err.response?.data?.message || 'Update failed. Check your connection or image size.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-hidden bg-surface flex flex-col h-[100dvh]">
      {/* Header */}
      <header className="h-16 md:h-24 flex items-center justify-between px-4 md:px-12 glass-header border-none shrink-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="p-3 hover:bg-surface-high rounded-xl transition-all text-text-soft active:scale-95"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex flex-col">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-text-main leading-tight">Edit Profile</h2>
            <p className="text-[9px] md:text-[10px] text-text-soft font-bold uppercase tracking-[0.2em] mt-0.5">Update your personal information</p>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mx-auto space-y-6 md:space-y-12 pb-[calc(120px+env(safe-area-inset-bottom))]"
        >
          {/* Profile Details */}
          <section className="bg-surface-lowest rounded-2xl p-5 md:p-16 shadow-soft relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-container opacity-40" />
            
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-14">
              {/* Profile Photo: Refined Framing */}
              <div className="relative group">
                <div className="w-28 h-28 md:w-52 md:h-52 rounded-2xl bg-surface-low p-1.5 overflow-hidden shadow-soft transition-transform duration-700">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <div className="w-full h-full rounded-lg bg-surface-high flex items-center justify-center">
                      <User size={80} className="text-primary/10" />
                    </div>
                  )}
                </div>
                <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="absolute bottom-2 right-2 md:bottom-4 md:right-4 p-3 md:p-4 bg-primary text-white rounded-xl shadow-soft hover:bg-primary-dark transition-all scale-100 md:scale-110 active:scale-95"
                   title="Update Photo"
                >
                  <Camera size={20} className="md:w-6 md:h-6" />
                </button>
                {photoPreview && (
                  <button 
                    onClick={handleRemovePhoto}
                    className="absolute -top-2 -left-2 p-2 bg-red-500 text-white rounded-lg shadow-soft hover:bg-red-600 transition-all active:scale-95 z-10"
                    title="Remove Photo"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  </button>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handlePhotoChange} 
                />
              </div>

              {/* Identity Info */}
              <div className="text-center md:text-left space-y-4 pt-4 md:pt-0">
                <div className="space-y-1">
                  <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-text-main">
                    {user.username.charAt(0).toUpperCase() + user.username.slice(1)}
                  </h3>
                  <div className="flex items-center justify-center md:justify-start gap-2.5 text-text-soft">
                    <Mail size={18} className="text-primary/40" />
                    <span className="text-sm font-semibold tracking-tight">{user.email}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-center md:justify-start gap-2.5 text-primary bg-primary/5 px-4 py-1.5 rounded-full inline-flex border border-primary/10">
                  <Shield size={16} className="text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Verified Identity</span>
                </div>
              </div>
            </div>
          </section>

          {/* Settings Section */}
          <section className="space-y-4 md:space-y-8">
            <div className="flex items-center gap-4 px-2">
               <div className="w-1.5 h-6 bg-primary rounded-full opacity-60" />
                <h4 className="text-base md:text-lg font-bold tracking-tight text-text-soft uppercase tracking-[0.15em]">Profile Settings</h4>
            </div>

            <div className="bg-surface-lowest rounded-2xl p-5 md:p-12 shadow-soft">
              <form onSubmit={handleSave} className="space-y-8 md:space-y-10">
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-text-light uppercase tracking-[0.2em] ml-1">Full Name</label>
                  <div className="relative group">
                    <Edit2 className="absolute left-5 top-1/2 -translate-y-1/2 text-text-light transition-all duration-300 group-focus-within:text-primary" size={20} />
                    <input 
                      type="text" 
                      placeholder="Enter your full name"
                      className="organic-input !pl-14 !pr-14 h-12 md:!h-16 text-base md:text-lg w-full"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`p-2 rounded-xl transition-all ${showEmojiPicker ? 'bg-primary/10 text-primary' : 'text-text-soft hover:bg-surface-high'}`}
                      >
                        <Smile size={24} />
                      </button>

                      <AnimatePresence>
                        {showEmojiPicker && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                            <motion.div 
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="fixed md:absolute bottom-0 left-0 right-0 md:bottom-full md:right-0 md:left-auto mb-0 md:mb-4 z-50 shadow-2xl rounded-t-3xl md:rounded-2xl overflow-hidden border-none"
                            >
                              <EmojiPicker 
                                onEmojiClick={(emojiData) => {
                                  setFullName(prev => prev + emojiData.emoji);
                                  setShowEmojiPicker(false);
                                }}
                                autoFocusSearch={false}
                                theme={settings.theme === 'dark' ? 'dark' : 'light'}
                                width="100%"
                                height={350}
                                previewConfig={{ showPreview: false }}
                              />
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-text-light uppercase tracking-[0.2em] ml-1">About</label>
                  <div className="relative group">
                    <Edit2 className="absolute left-5 top-1/2 -translate-y-1/2 text-text-light transition-all duration-300 group-focus-within:text-primary" size={20} />
                    <input 
                      type="text" 
                      placeholder="Write something about yourself..."
                      className="organic-input !pl-14 h-12 md:!h-16 text-base md:text-lg"
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                    />
                  </div>
                  <p className="text-[11px] text-text-light font-medium italic ml-1 opacity-60">This bio will be visible to your contacts based on your privacy settings.</p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-6 pt-2">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full md:flex-1 h-14 md:h-16 btn-premium tracking-widest uppercase text-sm md:text-base"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={24} />
                    ) : success ? (
                      <div className="flex items-center gap-3">
                        <Check size={24} />
                        <span>Changes Saved</span>
                      </div>
                    ) : 'Save Changes'}
                  </button>
                  <button 
                    type="button"
                    onClick={onBack}
                    className="w-full md:w-auto px-10 h-14 md:h-16 text-text-soft font-bold tracking-tight hover:text-text-main transition-colors uppercase text-sm"
                  >
                    Cancel
                  </button>
                </div>

                {success && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-primary/5 text-primary p-5 rounded-xl flex items-center gap-4 text-sm font-bold border border-primary/20"
                  >
                    <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-md">
                      <Check size={18} />
                    </div>
                    Profile updated successfully.
                  </motion.div>
                )}

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-red-50 text-red-600 p-5 rounded-xl flex items-center gap-4 text-sm font-bold border border-red-100"
                  >
                    <div className="w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-md">
                      <span className="text-lg">!</span>
                    </div>
                    {error}
                  </motion.div>
                )}
              </form>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfileView;
