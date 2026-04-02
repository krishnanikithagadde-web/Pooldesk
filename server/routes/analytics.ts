import { RequestHandler } from "express";
import RideHistory from "../models/RideHistory";
import Booking from "../models/Booking";
import User from "../models/User";

// Get ride history for a user (driver history from RideHistory, passenger history from Bookings)
export const getRideHistory: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = "driver", limit = "10", skip = "0" } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const limitNum = parseInt(limit as string) || 10;
    const skipNum = parseInt(skip as string) || 0;

    if (type === "passenger") {
      // Get ride history for passenger - from accepted bookings
      const acceptedBookings = await Booking.find({
        passengerId: userId,
        status: { $in: ['accepted', 'completed'] },
      })
        .sort({ acceptedAt: -1 })
        .limit(limitNum)
        .skip(skipNum);

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
    } else {
      // Get ride history for driver - from RideHistory model
      let query: any = { driverId: userId };

      const rideHistory = await RideHistory.find(query)
        .sort({ completedAt: -1 })
        .limit(limitNum)
        .skip(skipNum);

      const totalCount = await RideHistory.countDocuments(query);

      return res.json({
        rides: rideHistory,
        totalCount,
        limit: limitNum,
        skip: skipNum,
      });
    }
  } catch (error) {
    console.error('Error getting ride history:', error);
    res.status(500).json({ error: 'Failed to fetch ride history: ' + String(error) });
  }
};

