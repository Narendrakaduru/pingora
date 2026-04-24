const { Sequelize } = require('sequelize');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// 1. Setup Postgres connection (matches docker-compose environment)
const sequelize = new Sequelize('postgres://postgres:postgres@localhost:5432/chat_user_db', {
  logging: false,
});

// 2. Setup MongoDB connection (matches chat-db)
const mongoUrl = 'mongodb://localhost:27027/';
const mongoClient = new MongoClient(mongoUrl);

const CATEGORY_MAP = {
  'image': 'photo',
};

async function runMigration() {
  try {
    console.log('Connecting to databases...');
    await sequelize.authenticate();
    await mongoClient.connect();
    console.log('Connected.');

    // Query Users
    const [users] = await sequelize.query('SELECT id, username FROM "Users"');
    const userMap = {};
    users.forEach(u => userMap[u.username] = u.id);

    const db = mongoClient.db('chat_db');
    const messages = db.collection('messages');
    
    // UPLOAD DIR is shared volume, mapped locally to root/uploads
    // from user-service logic it maps to `d:\Node\chat-web-app\uploads` wait!
    // Since we are running on host, we can resolve the path directly:
    const uploadsDir = path.resolve(__dirname, '../../uploads');

    const msgs = await messages.find({ "metadata.file_url": { $exists: true, $ne: null } }).toArray();
    console.log(`Found ${msgs.length} file messages to migrate.`);

    for (const msg of msgs) {
      const oldUrl = msg.metadata.file_url;
      const type = msg.type || 'document'; // e.g. 'image', 'audio', etc
      const category = CATEGORY_MAP[type] || type;
      
      const username = msg.username;
      const userId = userMap[username];
      
      if (!userId) {
        console.log(`Skipping message ${msg._id}: Unknown username ${username}`);
        continue;
      }

      // Check if it's already in the new format:
      // The new format is /uploads/{userId}/{category}/{userId}-{timestamp}{ext}
      const newPatternMatch = oldUrl.includes(`/uploads/${userId}/`);
      
      let oldFilePath = path.join(uploadsDir, oldUrl.replace(/^\/uploads\//, ''));
      
      if (!fs.existsSync(oldFilePath)) {
          console.log(`WARN: Physical file not found at ${oldFilePath} for message ${msg._id}`);
          // try checking if it's already in the backend/chat-service/uploads (old flat structure)
          const legacyPath = path.resolve(__dirname, '../chat-service/uploads', path.basename(oldUrl));
          if (fs.existsSync(legacyPath)) {
              oldFilePath = legacyPath;
          } else {
              continue;
          }
      }

      if (newPatternMatch) {
         // Maybe just rename 'image' -> 'photo' if applicable, or rename the uuid -> userId-timestamp
         if (!oldUrl.includes(`/${category}/`)) {
             // The structure has the wrong category
         } else {
             // continue? 
             // We'll standardise it completely
         }
      }
      
      const ext = path.extname(oldFilePath) || path.extname(oldUrl);
      const timestamp_ms = new Date(msg.timestamp).getTime() || Date.now();
      const unique_name = `${userId}-${timestamp_ms}-${Math.random().toString(36).substr(2, 5)}${ext}`;
      
      const targetDir = path.join(uploadsDir, String(userId), category);
      if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
      }
      
      const newFilePath = path.join(targetDir, unique_name);
      
      fs.copyFileSync(oldFilePath, newFilePath);
      console.log(`Migrated: ${oldFilePath} -> ${newFilePath}`);
      
      const newUrl = `/uploads/${userId}/${category}/${unique_name}`;
      
      await messages.updateOne({ _id: msg._id }, { $set: { "metadata.file_url": newUrl } });
    }

    console.log('Migration completed successfully.');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoClient.close();
    await sequelize.close();
  }
}

runMigration();
