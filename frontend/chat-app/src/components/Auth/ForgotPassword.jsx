import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, KeyRound, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Real-time validation
  useEffect(() => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    setErrors(prev => {
      const { server, ...rest } = prev;
      return { ...newErrors, ...(server ? { server } : {}) };
    });
  }, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true });

    if (!email) {
      setErrors({ email: 'Email is required' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post('/api/auth/forgot-password', { email });
      // Silently redirect to reset password page with token in URL
      navigate(`/reset-password?token=${res.data.resetToken}`);
    } catch (err) {
      setErrors({ server: err.response?.data?.message || 'Something went wrong' });
      setIsSubmitting(false);
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'email' && !email) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[460px] bg-surface-lowest rounded-xl p-8 md:p-12 shadow-soft relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500 opacity-60" />

        <div className="flex flex-col items-center mb-10">
          <div className="w-full h-24 mb-6 flex items-center justify-center overflow-hidden">
            <img 
              src="/pingora_brand.png" 
              alt="Pingora" 
              className="h-full w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-text-main mb-2 tracking-tight">
            Recover Account
          </h1>
          <p className="text-text-soft text-center max-w-[300px]">
            Enter your email to reset your password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.server && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-bold shadow-sm"
            >
              ⚠️ {errors.server}
            </motion.div>
          )}

          <div className="space-y-2.5">
            <label className="text-xs font-black text-text-soft ml-1 tracking-widest uppercase opacity-70">
              EMAIL ADDRESS
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-primary transition-colors duration-300" size={18} />
              <input
                type="email"
                placeholder="name@company.com"
                className={`organic-input !pl-12 ${(touched.email && errors.email) ? 'border-red-300 bg-red-50/30' : ''}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setTouched(prev => ({ ...prev, email: true }));
                }}
                onBlur={() => handleBlur('email')}
              />
            </div>
            {(touched.email && errors.email) && <p className="text-[10px] font-bold text-red-500 ml-1 mt-1 uppercase tracking-tighter">{errors.email}</p>}
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-premium h-14 text-base tracking-widest uppercase shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Verifying...
                </span>
              ) : 'Continue'}
            </button>
          </div>
        </form>

        <div className="mt-12 pt-8 flex flex-col items-center gap-4">
          <Link to="/login" className="text-sm text-text-soft flex items-center gap-2 hover:text-primary transition-colors">
            <ArrowLeft size={14} />
            Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
