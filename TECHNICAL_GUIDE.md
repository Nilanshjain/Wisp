# WispCloud - Enterprise-Grade Real-Time Messaging Platform

## Project Overview
WispCloud is a production-ready, scalable real-time messaging platform built with modern cloud architecture. This portfolio project demonstrates enterprise-level development skills including horizontal scaling, microservices patterns, caching strategies, cloud deployment, monitoring, and DevOps best practices - all optimized for cost-effective deployment.

**Goal:** Create a portfolio-grade messaging application with actual cloud deployment and scaling potential, showcasing skills to recruiters without requiring a business budget.

---

## Technology Stack

### Backend
- **Runtime:** Node.js 20+ with ES modules
- **Framework:** Express.js
- **Database:** MongoDB Atlas with Mongoose ODM
- **Caching:** Redis Cloud (with Redis Adapter for Socket.IO)
- **Authentication:** JWT (JSON Web Tokens) + bcryptjs for password hashing
- **Real-time Communication:** Socket.IO with Redis Adapter (multi-instance support)
- **File Upload:** Cloudinary integration
- **Environment Management:** dotenv

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite
- **Routing:** React Router DOM v7
- **State Management:** Zustand
- **Styling:** TailwindCSS v4 + DaisyUI
- **HTTP Client:** Axios
- **Real-time Communication:** Socket.IO Client
- **UI Components:** Lucide React icons
- **Notifications:** React Hot Toast

### Infrastructure & DevOps
- **Containerization:** Docker + Docker Compose
- **Cloud Deployment:** AWS ECS/Fargate or Railway
- **CDN & Hosting:** Vercel (frontend), Cloudinary (media)
- **Monitoring:** Sentry (error tracking), Grafana Cloud (metrics)
- **CI/CD:** GitHub Actions (planned)

---

## Project Structure

### Backend (`/backend`)
```
backend/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.js       # Authentication logic
│   │   └── message.controllers.js   # Message handling
│   ├── lib/
│   │   ├── cloudinary.js           # Cloudinary config
│   │   ├── db.js                   # Database connection with pooling
│   │   ├── redis.js                # Redis utilities & caching (NEW)
│   │   ├── socket.js               # Socket.IO with Redis Adapter (ENHANCED)
│   │   └── utils.js                # Utility functions
│   ├── middleware/
│   │   └── auth.middleware.js      # Authentication middleware
│   ├── models/
│   │   ├── message.model.js        # Message schema with indexes
│   │   └── user.model.js           # User schema with indexes
│   ├── routes/
│   │   ├── auth.route.js           # Auth routes
│   │   └── messageRoutes.js        # Message routes
│   ├── seeds/
│   │   └── user.seeds.js           # Database seeding
│   └── index.js                    # Entry point with graceful shutdown
├── Dockerfile                       # Multi-stage Docker build (NEW)
├── .dockerignore                    # Docker ignore file (NEW)
└── package.json
```

### Frontend (`/frontend/Wisp`)
```
frontend/Wisp/
├── src/
│   ├── components/
│   │   ├── AuthImagePattern.jsx    # Auth page decoration
│   │   ├── ChatContainer.jsx       # Main chat interface
│   │   ├── ChatHeader.jsx          # Chat header component
│   │   ├── MessageInput.jsx        # Message input field
│   │   ├── Navbar.jsx              # Navigation bar
│   │   ├── NoChatSelected.jsx      # Empty state
│   │   ├── Sidebar.jsx             # User/chat list
│   │   └── skeletons/              # Loading states
│   ├── lib/
│   │   ├── axios.js                # Axios configuration
│   │   └── utils.js                # Utility functions
│   ├── pages/
│   │   ├── HomePage.jsx            # Main chat page
│   │   ├── LoginPage.jsx           # Login interface
│   │   ├── ProfilePage.jsx         # User profile
│   │   ├── SettingsPage.jsx        # App settings
│   │   └── SignUpPage.jsx          # Registration
│   ├── store/
│   │   ├── useAuthStore.js         # Auth state management
│   │   ├── useChatStore.js         # Chat state management
│   │   └── useThemeStore.js        # Theme state management
│   ├── constants/
│   │   └── index.js                # App constants
│   ├── App.jsx                     # Root component
│   └── main.jsx                    # Entry point
├── Dockerfile                       # Multi-stage Docker build (NEW)
├── nginx.conf                       # Production nginx config (NEW)
├── .dockerignore                    # Docker ignore file (NEW)
└── package.json
```

