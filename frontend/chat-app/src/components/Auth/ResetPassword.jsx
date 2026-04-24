import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Real-time validation
  useEffect(() => {
    const newErrors = {};

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,12}$/;
    if (password && !passwordRegex.test(password)) {
      newErrors.password = '8-12 chars with uppercase, lowercase, number, and special character';
    }

    if (confirmPassword && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(prev => {
      const { server, ...rest } = prev;
      return { ...newErrors, ...(server ? { server } : {}) };
    });
  }, [password, confirmPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setTouched({ password: true, confirmPassword: true });

    const submitErrors = {};
    if (!token) submitErrors.server = 'Invalid reset link. Please request a new one.';
    if (!password) submitErrors.password = 'Password is required';
    if (!confirmPassword) submitErrors.confirmPassword = 'Please confirm your password';
    if (password && confirmPassword && password !== confirmPassword) {
      submitErrors.confirmPassword = 'Passwords do not match';
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,12}$/;
    if (password && !passwordRegex.test(password)) {
      submitErrors.password = '8-12 chars with uppercase, lowercase, number, and special character';
    }

    if (Object.keys(submitErrors).length > 0) {
      setErrors(submitErrors);
      return;
    }

    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await axios.post('/api/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err) {
      setErrors({ server: err.response?.data?.message || 'Something went wrong' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'password' && !password) setErrors(prev => ({ ...prev, password: 'Password is required' }));
    if (field === 'confirmPassword' && !confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: 'Please confirm your password' }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[500px] bg-surface-lowest rounded-xl p-8 md:p-12 shadow-soft relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-60" />

        <div className="flex flex-col items-center mb-10">
          <div className="w-full h-24 mb-6 flex items-center justify-center overflow-hidden">
            <img 
              src="/pingora_brand.png" 
              alt="Pingora" 
              className="h-full w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-text-main mb-2 tracking-tight">
            Reset Password
          </h1>
          <p className="text-text-soft text-center max-w-[300px]">
            {success ? 'Your password has been updated' : 'Create a new password for your account'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!success ? (
            <motion.form
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
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
                  NEW PASSWORD
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-primary transition-colors duration-300" size={18} />
                  <input
                    type="password"
                    placeholder="New password"
                    className={`organic-input !pl-12 ${(touched.password && errors.password) ? 'border-red-300 bg-red-50/30' : ''}`}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setTouched(prev => ({ ...prev, password: true }));
                    }}
                    onBlur={() => handleBlur('password')}
                  />
                </div>
                {(touched.password && errors.password) && <p className="text-[10px] font-bold text-red-500 ml-1 mt-1 uppercase tracking-tighter leading-tight">{errors.password}</p>}
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-black text-text-soft ml-1 tracking-widest uppercase opacity-70">
                  CONFIRM PASSWORD
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-primary transition-colors duration-300" size={18} />
                  <input
                    type="password"
                    placeholder="Repeat new password"
                    className={`organic-input !pl-12 ${(touched.confirmPassword && errors.confirmPassword) ? 'border-red-300 bg-red-50/30' : ''}`}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setTouched(prev => ({ ...prev, confirmPassword: true }));
                    }}
                    onBlur={() => handleBlur('confirmPassword')}
                  />
                </div>
                {(touched.confirmPassword && errors.confirmPassword) && <p className="text-[10px] font-bold text-red-500 ml-1 mt-1 uppercase tracking-tighter">{errors.confirmPassword}</p>}
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
                      Resetting...
                    </span>
                  ) : 'Reset Password'}
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="text-emerald-500" size={32} />
                </div>
                <p className="text-text-main font-semibold text-center">
                  Password reset successfully!
                </p>
                <p className="text-text-soft text-sm text-center">
                  You can now log in with your new password
                </p>
              </div>

              <Link
                to="/login"
                className="w-full btn-premium h-14 text-base tracking-widest uppercase shadow-lg shadow-primary/20 flex items-center justify-center"
              >
                Go to Login
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

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

export default ResetPassword;
