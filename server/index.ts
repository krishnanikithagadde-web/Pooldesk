import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleSignUp, handleLogin } from "./routes/auth";
import { handleFindRides, handleMLHealth } from "./routes/rides";
import {
  handleOfferRide,
  handleGetRide,
  handleGetMyRides,
  handleAcceptRide,
  handleRejectRide,
  handleCancelRide
} from "./routes/rideOffers";
import {
  handleBookRide,
  handleGetRideBookings,
  handleAcceptBooking,
  handleRejectBooking,
  handleGetBooking,
  handleGetPassengerBookings,
  handleCancelBooking,
  handleGetAcceptedBookings,
  handleGetBookingsByPassenger,
  handleCheckAcceptedBookings,
} from "./routes/bookings";
import {
  handleGetRideDetails,
  handleGetBookingById,
  handleFindRidesFixed,
  handleGetRideHistoryFixed,
  handleGetPendingBookingsFixed,
} from "./routes/rideDetails";
import { calculateRealDistance } from "./utils/distance";
import { checkActiveRide, completeRide, startRide, verifyRideOtp, rateRide, getRideHistoryId, confirmPayment } from "./routes/rideManagement";
import { getRideHistory, getDriverAnalytics, getDemandPrediction } from "./routes/analytics";
import {
  verifyEmployee,
  checkVerificationStatus,
  flagUser,
  getVerifiedEmployees,
  getFlaggedUsers,
  authenticatePassengers,
} from "./routes/verification";
import { getDriverProfile } from "./routes/driverProfile";

import { connectToDatabase } from "./db";

export function createServer() {
  const app = express();

  // connect to MongoDB when server initializes
  connectToDatabase().catch(err => {
    console.error("Failed to connect to MongoDB during server startup:", err);
  });

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Debug endpoint for distance testing
  app.post("/api/debug/test-distance", async (req, res) => {
    try {
      const { pickup, dropoff } = req.body;

      if (!pickup || !dropoff) {
        return res.status(400).json({ error: "pickup and dropoff required" });
      }

      console.log(`\n${'='.repeat(70)}`);
      console.log(`🧪 DEBUG TEST: Distance calculation`);
      console.log(`   Pickup: "${pickup}"`);
      console.log(`   Dropoff: "${dropoff}"`);
      console.log(`${'='.repeat(70)}`);

      // Use dynamic import to get calculateRealDistance
      const { calculateRealDistance: calcDist } = await import('./utils/distance');
      const distance = await calcDist(pickup, dropoff);

      console.log(`\n✅ Test Result: ${distance.toFixed(2)} km\n`);

      res.json({
        pickup,
        dropoff,
        distanceInKm: distance,
        pricePerSeat: Math.round(50 + distance * 8),
      });
    } catch (error) {
      console.error("Debug test error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Authentication routes
  app.post("/api/auth/signup", handleSignUp);
  app.post("/api/auth/login", handleLogin);

  // Ride finding routes
  app.post("/api/rides/find", handleFindRides);
  app.get("/api/health/ml", handleMLHealth);

  // Ride offer routes
  app.post("/api/rides/offer", handleOfferRide);
  app.get("/api/rides/:rideId", handleGetRide);
  app.get("/api/rides/my/rides", handleGetMyRides);
  app.post("/api/rides/:rideId/accept", handleAcceptRide);
  app.post("/api/rides/:rideId/reject", handleRejectRide);
  app.post("/api/rides/:rideId/cancel", handleCancelRide);

  // Booking routes (passenger books a ride)
  app.post("/api/bookings", handleBookRide);
  app.get("/api/rides/:rideId/bookings", handleGetRideBookings);
  app.post("/api/bookings/:bookingId/accept", handleAcceptBooking);
  app.post("/api/bookings/:bookingId/reject", handleRejectBooking);
  app.get("/api/bookings/:bookingId", handleGetBooking);
  app.get("/api/bookings/passenger/:passengerId", handleGetPassengerBookings);
  app.post("/api/bookings/:bookingId/cancel", handleCancelBooking);
  // NEW: Mutual data sharing endpoints
  app.get("/api/driver/:driverId/accepted-bookings", handleGetAcceptedBookings);
  app.get("/api/passenger/:passengerId/bookings", handleGetBookingsByPassenger);
  app.get("/api/passenger/:passengerId/accepted-bookings", handleCheckAcceptedBookings);

  // Ride Management routes
  app.get("/api/driver/:driverId/active-ride", checkActiveRide);
  app.post("/api/rides/:rideId/start", startRide);
  app.post("/api/rides/:rideId/verify-otp", verifyRideOtp);
  app.post("/api/rides/:rideId/complete", completeRide);
  app.post("/api/rides/:rideId/confirm-payment", confirmPayment);
  app.get("/api/rides/:rideId/history", getRideHistoryId);
  app.post("/api/ride-history/:rideHistoryId/rate", rateRide);

  // NEW: Ride Details Routes (Fixed database queries)
  app.get("/api/rides/:rideId/details", handleGetRideDetails);
  app.get("/api/bookings/:bookingId/details", handleGetBookingById);
  app.post("/api/rides/search/fixed", handleFindRidesFixed);
  app.get("/api/user/:userId/ride-history/fixed", handleGetRideHistoryFixed);
  app.get("/api/driver/:driverId/pending-bookings", handleGetPendingBookingsFixed);

  // Analytics routes (fallback to fixed versions if needed)
  app.get("/api/user/:userId/ride-history", handleGetRideHistoryFixed);
  app.get("/api/driver/:driverId/analytics", getDriverAnalytics);
  app.get("/api/demand-prediction", getDemandPrediction);

  // Verification and Security routes
  app.post("/api/user/:userId/verify", verifyEmployee);
  app.get("/api/user/:userId/verification-status", checkVerificationStatus);
  app.post("/api/user/:userId/flag", flagUser);
  app.get("/api/company/verified-employees", getVerifiedEmployees);
  app.get("/api/company/flagged-users", getFlaggedUsers);
  app.post("/api/rides/:rideId/authenticate-passengers", authenticatePassengers);

  // Driver profile route
  app.get("/api/driver/:driverId/profile", getDriverProfile);

  return app;
}
