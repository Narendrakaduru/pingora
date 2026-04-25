const SupportTicket = require('../models/SupportTicket');
const ProRequest = require('../models/ProRequest');
const User = require('../models/User');

// --- Ticket Management ---

// Get all tickets (for admin)
exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update ticket status
exports.updateTicketStatus = async (req, res) => {
  const { id } = req.params;
    const { status, adminFeedback } = req.body;
  
    try {
      const ticket = await SupportTicket.findByPk(id);
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }
  
      if (status) ticket.status = status;
      if (adminFeedback !== undefined) ticket.adminFeedback = adminFeedback;
      
      await ticket.save();


    res.status(200).json({ success: true, message: `Ticket status updated to ${status}`, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// --- Pro Request Management ---

// Get all pro requests
exports.getAllProRequests = async (req, res) => {
  try {
    const requests = await ProRequest.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Approve/Reject pro request
exports.handleProRequest = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'approved' or 'rejected'

  try {
    const proRequest = await ProRequest.findByPk(id);
    if (!proRequest) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (proRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request already handled' });
    }

    proRequest.status = status;
    await proRequest.save();

    if (status === 'approved') {
      const user = await User.findByPk(proRequest.userId);
      if (user) {
        user.accountType = 'pro';
        await user.save();
      }
    }

    res.status(200).json({ success: true, message: `Pro request ${status}`, proRequest });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
