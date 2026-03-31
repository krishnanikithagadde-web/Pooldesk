import { RequestHandler } from 'express';
import { connectToDatabase } from '../db';
import Ride from '../models/Ride';
import User from '../models/User';
import { calculateRealDistance, estimateDistance, calculatePricePerSeat } from '../utils/distance';

/**
 * Submit a ride offer
 */
export const handleOfferRide: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const {
      driverId,
      driverName,
      driverEmail,
      driverGender,
      pickupLocation,
      dropoffLocation,
      date,
      time,
      carBrand,
      carModel,
      availableSeats,
      passengerPreference,
    } = req.body;

    // Validate required fields
    if (!driverId || !driverName || !driverEmail || !pickupLocation || !dropoffLocation || !date || !time || !carBrand || !carModel) {
      res.status(400).json({
        error: 'Missing required fields',
      });
      return;
    }

    // Check if driver has an active ride
    const activeRide = await Ride.findOne({
      driverId,
      status: 'active',
    });

    if (activeRide) {
      res.status(409).json({
        error: 'You have an active ride. Please complete it before creating a new ride.',
        activeRideId: activeRide._id,
      });
      return;
    }

    // Create new ride
    const seatsNumber = parseInt(availableSeats);

    // Calculate distance using Google Maps API and pricing
    console.log(`\n🚗 Creating ride offer:`);
    console.log(`   From: ${pickupLocation}`);
    console.log(`   To: ${dropoffLocation}`);

    const distanceTravelledInKm = await calculateRealDistance(pickupLocation, dropoffLocation);
    const pricePerSeat = calculatePricePerSeat(distanceTravelledInKm, 1);

    console.log(`   Distance: ${distanceTravelledInKm.toFixed(2)} km`);
    console.log(`   Price/Seat: ₹${Math.round(pricePerSeat)}\n`);

    const ride = new Ride({
      driverId,
      driverName,
      driverEmail,
      driverGender,
      pickupLocation,
      dropoffLocation,
      date,
      time,
      carBrand,
      carModel,
      totalSeats: seatsNumber,
      availableSeats: seatsNumber,
      bookedSeats: 0,
      passengerPreference: passengerPreference || 'any',
      status: 'active',
      distanceTravelledInKm,
      pricePerSeat: Math.round(pricePerSeat),
    });

    await ride.save();

    // Try to set the driver's active ride (only if driver exists in User collection)
    try {
      await User.findByIdAndUpdate(driverId, {
        activeRideId: ride._id.toString(),
      });
    } catch (error) {
      // Driver might not exist in User table yet - that's okay for temporary drivers
      console.log(`Note: Could not update user record for driver ${driverId}`);
    }

    res.status(201).json({
      message: 'Ride offered successfully',
      ride: {
        id: ride._id,
        driverId: ride.driverId,
        driverName: ride.driverName,
        pickupLocation: ride.pickupLocation,
        dropoffLocation: ride.dropoffLocation,
        date: ride.date,
        time: ride.time,
        carBrand: ride.carBrand,
        carModel: ride.carModel,
        availableSeats: ride.availableSeats,
        status: ride.status,
        distanceTravelledInKm: ride.distanceTravelledInKm,
        pricePerSeat: ride.pricePerSeat,
      },
    });
  } catch (error: any) {
    console.error('Error offering ride:', error);
    res.status(500).json({ error: 'Failed to offer ride' });
  }
};

/**
 * Get a specific ride by ID
 */
export const handleGetRide: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const { rideId } = req.params;

    if (!rideId) {
      res.status(400).json({ error: 'Ride ID is required' });
      return;
    }

    const ride = await Ride.findById(rideId);

    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }

    res.status(200).json(ride);
  } catch (error: any) {
    console.error('Error getting ride:', error);
    res.status(500).json({ error: 'Failed to get ride' });
  }
};

/**
 * Get all rides offered by a driver
 */
export const handleGetMyRides: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const { driverId } = req.query;

    if (!driverId) {
      res.status(400).json({ error: 'Driver ID is required' });
      return;
    }

    const rides = await Ride.find({ driverId }).sort({ createdAt: -1 });

    res.status(200).json({
      rides,
      total: rides.length,
    });
  } catch (error: any) {
    console.error('Error getting rides:', error);
    res.status(500).json({ error: 'Failed to get rides' });
  }
};

/**
 * Accept a ride offer
 */
export const handleAcceptRide: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const { rideId } = req.params;
    const { passengerId, passengerName, passengerEmail, passengerGender } = req.body;

    if (!rideId || !passengerId || !passengerName || !passengerEmail) {
      res.status(400).json({
        error: 'Missing required fields: rideId, passengerId, passengerName, passengerEmail',
      });
      return;
    }

    const ride = await Ride.findById(rideId);

    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }

    if (ride.status !== 'active') {
      res.status(400).json({ error: 'Ride is no longer active' });
      return;
    }

    if (ride.acceptedBy) {
      res.status(400).json({ error: 'Ride already has an accepted passenger' });
      return;
    }

    // Update ride with passenger info
    ride.acceptedBy = passengerId;
    ride.acceptedByName = passengerName;
    ride.acceptedByEmail = passengerEmail;
    ride.acceptedByGender = passengerGender || 'not specified';
    ride.status = 'completed';

    await ride.save();

    res.status(200).json({
      message: 'Ride accepted successfully',
      ride,
      notification: {
        type: 'ride_accepted',
        driverName: ride.driverName,
        passengerName: passengerName,
        passengerEmail: passengerEmail,
        pickupLocation: ride.pickupLocation,
        dropoffLocation: ride.dropoffLocation,
        date: ride.date,
        time: ride.time,
        carBrand: ride.carBrand,
        carModel: ride.carModel,
      },
    });
  } catch (error: any) {
    console.error('Error accepting ride:', error);
    res.status(500).json({ error: 'Failed to accept ride' });
  }
};

/**
 * Reject a ride offer
 */
export const handleRejectRide: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const { rideId } = req.params;

    if (!rideId) {
      res.status(400).json({ error: 'Ride ID is required' });
      return;
    }

    const ride = await Ride.findById(rideId);

    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }

    // Reset acceptance
    ride.acceptedBy = null;
    ride.acceptedByName = null;
    ride.acceptedByEmail = null;
    ride.acceptedByGender = null;
    ride.status = 'active';

    await ride.save();

    res.status(200).json({
      message: 'Ride rejected successfully',
      ride,
    });
  } catch (error: any) {
    console.error('Error rejecting ride:', error);
    res.status(500).json({ error: 'Failed to reject ride' });
  }
};

/**
 * Cancel a ride (driver cancellation)
 */
export const handleCancelRide: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const { rideId } = req.params;
    const { driverId } = req.body;

    if (!rideId || !driverId) {
      res.status(400).json({ error: 'Ride ID and Driver ID are required' });
      return;
    }

    const ride = await Ride.findById(rideId);

    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }

    if (ride.driverId !== driverId) {
      res.status(403).json({ error: 'Unauthorized - not the ride owner' });
      return;
    }

    ride.status = 'cancelled';
    await ride.save();

    res.status(200).json({
      message: 'Ride cancelled successfully',
      ride,
    });
  } catch (error: any) {
    console.error('Error cancelling ride:', error);
    res.status(500).json({ error: 'Failed to cancel ride' });
  }
};
