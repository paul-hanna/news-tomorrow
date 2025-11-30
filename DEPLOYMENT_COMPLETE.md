# Complete Deployment Guide

This guide will walk you through deploying your **Tomorrow's Tragedy** application to Digital Ocean (backend) and GitHub Pages (frontend).

## Overview

- **Frontend**: React + Vite app deployed to GitHub Pages
- **Backend**: Node.js/Express API deployed to Digital Ocean App Platform
- **Database**: PostgreSQL on Digital Ocean

---

## Step 1: Deploy Backend to Digital Ocean

### 1.1 Create PostgreSQL Database

1. Go to [Digital Ocean Dashboard](https://cloud.digitalocean.com/)
2. Navigate to **Databases** → **Create Database**
3. Choose:
   - **Engine**: PostgreSQL (version 15 or latest)
   - **Datacenter**: Choose closest to you
   - **Plan**: Basic ($15/month) is fine to start
   - **Database Name**: `predictions-db` (or your choice)
4. Click **Create Database Cluster**
5. Wait for database to be created (2-3 minutes)

### 1.2 Get Database Connection Details

1. Click on your database cluster
2. Go to **Connection Details** tab
3. Note down:
   - **Host** (e.g., `db-postgresql-nyc1-12345.db.ondigitalocean.com`)
   - **Port** (usually `25060`)
   - **Database** (e.g., `defaultdb`)
   - **Username** (e.g., `doadmin`)
   - **Password** (click "Show" to reveal)

### 1.3 Deploy Backend via App Platform

1. **Push your code to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Go to Digital Ocean Dashboard** → **App Platform** → **Create App**

3. **Connect GitHub**:
   - Click "GitHub" tab
   - Authorize Digital Ocean if needed
   - Select your repository: `paul-hanna.github.io` (or your repo name)
   - Select branch: `main`

4. **Configure the App**:
   
   **Option A: Using App Spec File (Recommended)**
   - The `.do/app.yaml` file is already configured
   - Digital Ocean will automatically detect and use it
   - Just verify the repository name matches in the file
   
   **Option B: Manual Configuration**
   - Digital Ocean will auto-detect it's a Node.js app
   - **Root Directory**: Set to `news-tomorrow/backend` (NOT just `backend`)
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
   - **Environment**: `Node.js` (auto-detected)
   
   **Important**: If you see "could not detect app files" error, make sure the Root Directory is set to `news-tomorrow/backend` (the full path from repo root).

5. **Add Environment Variables**:
   Click **Environment Variables** and add:
   
   ```
   NODE_ENV = production
   PORT = 8080
   DB_HOST = <your-db-host>
   DB_PORT = <your-db-port>
   DB_NAME = <your-db-name>
   DB_USER = <your-db-username>
   DB_PASSWORD = <your-db-password> (mark as SECRET)
   DB_SSL = true
   OPENAI_API_KEY = <your-key> (mark as SECRET, optional)
   ANTHROPIC_API_KEY = <your-key> (mark as SECRET, optional)
   OPENROUTER_API_KEY = <your-key> (mark as SECRET, optional)
   NEWS_API_KEY = <your-key> (mark as SECRET, optional)
   ```

   **Important**: Mark sensitive values (passwords, API keys) as **SECRET**.

6. **Connect Database** (Optional but Recommended):
   - Click **Resources** tab
   - Click **Add Resource** → **Database**
   - Select your PostgreSQL database from Step 1.1
   - This will automatically add connection variables

7. **Review and Deploy**:
   - Click **Review** → **Create Resources**
   - Wait for deployment (5-10 minutes)

### 1.4 Get Your Backend URL

1. Once deployed, go to your app in App Platform
2. Click on the **Live App** link or go to **Settings** → **Domains**
3. Your backend URL will be something like: `https://your-app-name-xyz123.ondigitalocean.app`
4. **Save this URL** - you'll need it for the frontend!

### 1.5 Initialize Database

1. **SSH into your app** (if using Droplet) or use App Platform console
2. **Run the database migration**:
   ```bash
   cd backend
   node migrate.js
   ```

   Or via App Platform:
   - Go to **Settings** → **Run Command**
   - Run: `node migrate.js`

### 1.6 Test Your Backend

Visit: `https://your-backend-url.ondigitalocean.app/api/predictions`

You should see JSON data (or an empty array `[]`).

---

## Step 2: Deploy Frontend to GitHub Pages

### 2.1 Enable GitHub Pages

1. Go to your GitHub repository: `https://github.com/paul-hanna/news-tomorrow`
2. Go to **Settings** → **Pages**
3. Under **Source**, select:
   - **Source**: `GitHub Actions`
4. Save (the workflow will handle deployment)

### 2.2 Add GitHub Secret for Backend URL

1. In your GitHub repository, go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-backend-url.ondigitalocean.app` (from Step 1.4)
4. Click **Add secret**

### 2.3 Deploy via GitHub Actions

The GitHub Actions workflow (`.github/workflows/deploy.yml`) will automatically:
- Build your frontend when you push to `main`
- Deploy to GitHub Pages

**To trigger deployment:**

1. **Push your code** (if you haven't already):
   ```bash
   git add .
   git commit -m "Add GitHub Actions deployment"
   git push origin main
   ```

2. **Check deployment status**:
   - Go to **Actions** tab in your GitHub repository
   - You should see "Deploy Frontend to GitHub Pages" workflow running
   - Wait for it to complete (2-3 minutes)

3. **Access your site**:
   - Your site will be available at: `https://paul-hanna.github.io/news-tomorrow/`
   - Or check the **Pages** section in repository settings for the exact URL

### 2.4 Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
cd frontend
npm install
VITE_API_URL=https://your-backend-url.ondigitalocean.app npm run build
```

Then push the `dist/` folder to the `gh-pages` branch (not recommended, use GitHub Actions instead).

---

## Step 3: Verify Everything Works

### 3.1 Test Frontend

1. Visit: `https://paul-hanna.github.io/news-tomorrow/`
2. The 3D lobby should load
3. Check browser console for any errors

### 3.2 Test API Connection

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Look for requests to `/api/predictions`
4. They should go to: `https://your-backend-url.ondigitalocean.app/api/predictions`
5. Should return JSON data (or empty array)

### 3.3 Test CORS

If you see CORS errors:
- Check that your backend URL is correct in GitHub Secrets
- Verify backend CORS configuration allows `*.github.io` domains
- Check backend logs in Digital Ocean App Platform

---

## Step 4: Populate Initial Data

### 4.1 Populate with Yesterday's Articles

You can populate your database with real news articles:

1. **Via API** (if you have a way to call it):
   ```bash
   curl -X POST https://your-backend-url.ondigitalocean.app/api/populate/yesterday
   ```

2. **Via App Platform Console**:
   - Go to your app in Digital Ocean
   - **Settings** → **Run Command**
   - Run: `node populate-yesterday.js`

### 4.2 Populate with NYTimes Articles

```bash
curl -X POST https://your-backend-url.ondigitalocean.app/api/populate/nytimes \
  -H "Content-Type: application/json" \
  -d '{"count": 15}'
```

---

## Troubleshooting

### Backend Issues

**Backend not starting:**
- Check logs in App Platform → **Runtime Logs**
- Verify all environment variables are set correctly
- Check database connection

**Database connection errors:**
- Verify database is running in Digital Ocean
- Check firewall rules allow connections
- Verify credentials in environment variables
- Make sure `DB_SSL=true` is set

**CORS errors:**
- Backend should allow `*.github.io` domains (already configured)
- Check `FRONTEND_URL` environment variable if you set one

### Frontend Issues

**404 errors on GitHub Pages:**
- Check that `vite.config.js` has correct `base: '/news-tomorrow/'`
- Verify repository name matches base path
- Clear browser cache

**API calls failing:**
- Check `VITE_API_URL` GitHub Secret is set correctly
- Verify backend URL is accessible
- Check browser console for CORS errors

**Build fails:**
- Check GitHub Actions logs
- Verify `package.json` has correct build script
- Check Node.js version (should be 20)

### General Issues

**Environment variables not working:**
- Frontend: Must use `VITE_` prefix (e.g., `VITE_API_URL`)
- Backend: No prefix needed
- GitHub Secrets: Must match exactly (case-sensitive)

**Deployment not triggering:**
- Check workflow file is in `.github/workflows/`
- Verify you pushed to `main` branch
- Check GitHub Actions tab for errors

---

## Cost Estimate

- **Digital Ocean App Platform**: ~$5-12/month (Basic plan)
- **PostgreSQL Database**: ~$15/month (Basic plan)
- **GitHub Pages**: **FREE**
- **Total**: ~$20-30/month

---

## Next Steps

1. ✅ Backend deployed to Digital Ocean
2. ✅ Frontend deployed to GitHub Pages
3. ✅ Database initialized
4. ✅ Environment variables configured
5. 🔄 Populate database with initial data
6. 🔄 Set up custom domain (optional)
7. 🔄 Monitor logs and performance

---

## Useful Links

- **Digital Ocean Dashboard**: https://cloud.digitalocean.com/
- **GitHub Repository**: https://github.com/paul-hanna/news-tomorrow
- **GitHub Pages**: https://paul-hanna.github.io/news-tomorrow/
- **Backend API**: `https://your-backend-url.ondigitalocean.app`

---

## Support

If you encounter issues:
1. Check logs in Digital Ocean App Platform
2. Check GitHub Actions logs
3. Review browser console for frontend errors
4. Verify all environment variables are set correctly

