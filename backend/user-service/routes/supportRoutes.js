const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { submitTicket, getMyTickets, requestPro } = require('../controllers/supportController');

router.post('/tickets', protect, submitTicket);
router.get('/tickets', protect, getMyTickets);
router.post('/request-pro', protect, requestPro);
router.get('/pro-request/status', protect, require('../controllers/supportController').getProRequestStatus);



module.exports = router;
