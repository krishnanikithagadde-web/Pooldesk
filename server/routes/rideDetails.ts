import { RequestHandler } from 'express';
import { connectToDatabase } from '../db';
import Ride from '../models/Ride';
import Booking from '../models/Booking';
import RideHistory from '../models/RideHistory';

/**
 * Get detailed ride information including all bookings
 */
export const handleGetRideDetails: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();
    const { rideId } = req.params;

    if (!rideId) {
      res.status(400).json({ error: 'Ride ID is required' });
      return;
    }

    // Get ride
    const ride = await Ride.findById(rideId);
    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }

    // Get all bookings for this ride
    const bookings = await Booking.find({ rideId }).sort({ createdAt: -1 });

    res.status(200).json({
      ride: {
        _id: ride._id,
        driverId: ride.driverId,
        driverName: ride.driverName,
        driverEmail: ride.driverEmail,
        driverGender: ride.driverGender,
        driverPhone: ride.driverPhone,
        pickupLocation: ride.pickupLocation,
        dropoffLocation: ride.dropoffLocation,
        date: ride.date,
        time: ride.time,
        carBrand: ride.carBrand,
        carModel: ride.carModel,
        carLicensePlate: ride.carLicensePlate,
        totalSeats: ride.totalSeats,
        availableSeats: ride.availableSeats,
        bookedSeats: ride.bookedSeats,
        passengerPreference: ride.passengerPreference,
        status: ride.status,
        distanceTravelledInKm: ride.distanceTravelledInKm,
        pricePerSeat: ride.pricePerSeat,
        rating: ride.rating,
        averageRating: ride.averageRating,
        acceptedBookings: ride.acceptedBookings,
        createdAt: ride.createdAt,
        updatedAt: ride.updatedAt,
      },
      bookings: bookings.map(b => ({
        _id: b._id,
        passengerId: b.passengerId,
        passengerName: b.passengerName,
        passengerEmail: b.passengerEmail,
        passengerPhone: b.passengerPhone,
        seatsBooked: b.seatsBooked,
        status: b.status,
        createdAt: b.createdAt,
      })),
      totalBookings: bookings.length,
      acceptedCount: bookings.filter(b => b.status === 'accepted').length,
      pendingCount: bookings.filter(b => b.status === 'pending').length,
    });
  } catch (error: any) {
    console.error('Error getting ride details:', error);
    res.status(500).json({ error: 'Failed to get ride details: ' + error.message });
  }
};

/**
 * Get booking by ID with full details
 */
export const handleGetBookingById: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();
    const { bookingId } = req.params;

    if (!bookingId) {
      res.status(400).json({ error: 'Booking ID is required' });
      return;
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    // Get ride details for context
    const ride = await Ride.findById(booking.rideId);

    res.status(200).json({
      booking: {
        _id: booking._id,
        rideId: booking.rideId,
        driverId: booking.driverId,
        driverName: booking.driverName,
        driverEmail: booking.driverEmail,
        driverPhone: booking.driverPhone,
        driverGender: booking.driverGender,
        carBrand: booking.carBrand,
        carModel: booking.carModel,
        carLicensePlate: booking.carLicensePlate,
        passengerId: booking.passengerId,
        passengerName: booking.passengerName,
        passengerEmail: booking.passengerEmail,
        passengerPhone: booking.passengerPhone,
        seatsBooked: booking.seatsBooked,
        passengerDetails: booking.passengerDetails,
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        date: booking.date,
        time: booking.time,
        status: booking.status,
        pricePerSeat: booking.pricePerSeat,
        distanceTravelledInKm: booking.distanceTravelledInKm,
        totalPrice: (booking.pricePerSeat || 0) * (booking.seatsBooked || 1),
        acceptedAt: booking.acceptedAt,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      },
      rideStatus: ride?.status,
    });
  } catch (error: any) {
    console.error('Error getting booking:', error);
    res.status(500).json({ error: 'Failed to get booking: ' + error.message });
  }
};

/**
 * Fixed: Get available rides with proper error handling
 */
