const express = require('express');
const { register, login, getMe, getUsers, updateProfile, forgotPassword, resetPassword, deleteAccount, toggleProStatus } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user.id;
    const dir = path.join('uploads', userId.toString(), 'photo');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.get('/users', protect, getUsers);
router.put('/profile', protect, upload.single('profilePhoto'), updateProfile);
router.post('/toggle-pro', protect, toggleProStatus);
router.delete('/delete-account', protect, deleteAccount);

// Friend Requests
const { sendRequest, acceptRequest, rejectRequest, getFriends, getPendingRequests, getMyFriendships, unfriendUser } = require('../controllers/friendController');
router.post('/friends/request', protect, sendRequest);
router.post('/friends/accept', protect, acceptRequest);
router.post('/friends/reject', protect, rejectRequest);
router.post('/friends/unfriend', protect, unfriendUser);
router.get('/friends', protect, getFriends);
router.get('/friends/pending', protect, getPendingRequests);
router.get('/friends/all', protect, getMyFriendships);

// Internal endpoint (used by chat-service to check blocked contacts and friendship)
router.get('/privacy/:username', async (req, res) => {
  try {
    const User = require('../models/User');
    const Friendship = require('../models/Friendship');
    const targetUser = await User.findOne({ where: { username: req.params.username.toLowerCase() } });
    if (!targetUser) return res.json({ exists: false, blockedContacts: [], acceptRequests: true, isFriend: false });

    const privacy = targetUser.privacy || {};
    
    // If a requester (from chat-service) is provided via query
    const requesterUsername = req.query.requester;
    let isFriend = false;
    if (requesterUsername) {
      const requester = await User.findOne({ where: { username: requesterUsername.toLowerCase() } });
      if (requester) {
        const [u1, u2] = [targetUser.id, requester.id].sort((a, b) => a - b);
        const friendship = await Friendship.findOne({
          where: { user1Id: u1, user2Id: u2, status: 'accepted' }
        });
        isFriend = !!friendship;
      }
    }

    res.json({ 
      exists: true,
      blockedContacts: privacy.blockedContacts || [],
      acceptRequests: privacy.acceptRequests !== false,
      accountType: targetUser.accountType || 'normal',
      isFriend
    });
  } catch (err) {
    res.json({ blockedContacts: [], acceptRequests: true, isFriend: false });
  }
});


module.exports = router;
