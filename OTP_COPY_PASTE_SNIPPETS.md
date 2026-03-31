# Exact Code Snippets - Copy & Paste Ready

## 📌 PART 1: Backend - OTP Generation on Booking Acceptance

### Location: `server/routes/bookings.ts`
### Handler: `handleAcceptBooking` (Update this function)

---

### ✏️ SNIPPET 1.1: Generate OTP in Ride Update

**Find this section:**
```typescript
const ride = await Ride.findById(booking.rideId);
if (ride) {
  ride.availableSeats = Math.max(0, ride.availableSeats - booking.seatsBooked);
  ride.bookedSeats = (ride.bookedSeats || 0) + booking.seatsBooked;

  if (!ride.acceptedBookings) {
    ride.acceptedBookings = [];
  }
  ride.acceptedBookings.push(bookingId.toString());

  if (ride.availableSeats === 0) {
    ride.status = 'completed';
  }

  await ride.save();
}
```

**Replace with:**
```typescript
const ride = await Ride.findById(booking.rideId);
if (ride) {
  ride.availableSeats = Math.max(0, ride.availableSeats - booking.seatsBooked);
  ride.bookedSeats = (ride.bookedSeats || 0) + booking.seatsBooked;

  if (!ride.acceptedBookings) {
    ride.acceptedBookings = [];
  }
  ride.acceptedBookings.push(bookingId.toString());

  // ✅ GENERATE 4-DIGIT OTP
  const otp = String(Math.floor(Math.random() * 9000) + 1000);
  ride.otp = otp;
  console.log(`✓ OTP generated for ride ${booking.rideId}: ${otp}`);

  if (ride.availableSeats === 0) {
    ride.status = 'completed';
  }

  await ride.save();
}
```

---

### ✏️ SNIPPET 1.2: Include OTP in Socket Event

**Find this section:**
```typescript
io.to(`passenger_${booking.rideId}`).emit('bookingAccepted', {
  rideId: booking.rideId,
  passengerId: booking.passengerId,
  driverInfo: {
    name: booking.driverName,
    email: booking.driverEmail,
    carBrand: booking.carBrand,
    carModel: booking.carModel,
    carLicensePlate: booking.carLicensePlate,
    driverPhone: booking.driverPhone,
    gender: booking.driverGender || 'not specified',
    pickupLocation: booking.pickupLocation,
    dropoffLocation: booking.dropoffLocation,
    date: booking.date,
    time: booking.time,
  },
  passengerInfo: {
    name: booking.passengerName,
    email: booking.passengerEmail,
    passengerPhone: booking.passengerPhone,
    gender: booking.passengerDetails?.[0]?.gender || 'not specified',
    seatsBooked: booking.seatsBooked,
    pickupLocation: booking.pickupLocation,
    dropoffLocation: booking.dropoffLocation,
  },
  redirectUrl: `/track-passenger/${booking.rideId}`
});
```

**Replace with:**
```typescript
io.to(`passenger_${booking.rideId}`).emit('bookingAccepted', {
  rideId: booking.rideId,
  passengerId: booking.passengerId,
  otp: ride?.otp,  // ✅ ADD THIS LINE
  driverInfo: {
    name: booking.driverName,
    email: booking.driverEmail,
    carBrand: booking.carBrand,
    carModel: booking.carModel,
    carLicensePlate: booking.carLicensePlate,
    driverPhone: booking.driverPhone,
    gender: booking.driverGender || 'not specified',
    pickupLocation: booking.pickupLocation,
    dropoffLocation: booking.dropoffLocation,
    date: booking.date,
    time: booking.time,
  },
  passengerInfo: {
    name: booking.passengerName,
    email: booking.passengerEmail,
    passengerPhone: booking.passengerPhone,
    gender: booking.passengerDetails?.[0]?.gender || 'not specified',
    seatsBooked: booking.seatsBooked,
    pickupLocation: booking.pickupLocation,
    dropoffLocation: booking.dropoffLocation,
  },
  redirectUrl: `/track-passenger/${booking.rideId}`
});
```

---

### ✏️ SNIPPET 1.3: Return OTP in HTTP Response

**Find this section:**
```typescript
res.status(200).json({
  message: 'Booking accepted',
  redirectUrl: `/track-driver/${booking.rideId}`,
  passengerRedirectUrl: `/track-passenger/${booking.rideId}`,
  bookingData: {
    bookingId: booking._id.toString(),
    rideId: booking.rideId,
    passengerName: booking.passengerName,
    passengerEmail: booking.passengerEmail,
    passengerPhone: booking.passengerPhone,
  },
```

**Replace with:**
```typescript
res.status(200).json({
  message: 'Booking accepted',
  redirectUrl: `/track-driver/${booking.rideId}`,
  passengerRedirectUrl: `/track-passenger/${booking.rideId}`,
  otp: ride?.otp,  // ✅ ADD THIS LINE
  bookingData: {
    bookingId: booking._id.toString(),
    rideId: booking.rideId,
    passengerName: booking.passengerName,
    passengerEmail: booking.passengerEmail,
    passengerPhone: booking.passengerPhone,
    otp: ride?.otp,  // ✅ ADD THIS LINE TOO
  },
```

