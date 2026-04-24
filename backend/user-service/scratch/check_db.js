const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('postgres://nani:6264@localhost:5432/chat_user_db', { logging: false });

const User = sequelize.define('User', {
  username: DataTypes.STRING,
  profilePhoto: DataTypes.STRING,
}, { timestamps: false });

async function check() {
  const users = await User.findAll({ limit: 5 });
  console.log(JSON.stringify(users.map(u => ({ username: u.username, profilePhoto: u.profilePhoto })), null, 2));
  process.exit();
}

check();