// Get AI analytics for driver
export const getDriverAnalytics: RequestHandler = async (req, res) => {
  try {
    const { driverId } = req.params;

    const rideHistory = await RideHistory.find({ driverId }).sort({
      completedAt: -1,
    });

    if (rideHistory.length === 0) {
      return res.json({
        totalRides: 0,
        totalEarnings: 0,
        averageDistance: 0,
        averagePassengers: 0,
        peakHours: [],
        mostFrequentRoutes: [],
        averageRating: 0,
      });
    }

    // Calculate aggregated analytics
    const totalRides = rideHistory.length;
    const totalEarnings = rideHistory.reduce(
      (sum, ride) => sum + ride.fareCollected,
      0
    );
    const totalDistance = rideHistory.reduce(
      (sum, ride) => sum + ride.distanceTravelledInKm,
      0
    );
    const totalPassengers = rideHistory.reduce(
      (sum, ride) => sum + ride.numberOfPassengers,
      0
    );

    // Peak hours analysis
    const hourCount = new Map<string, number>();
    rideHistory.forEach((ride) => {
      const hour = ride.time.split(":")[0];
      hourCount.set(hour, (hourCount.get(hour) || 0) + 1);
    });

    const peakHours = Array.from(hourCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hour, count]) => ({ hour, rideCount: count }));

    // Most frequent routes
    const routeCount = new Map<string, number>();
    rideHistory.forEach((ride) => {
      const route = `${ride.pickupLocation} → ${ride.dropoffLocation}`;
      routeCount.set(route, (routeCount.get(route) || 0) + 1);
    });

    const mostFrequentRoutes = Array.from(routeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([route, count]) => ({ route, frequency: count }));

    // Average rating and feedback analytics
    let totalRatings = 0;
    let ratingCount = 0;
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const allRatings: any[] = [];

    rideHistory.forEach((ride) => {
      ride.rideRatings.forEach((rating) => {
        totalRatings += rating.rating;
        ratingCount++;
        ratingDistribution[rating.rating as keyof typeof ratingDistribution]++;
        allRatings.push({
          rating: rating.rating,
          review: rating.review,
          ride: {
            pickupLocation: ride.pickupLocation,
            dropoffLocation: ride.dropoffLocation,
            fareCollected: ride.fareCollected,
            completedAt: ride.completedAt,
          },
        });
      });
    });

    const averageRating = ratingCount > 0 ? totalRatings / ratingCount : 0;

    // Get top rated rides (5-star reviews)
    const topRatedRides = allRatings
      .filter((r) => r.rating === 5)
      .slice(0, 5)
      .map((r) => ({
        rating: r.rating,
        review: r.review || "Great ride!",
        route: `${r.ride.pickupLocation} → ${r.ride.dropoffLocation}`,
      }));

    // Get lowest rated rides (1-2 star reviews)
    const lowestRatedRides = allRatings
      .filter((r) => r.rating <= 2)
      .slice(0, 3)
      .map((r) => ({
        rating: r.rating,
        review: r.review || "Need improvement",
        route: `${r.ride.pickupLocation} → ${r.ride.dropoffLocation}`,
      }));

    // Sentiment analysis based on ratings
    const positiveFeedback = ratingDistribution[5] + ratingDistribution[4]; // 4-5 stars
    const neutralFeedback = ratingDistribution[3]; // 3 stars
    const negativeFeedback = ratingDistribution[2] + ratingDistribution[1]; // 1-2 stars

    // Consistency score (how consistent quality is) - lower std dev = higher consistency
    let varianceSum = 0;
    allRatings.forEach((r) => {
      varianceSum += Math.pow(r.rating - averageRating, 2);
    });
    const variance = ratingCount > 0 ? varianceSum / ratingCount : 0;
    const standardDeviation = Math.sqrt(variance);
    const consistencyScore = Math.max(0, 100 - standardDeviation * 20); // Scale to 0-100

    // Payment analytics
    const paymentsConfirmed = rideHistory.filter((r) => r.paymentConfirmed).length;
    const paymentConfirmationRate =
      totalRides > 0 ? Math.round((paymentsConfirmed / totalRides) * 100) : 0;

    res.json({
      totalRides,
      totalEarnings: Math.round(totalEarnings),
      averageDistance: (totalDistance / totalRides).toFixed(2),
      averagePassengers: (totalPassengers / totalRides).toFixed(2),
      averageEarningsPerRide: Math.round(totalEarnings / totalRides),
      peakHours,
      mostFrequentRoutes,
      averageRating: averageRating.toFixed(2),
      // Feedback analytics
      totalFeedback: ratingCount,
      ratingDistribution,
      feedbackSentiment: {
        positive: positiveFeedback,
        neutral: neutralFeedback,
        negative: negativeFeedback,
      },
      topRatedRides,
      lowestRatedRides,
      consistencyScore: Math.round(consistencyScore),
      // Payment analytics
      paymentsConfirmed,
      paymentConfirmationRate,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

// Get demand prediction based on analytics
export const getDemandPrediction: RequestHandler = async (req, res) => {
  try {
    const { company } = req.query;

    const rideHistory = await RideHistory.find(
      company ? { company } : {}
    ).sort({ completedAt: -1 });

    // Analyze time patterns
    const dayOfWeekCount = new Map<number, number>();
    const timeSlotCount = new Map<string, number>();

    rideHistory.forEach((ride) => {
      const date = new Date(ride.completedAt);
      const dayOfWeek = date.getDay();
      const hour = parseInt(ride.time.split(":")[0]);

      // Group hours into slots
      let slot;
      if (hour >= 6 && hour < 9) slot = "morning-peak";
      else if (hour >= 9 && hour < 12) slot = "morning-off-peak";
      else if (hour >= 12 && hour < 14) slot = "noon";
      else if (hour >= 14 && hour < 17) slot = "afternoon-off-peak";
      else if (hour >= 17 && hour < 20) slot = "evening-peak";
      else slot = "night";

      dayOfWeekCount.set(dayOfWeek, (dayOfWeekCount.get(dayOfWeek) || 0) + 1);
      timeSlotCount.set(slot, (timeSlotCount.get(slot) || 0) + 1);
    });

    const highDemandDays = Array.from(dayOfWeekCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([day, count]) => ({
        day: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day],
        demand: count,
      }));

    const highDemandTimes = Array.from(timeSlotCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([slot, count]) => ({
        timeSlot: slot,
        demand: count,
      }));

    res.json({
      highDemandDays,
      highDemandTimes,
      totalAnalyzedRides: rideHistory.length,
      prediction: "Plan rides during identified high-demand periods for better occupancy",
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};
