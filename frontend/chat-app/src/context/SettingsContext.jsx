import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const { user, updateProfile } = useAuth();
  const isInitialMount = useRef(true);
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('app-settings');
    const defaultSettings = {
      theme: 'light',
      wallpaper: 'default',
      notifications: {
        messages: true,
        groups: true,
        preview: true,
        sounds: true
      },
      privacy: {
        blockedContacts: [],
        disappearingTime: 'off', // 'off', '24h', '7d', '90d'
        securityNotifications: true,
        lastSeen: 'everyone', // 'everyone', 'nobody', 'selected'
        profilePhoto: 'everyone',
        about: 'everyone',
        groups: 'everyone',
        status: 'everyone',
        lastSeenSelected: [],
        profilePhotoSelected: [],
        aboutSelected: [],
        groupsSelected: [],
        statusSelected: []
      },
      chats: {
        mediaQuality: 'auto',
        autoDownload: true,
        spellCheck: true,
        replaceWithEmoji: true,
        enterIsSend: true
      }
    };
    if (!saved) return defaultSettings;
    const parsed = JSON.parse(saved);
    return {
      ...defaultSettings,
      ...parsed,
      notifications: { ...defaultSettings.notifications, ...(parsed.notifications || {}) },
      privacy: { ...defaultSettings.privacy, ...(parsed.privacy || {}) },
      chats: { ...defaultSettings.chats, ...(parsed.chats || {}) }
    };
  });

  // Load settings from user profile on login
  useEffect(() => {
    if (user && user.privacy) {
      setSettings(prev => ({
        ...prev,
        privacy: {
          ...prev.privacy,
          ...user.privacy
        }
      }));
    }
  }, [user?.id]); // Only run when user changes (login/logout)

  // Save privacy settings to backend when they change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!user) return;

    // Deep comparison to avoid unnecessary updates
    const privacyChanged = JSON.stringify(settings.privacy) !== JSON.stringify(user.privacy);
    
    if (privacyChanged) {
      const timer = setTimeout(() => {
        updateProfile({ privacy: settings.privacy });
      }, 1000); // Debounce
      return () => clearTimeout(timer);
    }
  }, [settings.privacy, user?.id, updateProfile]);

  useEffect(() => {
    localStorage.setItem('app-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const applyTheme = (theme) => {
      let activeTheme = theme;
      if (theme === 'system') {
        activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }

      document.documentElement.className = activeTheme;
      if (activeTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    };

    applyTheme(settings.theme);

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme]);


  const updateSettings = (key, value) => {
    setSettings(prev => {
      const keys = key.split('.');
      if (keys.length > 1) {
        return {
          ...prev,
          [keys[0]]: {
            ...prev[keys[0]],
            [keys[1]]: value
          }
        };
      }
      return { ...prev, [key]: value };
    });
  };

  const blockContact = (username) => {
    if (!username) return;
    setSettings(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        blockedContacts: [...new Set([...prev.privacy.blockedContacts, username.toLowerCase()])]
      }
    }));
  };

  const unblockContact = (username) => {
    setSettings(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        blockedContacts: prev.privacy.blockedContacts.filter(u => u !== username.toLowerCase())
      }
    }));
  };

  const togglePrivacyUser = (category, username) => {
    if (!username) return;
    setSettings(prev => {
      const currentList = prev.privacy[category] || [];
      const newList = currentList.includes(username.toLowerCase())
        ? currentList.filter(u => u !== username.toLowerCase())
        : [...currentList, username.toLowerCase()];
      
      return {
        ...prev,
        privacy: {
          ...prev.privacy,
          [category]: newList
        }
      };
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, blockContact, unblockContact, togglePrivacyUser }}>
      {children}
    </SettingsContext.Provider>
  );
};
