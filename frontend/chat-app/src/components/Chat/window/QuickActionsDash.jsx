import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Image, MessageSquare, Phone } from 'lucide-react';

const QuickActionsDash = ({ onAction }) => {
  const actions = [
    { 
      id: 'document', 
      label: 'Send document', 
      icon: FileText, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-50/50'
    },
    { 
      id: 'photo', 
      label: 'Photo & video', 
      icon: Image, 
      color: 'text-purple-500',
      bgColor: 'bg-purple-50/50'
    },
    { 
      id: 'contact', 
      label: 'Message', 
      icon: MessageSquare, 
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50/50'
    },
    {
      id: 'call',
      label: 'Audio Call',
      icon: Phone,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50/50'
    }
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-4xl w-full px-4"
      >
        {actions.map((action, idx) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex flex-col items-center gap-4"
          >
            <button
              onClick={() => onAction(action.id)}
              className="w-32 h-32 md:w-36 md:h-36 bg-surface-high rounded-[2rem] flex items-center justify-center shadow-soft hover:shadow-xl hover:scale-105 transition-all duration-300 group relative overflow-hidden"
            >
              <div className={`absolute inset-0 ${action.bgColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <action.icon 
                size={40} 
                className={`${action.color} group-hover:scale-110 transition-transform duration-300 relative z-10`} 
              />
            </button>
            <span className="text-sm font-bold text-text-soft tracking-tight">{action.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default QuickActionsDash;
