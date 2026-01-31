# Backend Status & Error Handling

## Current Issue

The backend at `https://sapphire-2x9z.onrender.com` is currently **not responding** (returning 404 errors).

**Tested:**
```
GET https://sapphire-2x9z.onrender.com/ → 404 Not Found
GET https://sapphire-2x9z.onrender.com/health → 404 Not Found
```

## Possible Causes

1. **Free Render Instance Sleeping** - Free Render instances spin down after inactivity
2. **Backend Deployment Issue** - Backend may not be deployed correctly
3. **Endpoint Configuration** - Backend routes may be different than expected
4. **Backend Server Down** - Service may be temporarily unavailable

## How We Handle This

### 1. Error Detection
The app now detects these types of errors:

```typescript
// Network/Connection Errors
- "Failed to fetch"
- "Cannot connect to server"
- "Backend may be down"

// Authentication Errors
- 404 → "Account doesn't exist"
- 401 → "Incorrect password"
```

### 2. User-Friendly Messages

**When Backend is Down:**
```
Cannot connect to server. The backend may be down or your internet 
connection is unavailable. Please try again later or use the demo 
account (andrew.lee@demo.com).
```

The login form shows:
- Error message
- Demo account suggestion: `andrew.lee@demo.com`
- Clear instructions to try demo mode

### 3. Demo Account Fallback

Users can always login with:
- **Email:** `andrew.lee@demo.com`
- **Password:** Any password works
- **Access:** Full app functionality with demo data

## Solutions

### Option 1: Wake Up Free Render Instance
If using Render free tier, visit the backend URL to wake it up:
```
https://sapphire-2x9z.onrender.com
```

Free instances take 30-60 seconds to spin up after being dormant.

### Option 2: Check Backend Deployment
1. Log into Render dashboard
2. Check if `sapphire-2x9z` service is running
3. View logs for errors
4. Redeploy if needed

### Option 3: Use Different Backend URL
If backend was redeployed to a different URL, update `.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=https://your-new-backend-url.com
```

### Option 4: Run Local Backend
Start the backend locally:
```bash
cd ../sapphire-backend  # or wherever backend is located
python -m uvicorn main:app --reload --port 8000
```

Then update `.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### Option 5: Continue with Demo Mode
The app is fully functional with the demo account:
- All AI features work (quiz, flashcards, chat)
- Notes and progress are saved in localStorage
- No backend needed for demo user

## Testing Backend Connection

### PowerShell
```powershell
Invoke-WebRequest -Uri "https://sapphire-2x9z.onrender.com/health"
```

### cURL (if available)
```bash
curl https://sapphire-2x9z.onrender.com/health
```

### Browser
Simply visit: https://sapphire-2x9z.onrender.com

## User Instructions

**If you see "Failed to fetch" error:**

1. **Try Demo Account**
   - Email: `andrew.lee@demo.com`
   - Password: anything
   - This works offline and doesn't need the backend

2. **Check Internet Connection**
   - Make sure you're connected to the internet

3. **Wait and Retry**
   - If backend is waking up, wait 60 seconds and try again

4. **Contact Support**
   - If problem persists, backend may need attention

## Files Modified

- **lib/api-client.ts** - Wraps fetch errors with helpful messages
- **contexts/auth-context.tsx** - Detects network vs auth errors
- **components/login-form.tsx** - Shows demo account on network errors

## Next Steps

1. ✅ Error handling improved (shows helpful messages)
2. ⏳ Check why Render backend is returning 404
3. ⏳ Verify backend deployment configuration
4. ⏳ Consider upgrading Render plan to avoid cold starts
5. ⏳ Add health check endpoint monitoring
