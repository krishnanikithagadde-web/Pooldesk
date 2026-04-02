import { RequestHandler } from "express";
import Ride from "../models/Ride";
import Booking from "../models/Booking";
import User from "../models/User";
import RideHistory from "../models/RideHistory";
import VerifiedEmployee from "../models/VerifiedEmployee";
import mongoose from 'mongoose';

// Get ride history ID for a completed ride
export const getRideHistoryId: RequestHandler = async (req, res) => {
  try {
    const { rideId } = req.params;

    const rideHistory = await RideHistory.findOne({ rideId });
    if (!rideHistory) {
      return res.status(404).json({ error: "Ride history not found" });
    }

    res.json({
      rideHistoryId: rideHistory._id.toString(),
      rideId: rideHistory.rideId,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

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
    // Resolve driver company defensively (ride.driverId may not be an ObjectId in some dev flows)
    let driverCompany = "Unknown"; // Default value instead of empty string
    try {
      if (ride.driverId && mongoose.isValidObjectId(ride.driverId)) {
        const drv = await User.findById(ride.driverId);
        driverCompany = drv?.company || "Unknown";
      } else {
        // driverId isn't a valid ObjectId (e.g., 'driver_...') — use default
        driverCompany = "Unknown";
      }
    } catch (e) {
      console.warn('Failed to resolve driver company for ride history:', e);
      driverCompany = "Unknown";
    }

    // Use upsert to avoid duplicate key errors if ride history already exists
    await RideHistory.findOneAndUpdate(
      { rideId: ride._id.toString() },
      {
        rideId: ride._id.toString(),
        driverId: ride.driverId,
        driverName: ride.driverName,
        driverEmail: ride.driverEmail,
        company: driverCompany || "Unknown",
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
      },
      { upsert: true, new: true }
    );

    // Clear active ride from driver (handle both ObjectId and string cases)
    try {
      if (ride.driverId && mongoose.isValidObjectId(ride.driverId)) {
        await User.findByIdAndUpdate(ride.driverId, {
          activeRideId: null,
        });
      } else {
        console.warn(`Skipping driver update - invalid driverId: ${ride.driverId}`);
      }
    } catch (e) {
      console.warn('Failed to clear active ride from driver:', e);
      // Don't fail the entire ride completion if this fails
    }

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

    // Allow verifying OTP even if ride hasn't been marked in_progress yet (acceptBooking may generate OTP)
    if (ride.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // Transition ride into in_progress when OTP is correctly verified
    try {
      ride.status = 'in_progress';
      ride.startedAt = new Date();
      await ride.save();

      // Notify via socket that OTP was verified and ride started
      try {
        const { getIo } = await import('../socket');
        const io = getIo();
        io.to(`ride_${rideId}`).emit('otpVerified', { rideId, otp });
        io.to(`ride_${rideId}`).emit('rideStarted', { rideId });
      } catch (e) {
        console.warn('Failed to emit otpVerified via socket:', e);
      }

      res.json({
        message: "OTP verified successfully",
        verified: true,
      });
    } catch (e) {
      console.error('Failed to update ride status after OTP verification', e);
      return res.status(500).json({ error: 'Failed to start ride after OTP verification' });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

// Mark payment as confirmed by driver
export const confirmPayment: RequestHandler = async (req, res) => {
  try {
    const { rideId } = req.params;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: "Ride not found" });
    }

    // Update ride status to mark payment as confirmed
    ride.paymentConfirmed = true;
    ride.paymentConfirmedAt = new Date();
    await ride.save();

    // Also update ride history record with payment confirmation
    try {
      await RideHistory.findOneAndUpdate(
        { rideId: ride._id.toString() },
        {
          paymentConfirmed: true,
          paymentConfirmedAt: new Date(),
        }
      );
    } catch (e) {
      console.warn('Failed to update ride history with payment confirmation:', e);
    }

    // Notify via socket that payment is confirmed
    try {
      const { getIo } = await import('../socket');
      const io = getIo();
      io.to(`ride_${rideId}`).emit('paymentConfirmed', { rideId });
    } catch (e) {
      console.warn('Failed to emit paymentConfirmed via socket:', e);
    }

    res.json({
      message: "Payment confirmed",
      rideId: ride._id,
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

    // Calculate average rating for this ride history
    const averageRating =
      rideHistory.rideRatings.reduce((sum, r) => sum + r.rating, 0) /
      rideHistory.rideRatings.length;

    // Update ride with average rating
    await Ride.findOneAndUpdate(
      { _id: rideHistory.rideId },
      { averageRating }
    );

    // Update driver's cumulative rating in User record
    if (rideHistory.driverId && mongoose.isValidObjectId(rideHistory.driverId)) {
      const driver = await User.findById(rideHistory.driverId);
      if (driver) {
        driver.totalRatings += 1;
        driver.sumRatings += rating;
        driver.averageRating = driver.sumRatings / driver.totalRatings;
        await driver.save();
      }
    }

    await rideHistory.save();

    res.json({
      message: "Ride rated successfully",
      averageRating,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};
