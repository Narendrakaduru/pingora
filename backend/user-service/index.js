const express = require('express');
const cors = require('cors');
const { connectDB, sequelize } = require('./config/db');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors());

// Serve static files from the uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/api/auth/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/status', require('./routes/statusRoutes'));

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  await connectDB();
  require('./models/Status'); // Ensure model is loaded for sync
  require('./models/Friendship');
  await sequelize.sync({ alter: true }); // Sync models and update schema if needed
  app.listen(PORT, () => console.log(`User Service running on port ${PORT}`));
};

startServer();
