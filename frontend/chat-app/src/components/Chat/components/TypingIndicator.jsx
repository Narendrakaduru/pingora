import React from 'react';
import { motion } from 'framer-motion';

export const TypingIndicatorDots = () => (
  <div className="flex gap-1 items-center px-1">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="w-1.5 h-1.5 bg-current rounded-full"
        animate={{ y: [0, -4, 0] }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          delay: i * 0.15,
          ease: "easeInOut"
        }}
      />
    ))}
  </div>
);

export const TypingIndicatorBubble = ({ typer }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, x: -20 }}
    animate={{ opacity: 1, scale: 1, x: 0 }}
    exit={{ opacity: 0, scale: 0.8, x: -20 }}
    className="flex items-center gap-3 mb-6 ml-2"
  >
    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center font-bold text-primary text-sm shadow-sm border border-primary/10 shrink-0">
      {typer[0].toUpperCase()}
    </div>
    <div className="bg-surface-lowest border border-border/10 shadow-premium rounded-[24px] rounded-tl-none px-5 py-3.5 flex items-center gap-3">
       <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-soft">{typer} is typing</span>
       <div className="text-primary flex">
         <TypingIndicatorDots />
       </div>
    </div>
  </motion.div>
);
