# WispCloud Deployment Guide

## Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [Docker Deployment](#docker-deployment)
3. [Cloud Deployment](#cloud-deployment)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [Redis Setup](#redis-setup)
7. [Monitoring & Health Checks](#monitoring--health-checks)

---

## Local Development Setup

### Prerequisites
- Node.js 20+
- MongoDB (local or MongoDB Atlas)
- Redis (local or Redis Cloud)
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
cp ../.env.example .env  # Configure your environment variables
npm run dev
```

### Frontend Setup
```bash
cd frontend/Wisp
npm install
npm run dev
```

The app will be running at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5001

---

## Docker Deployment

### Using Docker Compose (Recommended for Development)

```bash
# Start all services (MongoDB, Redis, Backend, Frontend)
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Building Individual Containers

**Backend:**
```bash
cd backend
docker build -t wispcloud-backend:latest --target production .
docker run -p 5001:5001 --env-file .env wispcloud-backend:latest
```

**Frontend:**
```bash
cd frontend/Wisp
docker build -t wispcloud-frontend:latest --target production .
docker run -p 80:80 wispcloud-frontend:latest
```

---

## Cloud Deployment

### Option 1: AWS ECS/Fargate (Recommended for Resume)

#### 1. Push Images to Amazon ECR
```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag and push backend
docker tag wispcloud-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/wispcloud-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/wispcloud-backend:latest

# Tag and push frontend
docker tag wispcloud-frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/wispcloud-frontend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/wispcloud-frontend:latest
```

#### 2. Create ECS Task Definitions
- Use Fargate launch type
- Configure environment variables via AWS Secrets Manager
- Set up Application Load Balancer with WebSocket support
- Configure auto-scaling (min: 1, max: 3 tasks)

#### 3. Set up Application Load Balancer
- Enable sticky sessions for WebSocket connections
- Configure health check: `/health`
- HTTPS with ACM certificate

### Option 2: Railway/Render (Easiest for Portfolio)

#### Railway Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy backend
cd backend
railway up

# Deploy frontend
cd frontend/Wisp
railway up
```

#### Render Deployment
1. Connect GitHub repository
2. Create Web Service for backend:
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
3. Create Static Site for frontend:
   - Build Command: `cd frontend/Wisp && npm install && npm run build`
   - Publish Directory: `frontend/Wisp/dist`

### Option 3: Vercel (Frontend) + Railway/Render (Backend)

**Frontend on Vercel:**
```bash
cd frontend/Wisp
npm install -g vercel
vercel
```

Configure:
- Root Directory: `frontend/Wisp`
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

---

## Environment Variables

### Backend (.env)
```env
# Server
PORT=5001
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/wispcloud?retryWrites=true&w=majority

# Redis (Use Redis Cloud free tier)
REDIS_URL=redis://:<password>@<host>:<port>

# JWT Secret (MUST BE CHANGED IN PRODUCTION)
JWT_SECRET=use-crypto-random-bytes-minimum-32-characters

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend URL
FRONTEND_URL=https://your-domain.vercel.app

# Optional: Sentry for error tracking
SENTRY_DSN=your_sentry_dsn_here
```

### Frontend (.env)
```env
VITE_API_URL=https://your-backend-api-url.com
```

---

## Database Setup

### MongoDB Atlas (Free Tier - M0)

1. **Create Account**: https://cloud.mongodb.com
2. **Create Cluster**:
   - Choose M0 (Free tier)
   - Select region closest to your users
3. **Security**:
   - Database Access: Create user with password
   - Network Access: Add IP (0.0.0.0/0 for development, specific IPs for production)
4. **Connection String**:
   ```
   mongodb+srv://<user>:<password>@cluster.mongodb.net/wispcloud?retryWrites=true&w=majority
   ```

### Database Indexes
Indexes are automatically created via Mongoose schemas:
- User: `email`, `createdAt`
- Message: `senderId + receiverId + createdAt`, `receiverId + status`

---

## Redis Setup

### Redis Cloud (Free Tier - 30MB)

1. **Create Account**: https://redis.com/try-free/
2. **Create Database**:
   - Choose 30MB free tier
   - Select region closest to your application
3. **Get Connection Details**:
   - Endpoint: `redis-xxxxx.redis.cloud:xxxxx`
   - Password: Generate secure password
4. **Connection String**:
   ```
   redis://:<password>@<endpoint>:<port>
   ```

### Redis Usage in WispCloud
- **Socket.IO Adapter**: Multi-instance WebSocket support
- **Session Storage**: User sessions and socket mappings
- **Presence Management**: Online/offline status
- **Caching**: User profiles (5 min TTL)

---

## Monitoring & Health Checks

### Health Check Endpoint
```bash
curl https://your-api-url.com/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2025-10-02T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

### Recommended Monitoring Tools

#### 1. Sentry (Error Tracking - FREE)
```bash
npm install @sentry/node @sentry/integrations
```

#### 2. Grafana Cloud (Metrics - FREE)
- Monitor: API latency, active connections, error rates
- Dashboards for real-time system health

#### 3. UptimeRobot (Uptime Monitoring - FREE)
- Monitor: `/health` endpoint every 5 minutes
- Alert via email/SMS on downtime

---

## Scaling Configuration

### Horizontal Scaling
WispCloud is ready for horizontal scaling:
- ✅ Redis Adapter for Socket.IO (multi-instance WebSocket support)
- ✅ Stateless backend (sessions in Redis)
- ✅ Database connection pooling
- ✅ Sticky sessions for WebSocket connections

### Load Balancer Configuration
```nginx
upstream backend {
    ip_hash;  # Sticky sessions for WebSocket
    server backend-1:5001;
    server backend-2:5001;
    server backend-3:5001;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Auto-Scaling Policies (AWS ECS)
- Scale out: CPU > 70% for 2 minutes
- Scale in: CPU < 30% for 5 minutes
- Min: 1 task, Max: 3 tasks

---

## Performance Optimization

### Backend
- ✅ Database indexing on frequently queried fields
- ✅ Redis caching (user profiles, online status)
- ✅ Connection pooling (MongoDB)
- ✅ Compression (gzip)
- ✅ Lazy loading with pagination

### Frontend
- ✅ Code splitting
- ✅ Image optimization (Cloudinary)
- ✅ Vite production build optimizations
- ✅ Nginx caching for static assets

---

## Security Checklist

- ✅ HTTPS/TLS encryption
- ✅ CORS whitelist configuration
- ✅ JWT authentication with HTTP-only cookies
- ✅ Password hashing with bcrypt
- ✅ Input validation
- ✅ Rate limiting (ready to add with express-rate-limit)
- ✅ Helmet.js security headers (ready to add)
- ✅ Environment variables for secrets

---

## Troubleshooting

### Common Issues

**Redis connection fails:**
```bash
# Check Redis URL format
REDIS_URL=redis://:<password>@<host>:<port>

# Test connection
redis-cli -h <host> -p <port> -a <password> ping
```

**MongoDB connection timeout:**
- Check IP whitelist in MongoDB Atlas
- Verify connection string format
- Ensure network allows outbound connections

**WebSocket connection fails:**
- Enable sticky sessions on load balancer
- Check CORS configuration
- Verify frontend connects to correct backend URL

**Docker containers can't communicate:**
```bash
# Ensure all services are on the same network
docker network inspect wispcloud-network
```

---

## Cost Breakdown

### FREE Tier Deployment
- MongoDB Atlas M0: $0/month
- Redis Cloud 30MB: $0/month
- Vercel (Frontend): $0/month
- Railway Starter: $5/month OR AWS Free Tier: $0/month (12 months)
- Cloudinary: $0/month
- **Total: $0-5/month**

### Production-Ready Deployment
- MongoDB Atlas M10: $10/month
- Redis Cloud 250MB: $5/month
- AWS ECS Fargate: ~$15/month
- Vercel Pro: $20/month (optional)
- Domain: $12/year
- **Total: ~$30-50/month**

---

## Next Steps After Deployment

1. ✅ Set up monitoring (Sentry + Grafana Cloud)
2. ✅ Configure auto-scaling policies
3. ✅ Add rate limiting middleware
4. ✅ Implement CI/CD pipeline (GitHub Actions)
5. ✅ Load testing (Artillery/k6)
6. ✅ Document API with Swagger/OpenAPI
7. ✅ Write blog post about architecture
8. ✅ Create demo video for portfolio

---

## Support & Resources

- Documentation: See `README.md` and `claude.md`
- Issues: GitHub Issues
- MongoDB Docs: https://docs.mongodb.com
- Redis Docs: https://redis.io/docs
- Socket.IO Docs: https://socket.io/docs
