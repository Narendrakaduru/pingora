import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const { login } = useAuth();
  const navigate = useNavigate();

  // Real-time validation effect
  useEffect(() => {
    const newErrors = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (password && password.length < 1) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
  }, [email, password]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all as touched on submit to show any remaining errors
    setTouched({
      email: true,
      password: true
    });

    // Check for empty fields
    const submitErrors = {};
    if (!email) {
      submitErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        submitErrors.email = 'Please enter a valid email address';
      }
    }
    if (!password) {
      submitErrors.password = 'Password is required';
    }

    if (Object.keys(submitErrors).length > 0) {
      setErrors(submitErrors);
      return;
    }

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setErrors(prev => ({ ...prev, server: err.response?.data?.message || err.message }));
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    // Also validate empty on blur
    if (field === 'email' && !email) {
      setErrors(prev => ({ ...prev, email: 'Email is required' }));
    }
    if (field === 'password' && !password) {
      setErrors(prev => ({ ...prev, password: 'Password is required' }));
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
        {/* The Organic Pulse: Subtle gradient background shift */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-container opacity-40" />
        
        <div className="flex flex-col items-center mb-10">
          <div className="w-full h-24 mb-6 flex items-center justify-center overflow-hidden">
            <img 
              src="/pingora_brand.png" 
              alt="Pingora" 
              className="h-full w-auto object-contain"
            />
          </div>
          <p className="text-text-soft text-center max-w-[280px]">
            Welcome back to your messages
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
          
          <div className="space-y-2.5">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-black text-text-soft tracking-widest uppercase opacity-70">
                PASSWORD
              </label>
              <Link to="/forgot-password" className="text-xs font-bold text-primary hover:text-primary-dark transition-colors tracking-wide">
                RECOVER
              </Link>
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-primary transition-colors duration-300" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className={`organic-input !pl-12 !pr-12 ${(touched.password && errors.password) ? 'border-red-300 bg-red-50/30' : ''}`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setTouched(prev => ({ ...prev, password: true }));
                }}
                onBlur={() => handleBlur('password')}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light hover:text-primary transition-colors duration-300 focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {(touched.password && errors.password) && <p className="text-[10px] font-bold text-red-500 ml-1 mt-1 uppercase tracking-tighter">{errors.password}</p>}
          </div>
          
          <div className="pt-4">
            <button type="submit" className="w-full btn-premium h-14 text-base tracking-widest uppercase shadow-lg shadow-primary/20">
              Log In
            </button>
          </div>
        </form>

        <div className="mt-12 pt-8 flex flex-col items-center gap-4">
          <p className="text-sm text-text-soft">
            New user? <Link to="/signup" className="text-primary font-bold hover:text-primary-dark transition-colors">Sign Up</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
