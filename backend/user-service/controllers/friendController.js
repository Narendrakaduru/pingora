const Friendship = require('../models/Friendship');
const User = require('../models/User');
const { Op, Sequelize } = require('sequelize');

// Helper for case-insensitive username lookup
const findUserByUsername = (username) => User.findOne({
  where: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('username')), username.toLowerCase())
});

const sendRequest = async (req, res) => {
  try {
    const { recipientUsername } = req.body;
    const senderId = req.user.id;

    if (req.user.username.toLowerCase() === recipientUsername.toLowerCase()) {
      return res.status(400).json({ success: false, message: 'You cannot send a request to yourself' });
    }

    const recipient = await findUserByUsername(recipientUsername);
    if (!recipient) {
      return res.status(200).json({ success: false, message: 'User not found' });
    }

    // Check if recipient accepts requests
    const privacy = recipient.privacy || {};
    if (privacy.acceptRequests === false) {
      return res.status(403).json({ success: false, message: 'This user does not accept friend requests' });
    }

    // Check if relationship already exists
    const [u1, u2] = [senderId, recipient.id].sort((a, b) => a - b);
    const existing = await Friendship.findOne({
      where: { user1Id: u1, user2Id: u2 }
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ success: false, message: 'Already friends' });
      }
      if (existing.status === 'pending' && existing.requestSenderId === senderId) {
        return res.status(400).json({ success: false, message: 'Request already sent' });
      }
      if (existing.status === 'pending' && existing.requestSenderId !== senderId) {
        // Recipient has already sent a request to the sender, so just accept it
        existing.status = 'accepted';
        await existing.save();
        return res.json({ success: true, message: 'Friend request accepted', friendship: existing });
      }
      // If rejected, allow resending? For now, let's say yes by resetting it
      existing.status = 'pending';
      existing.requestSenderId = senderId;
      await existing.save();
      return res.json({ success: true, message: 'Friend request sent', friendship: existing });
    }

    const friendship = await Friendship.create({
      user1Id: u1,
      user2Id: u2,
      status: 'pending',
      requestSenderId: senderId
    });

    res.status(201).json({ success: true, friendship });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const acceptRequest = async (req, res) => {
  try {
    const { friendshipId } = req.body;
    const userId = req.user.id;

    const friendship = await Friendship.findByPk(friendshipId);
    if (!friendship) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (friendship.user1Id !== userId && friendship.user2Id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (friendship.requestSenderId === userId) {
      return res.status(400).json({ success: false, message: 'You cannot accept your own request' });
    }

    friendship.status = 'accepted';
    await friendship.save();

    res.json({ success: true, friendship });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const rejectRequest = async (req, res) => {
  try {
    const { friendshipId } = req.body;
    const userId = req.user.id;

    const friendship = await Friendship.findByPk(friendshipId);
    if (!friendship) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (friendship.user1Id !== userId && friendship.user2Id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // We can either delete it or mark as rejected
    // Deleting allows them to send request again easily
    await friendship.destroy();

    res.json({ success: true, message: 'Request rejected/deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getFriends = async (req, res) => {
  try {
    const userId = req.user.id;
    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [{ user1Id: userId }, { user2Id: userId }],
        status: 'accepted'
      },
      include: [
        { model: User, as: 'user1', attributes: ['id', 'username', 'fullName', 'profilePhoto'] },
        { model: User, as: 'user2', attributes: ['id', 'username', 'fullName', 'profilePhoto'] }
      ]
    });

    const friends = friendships.map(f => {
      return f.user1Id === userId ? f.user2 : f.user1;
    });

    res.json({ success: true, friends });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await Friendship.findAll({
      where: {
        [Op.or]: [{ user1Id: userId }, { user2Id: userId }],
        status: 'pending',
        requestSenderId: { [Op.ne]: userId }
      },
      include: [
        { model: User, as: 'user1', attributes: ['id', 'username', 'fullName', 'profilePhoto'] },
        { model: User, as: 'user2', attributes: ['id', 'username', 'fullName', 'profilePhoto'] }
      ]
    });

    const pending = requests.map(f => {
      const sender = f.user1Id === f.requestSenderId ? f.user1 : f.user2;
      return {
        id: f.id,
        sender
      };
    });

    res.json({ success: true, pending });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMyFriendships = async (req, res) => {
  try {
    const userId = req.user.id;
    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [{ user1Id: userId }, { user2Id: userId }]
      }
    });

    res.json({ success: true, friendships });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const unfriendUser = async (req, res) => {
  try {
    const { friendshipId } = req.body;
    const userId = req.user.id;

    const friendship = await Friendship.findByPk(friendshipId);
    if (!friendship) {
      return res.status(404).json({ success: false, message: 'Friendship not found' });
    }

    if (friendship.user1Id !== userId && friendship.user2Id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await friendship.destroy();

    res.json({ success: true, message: 'Unfriended successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { sendRequest, acceptRequest, rejectRequest, getFriends, getPendingRequests, getMyFriendships, unfriendUser };
