// utility for distance/time and fare calculation

export interface DistanceResult {
  distanceKm: number;
  timeMins: number;
}

/**
 * Calls Google Maps Directions API to compute driving distance/time
 * ONLY between passengerPickupCoords and passengerDestinationCoords.
 * This STRICTLY ignores any distance the driver travels to reach the pickup point.
 *
 * Business Rule: Passenger cost is calculated ONLY based on the distance
 * from their exact Pickup Location to their Destination - nothing else matters.
 *
 * Uses Directions API for accurate route-based calculations.
 */
export async function getDistanceAndTime(
  pickup: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<DistanceResult> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  if (!apiKey) {
    throw new Error('Google Maps API key not configured');
  }

  const origin = `${pickup.lat},${pickup.lng}`;
  const dest = `${destination.lat},${destination.lng}`;

  // Use Directions API for route-based calculations
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
    origin
  )}&destination=${encodeURIComponent(dest)}&key=${apiKey}&units=metric`;

  console.log('🔍 Directions API URL:', url.replace(apiKey, '[API_KEY]'));

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Directions API request failed');
  }

  const data = await res.json();
  console.log('📊 Directions API Response:', data);

  if (data.status !== 'OK' || !data.routes || !data.routes[0]) {
    throw new Error(`Route not found (${data.status})`);
  }

  const route = data.routes[0];
  if (!route.legs || !route.legs[0]) {
    throw new Error('No route legs found');
  }

  const leg = route.legs[0];

  // CRITICAL: Extract distance from legs[0].distance.value (in meters)
  // This is the exact value that matches what Google Maps displays
  const distanceMeters = leg.distance.value; // e.g., 7200 for 7.2 km
  const distanceKm = distanceMeters / 1000; // Convert meters to kilometers

  // Extract duration from legs[0].duration.value (in seconds)
  const durationSeconds = leg.duration.value; // e.g., 960 for 16 minutes
  const timeMins = durationSeconds / 60; // Convert seconds to minutes

  console.log(`📏 CORRECTED Distance extraction: ${distanceMeters}m = ${distanceKm.toFixed(2)}km`);
  console.log(`⏱️ Duration extraction: ${durationSeconds}s = ${timeMins.toFixed(0)}mins`);

  return { distanceKm, timeMins };
}

/**
 * FARE CALCULATION - Matches server-side pricing for consistency
 * Business Rule: Only the pickup-to-destination distance affects pricing
 *
 * Updated to match server-side calculation in server/utils/distance.ts
 * Example: 7.2 km should give ~₹130 fare (₹50 base + ₹8/km × 7.2km = ₹50 + ₹57.6 = ₹107.6)
 */
export function calculateFare(distanceInKm: number, timeInMins: number): number {
  // MATCH SERVER-SIDE CALCULATION from server/utils/distance.ts
  const BASE_FARE = 50;        // ₹50 base fare (matches server)
  const PER_KM_RATE = 8;       // ₹8 per kilometer (matches server)
  const MIN_PRICE = 50;        // Minimum ₹50 fare (matches server)

  // Calculate fare: base + (distance × rate)
  // Note: Server doesn't include time component, so we match that
  const distanceCost = distanceInKm * PER_KM_RATE;
  const totalFare = BASE_FARE + distanceCost;

  // Apply minimum price floor (matches server)
  const finalFare = Math.max(totalFare, MIN_PRICE);

  console.log(`💰 UPDATED Fare calculation (matches server): Base ₹${BASE_FARE} + Distance ₹${distanceCost.toFixed(2)} (${distanceInKm.toFixed(2)}km × ₹${PER_KM_RATE}) = ₹${finalFare.toFixed(2)} (min: ₹${MIN_PRICE})`);

  // Example for 7.2 km:
  // ₹50 + (7.2 × ₹8) = ₹50 + ₹57.6 = ₹107.6 → rounds to ₹108

  return Math.round(finalFare); // Round to nearest rupee
}

/**
 * Convenience function to calculate fare from coordinates
 * This is the main function to call when passenger selects pickup/destination
 */
export async function calculateFareFromCoords(
  pickupCoords: { lat: number; lng: number },
  destinationCoords: { lat: number; lng: number }
): Promise<{ distanceKm: number; timeMins: number; fare: number }> {
  const { distanceKm, timeMins } = await getDistanceAndTime(pickupCoords, destinationCoords);
  const fare = calculateFare(distanceKm, timeMins);

  return { distanceKm, timeMins, fare };
}
