# Pooldesk - Contact Details & Routing Implementation

## ✅ **COMPLETED: Contact Cards & Routing**

Your tracking pages now display contact information and handle proper routing!

---

## 📱 **DriverTracking.tsx Updates**

### **Passenger Contact Card Added**
- **Location**: Floating card in top-right corner
- **Content**: Name, Phone (with call button), Seats booked, Pickup/Dropoff locations
- **Styling**: Blue theme, semi-transparent background, doesn't block map

### **Data Sources** (in order of preference):
1. **React Router State** (fastest): `location.state.passengerInfo`
2. **API Fallback**: `/api/rides/:rideId/details` → finds accepted booking

---

## 📱 **PassengerTracking.tsx Updates**

### **Driver Contact Card Added**
- **Location**: Floating card in top-right corner  
- **Content**: Name, Phone (with call button), Vehicle details, License plate, Route info
- **Styling**: Green theme, semi-transparent background, doesn't block map

### **Data Sources** (in order of preference):
1. **React Router State** (fastest): `location.state.driverInfo`
2. **API Fallback**: `/api/rides/:rideId/details` → finds accepted booking

---

## 🛣️ **Routing Logic**

### **Server-Side Updates** (`server/routes/bookings.ts`)

```typescript
// Booking acceptance now returns different redirect URLs:
res.status(200).json({
  message: 'Booking accepted',
  redirectUrl: `/track-driver/${booking.rideId}`,        // Driver goes here
  passengerRedirectUrl: `/track-passenger/${booking.rideId}`, // Passenger goes here
  // ... contact data for both parties
});
```

### **Frontend Redirect Logic**

```typescript
// In booking acceptance handler (wherever drivers accept bookings):
const handleAcceptBooking = async (bookingId) => {
  const response = await fetch(`/api/bookings/${bookingId}/accept`, {
    method: 'POST',
    body: JSON.stringify({ driverId })
  });
  
  const data = await response.json();
  
  // Driver navigates to their tracking page with passenger info
  navigate(data.redirectUrl, {
    state: {
      passengerInfo: data.passengerInfo,
      driverInfo: data.driverInfo
    }
  });
  
  // TODO: Notify passenger to navigate to their tracking page
  // This could be done via WebSocket or by having passenger
  // check for booking status changes
};
```

---

## 📊 **Data Passing Methods**

### **Method 1: React Router State (Recommended)**
```typescript
// When redirecting after booking acceptance:
navigate('/track-driver/:rideId', {
  state: {
    passengerInfo: {
      name: "John Doe",
      passengerPhone: "+91-9876543210",
      seatsBooked: 2,
      pickupLocation: "HITEC City",
      dropoffLocation: "Gachibowli"
    }
  }
});

// Access in component:
const location = useLocation();
const passengerInfo = location.state?.passengerInfo;
```

### **Method 2: API Fetch (Fallback)**
```typescript
// If state not available, fetch from API:
const fetchPassengerInfo = async () => {
  const response = await fetch(`/api/rides/${rideId}/details`);
  const data = await response.json();
  const booking = data.bookings.find(b => b.status === 'accepted');
  if (booking) {
    setPassengerInfo({
      name: booking.passengerName,
      passengerPhone: booking.passengerPhone,
      // ... other fields
    });
  }
};
```

### **Method 3: Local Storage (Alternative)**
```typescript
// Store during redirect:
localStorage.setItem(`booking_${rideId}`, JSON.stringify({
  passengerInfo: data.passengerInfo,
  driverInfo: data.driverInfo
}));

// Retrieve in component:
const bookingData = JSON.parse(localStorage.getItem(`booking_${rideId}`) || '{}');
const passengerInfo = bookingData.passengerInfo;
```

---

## 🎨 **UI Components**

### **Contact Card Structure**
```tsx
<Card className="absolute top-4 right-4 w-80 bg-white/95 backdrop-blur-sm shadow-lg border-2 border-blue-200 z-10">
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-blue-700">
      <User className="w-5 h-5" />
      Passenger Details
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    {/* Contact fields with call button */}
  </CardContent>
</Card>
```

### **Call Button Implementation**
```tsx
<Button onClick={() => window.open(`tel:${phoneNumber}`, '_self')}>
  <Phone className="w-3 h-3 mr-1" />
  Call
</Button>
```

---

## 🔄 **Complete Flow Example**

### **1. Driver Accepts Booking**
```typescript
// Driver clicks "Accept" in their dashboard
const response = await fetch(`/api/bookings/${bookingId}/accept`, {
  method: 'POST',
  body: JSON.stringify({ driverId: currentUserId })
});

const data = await response.json();

// Driver navigates to tracking with passenger info
navigate(data.redirectUrl, {
  state: { passengerInfo: data.passengerInfo }
});
```

### **2. Passenger Gets Notified**
```typescript
// Via WebSocket or polling, passenger detects booking accepted
// Passenger navigates to their tracking page
navigate('/track-passenger/:rideId', {
  state: { driverInfo: bookingData.driverInfo }
});
```

### **3. Both See Contact Info**
- **Driver**: Sees passenger name, phone, seats, locations
- **Passenger**: Sees driver name, phone, vehicle, license, route

---

## 📍 **Current Route Structure**

| Route | Component | Purpose |
|-------|-----------|---------|
| `/track-driver/:rideId` | DriverTracking | Driver tracks passenger + sees passenger contact |
| `/track-passenger/:rideId` | PassengerTracking | Passenger tracks driver + sees driver contact |
| `/active-ride/:rideId` | ActiveRide | Legacy route (can be kept for compatibility) |

---

## 🚀 **Next Steps**

### **1. Add Pending Bookings UI**
Create a component in DriverDashboard to show pending bookings that drivers can accept:

```tsx
// Add to DriverDashboard tabs
<TabsContent value="pending" className="mt-6">
  <PendingBookingsList driverId={userId} />
</TabsContent>
```

### **2. Implement Passenger Notification**
When driver accepts booking, notify passenger via WebSocket to redirect to tracking page.

### **3. Test Complete Flow**
1. Driver creates ride
2. Passenger books ride  
3. Driver accepts booking → redirected to `/track-driver/:rideId`
4. Passenger gets notified → redirected to `/track-passenger/:rideId`
5. Both see live tracking + contact cards

---

## 💡 **Key Benefits**

- ✅ **Secure**: Contact data passed via React Router state or API
- ✅ **Fast**: Router state provides instant loading
- ✅ **Reliable**: API fallback ensures data availability
- ✅ **User-Friendly**: Call buttons for easy contact
- ✅ **Non-Intrusive**: Cards don't block map view
- ✅ **Responsive**: Works on mobile and desktop

---

## 📞 **Contact Integration**

### **Phone Calling**
```tsx
// Direct phone call (works on mobile)
window.open(`tel:${phoneNumber}`, '_self');

// Or show number for manual dialing
<span className="font-mono">{phoneNumber}</span>
```

### **WhatsApp Integration** (Optional)
```tsx
// WhatsApp link
window.open(`https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}`, '_blank');
```

---

**Ready to test!** Both tracking pages now have professional contact cards that display all necessary information for safe, easy communication between drivers and passengers. 🎉</content>
<parameter name="filePath">c:\Users\91814\Downloads\majorproject\pooldesk\CONTACT_ROUTING_GUIDE.md