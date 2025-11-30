# Deploying Backend to Digital Ocean

This guide walks you through deploying your backend to Digital Ocean using App Platform (recommended) or a Droplet.

## Option 1: Digital Ocean App Platform (Recommended - Easier)

App Platform is Digital Ocean's Platform-as-a-Service (PaaS) that handles server management for you.

### Step 1: Prepare Your Backend

✅ **Already done!** The following files are ready:
- `backend/Procfile` - Tells Digital Ocean how to start your app
- `backend/package.json` - Already has `"start": "node server.js"`
- `backend/migrate.js` - Database initialization script
- `backend/server.js` - Updated to use `process.env.PORT` and CORS

**Optional:** Create `.do/app.yaml` (App Platform configuration):
```yaml
name: tomorrow-tragedy-backend
region: nyc
services:
  - name: api
    github:
      repo: your-username/tomorrow-tragedy
      branch: main
      deploy_on_push: true
    source_dir: backend
    run_command: npm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: "8080"
      - key: DB_HOST
        scope: RUN_TIME
        type: SECRET
      - key: DB_PORT
        scope: RUN_TIME
        type: SECRET
      - key: DB_NAME
        scope: RUN_TIME
        type: SECRET
      - key: DB_USER
        scope: RUN_TIME
        type: SECRET
      - key: DB_PASSWORD
        scope: RUN_TIME
        type: SECRET
      - key: DB_SSL
        value: "true"
      - key: OPENAI_API_KEY
        scope: RUN_TIME
        type: SECRET
      - key: ANTHROPIC_API_KEY
        scope: RUN_TIME
        type: SECRET
      - key: OPENROUTER_API_KEY
        scope: RUN_TIME
        type: SECRET
      - key: NEWS_API_KEY
        scope: RUN_TIME
        type: SECRET
    databases:
      - name: predictions-db
        engine: PG
        version: "15"
        production: false
        cluster_name: predictions-db-cluster
        db_name: predictions
        db_user: predictions_user
```

### Step 2: Set Up PostgreSQL Database

1. **Go to Digital Ocean Dashboard** → **Databases** → **Create Database**
2. Choose **PostgreSQL** (version 15 or latest)
3. Choose a datacenter region (same as your app if possible)
4. Choose a plan (Basic $15/month is fine to start)
5. Name your database (e.g., `predictions-db`)
6. Click **Create Database Cluster**

### Step 3: Get Database Connection Info

1. Once the database is created, click on it
2. Go to **Connection Details**
3. Note down:
   - **Host** (e.g., `db-postgresql-nyc1-12345.db.ondigitalocean.com`)
   - **Port** (usually `25060`)
   - **Database** (e.g., `defaultdb`)
   - **Username** (e.g., `doadmin`)
   - **Password** (click "Show" to reveal)

### Step 4: Deploy via App Platform

#### Method A: Via GitHub (Recommended)

1. **Push your code to GitHub** (if not already)
2. **Go to Digital Ocean Dashboard** → **App Platform** → **Create App**
3. **Connect GitHub**:
   - Click "GitHub" tab
   - Authorize Digital Ocean
   - Select your repository: `tomorrow-tragedy`
   - Select branch: `main`
4. **Configure the App**:
   - Digital Ocean will auto-detect it's a Node.js app
   - **Root Directory**: Set to `backend`
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
5. **Add Environment Variables**:
   - Click **Environment Variables**
   - Add each variable:
     - `NODE_ENV` = `production`
     - `PORT` = `8080` (App Platform sets this automatically, but good to have)
     - `DB_HOST` = (from Step 3)
     - `DB_PORT` = (from Step 3)
     - `DB_NAME` = (from Step 3)
     - `DB_USER` = (from Step 3)
     - `DB_PASSWORD` = (from Step 3) - **Mark as SECRET**
     - `DB_SSL` = `true`
     - `OPENAI_API_KEY` = (your key) - **Mark as SECRET**
     - `ANTHROPIC_API_KEY` = (your key) - **Mark as SECRET**
     - `OPENROUTER_API_KEY` = (your key) - **Mark as SECRET**
     - `NEWS_API_KEY` = (your key) - **Mark as SECRET**
6. **Connect Database**:
   - Click **Resources** tab
   - Click **Add Resource** → **Database**
   - Select your PostgreSQL database from Step 2
   - This will automatically add connection variables
7. **Review and Deploy**:
   - Click **Review** → **Create Resources**
   - Wait for deployment (5-10 minutes)

#### Method B: Via App Spec File

1. Create the `.do/app.yaml` file (see Step 1)
2. Push to GitHub
3. Go to **App Platform** → **Create App** → **GitHub**
4. Select your repo
5. Digital Ocean will detect the `.do/app.yaml` file
6. Review and deploy

### Step 5: Get Your Backend URL

1. Once deployed, go to your app in App Platform
2. Click on the **Live App** link or go to **Settings** → **Domains**
3. Your backend URL will be something like: `https://your-app-name-xyz123.ondigitalocean.app`
4. **Save this URL** - you'll use it as `VITE_API_URL` in GitHub Secrets

### Step 6: CORS Configuration

