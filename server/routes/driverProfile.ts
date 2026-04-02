import { RequestHandler } from "express";
import User from "../models/User";
import RideHistory from "../models/RideHistory";
import mongoose from "mongoose";

// Get driver profile with ratings and reviews
export const getDriverProfile: RequestHandler = async (req, res) => {
  try {
    const { driverId } = req.params;

    if (!driverId || !mongoose.isValidObjectId(driverId)) {
      return res.status(400).json({ error: "Invalid driver ID" });
    }

    // Get driver info
    const driver = await User.findById(driverId);
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    // Get driver's ride history and reviews
    const rideHistory = await RideHistory.find({ driverId })
      .sort({ completedAt: -1 })
      .limit(50);

    // Aggregate review data
    const allReviews: any[] = [];
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    rideHistory.forEach((ride) => {
      ride.rideRatings.forEach((rating) => {
        allReviews.push({
          rating: rating.rating,
          review: rating.review,
          route: `${ride.pickupLocation} → ${ride.dropoffLocation}`,
          date: ride.completedAt,
        });
        ratingDistribution[rating.rating as keyof typeof ratingDistribution]++;
      });
    });

    // Get recent reviews (last 10)
    const recentReviews = allReviews.slice(0, 10);

    // Get top reviews (5 stars)
    const topReviews = allReviews.filter((r) => r.rating === 5).slice(0, 5);

    // Calculate sentiment
    const positiveCount = allReviews.filter((r) => r.rating >= 4).length;
    const neutralCount = allReviews.filter((r) => r.rating === 3).length;
    const negativeCount = allReviews.filter((r) => r.rating <= 2).length;

    // Member info
    const memberSince = driver.createdAt
      ? new Date(driver.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        })
      : "Unknown";

    // Total completed rides
    const totalRidesCompleted = rideHistory.length;

    // Average rating per ride (if we can calculate it from ride history)
    const totalPassengers = rideHistory.reduce(
      (sum, ride) => sum + ride.numberOfPassengers,
      0
    );

    res.json({
      driver: {
        id: driver._id.toString(),
        fullName: driver.fullName,
        email: driver.email,
        gender: driver.gender,
        company: driver.company,
        isVerified: driver.isVerified,
        verifiedAt: driver.verifiedAt,
        isFlagged: driver.isFlagged,
        flagReason: driver.flagReason,
      },
      rating: {
        average: parseFloat(driver.averageRating.toFixed(2)),
        total: driver.totalRatings,
        sum: driver.sumRatings,
        distribution: ratingDistribution,
      },
      reviews: {
        total: allReviews.length,
        recent: recentReviews,
        topRated: topReviews,
        sentiment: {
          positive: positiveCount,
          neutral: neutralCount,
          negative: negativeCount,
        },
      },
      stats: {
        totalRidesCompleted,
        totalPassengers,
        memberSince,
      },
    });
  } catch (error) {
    console.error("Error getting driver profile:", error);
    res.status(500).json({ error: "Failed to fetch driver profile: " + String(error) });
  }
};
