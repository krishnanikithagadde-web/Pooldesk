import { RequestHandler } from 'express';
import { connectToDatabase } from '../db';
import Booking from '../models/Booking';
import Ride from '../models/Ride';
import User from '../models/User';

/**
 * Request to book a ride (passenger books)
 */
export const handleBookRide: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const {
      rideId,
      passengerId,
      passengerName,
      passengerEmail,
      seatsToBook,
      passengerDetails,
    } = req.body;

    if (!rideId || !passengerId || !passengerName || !passengerEmail || !seatsToBook || !passengerDetails) {
      res.status(400).json({
        error: 'Missing required fields: rideId, passengerId, passengerName, passengerEmail, seatsToBook, passengerDetails',
      });
      return;
    }

    // Get ride details
    const ride = await Ride.findById(rideId);
    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }

    if (ride.status !== 'active') {
      res.status(400).json({ error: 'Ride is no longer active' });
      return;
    }

    // Check if enough seats available
    if (seatsToBook > ride.availableSeats) {
      res.status(400).json({ error: `Only ${ride.availableSeats} seats available` });
      return;
    }

    // Check if already booked
    const existingBooking = await Booking.findOne({
      rideId,
      passengerId,
      status: { $in: ['pending', 'accepted'] },
    });

    if (existingBooking) {
      res.status(400).json({ error: 'You already have a booking for this ride' });
      return;
    }

    // Create booking
    const booking = new Booking({
      rideId,
      driverId: ride.driverId,
      driverName: ride.driverName,
      driverEmail: ride.driverEmail,
      passengerId,
      passengerName,
      passengerEmail,
      seatsBooked: seatsToBook,
      passengerDetails,
      pickupLocation: ride.pickupLocation,
      dropoffLocation: ride.dropoffLocation,
      date: ride.date,
      time: ride.time,
      carBrand: ride.carBrand,
      carModel: ride.carModel,
      status: 'pending',
      pricePerSeat: ride.pricePerSeat,
      distanceTravelledInKm: ride.distanceTravelledInKm,
    });

    await booking.save();

    res.status(201).json({
      message: 'Booking request sent to driver',
      booking: {
        id: booking._id,
        status: booking.status,
        seatsBooked: booking.seatsBooked,
        driverName: booking.driverName,
        driverEmail: booking.driverEmail,
        createdAt: booking.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error booking ride:', error);
    res.status(500).json({ error: 'Failed to book ride' });
  }
};

/**
 * Get pending bookings for a ride (for driver to see notifications)
 */
export const handleGetRideBookings: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const { rideId } = req.params;

    if (!rideId) {
      res.status(400).json({ error: 'Ride ID is required' });
      return;
    }

    // Get all pending bookings for this ride
    const bookings = await Booking.find({
      rideId,
      status: 'pending',
    }).sort({ createdAt: -1 });

    res.status(200).json({
      bookings,
      total: bookings.length,
    });
  } catch (error: any) {
    console.error('Error getting bookings:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
};

/**
 * Accept a booking (driver accepts passenger)
 * Fixed: Handle verification checks without strict ID match for temporary drivers
 */
export const handleAcceptBooking: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const { bookingId } = req.params;
    const { driverId } = req.body;

    if (!bookingId) {
      res.status(400).json({ error: 'Booking ID is required' });
      return;
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.status !== 'pending') {
      res.status(400).json({ error: 'Booking is no longer pending' });
      return;
    }

    // Check if passenger is flagged (critical check)
    // Verification is optional for development/testing
    const passenger = await User.findOne({ email: booking.passengerEmail });
    
    if (passenger && passenger.isFlagged) {
      return res.status(403).json({
        error: 'Passenger is flagged for security reasons. Cannot accept booking.',
        flagReason: passenger.flagReason,
      });
    }

    // Log if passenger is not verified (warning only, allow booking)
    if (!passenger) {
      console.warn(`Passenger not found in User table for email: ${booking.passengerEmail}. Allowing booking.`);
    } else if (!passenger.isVerified) {
      console.info(`Accepting booking from unverified passenger: ${booking.passengerEmail}`);
    }

    // Update booking status
    booking.status = 'accepted';
    booking.acceptedAt = new Date();
    await booking.save();

    // Update ride to track booked seats and reduce available seats
    const ride = await Ride.findById(booking.rideId);
    if (ride) {
      ride.availableSeats = Math.max(0, ride.availableSeats - booking.seatsBooked);
      ride.bookedSeats = (ride.bookedSeats || 0) + booking.seatsBooked;

      // Add to accepted bookings array
      if (!ride.acceptedBookings) {
        ride.acceptedBookings = [];
      }
      ride.acceptedBookings.push(bookingId.toString());

      // Generate 4-digit OTP for this ride
      const otp = String(Math.floor(Math.random() * 9000) + 1000); // Generates 1000-9999
      ride.otp = otp;
      console.log(`✓ OTP generated for ride ${booking.rideId}: ${otp}`);

      // If no more seats available, mark as completed
      if (ride.availableSeats === 0) {
        ride.status = 'completed';
      }

      await ride.save();
    }

    // Return comprehensive acceptance response with mutual data sharing
    // Notify via WebSocket before sending response
    try {
      const { getIo } = await import('../socket');
      const io = getIo();

      console.log(`📡 Emitting bookingAccepted to passenger_${booking.passengerId} for ride ${booking.rideId}`);

      // Notify passenger via socket with detailed acceptance info + OTP
      io.to(`passenger_${booking.passengerId}`).emit('bookingAccepted', {
        rideId: booking.rideId,
        passengerId: booking.passengerId,
        otp: ride?.otp, // ✓ INCLUDE OTP IN SOCKET EVENT
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
        redirectUrl: `/active-ride/${booking.rideId}`
      });

      console.log(`✅ Socket event emitted with OTP: ${ride?.otp}`);

      // Also emit to general ride room for any other listeners
      io.to(`ride_${booking.rideId}`).emit('bookingAccepted', {
        rideId: booking.rideId,
        bookingId: booking._id,
        passengerName: booking.passengerName,
        driverName: booking.driverName
      });

    } catch (e) {
      console.warn('Socket emit failed, socket may not be initialized yet', e);
    }

    res.status(200).json({
      message: 'Booking accepted',
      redirectUrl: `/active-ride/${booking.rideId}`, // Both driver and passenger see the same page
      otp: ride?.otp, // ✓ INCLUDE OTP IN RESPONSE
      bookingData: {
        bookingId: booking._id.toString(),
        rideId: booking.rideId,
        passengerName: booking.passengerName,
        passengerEmail: booking.passengerEmail,
        passengerPhone: booking.passengerPhone,
        otp: ride?.otp, // ✓ ALSO HERE FOR CONVENIENCE
      },
      booking: {
        id: booking._id,
        rideId: booking.rideId,
        status: booking.status,
        acceptedAt: booking.acceptedAt,
        driverId: booking.driverId,
        passengerId: booking.passengerId,
        driverName: booking.driverName,
        driverEmail: booking.driverEmail,
        driverGender: booking.driverGender,
        passengerName: booking.passengerName,
        passengerEmail: booking.passengerEmail,
        seatsBooked: booking.seatsBooked,
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        date: booking.date,
        time: booking.time,
        carBrand: booking.carBrand,
        carModel: booking.carModel,
        carLicensePlate: booking.carLicensePlate,
        driverPhone: booking.driverPhone,
        passengerPhone: booking.passengerPhone,
      },
      // DRIVER INFO FOR PASSENGER
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
      // PASSENGER INFO FOR DRIVER
      passengerInfo: {
        name: booking.passengerName,
        email: booking.passengerEmail,
        passengerPhone: booking.passengerPhone,
        gender: booking.passengerDetails?.[0]?.gender || 'not specified',
        seatsBooked: booking.seatsBooked,
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
      },
      notification: {
        type: 'booking_accepted',
        seatsBooked: booking.seatsBooked,
        passengerName: booking.passengerName,
        passengerEmail: booking.passengerEmail,
        driverName: booking.driverName,
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        date: booking.date,
        time: booking.time,
        carBrand: booking.carBrand,
        carModel: booking.carModel,
      },
    });
  } catch (error: any) {
    console.error('Error accepting booking:', error);
    res.status(500).json({ error: 'Failed to accept booking: ' + error.message });
  }
};

