const Status = require('../models/Status');
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Helper to get DM partners from chat-service
const getPartners = async (username) => {
  try {
    const response = await axios.get(`http://chat-service:8000/rooms?username=${username}`);
    if (response.data && response.data.partners) {
      return response.data.partners.map(p => p.username.toLowerCase());
    }
    return [];
  } catch (err) {
    console.error('Error fetching partners from chat-service:', err.message);
    return [];
  }
};

const createStatus = async (req, res) => {
  try {
    const { type, content, backgroundColor } = req.body;
    const userId = req.user.id;
    
    let statusContent = content;
    if (req.file) {
      statusContent = `/uploads/${userId}/status/${req.file.filename}`;
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const status = await Status.create({
      userId,
      type,
      content: statusContent,
      backgroundColor,
      expiresAt
    });

    res.status(201).json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getStatuses = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUsername = req.user.username.toLowerCase();

    // 1. Get all active statuses (not expired)
    const allActiveStatuses = await Status.findAll({
      where: {
        expiresAt: { [Op.gt]: new Date() }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'fullName', 'profilePhoto', 'privacy']
      }],
      order: [['createdAt', 'DESC']]
    });

    // 2. Filter based on privacy settings
    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [{ user1Id: currentUserId }, { user2Id: currentUserId }],
        status: 'accepted'
      }
    });
    const friendsUserIds = friendships.map(f => f.user1Id === currentUserId ? f.user2Id : f.user1Id);

    const filteredStatuses = allActiveStatuses.filter(status => {
      const poster = status.user;
      if (!poster) return false;
      if (poster.id === currentUserId) return true; // Always see own status

      const privacy = poster.privacy || {};
      const statusPrivacy = privacy.status || 'everyone';
      const statusSelected = privacy.statusSelected || [];
      const blockedContacts = privacy.blockedContacts || [];

      // Blocked users can't see status
      if (blockedContacts.includes(currentUsername)) return false;

      if (statusPrivacy === 'everyone') {
        // Even if 'everyone', the user requirement says "then only each other can send messages, see status"
        // This implies status is friend-only by default now.
        return friendsUserIds.includes(poster.id);
      }
      if (statusPrivacy === 'nobody') return false;
      if (statusPrivacy === 'contacts') {
        return friendsUserIds.includes(poster.id);
      }
      if (statusPrivacy === 'selected') {
        return statusSelected.includes(currentUsername);
      }
      
      return friendsUserIds.includes(poster.id);
    });

    // Group statuses by user
    const grouped = filteredStatuses.reduce((acc, status) => {
      const username = status.user.username;
      if (!acc[username]) {
        acc[username] = {
          user: {
            username: status.user.username,
            fullName: status.user.fullName,
            profilePhoto: status.user.profilePhoto
          },
          statuses: []
        };
      }
      acc[username].statuses.push(status);
      return acc;
    }, {});

    // 4. Sort each group's statuses by createdAt ASC (oldest first)
    for (let username in grouped) {
      grouped[username].statuses.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    // Convert to array
    const result = Object.values(grouped);

    res.json({ success: true, grouped: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const markStatusViewed = async (req, res) => {
  try {
    const { id } = req.params;
    const status = await Status.findByPk(id);
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });

    const viewers = status.viewers || [];
    if (!viewers.includes(req.user.id)) {
      status.viewers = [...viewers, req.user.id];
      status.changed('viewers', true);
      await status.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getStatusViewers = async (req, res) => {
  try {
    const { id } = req.params;
    const status = await Status.findOne({
      where: { id, userId: req.user.id }
    });

    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found or unauthorized' });
    }

    const viewerIds = status.viewers || [];
    const viewers = await User.findAll({
      where: {
        id: { [Op.in]: viewerIds }
      },
      attributes: ['id', 'username', 'fullName', 'profilePhoto']
    });

    res.json({ success: true, viewers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteStatus = async (req, res) => {
  try {
    const status = await Status.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    // Delete file if it exists
    if (status.type !== 'text') {
      const filePath = path.join(__dirname, '..', status.content);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await status.destroy();
    res.json({ success: true, message: 'Status deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createStatus, getStatuses, deleteStatus, markStatusViewed, getStatusViewers };
