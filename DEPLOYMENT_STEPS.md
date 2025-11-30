# Complete Deployment Guide: GitHub Pages + Digital Ocean

This guide walks you through deploying your app to both platforms.

## ✅ What's Already Done

- ✅ `.nojekyll` file created (disables Jekyll on GitHub Pages)
- ✅ GitHub Actions workflow created (`.github/workflows/deploy.yml`)
- ✅ Vite config has correct base path (`/news-tomorrow/`)
- ✅ Backend CORS configured for GitHub Pages domains

---

## Part 1: Deploy Backend to Digital Ocean

### Step 1: Create PostgreSQL Database

1. Go to **Digital Ocean Dashboard** → **Databases** → **Create Database**
2. Choose:
   - **Engine**: PostgreSQL (version 15 or latest)
   - **Plan**: Basic ($15/month)
   - **Region**: Choose closest to you
   - **Database Name**: `predictions` (or leave default)
3. Click **Create Database Cluster**
4. Wait 2-3 minutes for database to be created

### Step 2: Get Database Connection Info

1. Click on your database
2. Go to **Connection Details**
3. Note down:
   - **Host** (e.g., `db-postgresql-nyc1-12345.db.ondigitalocean.com`)
   - **Port** (usually `25060`)
   - **Database** (e.g., `defaultdb`)
   - **Username** (e.g., `doadmin`)
   - **Password** (click "Show" to reveal)

### Step 3: Create App Platform App

1. Go to **Digital Ocean Dashboard** → **App Platform** → **Create App**
2. **Connect GitHub**:
   - Click "GitHub" tab
   - Authorize Digital Ocean (if needed)
   - Select repository: `news-tomorrow`
   - Select branch: `main`
3. **Configure the App**:
   - Digital Ocean should auto-detect Node.js
   - **Source Directory**: `backend`
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
   - **Environment**: `Node.js`
4. **Add Environment Variables**:
   - Click **Environment Variables** tab
   - Add each variable (mark secrets as SECRET):
     ```
     NODE_ENV = production
     PORT = 8080
     DB_HOST = <from Step 2>
     DB_PORT = <from Step 2>
     DB_NAME = <from Step 2>
     DB_USER = <from Step 2>
     DB_PASSWORD = <from Step 2> (mark as SECRET)
     DB_SSL = true
     OPENAI_API_KEY = <your-key> (mark as SECRET, optional)
     ANTHROPIC_API_KEY = <your-key> (mark as SECRET, optional)
     OPENROUTER_API_KEY = <your-key> (mark as SECRET, optional)
     NEWS_API_KEY = <your-key> (mark as SECRET, optional)
     ```
5. **Connect Database** (Optional but Recommended):
   - Click **Resources** tab
   - Click **Add Resource** → **Database**
   - Select your PostgreSQL database
   - This auto-adds connection variables
6. **Review and Deploy**:
   - Click **Review** → **Create Resources**
   - Wait 5-10 minutes for deployment

### Step 4: Get Your Backend URL

1. Once deployed, go to your app in App Platform
2. Click the **Live App** link or go to **Settings** → **Domains**
3. Your backend URL will be: `https://your-app-name-xyz123.ondigitalocean.app`
4. **Save this URL** - you'll need it for GitHub Secrets!

### Step 5: Initialize Database

After deployment, you need to initialize the database schema. You can do this by:

1. **Option A: Add a one-time command in App Platform**:
   - Go to your app → **Settings** → **Run Command**
   - Run: `node migrate.js`
   - Or SSH into the app and run it

2. **Option B: Call the API endpoint** (if you have one):
   - The database will auto-initialize on first connection (check your `database.js`)

### Step 6: Test Your Backend

Visit: `https://your-backend-url.ondigitalocean.app/api/predictions`

You should see JSON (empty array `[]` is fine - means it's working but no data yet).

---

## Part 2: Deploy Frontend to GitHub Pages

### Step 1: Configure GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **"GitHub Actions"** (NOT "Deploy from a branch")
4. Save

### Step 2: Add GitHub Secret

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add:
   - **Name**: `VITE_API_URL`
   - **Value**: Your Digital Ocean backend URL (from Part 1, Step 4)
   - Example: `https://your-app-name-xyz123.ondigitalocean.app`
4. Click **Add secret**

### Step 3: Trigger Deployment

1. **Option A: Push to main branch** (if not already):
   ```bash
   git add .
   git commit -m "Configure deployment"
   git push origin main
   ```

2. **Option B: Manually trigger**:
   - Go to **Actions** tab in GitHub
   - Select "Deploy to GitHub Pages" workflow
   - Click **Run workflow** → **Run workflow**

### Step 4: Wait for Deployment

1. Go to **Actions** tab
2. Watch the workflow run (takes 2-3 minutes)
3. Once complete, your site will be at: `https://your-username.github.io/news-tomorrow/`

---

## Troubleshooting

### Backend Issues

**Build fails with "invalid Procfile"**:
- ✅ Fixed! The Procfile has been removed. App Platform uses `run_command` instead.

**Database connection errors**:
- Verify all DB environment variables are set correctly
- Check database firewall allows App Platform connections
- Ensure `DB_SSL=true` is set

**Backend not starting**:
- Check **Runtime Logs** in App Platform
- Verify `npm start` command works (runs `node server.js`)
- Check PORT is set (App Platform sets this automatically)

### Frontend Issues

**GitHub Pages shows 404**:
- Verify base path in `vite.config.js` matches your repo name (`/news-tomorrow/`)
- Check GitHub Pages is set to use "GitHub Actions" not "Deploy from a branch"

**CORS errors in browser**:
- Backend already allows `*.github.io` domains
- Verify backend URL in `VITE_API_URL` secret is correct
- Check backend is actually running

**Build fails in GitHub Actions**:
- Check `VITE_API_URL` secret is set
- Verify Node.js version (should be 20)
- Check build logs for specific errors

---

## Testing Your Deployment

1. **Test Backend**:
   ```bash
   curl https://your-backend-url.ondigitalocean.app/api/predictions
   ```

2. **Test Frontend**:
   - Visit: `https://your-username.github.io/news-tomorrow/`
   - Open browser console (F12)
   - Check for any errors
   - Try creating a prediction

---

## Cost Estimate

- **Digital Ocean App Platform**: ~$5-12/month (Basic plan)
- **PostgreSQL Database**: ~$15/month (Basic plan)
- **GitHub Pages**: Free
- **Total**: ~$20-27/month

---

## Next Steps After Deployment

1. ✅ Test both frontend and backend
2. ✅ Initialize database (run `node migrate.js` or let it auto-initialize)
3. ✅ Populate with test data (optional):
   ```bash
   curl -X POST https://your-backend-url.ondigitalocean.app/api/populate/nytimes
   ```
4. ✅ Monitor logs in both platforms
5. ✅ Set up custom domain (optional)

---

## Quick Reference

- **Backend URL**: `https://your-app-name-xyz123.ondigitalocean.app`
- **Frontend URL**: `https://your-username.github.io/news-tomorrow/`
- **GitHub Secret**: `VITE_API_URL` = your backend URL
- **Database**: PostgreSQL on Digital Ocean

Good luck! 🚀