✅ **Already configured!** The backend now automatically allows:
- Local development (localhost:5173, localhost:3000)
- Any GitHub Pages domain (*.github.io)
- Your custom frontend URL (via `FRONTEND_URL` env var)

You can optionally set `FRONTEND_URL` environment variable in App Platform if you want to restrict to a specific domain.

### Step 7: Test Your Backend

1. Visit: `https://your-app-url.ondigitalocean.app/api/predictions`
2. You should see JSON data (or an empty array)
3. Check logs in App Platform → **Runtime Logs** for any errors

---

## Option 2: Digital Ocean Droplet (More Control, More Setup)

If you prefer a virtual server you control completely:

### Step 1: Create a Droplet

1. **Go to Digital Ocean Dashboard** → **Droplets** → **Create Droplet**
2. Choose:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic ($6/month is fine to start)
   - **Datacenter**: Choose closest to you
   - **Authentication**: SSH keys (recommended) or password
3. Click **Create Droplet**

### Step 2: Set Up PostgreSQL on Droplet

1. **SSH into your droplet**:
```bash
ssh root@your-droplet-ip
```

2. **Update system**:
```bash
apt update && apt upgrade -y
```

3. **Install Node.js**:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version  # Should show v20.x
```

4. **Install PostgreSQL**:
```bash
apt install postgresql postgresql-contrib -y
sudo -u postgres psql
```

5. **Create database and user**:
```sql
CREATE DATABASE predictions;
CREATE USER predictions_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE predictions TO predictions_user;
\q
```

6. **Configure PostgreSQL** (allow remote connections if needed):
```bash
sudo nano /etc/postgresql/15/main/postgresql.conf
# Find and set: listen_addresses = '*'

sudo nano /etc/postgresql/15/main/pg_hba.conf
# Add line: host    all    all    0.0.0.0/0    md5
```

7. **Restart PostgreSQL**:
```bash
systemctl restart postgresql
```

### Step 3: Deploy Your Code

1. **Install Git**:
```bash
apt install git -y
```

2. **Clone your repository**:
```bash
cd /var/www
git clone https://github.com/your-username/tomorrow-tragedy.git
cd tomorrow-tragedy/backend
```

3. **Install dependencies**:
```bash
npm install --production
```

4. **Create `.env` file**:
```bash
nano .env
```

Add:
```
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=predictions
DB_USER=predictions_user
DB_PASSWORD=your-secure-password
DB_SSL=false
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
OPENROUTER_API_KEY=your-key
NEWS_API_KEY=your-key
```

5. **Set up PM2** (process manager):
```bash
npm install -g pm2
pm2 start server.js --name tomorrow-tragedy-api
pm2 save
pm2 startup  # Follow instructions to enable on boot
```

### Step 4: Set Up Nginx (Reverse Proxy)

1. **Install Nginx**:
```bash
apt install nginx -y
```

2. **Create Nginx config**:
```bash
nano /etc/nginx/sites-available/tomorrow-tragedy
```

Add:
```nginx
server {
    listen 80;
    server_name your-droplet-ip;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. **Enable site**:
```bash
ln -s /etc/nginx/sites-available/tomorrow-tragedy /etc/nginx/sites-enabled/
nginx -t  # Test config
systemctl restart nginx
```

### Step 5: Set Up SSL (Let's Encrypt)

1. **Install Certbot**:
```bash
apt install certbot python3-certbot-nginx -y
```

2. **Get SSL certificate**:
```bash
certbot --nginx -d your-domain.com
```

(You'll need to point a domain to your droplet IP first)

---

## Database Migration

Once your backend is deployed, you need to initialize the database:

1. **SSH into your droplet** (if using Droplet) or use App Platform console
2. **Run the database initialization**:
```bash
cd backend
node -e "require('./database').initializeDatabase().then(() => console.log('Database initialized'))"
```

Or create a migration script:

```javascript
// backend/migrate.js
require('dotenv').config();
const db = require('./database');

async function migrate() {
  try {
    await db.initializeDatabase();
    console.log('✅ Database initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
```

Then run: `node migrate.js`

---

## Troubleshooting

### Backend not starting
- Check logs: `pm2 logs` (Droplet) or App Platform → Runtime Logs
- Verify environment variables are set correctly
- Check database connection

### Database connection errors
- Verify database is running: `systemctl status postgresql`
- Check firewall rules allow connections
- Verify credentials in `.env`

### CORS errors
- Make sure your GitHub Pages URL is in the CORS allowed origins
- Check backend logs for CORS errors

### Port issues
- App Platform uses port 8080 by default (set via PORT env var)
- Droplet: Make sure port 3001 is open in firewall

---

## Cost Estimate

- **App Platform**: ~$5-12/month (Basic plan)
- **PostgreSQL Database**: ~$15/month (Basic plan)
- **Droplet**: ~$6/month (Basic) + Database setup time
- **Total**: ~$20-30/month for App Platform + Database

---

## Next Steps

Once your backend is deployed:
1. Test the API: `https://your-backend-url.ondigitalocean.app/api/predictions`
2. Update GitHub Secret `VITE_API_URL` with your backend URL
3. Deploy frontend to GitHub Pages (see DEPLOYMENT.md)

