# PoolDesk API Reference - Booking & Data Sharing Endpoints

## Base URL
```
http://localhost:8080
```

---

## 1. CREATE BOOKING (Passenger books a ride)

### Endpoint
```
POST /api/bookings
```

### Request Body
```json
{
  "rideId": "ride_id_from_search",
  "passengerId": "passenger_temp_id",
  "passengerName": "John Doe",
  "passengerEmail": "john@techcorp.com",
  "seatsToBook": 1,
  "passengerDetails": [
    {
      "seatNumber": 1,
      "gender": "male"
    }
  ]
}
```

### Success Response (201)
```json
{
  "message": "Booking request sent to driver",
  "booking": {
    "id": "booking_id",
    "status": "pending",
    "seatsBooked": 1,
    "driverName": "Driver Name",
    "driverEmail": "driver@company.com",
    "createdAt": "2026-03-06T10:00:00Z"
  }
}
```

### Error Response (400, 404, 500)
```json
{
  "error": "Description of the error"
}
```

---

## 2. ACCEPT BOOKING (Driver accepts passenger)

### Endpoint
```
POST /api/bookings/:bookingId/accept
```

### Path Parameters
- `bookingId`: ID of the booking to accept

### Request Body
```json
{
  "driverId": "driver_temp_id or driver email"
}
```

### Success Response (200) - WITH MUTUAL DATA SHARING
```json
{
  "message": "Booking accepted",
  "booking": {
    "id": "booking_id",
    "status": "accepted",
    "acceptedAt": "2026-03-06T10:05:00Z"
  },
  "driverInfo": {
    "name": "Driver Name",
    "email": "driver@company.com",
    "carBrand": "Toyota",
    "carModel": "Camry",
    "gender": "male",
    "pickupLocation": "123 Main St",
    "dropoffLocation": "456 Oak Ave",
    "date": "2026-03-06",
    "time": "09:00"
  },
  "passengerInfo": {
    "name": "John Doe",
    "email": "john@company.com",
    "gender": "male",
    "seatsBooked": 1,
    "pickupLocation": "123 Main St",
    "dropoffLocation": "456 Oak Ave"
  },
  "notification": {
    "type": "booking_accepted",
    "seatsBooked": 1,
    "passengerName": "John Doe",
    "passengerEmail": "john@company.com",
    "driverName": "Driver Name",
    "pickupLocation": "123 Main St",
    "dropoffLocation": "456 Oak Ave",
    "date": "2026-03-06",
    "time": "09:00",
    "carBrand": "Toyota",
    "carModel": "Camry"
  }
}
```

### Error Response Examples
```json
{
  "error": "Booking not found"
}
```

```json
{
  "error": "Passenger is not verified. Please complete company verification.",
  "requiresVerification": true,
  "passengerEmail": "john@company.com"
}
```

---

## 3. GET DRIVER'S ACCEPTED BOOKINGS (NEW)

### Endpoint
```
GET /api/driver/:driverId/accepted-bookings
```

### Path Parameters
- `driverId`: Driver's ID

### Response (200)
```json
{
  "bookings": [
    {
      "_id": "booking_id",
      "rideId": "ride_id",
      "status": "accepted",
      "acceptedAt": "2026-03-06T10:05:00Z",
      "passengerInfo": {
        "name": "John Doe",
        "email": "john@company.com",
        "seatsBooked": 1,
        "pickupLocation": "123 Main St",
        "dropoffLocation": "456 Oak Ave",
        "date": "2026-03-06",
        "time": "09:00",
        "gender": "male"
      },
      "rideDetails": {
        "carBrand": "Toyota",
        "carModel": "Camry",
        "pricePerSeat": 150,
        "distanceTravelledInKm": 5.5
      }
    }
  ],
  "total": 1
}
```

### Use Case
Driver calls this to see all passengers who have accepted their ride with complete details.

---

## 4. GET PASSENGER'S BOOKINGS (NEW)

### Endpoint
```
GET /api/passenger/:passengerId/bookings
```

### Path Parameters
- `passengerId`: Passenger's ID

### Response (200)
```json
{
  "bookings": [
    {
      "_id": "booking_id",
      "rideId": "ride_id",
      "status": "pending",
      "createdAt": "2026-03-06T10:00:00Z",
      "acceptedAt": null,
      "driverInfo": null,
      "bookingDetails": {
        "seatsBooked": 1,
        "pricePerSeat": 150,
        "distanceTravelledInKm": 5.5,
        "totalFare": 150
      }
    },
    {
      "_id": "booking_id_2",
      "rideId": "ride_id_2",
      "status": "accepted",
      "createdAt": "2026-03-06T09:50:00Z",
      "acceptedAt": "2026-03-06T10:05:00Z",
      "driverInfo": {
        "name": "Driver Name",
        "email": "driver@company.com",
        "gender": "male",
        "carBrand": "Toyota",
        "carModel": "Camry",
        "pickupLocation": "123 Main St",
        "dropoffLocation": "456 Oak Ave",
        "date": "2026-03-06",
        "time": "09:00"
      },
      "bookingDetails": {
        "seatsBooked": 1,
        "pricePerSeat": 150,
        "distanceTravelledInKm": 5.5,
        "totalFare": 150
      }
    }
  ],
  "total": 2
}
```

### Key Points
- **driverInfo** is `null` for non-accepted bookings
- **driverInfo** is populated for accepted and completed bookings
- Shows complete booking history with status

---

## 5. REJECT BOOKING

### Endpoint
```
POST /api/bookings/:bookingId/reject
```

### Request Body
```json
{
  "driverId": "driver_temp_id"
}
```

