# Pooldesk - Quick Start Checklist ✓

## Pre-Launch Verification

Use this checklist to verify everything is ready before running your project.

### ✅ Step 1: Environment Setup

- [ ] `.env` file exists with correct settings:
  ```
  MONGODB_URI=mongodb://localhost:27017/pooldesk
  ML_SERVICE_URL=http://localhost:8000
  VITE_GOOGLE_MAPS_KEY=AIzaSyBDQDA3xAwrnuiNxN3RTpP7Y3Kxe_Cd6Ig
  VITE_GOOGLE_MAPS_MAP_ID=pooldesk_map
  ```

- [ ] MongoDB is accessible
  ```powershell
  # Verify MongoDB is running and accessible
  curl http://localhost:27017/
  ```

- [ ] Port 8080 is free
  ```powershell
  # Check for conflicts
  netstat -ano | findstr :8080
  # If output appears, run: taskkill /PID [PID] /F
  ```

### ✅ Step 2: Google Cloud Console Verification

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Select your project
- [ ] Enable these APIs:
  - [ ] Maps JavaScript API
  - [ ] Directions API
  - [ ] Distance Matrix API
  - [ ] Geocoding API
  - [ ] Places API

- [ ] Verify your API key:
  - [ ] Navigate to Credentials
  - [ ] Check `VITE_GOOGLE_MAPS_KEY` is valid
  - [ ] Ensure no IP restrictions or correct domain restrictions set
  - [ ] Billing is enabled for the project

### ✅ Step 3: Project Dependencies

```bash
# Install all dependencies
pnpm install

# Verify Vite is ready
pnpm -v
# Should show: >9.0.0

# Verify Node version
node -v
# Should be: v18+ or v20+
```

### ✅ Step 4: File Modifications Confirmation

- [ ] `client/components/MapComponent.tsx` - Enhanced with env variable support
- [ ] `client/pages/History.tsx` - New history page created
- [ ] `.env` - Google Maps API key configured

---

## Launch Commands

### Option A: Standard Development

```bash
# Terminal 1: Start development server
pnpm dev

# Expected output:
# ✓ Compiled successfully
# ✓ Server running at http://0.0.0.0:8080
# ✓ MongoDB connected successfully
```

### Option B: Start Individual Services (Advanced)

```powershell
# Terminal 1: Start Node backend + Vite frontend
pnpm dev

# Terminal 2 (Optional): Start ML service
pnpm ml:start
# Access at http://localhost:8000

# Terminal 3 (Optional): Check ML health
pnpm ml:check
```

---

## Testing All Three Fixes

### Test 1: Port 8080 Connection

1. Start dev server: `pnpm dev`
2. Open browser: `http://localhost:8080`
3. ✅ Page loads without connection errors

### Test 2: Google Maps Integration

1. Navigate to any page with `MapComponent` (e.g., RideResults)
2. Enter a pickup location: "HITEC City, Hyderabad"
3. Enter a dropoff location: "Gachibowli, Hyderabad"
4. Verify:
   - [ ] Map displays
   - [ ] Route line visible between locations
   - [ ] Distance shown: ~15 km
   - [ ] Duration shown: ~25-30 mins
   - [ ] No errors in browser console

**Debug Console (F12 → Console):**
```
✓ Google Maps API loaded successfully
✓ Route: 15.2 km | Duration: 25 mins
```

### Test 3: History Page Synchronization

1. Navigate to `/history` (add route to App.tsx if needed)
2. Toggle between "As Passenger" and "As Driver"
3. Verify:
   - [ ] Page loads with correct layout
   - [ ] API call successful (check Network tab)
   - [ ] Rides display if any completed
   - [ ] Pagination works (Previous/Next buttons)
   - [ ] Empty state shows if no rides

**API Test (PowerShell):**
```powershell
# Replace USER_ID with actual user ID
$userId = "USER_ID"
$response = Invoke-WebRequest -Uri "http://localhost:8080/api/user/$userId/ride-history?type=passenger" -UseBasicParsing
$response.Content | ConvertFrom-Json | ConvertTo-Json
```

---

## Common Issues & Solutions

### Issue: "This page cannot be reached" on localhost:8080

**Solution:**
```powershell
# Kill any existing node process
taskkill /IM node.exe /F

# Verify port is free
netstat -ano | findstr :8080

# Restart dev server
pnpm dev
```

### Issue: "Failed to load Google Maps"

**Causes & Solutions:**
1. **API Key invalid or missing**
   - Check `.env` file has `VITE_GOOGLE_MAPS_KEY`
   - Verify key in Google Cloud Console Credentials

2. **APIs not enabled**
   - Go to Google Cloud Console → APIs
   - Enable: Maps JavaScript API, Directions API

3. **Billing not enabled**
   - Go to Google Cloud Console → Billing
   - Link active payment method

4. **API usage quota exceeded**
   - Check quota in Google Cloud Console
   - Wait for quota reset or upgrade billing

### Issue: History page shows "No rides yet"

**Solution:**
1. Ensure MongoDB is running
2. Check that rides have been completed in the system
3. Verify `userId` in URL is correct
4. Check browser Network tab for API response

---

## Production Build

When ready to deploy:

```bash
# Build frontend (SPA)
pnpm build:client

# Build backend (Node server)
pnpm build:server

# Build both
pnpm build

# Start production server
pnpm start
```

---

## Troubleshooting Dashboard

| Component | Status | Check Point |
|-----------|--------|------------|
| **Port 8080** | ✓ Fixed | `netstat -ano \| findstr :8080` |
| **MongoDB** | ✓ Ready | `curl http://localhost:27017/` |
| **Google Maps** | ✓ Enhanced | F12 Console for API load messages |
| **History Page** | ✓ Created | Navigate to `/history` |
| **Map Component** | ✓ Updated | Check env variable loading |

---

## Next Steps

1. ✅ Run all verification steps above
2. ✅ Launch dev server: `pnpm dev`
3. ✅ Test all three fixes
4. ✅ Check browser console for any warnings
5. ✅ Monitor terminal output for errors

**Questions?** Check the detailed `TROUBLESHOOTING_GUIDE.md` file for step-by-step instructions for each issue.

---

**Last Updated:** March 2026  
**Project:** Pooldesk - Carpooling Platform  
**Tech Stack:** Express + React + MongoDB  