---

## 📌 PART 2: Frontend - Socket Listener & localStorage Storage

### Location: `client/components/PassengerBookingsView.tsx`
### Component: Socket listeners

---

### ✏️ SNIPPET 2.1: Listen for bookingAccepted Socket Event with OTP

**Find this section:**
```typescript
socket.on('bookingAccepted', (data: { rideId: string }) => {
  if (!data || !data.rideId) return;
  if (window.location.pathname !== `/track-passenger/${data.rideId}`) {
    window.location.href = `/track-passenger/${data.rideId}`;
  }
});
```

**Replace with:**
```typescript
socket.on('bookingAccepted', (data: { 
  rideId: string; 
  driverInfo?: any; 
  otp?: string  // ✅ ADD THIS
}) => {
  if (!data || !data.rideId) return;
  
  // ✅ ADD THIS ENTIRE BLOCK
  if (data.otp || data.driverInfo) {
    const bookingData = {
      rideId: data.rideId,
      driverInfo: data.driverInfo,
      otp: data.otp,
      timestamp: Date.now(),
    };
    localStorage.setItem(`booking_${data.rideId}`, JSON.stringify(bookingData));
    console.log('✓ Booking data stored:', bookingData);
  }
  
  if (window.location.pathname !== `/track-passenger/${data.rideId}`) {
    window.location.href = `/track-passenger/${data.rideId}`;
  }
});
```

---

## 📌 PART 3: Frontend - Retrieve OTP from localStorage

### Location: `client/pages/PassengerTracking.tsx`
### Function: `fetchDriverInfoAndOtp()`

---

### ✏️ SNIPPET 3.1: Extract OTP from localStorage in Fetch Function

**Find this section:**
```typescript
const fetchDriverInfoAndOtp = async () => {
  if (!rideId) return;
  
  const storedBooking = localStorage.getItem(`booking_${rideId}`);
  if (storedBooking) {
    try {
      const bookingData = JSON.parse(storedBooking);
      if (bookingData.driverInfo && (Date.now() - bookingData.timestamp) < 3600000) {
        setDriverInfo(bookingData.driverInfo);
        console.log("✓ Driver info loaded from localStorage:", bookingData.driverInfo);
        fetchOtpFromApi();
        return;
      } else {
        localStorage.removeItem(`booking_${rideId}`);
      }
    } catch (error) {
      console.error("Error parsing stored booking data:", error);
      localStorage.removeItem(`booking_${rideId}`);
    }
  }
  // ... rest of function
}
```

**Replace with:**
```typescript
const fetchDriverInfoAndOtp = async () => {
  if (!rideId) return;
  
  const storedBooking = localStorage.getItem(`booking_${rideId}`);
  if (storedBooking) {
    try {
      const bookingData = JSON.parse(storedBooking);
      if (bookingData.driverInfo && (Date.now() - bookingData.timestamp) < 3600000) {
        setDriverInfo(bookingData.driverInfo);
        console.log("✓ Driver info loaded from localStorage:", bookingData.driverInfo);
        
        // ✅ ADD THIS ENTIRE BLOCK
        if (bookingData.otp) {
          setOtp(bookingData.otp);
          setRideStatus('waiting');
          console.log("✓ OTP loaded from localStorage:", bookingData.otp);
          return; // Don't call API if we have everything
        }
        
        fetchOtpFromApi();
        return;
      } else {
        localStorage.removeItem(`booking_${rideId}`);
      }
    } catch (error) {
      console.error("Error parsing stored booking data:", error);
      localStorage.removeItem(`booking_${rideId}`);
    }
  }
  // ... rest of function
}
```

---

## 📌 PART 4: Frontend - Display OTP in React Component

### Location: `client/pages/PassengerTracking.tsx`
### Component: Return JSX (render method)

---

### ✏️ SNIPPET 4.1: Render OTP Display Card (add inside return statement)

**Add this entire card component:**

