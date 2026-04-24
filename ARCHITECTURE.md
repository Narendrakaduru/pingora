# System Architecture — Pingora Chat

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph Client["🖥️ Client Tier"]
        WEB["React Web (Vite)"]
        MOBILE["React Native (Expo)"]
    end

    subgraph ServiceTier["⚙️ Service Tier (Docker)"]
        US["User Service (Node.js/Express)"]
        CS["Chat Service (Python/FastAPI)"]
    end

    subgraph DataTier["💾 Data Tier"]
        MYSQL[("MySQL (Identity/Social)")]
        MONGO[("MongoDB (Messaging)")]
        REDIS[("Redis (Real-time State)")]
    end

    WEB -- "REST/JSON" --> US
    WEB -- "WS/Socket.io" --> CS
    MOBILE -- "REST/JSON" --> US
    MOBILE -- "WS/Socket.io" --> CS

    CS -- "gRPC/Internal REST" --> US
    
    US -- "Persistence" --> MYSQL
    CS -- "Persistence" --> MONGO
    CS -- "State/Cache" --> REDIS
```

---

## 2. Backend Request Lifecycle

```mermaid
sequenceDiagram
    participant Client
    participant API as User/Chat Service
    participant Middleware as Auth/Validation
    participant Logic as Controller/Service
    participant DB as MySQL/MongoDB

    Client->>API: HTTP Request / WS Event
    API->>Middleware: intercept(JWT)
    alt Unauthorized
        Middleware-->>Client: 401 Unauthorized
    else Authorized
        Middleware->>Logic: Process Business Logic
        Logic->>DB: Query/Persist Data
        DB-->>Logic: Result
        Logic-->>API: Response Data
        API-->>Client: JSON / WS Ack
    end
```

---

## 3. Database Schema (ERD)

```mermaid
erDiagram
    USER ||--o{ FRIENDSHIP : "has"
    USER ||--o{ MESSAGE : "sends"
    USER ||--o| PRIVACY_SETTINGS : "defines"
    ROOM ||--|{ MESSAGE : "contains"
    USER ||--o{ ROOM_PARTICIPANT : "joins"

    USER {
        int id PK
        string username
        string email UK
        string password
        string profile_photo
        datetime created_at
    }

    FRIENDSHIP {
        int id PK
        int user_id FK
        int friend_id FK
        enum status "pending | accepted | blocked"
        int sender_id FK
    }

    MESSAGE {
        string _id PK
        string room_id FK
        string sender_id FK
        string content
        enum type "text | image | status"
        datetime timestamp
    }

    ROOM {
        string _id PK
        enum type "private | group"
        json metadata
        int disappearing_time
    }
```

---

## 4. Frontend Architecture (React + Custom Hooks)

```mermaid
graph TD
    subgraph UI["UI Layer"]
        APP["App.jsx"]
        COMP["Components (ChatBox, Sidebar, Status)"]
        MODAL["Premium Modals (Danger Zone, Privacy)"]
    end

    subgraph State["State Management"]
        AUTH_CTX["AuthContext"]
        WS_HOOK["useSocket Hook"]
        UI_CTX["UIStateContext"]
    end

    subgraph Services["Network Layer"]
        AXIOS["Axios Interceptors (JWT)"]
        WS["Socket.io Connection"]
    end

    COMP -- "useContext / useHook" --> State
    State -- "API Call" --> AXIOS
    State -- "Emit/Listen" --> WS
    AXIOS -- "Fetch" --> US[User Service]
    WS -- "Real-time" --> CS[Chat Service]
```

---

## 5. Real-time Messaging Flow

```mermaid
flowchart TD
    A([Sender]) --> B[WS: emit 'send_message']
    B --> C[Chat Service]
    C --> D{Privacy Check}
    D -- "Query User Service" --> E{Is Friend & Not Blocked?}
    E -- No --> F[WS: emit 'error']
    E -- Yes --> G[Persist to MongoDB]
    G --> H[WS: emit 'new_message' to Recipient]
    H --> I[WS: emit 'message_ack' to Sender]
```

---

## 6. Authentication & Authorization

| Component | Logic | Storage |
|---|---|---|
| **Token Type** | JSON Web Token (JWT) | LocalStorage (Web) / SecureStore (Mobile) |
| **Authentication** | `POST /api/auth/login` | MySQL (Bcrypt Hashing) |
| **Authorization** | Bearer Token in Headers | Verified by `express-jwt` or FastAPI Depends |
| **Cross-Service** | Header forwarding | Token validated at service entry |

---

## 7. Frontend Route Map

| Route | Component | Protected | Purpose |
|---|---|---|---|
| `/` | `LandingPage` | ❌ | Introduction and entry |
| `/login` | `LoginPage` | ❌ | User authentication |
| `/chat` | `ChatDashboard`| ✅ | Main messaging interface |
| `/profile`| `ProfilePage` | ✅ | User settings and privacy |
| `/status` | `StatusViewer` | ✅ | View and post stories |

---

## 8. Deployment Strategy (Docker)

- **Isolation**: Each service runs in its own container, sharing a private network.
- **Persistence**: 
    - `mysql_data` -> Local host path mapping.
    - `mongo_data` -> Local host path mapping.
    - `uploads` -> Shared volume for media assets.
- **Service Discovery**: Docker internal DNS allows services to communicate via names (e.g., `http://user-service:5000`).
