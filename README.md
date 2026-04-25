# Pingora Chat - Real-time Microservices Messaging Platform

Pingora is a premium, high-performance real-time chat application built with a **microservices architecture**. It features a decoupled backend using Node.js and Python (FastAPI), a responsive React frontend, and a cross-platform mobile client, all orchestrated for scalable and secure deployment.

## 🚀 Tech Stack

### 🖥️ Frontend (Web)
- **React 19 + Vite**: Modern, ultra-fast UI library with optimized production bundles.
- **Tailwind CSS**: Utility-first styling for a premium, responsive glassmorphism aesthetic.
- **Framer Motion**: Advanced animation engine for smooth transitions and interactive micro-interactions.
- **Socket.io-client**: Real-time bidirectional communication for instant messaging and presence.
- **Context API**: Clean and scalable global state management for Auth and UI preferences.

### 📱 Mobile (Cross-Platform)
- **React Native + Expo**: Single codebase for high-performance iOS and Android applications.
- **Native Modules**: Camera and Gallery integration for sharing media and status updates.
- **React Navigation**: Robust navigation patterns including Tab, Stack, and Drawer layouts.
- **Shared Logic**: Reuses core API and WebSocket services from the web frontend for feature parity.

### ⚙️ Microservices Backend
- **User Service (Node.js/Express)**: 
    - **Identity Provider**: Handles secure registration, login, and JWT-based session management.
    - **Social Graph**: Manages complex friendship states, pending requests, and user blocking.
    - **Security**: Implements Bcrypt hashing and granular middleware protection for all endpoints.
- **Chat Service (Python/FastAPI)**:
    - **High-Concurrency Messaging**: Leverages Python's `asyncio` for non-blocking message processing.
    - **WebSocket Orchestration**: Centralized manager for room-based broadcasting and delivery ACKs.
    - **Automated Tasks**: Integrated background scheduler for disappearing messages and data cleanup.

### 💾 Data & Infrastructure
- **PostgreSQL**: Robust relational database for identity, social connections, and account metadata.
- **MongoDB**: Highly scalable document store for message history, group details, and room logs.
- **Docker Compose**: Orchestrates isolated networks and persistent volumes across the entire stack.

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
- **Audio/Video Calls (WebRTC)**: Peer-to-peer secure calling integrated directly into the chat interface, secured in transit via **DTLS-SRTP**.
- **Data Security**: 
  - **Media Encryption at Rest**: All uploaded files and profile photos are securely encrypted on the server's disk using AES-256-CBC and Fernet.
  - **Text Encryption**: Database-level text encryption ensures message content remains secure at rest.
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
- **Tiered Account System (Pro vs. Normal)**:
  - **Pingora Premium**: Unlock exclusive features like detailed poll analytics and high-speed media sharing.
  - **Feature Gating**: Smart access control for advanced functionality (e.g., viewing granular poll votes).
  - **Premium Badges**: Sleek "PRO" badges for premium subscribers in profiles and sidebars.

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
| | `DATABASE_URL`| Postgres connection string | `postgres://...` |
| | `JWT_SECRET` | Secret for token signing | `your_secret` |
| | `ENCRYPTION_KEY` | Master key for AES-256 media encryption| `(Required)` |
| **Chat Service** | `PORT` | API Port | `8000` |
| | `MONGODB_URL` | MongoDB connection string| `mongodb://mongo:27017`|
| | `ENCRYPTION_KEY` | Key for message text & media encryption| `(Required)` |
| | `PYTHONUNBUFFERED` | Docker logging config | `1` |

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
| | `/api/auth/toggle-pro` | `POST` | Toggle between Normal and Pro tiers (Protected/Test) |
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
| | `/poll` | `POST` | Create interactive polls (supports multiple answers) |
| | `/poll/votes` | `GET` | View granular voter list (Pro Only) |
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