export const handleFindRidesFixed: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();
    
    const { pickup, dropoff, date } = req.query;

    // Build query with only the fields that were provided
    const query: any = { status: 'active' };

    if (pickup) {
      query.pickupLocation = new RegExp(String(pickup), 'i');
    }

    if (dropoff) {
      query.dropoffLocation = new RegExp(String(dropoff), 'i');
    }

    if (date) {
      query.date = String(date);
    }

    const rides = await Ride.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      rides: rides.map(ride => ({
        _id: ride._id,
        driverId: ride.driverId,
        driverName: ride.driverName,
        driverEmail: ride.driverEmail,
        pickupLocation: ride.pickupLocation,
        dropoffLocation: ride.dropoffLocation,
        date: ride.date,
        time: ride.time,
        carBrand: ride.carBrand,
        carModel: ride.carModel,
        availableSeats: ride.availableSeats,
        totalSeats: ride.totalSeats,
        passengerPreference: ride.passengerPreference,
        distanceTravelledInKm: ride.distanceTravelledInKm,
        pricePerSeat: ride.pricePerSeat,
        averageRating: ride.averageRating,
        createdAt: ride.createdAt,
      })),
      total: rides.length,
      filters: { pickup, dropoff, date },
    });
  } catch (error: any) {
    console.error('Error finding rides:', error);
    res.status(500).json({ error: 'Failed to find rides: ' + error.message });
  }
};

/**
 * Fixed: Get ride history with proper error handling and pagination
 */
export const handleGetRideHistoryFixed: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const { userId } = req.params;
    const { type = "driver", limit = "10", skip = "0" } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const limitNum = Math.min(parseInt(String(limit)) || 10, 100);
    const skipNum = Math.max(0, parseInt(String(skip)) || 0);

    if (type === "passenger") {
      // Get passenger ride history from accepted bookings
      try {
        const acceptedBookings = await Booking.find({
          passengerId: userId,
          status: { $in: ['accepted', 'completed'] },
        })
          .sort({ acceptedAt: -1, createdAt: -1 })
          .limit(limitNum)
          .skip(skipNum)
          .lean();

        const totalCount = await Booking.countDocuments({
          passengerId: userId,
          status: { $in: ['accepted', 'completed'] },
        });

        const rides = acceptedBookings.map(booking => ({
          _id: booking._id,
          rideId: booking.rideId,
          pickupLocation: booking.pickupLocation,
          dropoffLocation: booking.dropoffLocation,
          date: booking.date,
          time: booking.time,
          distanceTravelledInKm: booking.distanceTravelledInKm || 0,
          fareCollected: (booking.pricePerSeat || 0) * booking.seatsBooked,
          numberOfPassengers: 1,
          completedAt: booking.acceptedAt || booking.createdAt,
          driverName: booking.driverName,
          driverEmail: booking.driverEmail,
          carBrand: booking.carBrand,
          carModel: booking.carModel,
          seatsBooked: booking.seatsBooked,
          status: booking.status,
        }));

        return res.json({
          rides,
          totalCount,
          limit: limitNum,
          skip: skipNum,
        });
      } catch (error: any) {
        console.error('Error querying passenger bookings:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch passenger bookings: ' + error.message,
          rides: [],
          totalCount: 0,
        });
      }
    } else {
      // Get driver ride history from RideHistory
      try {
        const rideHistory = await RideHistory.find({ driverId: userId })
          .sort({ completedAt: -1 })
          .limit(limitNum)
          .skip(skipNum)
          .lean();

        const totalCount = await RideHistory.countDocuments({ driverId: userId });

        return res.json({
          rides: rideHistory,
          totalCount,
          limit: limitNum,
          skip: skipNum,
        });
      } catch (error: any) {
        console.error('Error querying driver ride history:', error);
        return res.status(500).json({
          error: 'Failed to fetch driver ride history: ' + error.message,
          rides: [],
          totalCount: 0,
        });
      }
    }
  } catch (error: any) {
    console.error('Error getting ride history:', error);
    res.status(500).json({
      error: 'Failed to fetch ride history: ' + error.message,
      rides: [],
      totalCount: 0,
    });
  }
};

/**
 * Fixed: Get bookings for a driver to see pending requests
 */
export const handleGetPendingBookingsFixed: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const { driverId } = req.params;
    const { status = 'pending', limit = '20' } = req.query;

    if (!driverId) {
      res.status(400).json({ error: 'Driver ID is required' });
      return;
    }

    const limitNum = Math.min(parseInt(String(limit)) || 20, 100);
    const statusFilter = String(status) === 'all' 
      ? { $in: ['pending', 'accepted'] }
      : String(status);

    const bookings = await Booking.find({
      driverId,
      status: statusFilter,
    })
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .lean();

    res.status(200).json({
      bookings: bookings.map(b => ({
        _id: b._id,
        rideId: b.rideId,
        passengerName: b.passengerName,
        passengerEmail: b.passengerEmail,
        seatsBooked: b.seatsBooked,
        status: b.status,
        pricePerSeat: b.pricePerSeat,
        totalPrice: (b.pricePerSeat || 0) * b.seatsBooked,
        createdAt: b.createdAt,
      })),
      total: bookings.length,
    });
  } catch (error: any) {
    console.error('Error getting pending bookings:', error);
    res.status(500).json({ error: 'Failed to get pending bookings: ' + error.message });
  }
};