### Response (200)
```json
{
  "message": "Booking rejected",
  "booking": {
    "id": "booking_id",
    "status": "rejected"
  }
}
```

---

## 6. CANCEL BOOKING (Passenger cancels)

### Endpoint
```
POST /api/bookings/:bookingId/cancel
```

### Request Body
```json
{
  "passengerId": "passenger_temp_id"
}
```

### Response (200)
```json
{
  "message": "Booking cancelled",
  "booking": {
    "id": "booking_id",
    "status": "cancelled"
  }
}
```

---

## 7. GET RIDE HISTORY

### Endpoint
```
GET /api/user/:userId/ride-history?type=driver&limit=10&skip=0
```

### Query Parameters
- `type`: `driver` or `passenger` (default: driver)
- `limit`: Number of results (default: 10)
- `skip`: Number of results to skip (default: 0)

### Response (200) - Driver History
```json
{
  "rides": [
    {
      "_id": "history_id",
      "driverId": "driver_id",
      "pickupLocation": "123 Main St",
      "dropoffLocation": "456 Oak Ave",
      "date": "2026-03-06",
      "time": "09:00",
      "distanceTravelledInKm": 5.5,
      "fareCollected": 300,
      "numberOfPassengers": 2,
      "completedAt": "2026-03-06T10:30:00Z",
      "rideRatings": [
        {
          "passengerId": "id",
          "rating": 5,
          "review": "Great ride!"
        }
      ]
    }
  ],
  "totalCount": 1,
  "limit": 10,
  "skip": 0
}
```

### Response (200) - Passenger History
```json
{
  "rides": [
    {
      "_id": "booking_id",
      "rideId": "ride_id",
      "pickupLocation": "123 Main St",
      "dropoffLocation": "456 Oak Ave",
      "date": "2026-03-06",
      "time": "09:00",
      "distanceTravelledInKm": 5.5,
      "fareCollected": 150,
      "numberOfPassengers": 1,
      "completedAt": "2026-03-06T10:30:00Z",
      "driverName": "Driver Name",
      "driverEmail": "driver@company.com",
      "carBrand": "Toyota",
      "carModel": "Camry",
      "seatsBooked": 1,
      "status": "completed"
    }
  ],
  "totalCount": 1,
  "limit": 10,
  "skip": 0
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Missing or invalid parameters |
| 403 | Forbidden - Not authorized or passenger not verified |
| 404 | Not Found - Booking, ride, or user not found |
| 500 | Internal Server Error - Database or server error |

---

## Data Sharing Timeline

### Sequence Diagram
```
Passenger                          Backend                            Driver
   |                                  |                                 |
   |------ POST /api/bookings --------|                                 |
   |                                  |                                 |
   |                   Booking created (status: pending)                |
   |                                  |                                 |
   |                                  |------ Notification -------------|
   |                                  |      (New booking request)      |
   |                                  |                                 |
   |                                  |<-- Accept /api/bookings/:id ---|
   |                                  |                                 |
   |<-- Driver Info Returned ---------|                                 |
   |  (name, email, car, location)    |                                 |
   |                                  |-- Passenger Info Returned ---->|
   |                                  | (name, email, seats, location) |
   |                                  |                                 |
   |-- GET /api/passenger/:id --------|                                 |
   |      (includes driverInfo)       |                                 |
   |                                  |                                 |
   |                                  |<-- GET /api/driver/:id --------|
   |                                  |  (includes passengerInfo)      |
   |                                  |                                 |
```

---

## Frontend Implementation Example

### Using Passenger Bookings Component
```tsx
import PassengerBookingsView from '@/components/PassengerBookingsView';

function PassengerDashboard() {
  const passengerId = localStorage.getItem("userId");
  
  return (
    <div>
      <h1>My Bookings</h1>
      <PassengerBookingsView passengerId={passengerId} />
    </div>
  );
}
```

### Using Driver Accepted Bookings Component
```tsx
import DriverAcceptedBookings from '@/components/DriverAcceptedBookings';

function DriverDashboard() {
  const driverId = localStorage.getItem("userId");
  
  return (
    <div>
      <h1>Accepted Bookings</h1>
      <DriverAcceptedBookings driverId={driverId} />
    </div>
  );
}
```

---

## Testing the API with curl

### Test Booking Creation
```bash
curl -X POST http://localhost:8080/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "rideId": "your_ride_id",
    "passengerId": "passenger_123",
    "passengerName": "John Doe",
    "passengerEmail": "john@techcorp.com",
    "seatsToBook": 1,
    "passengerDetails": [{"seatNumber": 1, "gender": "male"}]
  }'
```

### Test Booking Acceptance
```bash
curl -X POST http://localhost:8080/api/bookings/booking_id/accept \
  -H "Content-Type: application/json" \
  -d '{"driverId": "driver_123"}'
```

### Test Get Driver Accepted Bookings
```bash
curl http://localhost:8080/api/driver/driver_123/accepted-bookings
```

### Test Get Passenger Bookings
```bash
curl http://localhost:8080/api/passenger/passenger_123/bookings
```

---

## Important Notes

1. **Mutual Data Sharing**: Driver and passenger information is only shared after the booking is **accepted**.
2. **Email Lookup**: Driver ID can be driver email or temporary ID format.
3. **Verification Required**: Passengers must be verified before driver can accept their booking.
4. **Booking Status**: Always check the `status` field to determine if data should be visible.
5. **Error Handling**: Implement proper error handling in frontend for all possible error codes.

---

**Last Updated:** March 6, 2026  
**Version:** 1.0  
**Status:** Production Ready ✅