/**
 * Reject a booking (driver rejects passenger)
 */
export const handleRejectBooking: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const { bookingId } = req.params;
    const { driverId } = req.body;

    if (!bookingId || !driverId) {
      res.status(400).json({ error: 'Booking ID and Driver ID are required' });
      return;
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.driverId !== driverId) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    // Only allow rejection of pending bookings
    if (booking.status !== 'pending') {
      res.status(400).json({ error: 'Only pending bookings can be rejected' });
      return;
    }

    booking.status = 'rejected';
    await booking.save();

    res.status(200).json({
      message: 'Booking rejected',
      booking,
    });
  } catch (error: any) {
    console.error('Error rejecting booking:', error);
    res.status(500).json({ error: 'Failed to reject booking' });
  }
};

/**
 * Get booking details for passenger
 */
export const handleGetBooking: RequestHandler = async (req, res) => {
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

    res.status(200).json(booking);
  } catch (error: any) {
    console.error('Error getting booking:', error);
    res.status(500).json({ error: 'Failed to get booking' });
  }
};

/**
 * Get all bookings for a passenger
 */
export const handleGetPassengerBookings: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const { passengerId } = req.query;

    if (!passengerId) {
      res.status(400).json({ error: 'Passenger ID is required' });
      return;
    }

    const bookings = await Booking.find({ passengerId }).sort({ createdAt: -1 });

    res.status(200).json({
      bookings,
      total: bookings.length,
    });
  } catch (error: any) {
    console.error('Error getting passenger bookings:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
};

/**
 * Cancel a booking (passenger cancels)
 */
export const handleCancelBooking: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const { bookingId } = req.params;
    const { passengerId } = req.body;

    if (!bookingId || !passengerId) {
      res.status(400).json({ error: 'Booking ID and Passenger ID are required' });
      return;
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.passengerId !== passengerId) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    if (booking.status === 'completed' || booking.status === 'cancelled') {
      res.status(400).json({ error: 'Cannot cancel this booking' });
      return;
    }

    const wasAccepted = booking.status === 'accepted';

    booking.status = 'cancelled';
    await booking.save();

    // If booking was accepted, restore available seats
    if (wasAccepted) {
      const ride = await Ride.findById(booking.rideId);
      if (ride) {
        ride.availableSeats += booking.seatsBooked;
        ride.bookedSeats = Math.max(0, (ride.bookedSeats || 0) - booking.seatsBooked);

        // Remove from accepted bookings array
        if (ride.acceptedBookings) {
          ride.acceptedBookings = ride.acceptedBookings.filter(id => id.toString() !== bookingId);
        }

        // Mark as active again if it was completed due to no seats
        if (ride.status === 'completed' && ride.availableSeats > 0) {
          ride.status = 'active';
        }

        await ride.save();
      }
    }

    res.status(200).json({
      message: 'Booking cancelled',
      booking,
    });
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
};

