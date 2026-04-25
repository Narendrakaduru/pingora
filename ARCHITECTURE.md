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
    end

    WEB -- "REST/JSON" --> US
    WEB -- "WS/Socket.io" --> CS
    MOBILE -- "REST/JSON" --> US
    MOBILE -- "WS/Socket.io" --> CS

    CS -- "Internal REST (HTTP)" --> US
    
    US -- "Persistence" --> MYSQL
    CS -- "Persistence" --> MONGO
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
        
        opt Chat Service (Inter-service)
            Logic->>US: GET /api/auth/privacy (Check Friendship/Block)
            US-->>Logic: Privacy Context
        end

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
        enum account_type "normal | pro"
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

    USER_SETTINGS {
        string _id PK
        string username FK
        string room_id FK
        boolean is_pinned
        boolean is_muted
        boolean is_archived
        datetime last_read_timestamp
    }

    USER_PRESENCE {
        string _id PK
        string username FK
        datetime last_seen
        boolean is_online
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

## 5. Real-time Messaging & WebRTC Flow

```mermaid
flowchart TD
    subgraph Messaging
        A([Sender]) --> B[WS: emit 'send_message']
        B --> C[Chat Service]
        C --> D{"Privacy & Block Check (via US)"}
        D -- "Blocked/Not Friend" --> F[WS: emit 'error']
        D -- "Allowed" --> G[Encrypt & Persist to MongoDB]
        G --> H[WS: emit 'new_message' to Room/Recipient]
        H --> I[WS: emit 'message_ack' to Sender]
    end

    subgraph WebRTC Calls
        W1([Caller]) --> W2[WS: emit 'call_request']
        W2 --> W3[Chat Service Signalling]
        W3 --> W4{"Check Friendship"}
        W4 -- "Allowed" --> W5[WS: relay to Callee]
        W5 --> W6([Callee])
        W6 -. "webrtc_signal (SDP/ICE)" .-> W3
        W3 -. "relay" .-> W1
        W1 == "Peer-to-Peer E2EE Media Stream (DTLS-SRTP)" === W6
    end
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

---

## 9. Tiered Service Architecture (Pro vs Normal)

Pingora implements a tiered access model where certain advanced analytics or premium UI features are gated behind a "Pro" status.

- **State Management**: Managed in the `User` model via the `accountType` field.
- **Access Enforcement**: 
  - **Frontend**: Context-aware gating (e.g., `MessageBubble` restricting poll analytics).
  - **Backend**: API-level checks on the authenticated user's tier before returning premium data (like granular voter lists).
  - **Visuals**: Dynamic badge rendering based on the global `AuthContext` state.

---

## 10. Data Security & Privacy

Pingora implements multi-layered security for user data:

- **Media Encryption at Rest**: 
  - All user uploads (profile photos, chat attachments) are encrypted before being written to disk using **AES-256-CBC** (Node.js) and **Fernet** (Python).
  - Static file serving is disabled; media is decrypted "on-the-fly" in server memory during authenticated HTTP requests.
- **End-to-End Encryption (E2EE) in Transit**:
  - All real-time Audio and Video calls utilize WebRTC. The peer-to-peer media streams are secured using **DTLS-SRTP** (Datagram Transport Layer Security - Secure Real-time Transport Protocol), meaning media cannot be intercepted by the backend servers.
- **Client-Side Persistence**:
  - Application settings (theme, media quality preferences) are securely synchronized to `localStorage` and immediately rehydrated on page load, minimizing unnecessary server round-trips while preserving UX state.
