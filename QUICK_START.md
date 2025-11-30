# Quick Start Deployment Checklist

Follow these steps in order to deploy your app:

## ✅ Pre-Deployment Checklist

- [ ] Code is pushed to GitHub repository
- [ ] You have a Digital Ocean account
- [ ] You have API keys ready (OpenAI, Anthropic, News API, etc.) - optional

---

## 🚀 Step 1: Deploy Backend (Digital Ocean)

### Create Database
1. Digital Ocean → **Databases** → **Create Database**
2. Choose PostgreSQL, Basic plan ($15/month)
3. Save connection details

### Deploy App
1. Digital Ocean → **App Platform** → **Create App**
2. Connect GitHub repository
3. Set **Root Directory**: `backend`
4. Add environment variables (see DEPLOYMENT_COMPLETE.md)
5. Deploy!

### Get Backend URL
- Copy your app URL: `https://your-app-name.ondigitalocean.app`

---

## 🌐 Step 2: Deploy Frontend (GitHub Pages)

### Add Secret
1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. New secret: `VITE_API_URL` = `https://your-backend-url.ondigitalocean.app`

### Enable Pages
1. GitHub repo → **Settings** → **Pages**
2. Source: **GitHub Actions**

### Deploy
1. Push to `main` branch (or workflow runs automatically)
2. Check **Actions** tab for deployment status
3. Your site: `https://paul-hanna.github.io/news-tomorrow/`

---

## 🧪 Step 3: Test

1. Visit frontend: `https://paul-hanna.github.io/news-tomorrow/`
2. Check browser console for errors
3. Test API: `https://your-backend-url.ondigitalocean.app/api/predictions`

---

## 📝 Step 4: Populate Data

```bash
# Populate with yesterday's articles
curl -X POST https://your-backend-url.ondigitalocean.app/api/populate/yesterday
```

---

## 🆘 Need Help?

See `DEPLOYMENT_COMPLETE.md` for detailed instructions and troubleshooting.

