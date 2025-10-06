# Railway/Railpack Deployment Guide

## Quick Start

This monorepo is configured for easy deployment to Railway or any platform using Railpack (like Railway, Render, etc.).

### Configuration Files

Three configuration files are included in the root directory:

1. **`nixpacks.toml`** - Primary configuration for Nixpacks-based platforms (Railway)
2. **`Procfile`** - Fallback for Heroku-style buildpacks
3. **`railway.toml`** - Railway-specific advanced configuration

All three files are configured to deploy the **backend** service from the root directory.

## Deployment Options

### Option 1: Single Backend Service (Using Root Config)

Deploy just the backend using the root configuration files:

1. Create a new Railway project
2. Connect your GitHub repository
3. Railway will automatically detect and use the configuration files
4. Add required environment variables (see below)
5. Deploy!

The backend will be accessible at `your-service.up.railway.app`

### Option 2: Separate Backend + Frontend Services (Recommended)

Deploy backend and frontend as separate services:

#### Backend Service:
1. Create new service from GitHub repo
2. Set **Root Directory**: `backend`
3. Add environment variables
4. Deploy

#### Frontend Service:
1. Create another service from the same GitHub repo
2. Set **Root Directory**: `frontend/Wisp`
3. Add environment variable: `VITE_API_URL=<backend-url>`
4. Deploy

## Required Environment Variables

### Backend (.env in Railway)

**Required:**
```
NODE_ENV=production
PORT=5001
MONGODB_URI=<your-mongodb-connection-string>
REDIS_URL=<your-redis-connection-string>
JWT_SECRET=<generate-random-string-32-chars>
SESSION_SECRET=<generate-random-string-32-chars>
FRONTEND_URL=<your-frontend-url>
BACKEND_URL=<your-backend-url>
```

**Optional (for image uploads):**
```
CLOUDINARY_CLOUD_NAME=<your-cloudinary-name>
CLOUDINARY_API_KEY=<your-cloudinary-key>
CLOUDINARY_API_SECRET=<your-cloudinary-secret>
```

**Optional (for Google OAuth):**
```
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
```

> **Note:** If you don't set Google OAuth credentials, OAuth routes will be automatically disabled. This is expected behavior and won't cause errors.

### Frontend (.env in Railway)

```
VITE_API_URL=<your-backend-url>
```

## Generate Secrets

To generate secure JWT and session secrets:

```bash
# Using Node.js
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex')); console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'));"

# Using OpenSSL
openssl rand -hex 32
```

## Adding Databases on Railway

### MongoDB
1. Click **"+ New"** in your project
2. Select **"Database"** → **"MongoDB"**
3. Copy the connection string from the Variables tab
4. Add it as `MONGODB_URI` in backend service

### Redis
1. Click **"+ New"** in your project
2. Select **"Database"** → **"Redis"**
3. Copy the connection string from the Variables tab
4. Add it as `REDIS_URL` in backend service

## Deployment Checklist

- [ ] Push code to GitHub
- [ ] Create Railway project
- [ ] Add MongoDB database
- [ ] Add Redis database
- [ ] Deploy backend service (set root directory or use root config)
- [ ] Deploy frontend service (set root directory to `frontend/Wisp`)
- [ ] Add all required environment variables
- [ ] Update `FRONTEND_URL` in backend with frontend URL
- [ ] Update `VITE_API_URL` in frontend with backend URL
- [ ] Redeploy both services
- [ ] Test the application

## Testing Your Deployment

1. Visit backend URL: `https://your-backend.up.railway.app/health`
   - Should return: `{"status":"OK",...}`

2. Visit frontend URL: `https://your-frontend.up.railway.app`
   - Should load the application

3. Test registration and login

## Troubleshooting

### "Railpack could not determine how to build the app"
- Ensure configuration files (`nixpacks.toml`, `Procfile`, or `railway.toml`) are in the root
- Or deploy backend/frontend separately with root directory set

### "Unknown authentication strategy 'google'"
- This means Google OAuth is not configured
- Solution: Don't set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` if you don't need OAuth
- The app will automatically disable OAuth routes

### Build succeeds but app crashes
- Check Railway logs for error messages
- Verify all required environment variables are set
- Ensure MongoDB and Redis URLs are correct
- Check if MongoDB/Redis services are running

### CORS errors
- Verify `FRONTEND_URL` in backend matches your frontend URL exactly
- Verify `VITE_API_URL` in frontend matches your backend URL exactly
- Ensure both URLs include `https://` and don't have trailing slashes

## Cost Estimates

**Free Tier:**
- 500 hours/month of execution time
- Perfect for development and portfolio

**Paid ($5/month):**
- Unlimited hours
- 4 services (Backend, Frontend, MongoDB, Redis)
- Suitable for production demos

## Next Steps

After successful deployment:

1. Set up custom domain (optional)
2. Configure Cloudinary for image uploads
3. Set up Google OAuth (optional)
4. Monitor logs and usage in Railway dashboard
5. Set up auto-deploy from GitHub (enabled by default)

## Additional Resources

- Railway Documentation: https://docs.railway.app
- Nixpacks Documentation: https://nixpacks.com
- Project Documentation: See `DEPLOYMENT_STRATEGY.md` for more options

---

Need help? Check `DEPLOYMENT_STRATEGY.md` for detailed comparisons and alternative deployment options.
