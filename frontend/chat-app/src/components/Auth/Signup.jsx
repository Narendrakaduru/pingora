import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const { signup } = useAuth();
  const navigate = useNavigate();

  // Real-time validation effect
  useEffect(() => {
    const newErrors = {};
    
    if (username && username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password rules: 8-12 chars, small, capital, special, number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,12}$/;
    if (password && !passwordRegex.test(password)) {
      newErrors.password = '8-12 chars with uppercase, lowercase, number, and special character';
    }

    if (confirmPassword && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
  }, [username, email, password, confirmPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all as touched on submit to show any remaining errors
    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true
    });

    if (Object.keys(errors).length > 0 || !username || !email || !password || !confirmPassword) {
      return;
    }

    try {
      await signup(username, email, password);
      navigate('/');
    } catch (err) {
      setErrors(prev => ({ ...prev, server: err.response?.data?.message || err.message }));
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[500px] bg-surface-lowest rounded-xl p-8 md:p-12 shadow-soft relative overflow-hidden"
      >
        {/* The Organic Pulse: Subtle gradient background shift */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-container to-primary opacity-40" />
        
        <div className="flex flex-col items-center mb-10">
          <div className="w-full h-24 mb-6 flex items-center justify-center overflow-hidden">
            <img 
              src="/pingora_brand.png" 
              alt="Pingora" 
              className="h-full w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-text-main mb-2 tracking-tight">
            Create Account
          </h1>
          <p className="text-text-soft text-center max-w-[320px]">
            Connect with your friends and team
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
              USERNAME
            </label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-primary transition-colors duration-300" size={18} />
              <input
                type="text"
                placeholder="Username"
                className={`organic-input !pl-12 ${(touched.username && errors.username) ? 'border-red-300 bg-red-50/30' : ''}`}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setTouched(prev => ({ ...prev, username: true }));
                }}
                onBlur={() => handleBlur('username')}
              />
            </div>
            {(touched.username && errors.username) && <p className="text-[10px] font-bold text-red-500 ml-1 mt-1 uppercase tracking-tighter">{errors.username}</p>}
          </div>

          <div className="space-y-2.5">
            <label className="text-xs font-black text-text-soft ml-1 tracking-widest uppercase opacity-70">
              EMAIL ADDRESS
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-primary transition-colors duration-300" size={18} />
              <input
                type="email"
                placeholder="yourmail@pingora.in"
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
            <label className="text-xs font-black text-text-soft ml-1 tracking-widest uppercase opacity-70">
              PASSWORD
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-primary transition-colors duration-300" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
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
            {(touched.password && errors.password) && <p className="text-[10px] font-bold text-red-500 ml-1 mt-1 uppercase tracking-tighter leading-tight">{errors.password}</p>}
          </div>

          <div className="space-y-2.5">
            <label className="text-xs font-black text-text-soft ml-1 tracking-widest uppercase opacity-70">
              CONFIRM PASSWORD
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light group-focus-within:text-primary transition-colors duration-300" size={18} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repeat password"
                className={`organic-input !pl-12 !pr-12 ${(touched.confirmPassword && errors.confirmPassword) ? 'border-red-300 bg-red-50/30' : ''}`}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setTouched(prev => ({ ...prev, confirmPassword: true }));
                }}
                onBlur={() => handleBlur('confirmPassword')}
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light hover:text-primary transition-colors duration-300 focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {(touched.confirmPassword && errors.confirmPassword) && <p className="text-[10px] font-bold text-red-500 ml-1 mt-1 uppercase tracking-tighter">{errors.confirmPassword}</p>}
          </div>
          
          <div className="pt-4">
            <button type="submit" className="w-full btn-premium h-14 text-base tracking-widest uppercase shadow-lg shadow-primary/20">
              Sign Up
            </button>
          </div>
        </form>

        <div className="mt-12 pt-8 flex flex-col items-center gap-4">
          <p className="text-sm text-text-soft">
            Already have an account? <Link to="/login" className="text-primary font-bold hover:text-primary-dark transition-colors">Log In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
