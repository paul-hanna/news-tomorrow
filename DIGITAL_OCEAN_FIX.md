# Fixing Digital Ocean Deployment Error

## The Problem

You're seeing this error:
```
✘ could not detect app files that match known buildpacks.
```

This happens because Digital Ocean is looking in the wrong directory for your `package.json` file.

## The Solution

You have two options:

### Option 1: Use the App Spec File (Recommended)

The `.do/app.yaml` file is already configured. Just make sure:

1. **Push the `.do/app.yaml` file to GitHub**:
   ```bash
   git add .do/app.yaml
   git commit -m "Add Digital Ocean app spec"
   git push origin main
   ```

2. **In Digital Ocean App Platform**:
   - Go to your app settings
   - **Important**: Set **Source Directory** to `news-tomorrow` (this matches what the error shows)
   - Digital Ocean will automatically use the `.do/app.yaml` file
   - The `source_dir: backend` in the YAML will tell it to look in `news-tomorrow/backend` for your code

3. **Redeploy** - Digital Ocean should now detect the Node.js buildpack correctly
   
   **OR** if you want to use the repo root:
   - Set **Source Directory** to `/` (repo root) in the UI
   - Update `.do/app.yaml` to use `source_dir: news-tomorrow/backend`

### Option 2: Manual Configuration in UI

If you prefer to configure manually in the Digital Ocean UI:

1. **In App Platform Settings**:
   - **Source Directory**: Set to `news-tomorrow/backend` (NOT just `backend`)
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
   - **Environment**: `Node.js`

2. **Important**: The source directory must be the **full path from repo root** to your backend folder.

## Why This Happens

Your repository structure is:
```
paul-hanna.github.io/
  └── news-tomorrow/
      ├── backend/     ← Your Node.js code is here
      │   ├── package.json
      │   └── server.js
      └── frontend/
```

When Digital Ocean clones your repo, it needs to know the exact path to the `backend` folder. If you set the source directory to just `news-tomorrow`, it looks for `package.json` in that folder, but it's actually in `news-tomorrow/backend/`.

## Verification

After fixing, you should see in the build logs:
```
✔ detected Node.js buildpack
✔ found package.json
```

Instead of:
```
✘ could not detect app files
```

## Still Having Issues?

1. **Check the repository name** in `.do/app.yaml` matches your actual GitHub repo
2. **Verify the branch** is `main` (or update it in the YAML)
3. **Check the source_dir path** matches your actual folder structure
4. **Look at build logs** to see exactly where Digital Ocean is looking for files

