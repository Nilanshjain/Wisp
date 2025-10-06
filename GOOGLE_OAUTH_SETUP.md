# Google OAuth Setup Guide

This guide will walk you through setting up Google OAuth for WispCloud's "Sign in with Google" feature.

## Prerequisites
- Google Account
- WispCloud project running locally or deployed

---

## Step 1: Create a Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com
   - Sign in with your Google account

2. **Create a New Project**
   - Click the project dropdown at the top
   - Click **"New Project"**
   - Project Name: `WispCloud` (or any name you prefer)
   - Click **"Create"**
   - Wait for the project to be created and switch to it

---

## Step 2: Enable Google+ API

1. **Navigate to APIs & Services**
   - In the left sidebar, click **"APIs & Services"** > **"Library"**

2. **Enable Required API**
   - Search for: `Google+ API`
   - Click on **"Google+ API"**
   - Click **"Enable"**
   - Wait for it to enable (takes a few seconds)

---

## Step 3: Configure OAuth Consent Screen

1. **Navigate to OAuth Consent Screen**
   - Left sidebar: **"APIs & Services"** > **"OAuth consent screen"**

2. **Choose User Type**
   - Select **"External"** (for public access)
   - Click **"Create"**

3. **Fill in App Information**
   - **App name:** `WispCloud`
   - **User support email:** Your email address
   - **App logo:** (Optional) Upload your logo
   - **App domain:** (Skip for now, required for production)
   - **Developer contact email:** Your email address

4. **Scopes** (Next screen)
   - Click **"Add or Remove Scopes"**
   - Select:
     - `../auth/userinfo.email`
     - `../auth/userinfo.profile`
     - `openid`
   - Click **"Update"**
   - Click **"Save and Continue"**

5. **Test Users** (For development)
   - Click **"Add Users"**
   - Add your email and any test accounts you want to use
   - Click **"Save and Continue"**

6. **Summary**
   - Review and click **"Back to Dashboard"**

---

## Step 4: Create OAuth Credentials

1. **Navigate to Credentials**
   - Left sidebar: **"APIs & Services"** > **"Credentials"**

2. **Create OAuth Client ID**
   - Click **"+ Create Credentials"** at the top
   - Select **"OAuth client ID"**

3. **Configure OAuth Client**
   - **Application type:** `Web application`
   - **Name:** `WispCloud Web Client`

4. **Add Authorized JavaScript Origins**

   **For Local Development:**
   ```
   http://localhost:5001
   http://localhost:5173
   ```

   **For Production (add later when deployed):**
   ```
   https://your-backend-domain.com
   https://your-frontend-domain.com
   ```

5. **Add Authorized Redirect URIs**

   **For Local Development:**
   ```
   http://localhost:5001/api/auth/oauth/google/callback
   ```

   ⚠️ **Important:** The URI must exactly match. No trailing slashes!

   **For Production (add later when deployed):**
   ```
   https://your-backend-domain.com/api/auth/oauth/google/callback
   ```

6. **Create**
   - Click **"Create"**
   - You'll see a popup with your credentials

---

## Step 5: Copy Credentials to .env

1. **Copy Your Credentials**
   - From the popup, copy:
     - **Client ID** (long string ending in `.apps.googleusercontent.com`)
     - **Client secret** (random string)

2. **Update backend/.env**
   - Open: `C:\Users\Nilansh\Desktop\WispCloud\backend\.env`
   - Update these lines:

   ```env
   GOOGLE_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID_HERE.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=YOUR_ACTUAL_CLIENT_SECRET_HERE
   ```

3. **Save the file**

---

## Step 6: Test the Integration

1. **Start your application**
   ```bash
   # If using Docker
   docker-compose down
   docker-compose up

   # OR if running manually
   # Terminal 1
   cd backend && npm run dev

   # Terminal 2
   cd frontend/Wisp && npm run dev
   ```

2. **Test Google Sign-In**
   - Open: http://localhost:5173
   - Click on the **"Sign in with Google"** button
   - You should see the Google OAuth consent screen
   - Sign in with your test account
   - You'll be redirected back to WispCloud

3. **Verify Success**
   - Check backend logs for: `✅ Redis connected successfully`
   - You should be logged in automatically
   - Check MongoDB to see your user was created

---

## Production Deployment Updates

When you deploy to production, update your OAuth credentials:

### 1. Add Production URLs

1. Go back to: https://console.cloud.google.com
2. Navigate to **"Credentials"**
3. Click on your OAuth Client ID
4. Add production URLs:

**Authorized JavaScript origins:**
```
https://your-production-backend.com
https://your-production-frontend.com
```

**Authorized redirect URIs:**
```
https://your-production-backend.com/api/auth/oauth/google/callback
```

### 2. Update Production .env

Update your production environment variables:
```env
BACKEND_URL=https://your-production-backend.com
FRONTEND_URL=https://your-production-frontend.com
GOOGLE_CLIENT_ID=same_as_before
GOOGLE_CLIENT_SECRET=same_as_before
```

### 3. Publish OAuth Consent Screen

1. In Google Cloud Console
2. Go to **"OAuth consent screen"**
3. Click **"Publish App"**
4. This removes the test user limitation

---

## Troubleshooting

### Error: "redirect_uri_mismatch"
- **Cause:** Redirect URI doesn't match what you configured
- **Fix:**
  - Check your `BACKEND_URL` in .env matches the redirect URI
  - Verify redirect URI in Google Console includes `/api/auth/oauth/google/callback`
  - Make sure there's no trailing slash

### Error: "Access blocked: This app's request is invalid"
- **Cause:** Missing scopes or consent screen not configured
- **Fix:** Go back to Step 3 and configure the OAuth consent screen

### Google OAuth button doesn't work
- **Cause:** Missing environment variables
- **Fix:**
  - Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
  - Restart your backend server after updating .env
  - Check backend logs for OAuth configuration messages

### Users see "This app is not verified"
- **Normal for development:** Users can click "Advanced" > "Go to WispCloud (unsafe)"
- **For production:** Submit your app for Google verification (optional)

---

## Security Best Practices

1. **Never commit OAuth secrets**
   - Keep .env in .gitignore
   - Use environment variables in production

2. **Use HTTPS in production**
   - Google requires HTTPS for production OAuth
   - Only use HTTP for local development

3. **Restrict redirect URIs**
   - Only add URIs you actually use
   - Remove development URIs in production

4. **Rotate secrets periodically**
   - You can regenerate client secrets in Google Console
   - Update your .env when you do

---

## Cost

**FREE** - Google OAuth is completely free to use with no limits.

---

## Need Help?

- **Google OAuth Docs:** https://developers.google.com/identity/protocols/oauth2
- **WispCloud Issues:** Check your backend logs for detailed error messages

---

**Setup Time:** ~10-15 minutes

Once configured, Google OAuth will work automatically for all users!
