import { RequestHandler } from "express";
import Ride from "../models/Ride";
import Booking from "../models/Booking";
import User from "../models/User";
import RideHistory from "../models/RideHistory";
import VerifiedEmployee from "../models/VerifiedEmployee";

// Check if driver has an active ride
export const checkActiveRide: RequestHandler = async (req, res) => {
  try {
    const { driverId } = req.params;

    const user = await User.findById(driverId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user has active ride
    const activeRide = await Ride.findOne({
      driverId,
      status: "active",
    });

    res.json({
      hasActiveRide: !!activeRide,
      activeRideId: activeRide?._id,
      canCreateRide: !activeRide,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

// Mark ride as completed and create ride history
export const completeRide: RequestHandler = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { distance, totalFare } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }

    // Get all accepted bookings for this ride
    const bookings = await Booking.find({
      rideId,
      status: "accepted",
    });

    const passengerEmails = bookings.map((b) => b.passengerEmail);
    const numberOfPassengers = bookings.length;

    // Update ride status
    ride.status = "completed";
    ride.completedAt = new Date();
    ride.distanceTravelledInKm = distance || ride.distanceTravelledInKm;
    await ride.save();

    // Create ride history record
    await RideHistory.create({
      rideId: ride._id.toString(),
      driverId: ride.driverId,
      driverName: ride.driverName,
      driverEmail: ride.driverEmail,
      company: (await User.findById(ride.driverId))?.company || "",
      pickupLocation: ride.pickupLocation,
      dropoffLocation: ride.dropoffLocation,
      date: ride.date,
      time: ride.time,
      distanceTravelledInKm: distance || ride.distanceTravelledInKm,
      fareCollected: totalFare || numberOfPassengers * ride.pricePerSeat,
      numberOfPassengers,
      passengerEmails,
      rideRatings: [],
      completedAt: new Date(),
    });

    // Clear active ride from driver
    await User.findByIdAndUpdate(ride.driverId, {
      activeRideId: null,
    });

    // Update all bookings to completed
    await Booking.updateMany(
      { rideId, status: "accepted" },
      { status: "completed" }
    );

    res.json({
      message: "Ride completed successfully",
      rideId: ride._id,
      numberOfPassengers,
      totalFare: totalFare || numberOfPassengers * ride.pricePerSeat,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

// Start a ride - generate OTP and set status to in_progress
export const startRide: RequestHandler = async (req, res) => {
  try {
    const { rideId } = req.params;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }

    if (ride.status !== 'active') {
      return res.status(400).json({ error: "Ride is not in active status" });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Update ride status and OTP
    ride.status = 'in_progress';
    ride.otp = otp;
    await ride.save();

    res.json({
      message: "Ride started successfully",
      rideId: ride._id,
      otp: otp,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

// Verify OTP for ride start
export const verifyRideOtp: RequestHandler = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ error: "OTP is required" });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }

    if (ride.status !== 'in_progress') {
      return res.status(400).json({ error: "Ride is not in progress" });
    }

    if (ride.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    res.json({
      message: "OTP verified successfully",
      verified: true,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

// Rate a completed ride
export const rateRide: RequestHandler = async (req, res) => {
  try {
    const { rideHistoryId } = req.params;
    const { passengerId, rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const rideHistory = await RideHistory.findById(rideHistoryId);
    if (!rideHistory) {
      return res.status(404).json({ error: "Ride history not found" });
    }

    // Check if passenger already rated
    const existingRating = rideHistory.rideRatings.find(
      (r) => r.passengerId === passengerId
    );

    if (existingRating) {
      return res.status(400).json({ error: "Passenger has already rated this ride" });
    }

    rideHistory.rideRatings.push({
      passengerId,
      rating,
      review,
    });

    // Calculate average rating
    const averageRating =
      rideHistory.rideRatings.reduce((sum, r) => sum + r.rating, 0) /
      rideHistory.rideRatings.length;

    // Update ride with average rating
    await Ride.findOneAndUpdate(
      { _id: rideHistory.rideId },
      { averageRating }
    );

    await rideHistory.save();

    res.json({
      message: "Ride rated successfully",
      averageRating,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};