```jsx
{/* ✅ OTP DISPLAY CARD - Insert in return JSX before Map component */}
{otp && !isRideStarted && rideStatus === 'waiting' && (
  <Card className="absolute top-4 left-4 w-96 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-400 shadow-2xl rounded-xl">
    <CardContent className="pt-6">
      <div className="space-y-4">
        {/* Title */}
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-600">
            🔐 SHARE THIS PIN WITH YOUR DRIVER
          </p>
        </div>

        {/* Large OTP Display */}
        <div className="bg-white rounded-lg p-4 border border-blue-200">
          <div className="text-6xl font-black text-center text-blue-600 tracking-widest font-mono">
            {otp}
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">Your Ride PIN</p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-3 rounded-lg space-y-2">
          <p className="text-xs font-semibold text-blue-900">How to use:</p>
          <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
            <li>Share this 4-digit PIN with your driver</li>
            <li>Driver enters PIN on their screen</li>
            <li>Ride starts once verified ✓</li>
          </ol>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 animate-pulse">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <p className="text-xs text-blue-600 font-medium">
            Waiting for driver to verify...
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
)}

{/* Ride Started Badge - replaces OTP when driver verifies */}
{isRideStarted && rideStatus === 'in_progress' && (
  <Card className="absolute top-4 left-4 w-80 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-400 shadow-2xl rounded-xl">
    <CardContent className="pt-6">
      <div className="space-y-3">
        <div className="text-center">
          <p className="text-2xl">✓</p>
          <p className="text-sm font-bold text-green-700">Ride in Progress</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
          <p className="text-xs text-gray-600">
            Driver verified your PIN
          </p>
        </div>
        <p className="text-xs text-center text-green-600 font-medium">
          Sit back and enjoy your ride!
        </p>
      </div>
    </CardContent>
  </Card>
)}
```

---

## ✅ Verification Checklist

Run these commands to verify:

```bash
# 1. TypeScript check
pnpm typecheck

# 2. Build check
pnpm build

# 3. Start dev server
pnpm dev
```

**Console logs you should see:**

Backend:
```
✓ OTP generated for ride 507f1f77bcf86cd799439011: 4527
```

Frontend (PassengerBookingsView):
```
✓ Booking data stored: { rideId: '507f1f77bcf86cd799439011', otp: '4527', driverInfo: {...}, timestamp: 1709843200000 }
```

Frontend (PassengerTracking):
```
✓ OTP loaded from localStorage: 4527
```

---

## 🎯 Quick Test Steps

1. **Start the app:**
   ```bash
   pnpm dev
   ```

2. **Open two browser windows**
   - Window 1: Driver (http://localhost:8080?role=driver)
   - Window 2: Passenger (http://localhost:8080?role=passenger)

3. **As Driver:**
   - Create a ride offer
   - Wait for passenger to book

4. **As Passenger:**
   - Search and book driver's ride
   - Wait for driver to accept

5. **As Driver (back):**
   - Accept booking
   - You'll see: `✓ OTP generated for ride...` in console

6. **As Passenger (back):**
   - You'll see large blue OTP card on tracking page
   - OTP displays in massive 6XL font
   - Console shows: `✓ OTP loaded from localStorage`

7. **Test page refresh:**
   - Refresh passenger page (Ctrl+R)
   - OTP still visible (from localStorage)

---

## 📊 API Response Format

**Endpoint:** `POST /api/bookings/:bookingId/accept`

**Backend returns (minimum required fields):**
```json
{
  "message": "Booking accepted",
  "redirectUrl": "/track-driver/123456",
  "passengerRedirectUrl": "/track-passenger/123456",
  "otp": "4527",
  "bookingData": {
    "rideId": "123456",
    "otp": "4527",
    "driverInfo": { ... }
  },
  "driverInfo": { ... },
  "passengerInfo": { ... }
}
```

**Socket event (passenger receives):**
```json
{
  "rideId": "123456",
  "passengerId": "789",
  "otp": "4527",
  "driverInfo": { ... },
  "passengerInfo": { ... },
  "redirectUrl": "/track-passenger/123456"
}
```

---

## 🔧 If OTP Doesn't Show

1. **Check browser console:**
   - Look for errors
   - Verify: `✓ OTP loaded from localStorage:` message

2. **Inspect localStorage:**
   - Open DevTools → Application → Local Storage
   - Search for key: `booking_<rideId>`
   - Verify it contains: `{ otp: "1234", driverInfo: {...} }`

3. **Verify backend generated OTP:**
   - Check server console for: `✓ OTP generated for ride...`
   - If missing, OTP generation code not running

4. **Check socket connection:**
   - Verify socket is connected: `io.connected === true`
   - Verify socket event received: add console.log in socket.on('bookingAccepted')

5. **Restart dev server:**
   ```bash
   Ctrl+C  # Stop current server
   pnpm dev  # Restart
   ```

---

## 📝 Summary of Changes

| File | Change | Lines |
|------|--------|-------|
| `server/routes/bookings.ts` | Generate OTP on booking accept | +3 lines |
| `server/routes/bookings.ts` | Include OTP in socket event | +1 line |
| `server/routes/bookings.ts` | Return OTP in API response | +2 lines |
| `client/components/PassengerBookingsView.tsx` | Store OTP in localStorage | +13 lines |
| `client/pages/PassengerTracking.tsx` | Extract OTP from localStorage | +9 lines |
| `client/pages/PassengerTracking.tsx` | Render OTP display card | +45 lines |

**Total:** ~73 lines of code, 3 files modified

All changes have been applied. TypeScript compilation: ✅ PASS

