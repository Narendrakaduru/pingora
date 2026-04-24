const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');

const register = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    // Always store username as lowercase for consistency across services
    const user = await User.create({ username: username.toLowerCase().trim(), email, password });
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ success: true, token, user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName, profilePhoto: user.profilePhoto, about: user.about, privacy: user.privacy, accountType: user.accountType } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName, profilePhoto: user.profilePhoto, about: user.about, privacy: user.privacy, accountType: user.accountType } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'fullName', 'profilePhoto', 'about', 'privacy', 'accountType'],
      where: {
        id: { [Op.ne]: req.user.id }
      }
    });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { fullName, removePhoto, privacy, about } = req.body;
    console.log('UpdateProfile Request:', { userId: req.user.id, fullName, about, removePhoto, hasFile: !!req.file });
    
    const user = await User.findByPk(req.user.id);
    if (!user) {
      console.error('UpdateProfile: User not found', req.user.id);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (about !== undefined) user.about = about;
    
    if (privacy) {
      try {
        const privacyObj = typeof privacy === 'string' ? JSON.parse(privacy) : privacy;
        const existingPrivacy = user.privacy || {};
        user.privacy = { 
          ...existingPrivacy, 
          ...privacyObj,
          blockedContacts: privacyObj.blockedContacts ?? existingPrivacy.blockedContacts ?? [],
          lastSeenSelected: privacyObj.lastSeenSelected ?? existingPrivacy.lastSeenSelected ?? [],
          profilePhotoSelected: privacyObj.profilePhotoSelected ?? existingPrivacy.profilePhotoSelected ?? [],
          aboutSelected: privacyObj.aboutSelected ?? existingPrivacy.aboutSelected ?? [],
          groupsSelected: privacyObj.groupsSelected ?? existingPrivacy.groupsSelected ?? [],
          statusSelected: privacyObj.statusSelected ?? existingPrivacy.statusSelected ?? [],
        };
        user.changed('privacy', true);
      } catch (e) {
        console.error("Privacy parse error:", e);
      }
    }
    
    if (req.file) {
      user.profilePhoto = `/uploads/${user.id}/photo/${req.file.filename}`;
      console.log('UpdateProfile: New photo saved:', user.profilePhoto);
    } else if (removePhoto === 'true') {
      user.profilePhoto = null;
      console.log('UpdateProfile: Photo removed');
    }

    await user.save();
    console.log('UpdateProfile: Success for user', user.id);
    
    res.json({ success: true, user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName, profilePhoto: user.profilePhoto, about: user.about, privacy: user.privacy, accountType: user.accountType } });
  } catch (err) {
    console.error('UpdateProfile Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with that email' });
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset token generated. Use it to reset your password.',
      resetToken,
      expiresIn: '15 minutes'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const Friendship = require('../models/Friendship');
    const Status = require('../models/Status');
    const axios = require('axios');
    const username = req.user.username;
    
    // Delete friendships in user-service
    await Friendship.destroy({
      where: {
        [Op.or]: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ]
      }
    });

    // Delete statuses in user-service
    await Status.destroy({
      where: { userId: req.user.id }
    });

    // Cleanup in chat-service
    try {
      const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || "http://chat-service:8000";
      await axios.delete(`${CHAT_SERVICE_URL}/internal/cleanup-user/${username}`);
    } catch (chatErr) {
      console.error("Failed to cleanup chat-service data for deleted user:", chatErr.message);
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    await user.destroy();
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const toggleProStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.accountType = user.accountType === 'pro' ? 'normal' : 'pro';
    await user.save();

    res.json({ success: true, accountType: user.accountType });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { register, login, getMe, getUsers, updateProfile, forgotPassword, resetPassword, deleteAccount, toggleProStatus };

