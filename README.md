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

```
Pingora/
├── backend/                # Microservices ecosystem
│   ├── user-service/       # Auth, Profiles & Social (Node.js)
│   └── chat-service/       # Real-time Messaging (Python)
├── frontend/               # React (Vite) Application
│   └── pingora-app/        # Main Web Interface
├── mobile/                 # React Native (Expo) Application
├── uploads/                # [PERSISTED] User avatars and media
└── docker-compose.yml      # Full Stack Orchestration
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
   - **Web Frontend**: [http://localhost:3000](http://localhost:3000)
   - **User Service API**: [http://localhost:5000](http://localhost:5000)
   - **Chat Service API**: [http://localhost:8000](http://localhost:8000)

## 📋 Required Environment Variables

Ensure your `.env` files in the respective service directories contain the following:

| Service | Variable | Description | Default |
|---|---|---|---|
| **User Service** | `PORT` | API Port | `5000` |
| | `MYSQL_HOST` | Database host | `mysql` |
| | `JWT_SECRET` | Secret for token signing | `your_secret` |
| **Chat Service** | `PORT` | API Port | `8000` |
| | `MONGO_URI` | MongoDB connection string| `mongodb://mongo:27017/chat`|
| | `REDIS_URL` | Redis endpoint | `redis://redis:6379` |

## 🔗 API Endpoints

| Category | Endpoint | Method | Description |
|---|---|---|---|
| **Auth** | `/api/auth/register` | `POST` | Create a new user account |
| | `/api/auth/login` | `POST` | Authenticate and receive JWT |
| **Profile** | `/api/users/profile` | `GET` | Retrieve current user profile |
| | `/api/users/privacy` | `PATCH` | Update visibility settings |
| **Friends** | `/api/friends/request`| `POST` | Send a new friend request |
| | `/api/friends/accept` | `POST` | Accept a pending request |
| **Chat** | `/api/rooms` | `GET` | List all active chat rooms |
| | `/api/messages/:id` | `GET` | Fetch history for a room |

## 📄 License

This project is proprietary and for internal use only.