### Root Directory
```
WispCloud/
├── backend/                         # Backend service
├── frontend/                        # Frontend application
├── docker-compose.yml              # Local development orchestration (NEW)
├── .env.example                    # Environment template (NEW)
├── .gitignore                      # Git ignore rules (NEW)
├── README.md                       # Project overview (UPDATED)
├── DEPLOYMENT.md                   # Deployment guide (NEW)
├── .claude                         # Claude context pointer
└── claude.md                       # This file - comprehensive docs
```

---

## Scalability Architecture

### Horizontal Scaling Ready ✅
WispCloud is designed to scale horizontally across multiple server instances:

1. **Redis Adapter for Socket.IO**
   - Pub/Sub pattern for WebSocket broadcasting
   - Socket ID mapping stored in Redis (not in-memory)
   - Supports unlimited server instances

2. **Stateless Backend**
   - No server-side session storage
   - All state in Redis/MongoDB
   - Load balancer with sticky sessions

3. **Database Optimization**
   - Compound indexes on Message model
   - Indexed fields: `senderId`, `receiverId`, `email`, `createdAt`
   - Connection pooling configured

4. **Caching Layer**
   - User profiles cached (5 min TTL)
   - Online users in Redis Set
   - Socket mappings in Redis Hash

### Key Features Implemented

#### ✅ Phase 1: Foundation (Completed)
- [x] Renamed to WispCloud
- [x] Docker setup (multi-stage builds)
- [x] MongoDB Atlas integration ready
- [x] Redis integration with utilities
- [x] Socket.IO Redis Adapter for multi-instance support
- [x] Database indexing for performance

#### 🔄 Phase 2: Advanced Features (In Progress)
- [ ] Rate limiting with Redis
- [ ] API input validation (Zod)
- [ ] Enhanced error handling
- [ ] Message pagination (cursor-based)
- [ ] Typing indicators
- [ ] Read receipts

#### 📋 Phase 3: Security & Monitoring (Planned)
- [ ] Argon2 password hashing
- [ ] Helmet.js security headers
- [ ] Sentry error tracking
- [ ] Grafana Cloud monitoring
- [ ] Health check dashboard

#### 📋 Phase 4: DevOps & Testing (Planned)
- [ ] GitHub Actions CI/CD pipeline
- [ ] Unit tests (Jest) - 80%+ coverage
- [ ] Integration tests (Supertest)
- [ ] Load testing (k6/Artillery)
- [ ] API documentation (Swagger)

---

## Key Features

### Currently Implemented
- **User Authentication:** JWT-based auth with secure cookie storage
- **Real-time Messaging:** Socket.IO with Redis Adapter for scaling
- **Horizontal Scaling:** Multi-instance WebSocket support
- **User Profiles:** Profile management with Cloudinary uploads
- **Online Presence:** Redis-backed online/offline tracking
- **Message Status:** Sent/delivered/read tracking (schema ready)
- **Theme Support:** Multiple themes via DaisyUI
- **Protected Routes:** Client-side route protection
- **Responsive Design:** Mobile-friendly UI
- **Health Monitoring:** `/health` endpoint for uptime checks
- **Docker Support:** Full containerization with compose
- **Database Optimization:** Compound indexes, connection pooling
- **Caching:** Redis layer for user data and sessions

### Planned Features
- Group chats & channels
- Typing indicators (event handling ready)
- Read receipts
- Message search
- File attachments
- Voice messages
- Push notifications
- E2E encryption (future)

---

## Architecture Patterns

### Current Implementation
- **State Management:** Zustand stores (auth, chat, theme)
- **API Layer:** Centralized Axios with interceptors
- **Middleware:** JWT verification, error handling
- **Real-time:** Event-driven Socket.IO with Redis Pub/Sub
- **Database:** Mongoose schemas with indexes and validation
- **Caching:** Redis with TTL for frequently accessed data
- **Session Management:** Redis-backed user sessions
- **Presence Management:** Redis Set for online users

### Scalability Patterns
- **Microservices-Ready:** Service-oriented architecture
- **Event-Driven:** Socket.IO events for real-time updates
- **Cache-Aside Pattern:** Redis caching with fallback to DB
- **Connection Pooling:** Optimized DB connections
- **Stateless Design:** No server-side state (12-factor app)

