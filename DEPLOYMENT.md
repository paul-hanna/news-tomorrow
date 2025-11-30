# Deployment Guide for GitHub Pages

This guide explains how to deploy the frontend to GitHub Pages while keeping environment variables secure.

## Important Notes

⚠️ **GitHub Pages only serves static files** - it cannot run your backend server. You'll need to:
1. Deploy the **frontend** to GitHub Pages (static hosting)
2. Deploy the **backend** separately (Digital Ocean, Railway, Render, etc.)

## Step 1: Deploy Backend First

Your backend needs to be running somewhere accessible. Since you mentioned Digital Ocean:

1. Deploy your backend to Digital Ocean (or another hosting service)
2. Note the backend URL (e.g., `https://your-backend.railway.app` or `https://api.yourdomain.com`)
3. Set up your environment variables on the hosting platform (never commit `.env` files)

## Step 2: Configure Frontend for Production

### Update Vite Config

The `vite.config.js` already handles environment variables. You'll need to:

1. Create a `.env.production` file in the `frontend/` directory:
```bash
VITE_API_URL=https://your-backend-url.com
```

2. Update `vite.config.js` to use the environment variable (see below)

### Update Frontend API Calls

The frontend currently uses relative paths (`/api/...`). For production, you need to use the full backend URL.

## Step 3: Set Up GitHub Pages

### Option A: Manual Deployment

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. The `dist/` folder contains your static files

3. Push the `dist/` folder contents to the `gh-pages` branch or use GitHub Pages settings

### Option B: GitHub Actions (Recommended)

I'll create a GitHub Actions workflow that:
- Builds the frontend on push
- Deploys to GitHub Pages automatically
- Uses environment variables from GitHub Secrets

## Step 4: Environment Variables

### For Frontend (Build-time only)

Create `frontend/.env.production`:
```
VITE_API_URL=https://your-backend-url.com
```

**Never put sensitive keys in frontend code!** The frontend is public and anyone can see the code.

### For Backend

Set environment variables on your hosting platform (Digital Ocean, Railway, etc.):
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_SSL`
- `OPENAI_API_KEY` (or other AI API keys)
- `NEWS_API_KEY`
- etc.

## Security Best Practices

1. ✅ **Backend API keys**: Store on hosting platform, never in code
2. ✅ **Frontend API URL**: Can be public (it's just the backend URL)
3. ❌ **Never put API keys in frontend code** - they'll be visible to anyone
4. ✅ **Use CORS** on backend to only allow your GitHub Pages domain

## Next Steps

1. I'll update `vite.config.js` to handle production API URLs
2. I'll create a GitHub Actions workflow for auto-deployment
3. You'll need to add `VITE_API_URL` as a GitHub Secret