/**
 * Get driver's accepted bookings with passenger details (mutual data sharing)
 */
export const handleGetAcceptedBookings: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const { driverId } = req.params;

    if (!driverId) {
      res.status(400).json({ error: 'Driver ID is required' });
      return;
    }

    // Get all accepted bookings for this driver
    const bookings = await Booking.find({
      driverId,
      status: 'accepted',
    }).sort({ acceptedAt: -1 });

    const enrichedBookings = bookings.map(booking => ({
      _id: booking._id,
      rideId: booking.rideId,
      status: booking.status,
      acceptedAt: booking.acceptedAt,
      // Passenger details shared with driver
      passengerInfo: {
        name: booking.passengerName,
        email: booking.passengerEmail,
        seatsBooked: booking.seatsBooked,
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        date: booking.date,
        time: booking.time,
        gender: booking.passengerDetails?.[0]?.gender || 'not specified',
      },
      rideDetails: {
        carBrand: booking.carBrand,
        carModel: booking.carModel,
        pricePerSeat: booking.pricePerSeat,
        distanceTravelledInKm: booking.distanceTravelledInKm,
      },
    }));

    res.status(200).json({
      bookings: enrichedBookings,
      total: enrichedBookings.length,
    });
  } catch (error: any) {
    console.error('Error getting accepted bookings:', error);
    res.status(500).json({ error: 'Failed to get accepted bookings' });
  }
};

/**
 * Get passenger's bookings with driver details (mutual data sharing)
 */
export const handleGetBookingsByPassenger: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const { passengerId } = req.params;

    if (!passengerId) {
      res.status(400).json({ error: 'Passenger ID is required' });
      return;
    }

    // Get all bookings for this passenger
    const bookings = await Booking.find({
      passengerId,
    }).sort({ createdAt: -1 });

    const enrichedBookings = bookings.map(booking => ({
      _id: booking._id,
      rideId: booking.rideId,
      status: booking.status,
      createdAt: booking.createdAt,
      acceptedAt: booking.acceptedAt,
      // Driver details shared with passenger (only if accepted)
      driverInfo: booking.status === 'accepted' ? {
        name: booking.driverName,
        email: booking.driverEmail,
        gender: booking.driverGender || 'not specified',
        carBrand: booking.carBrand,
        carModel: booking.carModel,
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        date: booking.date,
        time: booking.time,
      } : null,
      // Booking details
      bookingDetails: {
        seatsBooked: booking.seatsBooked,
        pricePerSeat: booking.pricePerSeat,
        distanceTravelledInKm: booking.distanceTravelledInKm,
        totalFare: (booking.pricePerSeat || 0) * booking.seatsBooked,
      },
    }));

    res.status(200).json({
      bookings: enrichedBookings,
      total: enrichedBookings.length,
    });
  } catch (error: any) {
    console.error('Error getting passenger bookings:', error);
    res.status(500).json({ error: 'Failed to get passenger bookings' });
  }
};

/**
 * Check for newly accepted bookings with OTP (for polling fallback)
 */
export const handleCheckAcceptedBookings: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const { passengerId } = req.params;

    if (!passengerId) {
      res.status(400).json({ error: 'Passenger ID is required' });
      return;
    }

    // Get all accepted bookings for this passenger that have OTP
    const acceptedBookings = await Booking.find({
      passengerId,
      status: 'accepted',
    }).sort({ acceptedAt: -1 });

    // Enrich with OTP from ride
    const enrichedBookings = [];
    for (const booking of acceptedBookings) {
      const ride = await Ride.findById(booking.rideId);
      if (ride && ride.otp) {
        enrichedBookings.push({
          bookingId: booking._id,
          rideId: booking.rideId,
          otp: ride.otp,
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
          acceptedAt: booking.acceptedAt,
          redirectUrl: `/active-ride/${booking.rideId}`
        });
      }
    }

    res.status(200).json({
      acceptedBookings: enrichedBookings,
      total: enrichedBookings.length,
    });
  } catch (error: any) {
    console.error('Error checking accepted bookings:', error);
    res.status(500).json({ error: 'Failed to check accepted bookings' });
  }
};