---

## Development Commands

### Local Development (without Docker)

**Backend:**
```bash
cd backend
npm install
npm run dev  # Runs on PORT from .env (default 5001)
```

**Frontend:**
```bash
cd frontend/Wisp
npm install
npm run dev      # Runs on http://localhost:5173
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # ESLint check
```

### Docker Development

**Start all services:**
```bash
docker-compose up
```

This starts:
- MongoDB (port 27017)
- Redis (port 6379)
- Backend (port 5001)
- Frontend (port 5173)

**Other commands:**
```bash
docker-compose up -d          # Detached mode
docker-compose logs -f        # Follow logs
docker-compose down           # Stop all services
docker-compose down -v        # Stop and remove volumes
```

---

## Environment Variables

### Backend (.env)
```env
# Server
PORT=5001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://admin:password123@localhost:27017/wispcloud?authSource=admin

# Redis
REDIS_URL=redis://:redis123@localhost:6379

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5001
```

---

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/check` - Verify authentication
- `PUT /api/auth/update-profile` - Update user profile

### Messages
- `GET /api/messages/users` - Get all users for sidebar
- `GET /api/messages/:id` - Get messages with specific user
- `POST /api/messages/send/:id` - Send message to user

### Health Check
- `GET /health` - Server health status

---

## Socket.IO Events

### Client → Server
- `connection` - User connects (with userId in query)
- `disconnect` - User disconnects
- `typing` - User is typing indicator

### Server → Client
- `getOnlineUsers` - Broadcast online user IDs
- `newMessage` - New message received
- `userTyping` - Someone is typing

---

## Database Schemas

### User Model
```javascript
{
  email: String (indexed, unique),
  fullName: String,
  password: String (select: false),
  profilePic: String,
  lastSeen: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Message Model
```javascript
{
  senderId: ObjectId (indexed),
  receiverId: ObjectId (indexed),
  text: String,
  image: String,
  status: enum ['sent', 'delivered', 'read'],
  readAt: Date,
  createdAt: Date (indexed),
  updatedAt: Date
}
```

**Indexes:**
- Compound: `(senderId, receiverId, createdAt)`
- Compound: `(receiverId, status)` for unread messages
- Single: `createdAt` for sorting

---

## Redis Data Structures

### User Session & Presence
- `user:{userId}` - Cached user profile (Hash, TTL: 5 min)
- `online_users` - Set of online user IDs
- `user:{userId}:lastSeen` - Last seen timestamp
- `user:{userId}:socketId` - User's current socket ID

### Socket Mapping
- `socket_user_map` - Hash mapping socket IDs to user IDs

---

## Deployment Options

### Option 1: Free Tier (Portfolio)
- **Frontend:** Vercel (FREE)
- **Backend:** Railway Starter ($5/month)
- **Database:** MongoDB Atlas M0 (FREE)
- **Cache:** Redis Cloud 30MB (FREE)
- **CDN:** Cloudinary (FREE)
- **Total: $5/month**

### Option 2: AWS (Resume-Worthy)
- **Compute:** ECS Fargate (free tier eligible)
- **Load Balancer:** Application Load Balancer
- **Database:** MongoDB Atlas M10 ($10/month)
- **Cache:** Redis Cloud 250MB ($5/month)
- **Frontend:** Vercel or S3+CloudFront
- **Total: ~$20-30/month**

See `DEPLOYMENT.md` for detailed deployment instructions.

---

## Performance Metrics (Target)

- **Concurrent Users:** 1,000+ WebSocket connections
- **Message Latency:** < 100ms (p95)
- **API Response Time:** < 200ms (p95)
- **Database Query Time:** < 50ms (with indexes)
- **Cache Hit Rate:** > 70%
- **Uptime:** 99.9% (monitored)

---

## Monitoring & Observability

### Health Checks
- `/health` endpoint returns server status
- Uptime monitoring with UptimeRobot (planned)

### Error Tracking
- Sentry integration ready
- Structured logging with Winston (planned)

### Metrics Dashboard
- Grafana Cloud for system metrics (planned)
- Track: API latency, active connections, error rates

---

## Security Features

### Implemented
- ✅ JWT authentication with HTTP-only cookies
- ✅ Password hashing with bcryptjs (10 rounds)
- ✅ CORS whitelist configuration
- ✅ Input trimming and validation
- ✅ Password select: false (not returned in queries)
- ✅ Environment variable security
- ✅ Docker non-root user

### Planned
- [ ] Argon2 password hashing (better than bcrypt)
- [ ] Rate limiting (express-rate-limit + Redis)
- [ ] Helmet.js security headers
- [ ] Input validation with Zod
- [ ] XSS protection
- [ ] HTTPS enforcement in production

---

## Resume-Worthy Highlights

### Architecture & Scalability
✅ Horizontal scaling with Redis Adapter
✅ WebSocket communication across multiple instances
✅ Microservices-ready architecture
✅ Event-driven design with Pub/Sub
✅ Database optimization (indexing, pooling)
✅ Caching strategies with Redis
✅ Stateless backend design

### DevOps & Infrastructure
✅ Docker containerization with multi-stage builds
✅ Docker Compose for local development
✅ Cloud deployment ready (AWS/Railway/Vercel)
✅ Health monitoring endpoints
✅ Graceful shutdown handling
✅ Environment-based configuration

### Best Practices
✅ Clean code architecture
✅ RESTful API design
✅ Security best practices
✅ Comprehensive documentation
✅ Error handling & logging
✅ Performance optimization

---

## Testing Strategy (Planned)

### Unit Tests
- Controllers, utilities, models
- Target: 80%+ coverage
- Tool: Jest

### Integration Tests
- API endpoints
- Database operations
- Tool: Supertest

### E2E Tests
- User flows (signup, login, chat)
- Tool: Playwright/Cypress

### Load Testing
- 1,000+ concurrent WebSocket connections
- Message throughput testing
- Tool: Artillery or k6

---

## CI/CD Pipeline (Planned)

### GitHub Actions Workflow
1. **Lint & Format** - ESLint, Prettier
2. **Type Check** - (when TypeScript added)
3. **Unit Tests** - Jest with coverage report
4. **Integration Tests** - Supertest
5. **Build** - Docker images
6. **Push** - To container registry (ECR/GHCR)
7. **Deploy** - To staging/production

---

## Recent Changes

### v1.0.0 - WispCloud Launch
- ✅ Renamed from Wisp to WispCloud
- ✅ Added Redis integration for horizontal scaling
- ✅ Implemented Socket.IO Redis Adapter
- ✅ Added database indexing for performance
- ✅ Docker containerization with compose
- ✅ User presence management with Redis
- ✅ Caching layer implementation
- ✅ Health check endpoint
- ✅ Comprehensive documentation

---

## Next Steps

### Immediate (Week 1-2)
1. Add rate limiting middleware
2. Implement Zod validation
3. Add Helmet.js security headers
4. Set up Sentry error tracking
5. Deploy to Railway/Vercel

### Short-term (Week 3-4)
1. Add typing indicators
2. Implement read receipts
3. Message pagination
4. GitHub Actions CI/CD
5. Load testing

### Long-term (Week 5-6)
1. Group chat support
2. Message search (Elasticsearch/MongoDB text search)
3. File attachments
4. Push notifications
5. Analytics dashboard

---

## Portfolio Deliverables

1. **Live Demo:** https://wispcloud.vercel.app (planned)
2. **GitHub Repo:** Clean, documented code
3. **Architecture Diagram:** System design visualization
4. **Blog Post:** "Building a Scalable Real-Time Chat App"
5. **Demo Video:** 2-3 min feature walkthrough
6. **Load Test Results:** Performance metrics showcase

---

## Resources & Documentation

- **Main README:** Project overview and quick start
- **DEPLOYMENT.md:** Comprehensive deployment guide
- **API Docs:** OpenAPI/Swagger (planned)
- **.env.example:** Environment variable template

---

## Notes for Development

- Frontend runs on `http://localhost:5173` (Vite default)
- Backend runs on `http://localhost:5001`
- MongoDB runs on `localhost:27017` (Docker)
- Redis runs on `localhost:6379` (Docker)
- Uses ES modules throughout (`.js` files with `type: "module"`)
- Docker Compose manages all services for local dev
- Redis Adapter enables multi-instance WebSocket support
- All passwords excluded from queries by default (security)

---

## License

MIT License - Free to use for portfolio/learning purposes
