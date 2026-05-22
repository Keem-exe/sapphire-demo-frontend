# Sapphire Frontend - Vercel Deployment Steps

## ⚡ Quick Deploy Guide

### Step 1: Prepare Your Code

1. **Ensure all files are saved**
2. **Update .env.local with your backend URL:**
   ```bash
   NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
   ```

### Step 2: Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "feat: configure for backend API connection"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/sapphire-frontend.git

# Push
git push -u origin main
```

### Step 3: Deploy on Vercel

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"

2. **Import from GitHub**
   - Select your `sapphire-frontend` repository
   - Click "Import"

3. **Configure Project**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./`
   - Leave build settings as default

4. **Add Environment Variables**
   Click "Environment Variables" and add:
   
   **Required:**
   ```
   Name: NEXT_PUBLIC_BACKEND_URL
   Value: https://your-deployed-backend.com
   ```
   
   **Optional:**
   ```
   Name: GOOGLE_GEMINI_API_KEY
   Value: your_gemini_api_key
   
   Name: YOUTUBE_API_KEY
   Value: your_youtube_api_key
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment (usually 2-3 minutes)
   - Your site will be live at `https://your-project.vercel.app`

### Step 4: Configure Backend CORS

Update your backend to allow requests from Vercel:

```python
# In your sapphire-main backend (FastAPI example)
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",           # Local development
        "https://your-project.vercel.app", # Production
        "https://*.vercel.app",            # All Vercel preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Step 5: Test Deployment

1. Visit your Vercel URL
2. Test features:
   - [ ] Login works
   - [ ] Quiz generation connects to backend
   - [ ] Flashcards work
   - [ ] AI chat responds
   - [ ] YouTube shorts load

## 🔄 Continuous Deployment

Vercel automatically deploys on every push to `main`:

```bash
# Make changes
git add .
git commit -m "your changes"
git push

# Vercel auto-deploys in ~2 minutes
```

## 🎯 Custom Domain (Optional)

1. Go to your Vercel project → Settings → Domains
2. Add your custom domain (e.g., `sapphire.yourdomain.com`)
3. Follow DNS configuration instructions
4. Update backend CORS to include your custom domain

## 📊 Monitor Deployment

- **Vercel Dashboard:** View logs, analytics, and build status
- **Build Logs:** Click on deployment → View Build Logs
- **Runtime Logs:** Click on deployment → View Function Logs

## ⚠️ Common Issues

### Issue: "NEXT_PUBLIC_BACKEND_URL is undefined"
**Solution:** Add environment variable in Vercel dashboard, then redeploy

### Issue: CORS errors
**Solution:** Verify backend CORS allows your Vercel domain

### Issue: Build fails
**Solution:** Check build logs in Vercel dashboard. Common causes:
- TypeScript errors (set `ignoreBuildErrors: true` in next.config.mjs)
- Missing dependencies (run `npm install` locally)

## 🚀 You're Live!

Once deployed:
- Frontend: `https://your-project.vercel.app`
- Backend: `https://your-backend-url.com`
- Test all features end-to-end
