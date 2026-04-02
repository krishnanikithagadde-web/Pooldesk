import { RequestHandler } from 'express';
import { getRecommendations, checkMLServiceHealth } from '../services/recommendationService';
import { connectToDatabase } from '../db';
import Ride from '../models/Ride';
import User from '../models/User';
import mongoose from 'mongoose';

/**
 * Build ride match object with driver rating
 */
async function buildRideMatch(ride: any, mlScore: any, pickupDistance: number, dropDistance: number, timeDifference: number) {
  // Get driver's average rating
  let driverAverageRating = 0;
  try {
    if (ride.driverId && mongoose.isValidObjectId(ride.driverId)) {
      const driver = await User.findById(ride.driverId).select('averageRating');
      driverAverageRating = driver?.averageRating || 0;
    }
  } catch (e) {
    console.warn('Failed to fetch driver rating:', e);
  }

  const bestScore = mlScore.matches && mlScore.matches.length > 0 ? mlScore.matches[0].match_score : 0.5;
  const probability = mlScore.matches && mlScore.matches.length > 0 ? mlScore.matches[0].probability : 0.5;
  const cluster = mlScore.matches && mlScore.matches.length > 0 ? mlScore.matches[0].cluster : 0;

  return {
    ride_id: ride._id.toString(),
    driverId: ride.driverId.toString(),
    match_score: bestScore,
    cluster,
    probability,
    pickup_distance: pickupDistance,
    drop_distance: dropDistance,
    time_difference: Math.max(timeDifference, 0),
    available_seats: ride.availableSeats,
    driverName: ride.driverName,
    driverEmail: ride.driverEmail,
    driverGender: ride.driverGender,
    driverAverageRating,
    carBrand: ride.carBrand,
    carModel: ride.carModel,
    time: ride.time,
    passengerPreference: ride.passengerPreference,
    pickupLocation: ride.pickupLocation,
    dropoffLocation: ride.dropoffLocation,
    distanceTravelledInKm: ride.distanceTravelledInKm,
    pricePerSeat: ride.pricePerSeat,
  };
}

/**
 * Find available rides based on user search criteria
 * Searches actual MongoDB rides first, then uses ML for ranking
 */
export const handleFindRides: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const {
      pickupLocation,
      dropoffLocation,
      departureTime,
      requiredSeats,
      userGender,
      useAdvancedMatching = false,
    } = req.body;

    // Validate required fields
    if (!pickupLocation || !dropoffLocation || !departureTime || !requiredSeats) {
      res.status(400).json({
        error: 'Missing required fields: pickupLocation, dropoffLocation, departureTime, requiredSeats',
      });
      return;
    }

    // Parse search date
    const searchDate = new Date(departureTime).toISOString().split('T')[0];

    // Query MongoDB for active rides matching search criteria
    // Use regex for flexible location matching (case-insensitive, substring match)
    const matchingRides = await Ride.find({
      status: 'active',
      date: searchDate,
      availableSeats: { $gte: parseInt(requiredSeats) },
      pickupLocation: { $regex: pickupLocation, $options: 'i' },
      dropoffLocation: { $regex: dropoffLocation, $options: 'i' },
    }).limit(20); // Limit to 20 results

    console.log(`Found ${matchingRides.length} matching rides in MongoDB`);

    // Calculate time difference
    const now = new Date();
    const departureDate = new Date(departureTime);
    const timeDifference = (departureDate.getTime() - now.getTime()) / (1000 * 60); // minutes

    // Check ML service health
    const mlHealthy = await checkMLServiceHealth();

    let rideMatches: any[] = [];

    if (mlHealthy && matchingRides.length > 0) {
      try {
        console.log(`Using AI model to rank ${matchingRides.length} rides`);

        // Score each ride using the ML model
        const scoredRides = await Promise.all(
          matchingRides.map(async (ride) => {
            try {
              // Calculate approximate distances (in production, use real coordinates)
              const pickupDistance = Math.random() * 15; // 0-15 km from pickup
              const dropDistance = Math.random() * 15;   // 0-15 km from destination

              // Check gender match
              const genderMatch = userGender && ride.driverGender && userGender === ride.driverGender ? 1 : 0;

              // Get ML score for this ride
              const mlScore = await getRecommendations(
                {
                  pickup_distance: pickupDistance,
                  drop_distance: dropDistance,
                  time_difference: Math.max(timeDifference, 0),
                  available_seats: ride.availableSeats,
                  gender_match: genderMatch as 0 | 1,
                },
                false // Use basic recommendation, not advanced
              );

              return buildRideMatch(ride, mlScore, pickupDistance, dropDistance, Math.max(timeDifference, 0));
            } catch (error) {
              console.error(`Error scoring ride ${ride._id}:`, error);
              // Fallback score if ML fails for this ride
              const fallbackMlScore = { matches: [{ match_score: 0.5, probability: 0.5, cluster: 0 }] };
              return buildRideMatch(ride, fallbackMlScore, Math.random() * 15, Math.random() * 15, Math.max(timeDifference, 0));
            }
          })
        );

        rideMatches = scoredRides;
        console.log(`AI model scored ${rideMatches.length} rides`);
      } catch (mlError) {
        console.error('ML ranking failed, falling back to basic scoring:', mlError);

        // Fallback: score rides without ML
        rideMatches = await Promise.all(matchingRides.map(async (ride) => {
          const fallbackMlScore = { matches: [{ match_score: 0.75, probability: 0.75, cluster: 0 }] };
          return buildRideMatch(ride, fallbackMlScore, Math.random() * 15, Math.random() * 15, Math.max(timeDifference, 0));
        }));
      }
    } else {
      // ML service not available, use basic scoring
      console.log('ML service unavailable, using basic scoring');
      rideMatches = await Promise.all(matchingRides.map(async (ride) => {
        const fallbackMlScore = { matches: [{ match_score: 0.75, probability: 0.75, cluster: 0 }] };
        return buildRideMatch(ride, fallbackMlScore, Math.random() * 15, Math.random() * 15, Math.max(timeDifference, 0));
      }));
    }

    // Sort by match score (descending) - highest scores first
    rideMatches.sort((a, b) => b.match_score - a.match_score);

    res.status(200).json({
      matches: rideMatches,
      total_matches: rideMatches.length,
      source: 'database', // Indicate these are real rides from database
    });
  } catch (error: any) {
    console.error('Error finding rides:', error);
    res.status(500).json({
      error: 'Failed to find rides',
      details: error.message,
    });
  }
};

/**
 * Check ML service health
 */
export const handleMLHealth: RequestHandler = async (req, res) => {
  try {
    const isHealthy = await checkMLServiceHealth();
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      mlServiceAvailable: isHealthy,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      mlServiceAvailable: false,
    });
  }
};
