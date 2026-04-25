import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, Clock, AlignLeft } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const EventModal = ({ show, onClose, onCreate, roomId, currentChatName }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toLocaleDateString('en-CA'),
    start_time: '12:00',
    end_time: '13:00'
  });
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const localStartDateTime = new Date(`${formData.date}T${formData.start_time}`);
      const startTime = localStartDateTime.toISOString();
      
      const localEndDateTime = new Date(`${formData.date}T${formData.end_time}`);
      const endTime = localEndDateTime.toISOString();
      
      const eventData = {
        title: formData.title,
        description: formData.description,
        start_time: startTime,
        end_time: endTime,
        room_id: roomId
      };
      
      await onCreate(eventData);
      setFormData({
        title: '',
        description: '',
        date: new Date().toLocaleDateString('en-CA'),
        start_time: '12:00',
        end_time: '13:00'
      });
    } catch (err) {
      console.error("Error creating event:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
          >
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <CalendarIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-text-main">Create Event</h3>
                    <p className="text-xs text-text-soft font-medium">For {currentChatName}</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full text-text-soft transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-light uppercase tracking-widest ml-1">Event Title</label>
                  <div className="relative">
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Weekly Sync"
                      className="w-full bg-slate-50 border-none rounded-2xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-light uppercase tracking-widest ml-1">Date</label>
                    <DatePicker 
                      selected={new Date(formData.date + 'T00:00:00')}
                      onChange={date => setFormData({...formData, date: date.toLocaleDateString('en-CA')})}
                      className="w-full bg-slate-50 border-none rounded-2xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-light uppercase tracking-widest ml-1">Start</label>
                      <DatePicker 
                        selected={new Date(`1970-01-01T${formData.start_time}:00`)}
                        onChange={time => setFormData({...formData, start_time: time.toTimeString().slice(0,5)})}
                        showTimeSelect showTimeSelectOnly timeIntervals={15} dateFormat="h:mm aa"
                        className="w-full bg-slate-50 border-none rounded-2xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-text-light uppercase tracking-widest ml-1">End</label>
                      <DatePicker 
                        selected={new Date(`1970-01-01T${formData.end_time}:00`)}
                        onChange={time => setFormData({...formData, end_time: time.toTimeString().slice(0,5)})}
                        showTimeSelect showTimeSelectOnly timeIntervals={15} dateFormat="h:mm aa"
                        className="w-full bg-slate-50 border-none rounded-2xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-primary/20 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-light uppercase tracking-widest ml-1">Description (Optional)</label>
                  <textarea 
                    placeholder="Add more details about the event..."
                    className="w-full bg-slate-50 border-none rounded-2xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium min-h-[100px] resize-none"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full btn-premium py-4 uppercase tracking-widest text-xs shadow-xl"
                >
                  {loading ? 'Creating...' : 'Create Event'}
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EventModal;
