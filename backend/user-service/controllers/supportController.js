const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');

/**
 * POST /api/support/tickets
 * Submit a new support ticket (authenticated users only)
 */
exports.submitTicket = async (req, res) => {
  try {
    const { topic, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    if (message.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Message must be at least 10 characters.' });
    }

    const validTopics = ['Bug report', 'Feature request', 'Account issue', 'Billing question', 'Other'];
    const resolvedTopic = validTopics.includes(topic) ? topic : 'Other';

    // Fetch user email for reference
    const user = await User.findByPk(req.user.id);

    const ticket = await SupportTicket.create({
      username: req.user.username,
      email: user?.email || null,
      topic: resolvedTopic,
      message: message.trim(),
      status: 'open',
    });

    return res.status(201).json({
      success: true,
      message: 'Your support ticket has been submitted. We\'ll get back to you within 24–48 hours.',
      ticket: {
        id: ticket.id,
        topic: ticket.topic,
        status: ticket.status,
        createdAt: ticket.createdAt,
      },
    });
  } catch (err) {
    console.error('submitTicket error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit ticket. Please try again.' });
  }
};

/**
 * GET /api/support/tickets
 * Get all tickets for the authenticated user
 */
exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.findAll({
      where: { username: req.user.username },
      order: [['createdAt', 'DESC']],
    });
    return res.json({ success: true, tickets });
  } catch (err) {
    console.error('getMyTickets error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve tickets.' });
  }
};

const ProRequest = require('../models/ProRequest');

/**
 * POST /api/support/request-pro
 * User requests pro account upgrade
 */
exports.requestPro = async (req, res) => {
  try {
    const { message } = req.body;

    // Check if user is already pro
    if (req.user.accountType === 'pro') {
      return res.status(400).json({ success: false, message: 'You are already a Pro user.' });
    }

    // Check for existing pending request
    const existing = await ProRequest.findOne({
      where: { userId: req.user.id, status: 'pending' }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have a pending pro request.' });
    }

    const proReq = await ProRequest.create({
      userId: req.user.id,
      username: req.user.username,
      message: message || '',
      status: 'pending'
    });

    res.status(201).json({ 
      success: true, 
      message: 'Pro request submitted successfully. An admin will review it.', 
      proReq 
    });
  } catch (err) {
    console.error('requestPro error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
/**
 * GET /api/support/pro-request/status
 * Get the status of the current user's pro request
 */
exports.getProRequestStatus = async (req, res) => {
  try {
    const proReq = await ProRequest.findOne({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    if (!proReq) {
      return res.json({ success: true, status: null });
    }

    res.json({ success: true, status: proReq.status });
  } catch (err) {
    console.error('getProRequestStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
