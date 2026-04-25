const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { 
  getAllTickets, 
  updateTicketStatus, 
  getAllProRequests, 
  handleProRequest 
} = require('../controllers/adminController');

// All routes here are protected and admin-only
router.use(protect);
router.use(adminOnly);

// Ticket routes
router.get('/tickets', getAllTickets);
router.patch('/tickets/:id/status', updateTicketStatus);

// Pro Request routes
router.get('/pro-requests', getAllProRequests);
router.patch('/pro-requests/:id', handleProRequest);

module.exports = router;
