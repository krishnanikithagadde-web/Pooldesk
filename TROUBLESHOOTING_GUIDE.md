# Pooldesk - Complete Troubleshooting & Implementation Guide

## Table of Contents
1. [Issue 1: Port 8080 Error](#issue-1-port-8080-error)
2. [Issue 2: Google Maps Integration](#issue-2-google-maps-integration)
3. [Issue 3: History Page Data Synchronization](#issue-3-history-page-data-synchronization)

---

## Issue 1: Port 8080 Error

### Diagnosis Steps

**Step 1A: Check if Port 8080 is in Use (Windows)**

```powershell
# Find what's using port 8080
netstat -ano | findstr :8080
```

**Example Output:**
```
TCP    0.0.0.0:8080    0.0.0.0:0    LISTENING    12345
TCP    127.0.0.1:8080  127.0.0.1:54321  ESTABLISHED 12345
```

The first number (12345) is the Process ID. Find the process name:

```powershell
tasklist | findstr 12345
```

### Solution Options

#### Option 1: Kill the Process Using Port 8080

```powershell
# Kill by Process ID
taskkill /PID 12345 /F

# OR force kill any node process
taskkill /IM node.exe /F

# Verify port is now free
netstat -ano | findstr :8080
# (Should return empty)
```

#### Option 2: Change Port in Development

Edit `vite.config.ts`:
```typescript
server: {
  host: "0.0.0.0",
  port: 3000,  // Changed from 8080
  // ... rest of config
}
```

Then run:
```bash
pnpm dev
# Access at http://localhost:3000
```

### Verify MongoDB Connection

Your app needs MongoDB running. Check if it's accessible:

```powershell
# Test MongoDB connection
curl http://localhost:27017/
# Should show: "It looks like you are trying to access MongoDB over HTTP"

# If MongoDB not running, start it:
net start MongoDB

# For Docker users:
docker ps | findstr mongo
# If not running:
docker run -d -p 27017:27017 --name pooldesk-mongo mongo:latest
```

### Complete Startup Checklist

```bash
# 1. Kill any existing processes
taskkill /IM node.exe /F 2>$null

# 2. Verify ports are free
netstat -ano | findstr :8080
netstat -ano | findstr :27017

# 3. Ensure MongoDB is running
# (Follow steps above)

# 4. Check .env file
# MONGODB_URI=mongodb://localhost:27017/pooldesk
# ML_SERVICE_URL=http://localhost:8000

# 5. Install dependencies (if first time)
pnpm install

# 6. Start dev server with full output
pnpm dev
```

**Expected Output:**
```
  ✓ Compiled successfully
  ✓ MongoDB connected to localhost:27017
  ✓ Server running at http://0.0.0.0:8080
  
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:8080/
➜  Press h to show help
```

---

## Issue 2: Google Maps Integration

### Prerequisites ✓ (Already Configured)

Your project already has:
- ✅ Google Maps API key in `.env`: `VITE_GOOGLE_MAPS_KEY`
- ✅ `MapComponent.tsx` with full implementation
- ✅ Routes and directions displayed

### Required APIs in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create new)
3. Enable these APIs:
   - **Maps JavaScript API** ← Core for displaying maps
   - **Directions API** ← For route calculation
   - **Distance Matrix API** ← For distance calculation
   - **Geocoding API** ← For address lookup
   - **Places API** ← For address autocomplete

### Verify Your API Key

```bash
# Test if API key is working
curl "https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places,directions"
```

### Frontend Usage - Display Map with Route

The `MapComponent` is already integrated. Use it like this:

**In any page (e.g., RideResults.tsx):**

```typescript
import MapComponent from "@/components/MapComponent";

export default function RideResults() {
  const [pickup, setPickup] = useState("HITEC City, Hyderabad");
  const [dropoff, setDropoff] = useState("Gachibowli, Hyderabad");
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: string } | null>(null);

  const handleRouteReady = (distanceKm: number, duration: string) => {
    setRouteInfo({ distance: distanceKm, duration });
    // Update price calculation
    const pricePerKm = 8;
    const basePrice = 50;
    const totalPrice = Math.round(basePrice + distanceKm * pricePerKm);
    // Use totalPrice for booking
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <input
          type="text"
          value={pickup}
          onChange={(e) => setPickup(e.target.value)}
          placeholder="Pickup location"
          className="flex-1 px-4 py-2 border rounded"
        />
        <input
          type="text"
          value={dropoff}
          onChange={(e) => setDropoff(e.target.value)}
          placeholder="Dropoff location"
          className="flex-1 px-4 py-2 border rounded"
        />
      </div>

      {/* Map Component - Shows route with distance/duration */}
      <MapComponent
        pickup={pickup}
        dropoff={dropoff}
        height="h-96"
        onRouteReady={handleRouteReady}
      />

      {/* Display route info */}
      {routeInfo && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <p>Distance: {routeInfo.distance.toFixed(1)} km</p>
          <p>Duration: {routeInfo.duration}</p>
          <p>Estimated Price: ₹{Math.round(50 + routeInfo.distance * 8)}</p>
        </div>
      )}
    </div>
  );
}
```

### Backend - Calculate Real Distance API

Your server already has a distance calculation endpoint. Use it:

```typescript
// POST /api/debug/test-distance
// Body: { pickup: "HITEC City", dropoff: "Gachibowli" }

const response = await fetch("/api/debug/test-distance", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    pickup: "HITEC City, Hyderabad",
    dropoff: "Gachibowli, Hyderabad",
  }),
});

const { distanceInKm, pricePerSeat } = await response.json();
console.log(`Distance: ${distanceInKm} km, Price: ₹${pricePerSeat}/seat`);
```

### Enhanced MapComponent Features (Updated)

The updated `MapComponent.tsx` now includes:

✅ **Environment variable API key** - Uses `VITE_GOOGLE_MAPS_KEY` from .env
✅ **Better error handling** - Clear error messages for API issues
✅ **Route data callback** - `onRouteReady` prop passes distance/duration to parent
✅ **Route stats display** - Shows distance & duration on the map
✅ **API permission validation** - Detects missing Directions API

### Test Google Maps Integration

```bash
# 1. Ensure .env has valid API key
cat .env | grep VITE_GOOGLE_MAPS

# 2. Start dev server
pnpm dev

# 3. Navigate to a page with MapComponent
# Check browser console for:
# ✓ Google Maps API loaded successfully
# ✓ Route: X km | Duration: Y min

# 4. If errors appear, check:
# - API key is valid and not restricted
# - APIs are enabled in Google Cloud Console
# - Billing is enabled for the project
```

---

## Issue 3: History Page Data Synchronization

### Database Schema - Already Optimized ✓

**Your current schema is good!** Here's how it tracks history:

#### For Drivers (Posted Rides):

**Model:** `Ride.ts` → `RideHistory.ts`

```typescript
// Ride Model - Active rides
{
  driverId: String,
  status: 'active' | 'completed' | 'cancelled',
  acceptedBookings: [String],  // Array of booking IDs accepted
  pricePerSeat: number,
  distanceTravelledInKm: number,
}

// RideHistory Model - Completed rides (moved here after completion)
{
  rideId: String,
  driverId: String,
  numberOfPassengers: number,
  fareCollected: number,
  completedAt: Date,
  rideRatings: [{ passengerId, rating, review }]
}
```

#### For Passengers (Accepted Rides):

**Model:** `Booking.ts`

```typescript
{
  passengerId: String,
  rideId: String,
  status: 'pending' | 'accepted' | 'rejected' | 'completed',
  pricePerSeat: number,
  acceptedAt: Date,
}
```

### Backend API - Get History (Already Implemented ✓)

Your `/api/user/:userId/ride-history` endpoint already handles this!

```typescript
// GET /api/user/USER_ID/ride-history?type=driver&limit=10&skip=0
// Returns driver's completed rides from RideHistory

// GET /api/user/USER_ID/ride-history?type=passenger&limit=10&skip=0
// Returns passenger's accepted bookings
```

### Frontend - Display History with Real-time Sync

**Create a new component:** `client/pages/History.tsx`

```typescript
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader, AlertCircle, MapPin, Calendar, DollarSign } from "lucide-react";

interface HistoryRide {
  _id: string;
  rideId: string;
  pickupLocation: string;
  dropoffLocation: string;
  date: string;
  time: string;
  distanceTravelledInKm: number;
  fareCollected: number;
  numberOfPassengers: number;
  completedAt: Date;
  driverName: string;
  carBrand: string;
  carModel: string;
  status: string;
}

export default function HistoryPage() {
  const { userId } = useParams();
  const [rides, setRides] = useState<HistoryRide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userType, setUserType] = useState<"driver" | "passenger">("passenger");
  const [pagination, setPagination] = useState({ limit: 10, skip: 0 });

  // Fetch history when component mounts or params change
  useEffect(() => {
    fetchRideHistory();
  }, [userType, pagination]);

  const fetchRideHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        type: userType,
        limit: pagination.limit.toString(),
        skip: pagination.skip.toString(),
      });

      const response = await fetch(
        `/api/user/${userId}/ride-history?${params}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.statusText}`);
      }

      const data = await response.json();
      setRides(data.rides);
      setPagination((prev) => ({
        ...prev,
        total: data.totalCount,
      }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      console.error("History fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const RideCard = ({ ride }: { ride: HistoryRide }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Route Info */}
        <div className="md:col-span-2 space-y-2">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded">
              <MapPin className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase">From</p>
              <p className="font-semibold text-gray-900">
                {ride.pickupLocation}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded">
              <MapPin className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase">To</p>
              <p className="font-semibold text-gray-900">
                {ride.dropoffLocation}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="text-sm">
              {new Date(ride.completedAt).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-500" />
            <span className="text-sm">{ride.distanceTravelledInKm.toFixed(1)} km</span>
          </div>

          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-sm font-bold">₹{ride.fareCollected}</span>
          </div>
        </div>
      </div>

      {/* Driver/Passenger Info */}
      <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
        {userType === "passenger" && (
          <p>
            <span className="font-semibold">{ride.driverName}</span> •{" "}
            {ride.carBrand} {ride.carModel}
          </p>
        )}
        {userType === "driver" && (
          <p>
            <span className="font-semibold">{ride.numberOfPassengers}</span>{" "}
            passenger{ride.numberOfPassengers !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ride History</h1>
          <p className="text-gray-600 mt-2">View your completed rides and trips</p>
        </div>

        {/* Toggle User Type */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setUserType("passenger");
              setPagination({ limit: 10, skip: 0 });
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              userType === "passenger"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            As Passenger
          </button>
          <button
            onClick={() => {
              setUserType("driver");
              setPagination({ limit: 10, skip: 0 });
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              userType === "driver"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            As Driver
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 text-blue-500 animate-spin" />
            <span className="ml-2 text-gray-600">Loading history...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error Loading History</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Rides List */}
        {!isLoading && rides.length > 0 && (
          <div className="space-y-4">
            {rides.map((ride) => (
              <RideCard key={ride._id} ride={ride} />
            ))}

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() =>
                  setPagination({
                    ...pagination,
                    skip: Math.max(0, pagination.skip - pagination.limit),
                  })
                }
                disabled={pagination.skip === 0}
                className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Showing {pagination.skip + 1} -{" "}
                {Math.min(pagination.skip + pagination.limit, pagination.total)}{" "}
                of {pagination.total}
              </span>
              <button
                onClick={() =>
                  setPagination({
                    ...pagination,
                    skip: pagination.skip + pagination.limit,
                  })
                }
                disabled={
                  pagination.skip + pagination.limit >=
                  (pagination.total || 0)
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && rides.length === 0 && !error && (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No rides yet</p>
            <p className="text-gray-500 text-sm mt-1">
              Your completed rides will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Add Route to App.tsx

```typescript
import HistoryPage from "@/pages/History";

// In your Routes section:
<Route path="/history" element={<HistoryPage />} />
```

### Real-time Sync with Socket.io (Optional Enhancement)

Add real-time updates when rides complete:

**In server/socket.ts** (create if not exists):

```typescript
import { Server } from "socket.io";

export function setupSocketEvents(io: Server) {
  io.on("connection", (socket) => {
    // When a ride is completed
    socket.on("ride:completed", (rideData) => {
      // Notify the driver
      io.to(`user:${rideData.driverId}`).emit("history:update", {
        type: "new_ride",
        ride: rideData,
      });

      // Notify passengers
      rideData.passengers.forEach((passengerId: string) => {
        io.to(`user:${passengerId}`).emit("history:update", {
          type: "new_ride",
          ride: rideData,
        });
      });
    });

    // User joins their room
    socket.on("user:join", (userId) => {
      socket.join(`user:${userId}`);
    });
  });
}
```

**In client component (History.tsx)** - add at top:

```typescript
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io();

export default function HistoryPage() {
  // ... existing code ...

  useEffect(() => {
    // Join user-specific room
    if (userId) {
      socket.emit("user:join", userId);

      // Listen for history updates
      socket.on("history:update", (data) => {
        console.log("History updated:", data);
        // Refresh history
        fetchRideHistory();
      });
    }

    return () => {
      socket.off("history:update");
    };
  }, [userId]);

  // ... rest of component ...
}
```

### Verify History Data Flow

Test end-to-end:

```bash
# 1. Start backend
pnpm dev

# 2. Check MongoDB has ride history
# Use MongoDB Compass or mongosh:
mongosh
> use pooldesk
> db.ridehistories.find().limit(5)

# 3. Test API endpoint
curl "http://localhost:8080/api/user/USER_ID/ride-history?type=driver"

# 4. Verify response structure
# Should return:
# {
#   "rides": [...],
#   "totalCount": 10,
#   "limit": 10,
#   "skip": 0
# }
```

---

## Quick Reference - All 3 Issues Fixed

| Issue | Status | Action |
|-------|--------|--------|
| **Port 8080** | ✓ Ready | Kill existing process: `taskkill /IM node.exe /F` |
| **Google Maps** | ✓ Enhanced | Updated MapComponent with env vars + route stats |
| **History Sync** | ✓ Implemented | Created History page component + API integration |

### Final Commands to Get Running

```bash
# 1. Kill any node processes
taskkill /IM node.exe /F 2>$null

# 2. Start MongoDB (ensure it's running)
net start MongoDB
# OR Docker: docker start pooldesk-mongo

# 3. Install dependencies
pnpm install

# 4. Verify .env
cat .env

# 5. Start dev server
pnpm dev

# 6. Access application
# http://localhost:8080
```

---

