# Pingora Chat - Real-time Microservices Messaging Platform

Pingora is a premium, high-performance real-time chat application built with a **microservices architecture**. It features a decoupled backend using Node.js and Python (FastAPI), a responsive React frontend, and a cross-platform mobile client, all orchestrated for scalable and secure deployment.

## 🚀 Tech Stack

### Frontend & Mobile

- **React (Vite)**: Modern, ultra-fast UI library for the web experience.
- **React Native (Expo)**: Cross-platform mobile development for iOS and Android.
- **Tailwind CSS**: Utility-first CSS framework for premium, responsive design.
- **Framer Motion**: Advanced animation library for smooth UI transitions.
- **Socket.io Client**: Real-time bidirectional communication for instant messaging.

### Microservices Backend

- **User Service (Node.js/Express)**: Central identity provider handling JWT authentication, profiles, and friendship logic.
- **Chat Service (Python/FastAPI)**: High-concurrency engine for WebSocket management, room logic, and message persistence.
- **Sequelize ORM**: Promise-based Node.js ORM for MySQL data modeling.
- **Motor**: Asynchronous Python driver for MongoDB.

### Data & Infrastructure

- **MySQL**: Relational database for structured user data and social graphs.
- **MongoDB**: Document database for high-volume message storage and flexible chat settings.
- **Redis**: In-memory data store for session management and real-time state tracking.
- **Docker & Docker Compose**: Containerization for consistent environments and simplified orchestration.

## 📁 Directory Structure

```text
Pingora/
├── backend/                # Microservices Ecosystem
│   ├── user-service/       # Identity & Social (Node.js/Express)
│   │   ├── config/         # DB Connection & Configuration
│   │   ├── controllers/    # Logic for Auth, Friends, and Status
│   │   ├── models/         # Sequelize (MySQL) Data Models
│   │   └── routes/         # Express API Route Definitions
│   └── chat-service/       # Messaging Engine (Python/FastAPI)
│       ├── routers/        # FastAPI Endpoints (Messages, Rooms, Groups)
│       ├── scheduler.py    # Background tasks for disappearing messages
│       └── ws_manager.py   # WebSocket Lifecycle & Broadcasting
├── frontend/               # Web Application (React + Vite)
│   └── pingora-app/        # Main Web Interface (source in chat-app/)
│       ├── src/            # Components, Context, Hooks, and Services
│       └── tailwind.config # Visual Theme & Premium Design Tokens
├── mobile/                 # Mobile Application (React Native/Expo)
│   └── src/                # Screen-based Navigation & API Hooks
├── uploads/                # [PERSISTED] Shared Media & Avatars
└── docker-compose.yml      # Full-Stack Container Orchestration
```

> [!NOTE]
> All infrastructure services use persistent volumes defined in `docker-compose.yml`, ensuring your message history and user data survive container restarts.

## ✨ Key Features

- **Premium Real-time Messaging**: Instant message delivery with WebSocket persistence and delivery acknowledgments.
- **Advanced Privacy Controls**: 
  - **Disappearing Messages**: Customizable timers for self-destructing chats.
  - **Granular Visibility**: Toggle visibility for Last Seen, Profile Photo, and "About" info.
  - **Block/Unblock**: Complete control over social interactions.
- **Rich Social Graph**: 
  - **Friendship System**: Send, accept, or reject friend requests with live notifications.
  - **Secure Communication**: Restrict messages to confirmed friends or apply rate limits for unknown users.
- **Organization & Productivity**:
  - **Chat Pins**: Keep important conversations at the top.
  - **Mute & Archive**: Manage notifications and declutter your chat list.
  - **Custom Labels**: Organize rooms with flexible user-defined tags.
- **Premium User Experience**:
  - **Glassmorphism UI**: A modern, sleek aesthetic with subtle blurs and vibrant gradients.
  - **WhatsApp-style Status**: Share updates with friends via interactive status stories.
  - **Security Audits**: Real-time notifications for account activity and login attempts.
- **Account Management**: Comprehensive profile customization and a secure "Danger Zone" for permanent account deletion.

## 🛠 Setup & Installation

The entire stack is containerized for a single-command setup.

### Prerequisites

- **Docker Desktop** (with Docker Compose).
- **Node.js 18+** (for local frontend development).
- **Python 3.10+** (for local backend development).

### Running the Project

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd pingora
   ```

2. **Start the Stack**:
   ```bash
   docker compose up -d --build
   ```

3. **Access the Services**:
   - **Web Frontend**: [http://localhost:80](http://localhost:80)
   - **User Service API**: [http://localhost:5001](http://localhost:5001)
   - **Chat Service API**: [http://localhost:8001](http://localhost:8001)

## 📋 Required Environment Variables

Ensure your `.env` files in the respective service directories contain the following:

| Service | Variable | Description | Default |
|---|---|---|---|
| **User Service** | `PORT` | API Port | `5001` |
| | `MYSQL_HOST` | Database host | `mysql` |
| | `JWT_SECRET` | Secret for token signing | `your_secret` |
| **Chat Service** | `PORT` | API Port | `8000` |
| | `MONGO_URI` | MongoDB connection string| `mongodb://mongo:27017/chat`|
| | `REDIS_URL` | Redis endpoint | `redis://redis:6379` |

## 🔗 API Endpoints

### 👤 User Service (Port 5001)

| Category | Endpoint | Method | Description |
|---|---|---|---|
| **Auth** | `/api/auth/register` | `POST` | Create a new user account |
| | `/api/auth/login` | `POST` | Authenticate and receive JWT |
| | `/api/auth/forgot-password` | `POST` | Request password reset |
| | `/api/auth/reset-password` | `POST` | Execute password reset |
| **Profile** | `/api/auth/me` | `GET` | Get current user (Protected) |
| | `/api/auth/users` | `GET` | Search/List all users (Protected) |
| | `/api/auth/profile` | `PUT` | Update bio and profile photo (Protected) |
| | `/api/auth/delete-account` | `DELETE`| Permanent account removal (Protected) |
| **Friends** | `/api/auth/friends/request`| `POST` | Send a new friend request |
| | `/api/auth/friends/accept` | `POST` | Accept a pending request |
| | `/api/auth/friends/unfriend`| `POST` | Remove a friend connection |
| | `/api/auth/friends/pending`| `GET` | View incoming requests |
| **Status** | `/api/status/` | `POST` | Post a new status update |
| | `/api/status/` | `GET` | Fetch recent statuses from friends |

### 💬 Chat Service (Port 8001)

| Category | Endpoint | Method | Description |
|---|---|---|---|
| **Messaging**| `/messages` | `GET` | Fetch history for a specific room |
| | `/upload` | `POST` | Upload media/files to a chat |
| | `/poll` | `POST` | Create an interactive poll |
| **Rooms** | `/rooms` | `GET` | List active DMs and last messages |
| | `/rooms/:id` | `DELETE`| Hide a conversation from view |
| **Settings** | `/settings/pin` | `POST` | Pin/unpin a chat room |
| | `/settings/mute` | `POST` | Toggle notification muting |
| | `/settings/read` | `POST` | Mark all messages in room as read |
| | `/settings/room/disappearing` | `POST` | Set message self-destruct timer |
| **Groups** | `/groups/` | `POST` | Create a new group chat |
| | `/groups/user/:user`| `GET` | List all groups user belongs to |
| | `/groups/:id/add` | `POST` | Add a member to an existing group |

## 📄 License

This project is proprietary and for internal use only.
