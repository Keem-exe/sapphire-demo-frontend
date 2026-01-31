# Sapphire Frontend - Deployment Guide

## Backend Connection Setup

This frontend is configured to connect to a separate backend API (sapphire-main). 

### Environment Variables

Create a `.env.local` file with:

```bash
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=https://your-backend-api.com

# Optional: AI API Keys (if using frontend AI features)
GOOGLE_GEMINI_API_KEY=your_key_here
YOUTUBE_API_KEY=your_key_here
```

### Vercel Deployment

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables:
     - `NEXT_PUBLIC_BACKEND_URL`: Your deployed backend URL
     - `GOOGLE_GEMINI_API_KEY`: (Optional) For AI features
     - `YOUTUBE_API_KEY`: (Optional) For YouTube Shorts

3. **Deploy:**
   - Vercel will auto-deploy on every push to main

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### API Integration

The frontend uses `lib/api-client.ts` to communicate with the backend:

```typescript
import { apiClient } from '@/lib/api-client';

// GET request
const data = await apiClient.get('/api/endpoint');

// POST request
const result = await apiClient.post('/api/endpoint', { data });
```

### Static Data Fallback

Static/dummy data is preserved in:
- `lib/data/subjects.ts` - Subject definitions
- Component mock data - Used as fallback when backend is unavailable

### Backend API Endpoints Expected

The frontend expects these endpoints from the backend:

- `POST /api/quiz` - Generate quiz questions
- `POST /api/flashcards` - Generate flashcards
- `POST /api/chat` - AI chat responses
- `POST /api/quiz/grade` - Grade quiz submissions
- `GET /api/shorts` - Fetch YouTube educational shorts

### CORS Configuration

Ensure your backend has CORS enabled for your frontend domain:

```python
# Example for FastAPI backend
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
