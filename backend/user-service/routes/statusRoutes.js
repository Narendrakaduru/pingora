const express = require('express');
const { createStatus, getStatuses, deleteStatus, markStatusViewed, getStatusViewers } = require('../controllers/statusController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Multer Config for Status
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user.id;
    const dir = path.join('uploads', userId.toString(), 'status');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `status-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const router = express.Router();

router.use(protect);

router.post('/', upload.single('media'), createStatus);
router.get('/', getStatuses);
router.delete('/:id', deleteStatus);
router.post('/:id/view', markStatusViewed);
router.get('/:id/viewers', getStatusViewers);

module.exports = router;
