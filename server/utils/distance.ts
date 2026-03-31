/**
 * Distance and Pricing Calculation Utilities
 * For carpooling platform pricing based on distance travelled
 * Uses Google Maps Distance Matrix API for accurate distance calculation
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
console.log("GOOGLE API KEY:", GOOGLE_MAPS_API_KEY);

/**
 * Common Hyderabad landmarks and their precise coordinates
 * Used to ensure accurate location detection for well-known places
 * Source: Google Maps coordinates for Hyderabad, India
 */
const HYDERABAD_LANDMARKS: Record<string, { lat: number; lng: number }> = {
  // Tech Parks & Business Areas
  'raheja mindspace': { lat: 17.4475, lng: 78.3689 },
  'mindspace': { lat: 17.4475, lng: 78.3689 },
  'mindspace hyderabad': { lat: 17.4475, lng: 78.3689 },
  'raheja': { lat: 17.4475, lng: 78.3689 },
  'hitech city': { lat: 17.4522, lng: 78.3558 },
  'hitec': { lat: 17.4522, lng: 78.3558 },
  'hitec city': { lat: 17.4522, lng: 78.3558 },
  'cyberabad': { lat: 17.4472, lng: 78.3728 },
  'cyber towers': { lat: 17.4472, lng: 78.3728 },

  // Residential Areas
  'kukatpally': { lat: 17.3935, lng: 78.4345 },
  'kphb': { lat: 17.3935, lng: 78.4345 },
  'kphb colony': { lat: 17.3935, lng: 78.4345 },
  'gachibowli': { lat: 17.4403, lng: 78.4389 },
  'manikonda': { lat: 17.3917, lng: 78.4189 },
  'madhapur': { lat: 17.4472, lng: 78.3728 },
  'jubilee hills': { lat: 17.3850, lng: 78.4083 },
  'jubili hills': { lat: 17.3850, lng: 78.4083 },
  'banjara hills': { lat: 17.3750, lng: 78.4133 },
  'kondapur': { lat: 17.4494, lng: 78.3586 },
  'miyapur': { lat: 17.4948, lng: 78.3917 },

  // Other Important Areas
  'begumpet': { lat: 17.3850, lng: 78.4667 },
  'filmnagar': { lat: 17.3617, lng: 78.4789 },
  'ameerpet': { lat: 17.3850, lng: 78.4500 },
  'secunderabad': { lat: 17.3795, lng: 78.5017 },
  'charminar': { lat: 17.3603, lng: 78.4734 },
};

/**
 * Geocode a location name to get its coordinates
 * First checks known Hyderabad landmarks, then uses Google Maps Geocoding API
 * This ensures accurate location detection for well-known places
 *
 * @param location - Location name or address
 * @returns Object with latitude and longitude, or null if geocoding fails
 */
async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const originalLocation = location;
    const normalizedLocation = location.toLowerCase().trim().replace(/\s+/g, ' '); // Normalize spaces

    console.log(`\n   🔍 GEOCODING LOCATION`);
    console.log(`      Original input: "${originalLocation}"`);
    console.log(`      Normalized: "${normalizedLocation}"`);

    // Step 1: Exact match check
    console.log(`\n      STEP 1: Exact match check`);
    if (HYDERABAD_LANDMARKS[normalizedLocation]) {
      const coords = HYDERABAD_LANDMARKS[normalizedLocation];
      console.log(`      ✅ EXACT MATCH FOUND!`);
      console.log(`         Key: "${normalizedLocation}"`);
      console.log(`         Coords: (${coords.lat}, ${coords.lng})`);
      return coords;
    }
    console.log(`      ❌ No exact match for "${normalizedLocation}"`);

    // Step 2: Partial/substring match
    console.log(`\n      STEP 2: Checking partial matches...`);
    for (const [landmark, coords] of Object.entries(HYDERABAD_LANDMARKS)) {
      // Check if strings contain each other (case-insensitive)
      if (landmark.includes(normalizedLocation) || normalizedLocation.includes(landmark)) {
        console.log(`      ✅ SUBSTRING MATCH FOUND!`);
        console.log(`         Search: "${normalizedLocation}"`);
        console.log(`         Landmark: "${landmark}"`);
        console.log(`         Coords: (${coords.lat}, ${coords.lng})`);
        return coords;
      }
    }
    console.log(`      ❌ No substring matches`);

    // Step 3: Word-level match
    console.log(`\n      STEP 3: Checking word-level matches...`);
    const searchWords = normalizedLocation.split(/\s+/).filter(w => w.length > 0);
    for (const [landmark, coords] of Object.entries(HYDERABAD_LANDMARKS)) {
      const landmarkWords = landmark.split(/\s+/).filter(w => w.length > 0);

      // Check if any significant word matches
      for (const sword of searchWords) {
        for (const lword of landmarkWords) {
          if (sword === lword || lword.includes(sword) || sword.includes(lword)) {
            console.log(`      ✅ WORD MATCH FOUND!`);
            console.log(`         Search word: "${sword}" matches landmark word: "${lword}"`);
            console.log(`         Landmark: "${landmark}"`);
            console.log(`         Coords: (${coords.lat}, ${coords.lng})`);
            return coords;
          }
        }
      }
    }
    console.log(`      ❌ No word matches`);

    console.log(`\n      STEP 4: Google Maps Geocoding API fallback...`);

    // If not a known landmark, use Google Maps Geocoding API with location bias
    const encodedLocation = encodeURIComponent(location);

    // Add location bias to Hyderabad city center to ensure results are in the right area
    // Hyderabad center: 17.3850, 78.4867
    // Also restrict to Telangana state and India country
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedLocation}%20Hyderabad&components=country:IN|administrative_area:Telangana&key=${GOOGLE_MAPS_API_KEY}`;

    console.log(`\n      Calling Google Maps Geocoding API for: "${location}"`);
    const response = await fetch(url);
    const data = await response.json();

    console.log(`      API Response Status: ${data.status}`);

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Check all results, not just the first one
      for (const result of data.results) {
        const { lat, lng } = result.geometry.location;
        const formattedAddress = result.formatted_address;

        // Validate that the result is within Hyderabad bounds
        // Hyderabad city bounds approximately: 17.2 to 17.7 lat, 78.2 to 78.8 lng
        const isInHyderabad = lat >= 17.2 && lat <= 17.7 && lng >= 78.2 && lng <= 78.8;

        if (isInHyderabad) {
          console.log(`      ✅ Found location in Hyderabad!`);
          console.log(`         Address: ${formattedAddress}`);
          console.log(`         Coords: (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          return { lat, lng };
        }
      }

      // If no result is in Hyderabad, log warning
      const firstResult = data.results[0];
      console.warn(`\n      ⚠️  All results outside Hyderabad bounds!`);
      console.warn(`         First result: (${firstResult.geometry.location.lat.toFixed(4)}, ${firstResult.geometry.location.lng.toFixed(4)})`);
      console.warn(`         Expected: Within (17.2-17.7, 78.2-78.8)`);
      return null;
    } else {
      console.warn(`\n      ❌ Geocoding failed for "${location}": ${data.status}`);
      return null;
    }
  } catch (error) {
    console.error(`Error geocoding "${location}":`, error);
    return null;
  }
}

/**
 * Calculate actual distance between two locations using Google Maps API
 * First geocodes location names to coordinates for accuracy
 * Then calculates distance using Distance Matrix API
 * Falls back to estimates if API call fails
 *
 * @param pickup - Pickup location address/name
 * @param dropoff - Dropoff location address/name
 * @returns Distance in kilometers
 */
export async function calculateRealDistance(pickup: string, dropoff: string): Promise<number> {
  try {
    // If same location, distance is 0
    if (pickup.toLowerCase().trim() === dropoff.toLowerCase().trim()) {
      return 0;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📍 DISTANCE CALCULATION`);
    console.log(`   From: "${pickup}"`);
    console.log(`   To: "${dropoff}"`);
    console.log(`${'='.repeat(60)}`);

    // First, geocode both locations to get coordinates
    const pickupCoords = await geocodeLocation(pickup);
    const dropoffCoords = await geocodeLocation(dropoff);

    if (!pickupCoords) {
      console.error(`❌ Failed to geocode pickup: "${pickup}"`);
      return estimateDistance(pickup, dropoff);
    }

    if (!dropoffCoords) {
      console.error(`❌ Failed to geocode dropoff: "${dropoff}"`);
      return estimateDistance(pickup, dropoff);
    }

    // Use coordinates for Distance Matrix API
    const pickupLatLng = `${pickupCoords.lat},${pickupCoords.lng}`;
    const dropoffLatLng = `${dropoffCoords.lat},${dropoffCoords.lng}`;

    console.log(`📌 Coordinates:`);
    console.log(`   Pickup: (${pickupCoords.lat.toFixed(4)}, ${pickupCoords.lng.toFixed(4)})`);
    console.log(`   Dropoff: (${dropoffCoords.lat.toFixed(4)}, ${dropoffCoords.lng.toFixed(4)})`);

    const distanceUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${pickupLatLng}&destinations=${dropoffLatLng}&key=${GOOGLE_MAPS_API_KEY}&units=metric`;

    // Call Google Maps Distance Matrix API
    const response = await fetch(distanceUrl);
    const data = await response.json();

    console.log(`\n📡 Distance Matrix API Response:`);
    console.log(`   Status: ${data.status}`);

    // Check if API call was successful
    if (data.status !== 'OK' || !data.rows || data.rows.length === 0) {
      console.warn(`❌ Distance Matrix API error: ${data.status}. Using fallback.`);
      return estimateDistance(pickup, dropoff);
    }

    // Extract distance from response
    const element = data.rows[0].elements[0];
    console.log(`   Element Status: ${element.status}`);

    if (element.status === 'OK' && element.distance) {
      // Convert meters to kilometers
      const distanceInKm = element.distance.value / 1000;
      const durationText = element.duration?.text || 'Unknown';
      const distanceText = element.distance?.text || 'Unknown';

      console.log(`\n✅ RESULT:`);
      console.log(`   Distance: ${distanceInKm.toFixed(2)} km (${distanceText})`);
      console.log(`   Duration: ${durationText}`);
      console.log(`${'='.repeat(60)}\n`);

      return distanceInKm;
    } else {
      console.warn(`❌ Distance element error: ${element.status}. Using fallback.`);
      return estimateDistance(pickup, dropoff);
    }
  } catch (error) {
    console.error('❌ Error calculating distance:', error);
    // Fallback to estimate if API call fails
    return estimateDistance(pickup, dropoff);
  }
}

/**
 * Estimate distance between two locations as fallback
 * Uses a simple heuristic based on common Indian city distances
 * 
 * @param pickup - Pickup location
 * @param dropoff - Dropoff location
 * @returns Estimated distance in kilometers
 */
export function estimateDistance(pickup: string, dropoff: string): number {
  // Normalize location strings
  const from = pickup.toLowerCase().trim();
  const to = dropoff.toLowerCase().trim();

  // If same location, distance is 0
  if (from === to) {
    return 0;
  }

  // Common city distance matrix (simplified)
  // These are approximate distances between major Indian cities
  const distances: Record<string, Record<string, number>> = {
    // Chennai distances (km)
    'chennai': {
      'bangalore': 350,
      'coimbatore': 180,
      'madurai': 160,
      'pondicherry': 150,
      'hyderabad': 600,
      'kochi': 350,
    },
    // Bangalore distances
    'bangalore': {
      'chennai': 350,
      'hyderabad': 560,
      'coimbatore': 240,
      'mysore': 145,
      'pune': 800,
    },
    // Delhi distances
    'delhi': {
      'gurgaon': 30,
      'noida': 25,
      'faridabad': 45,
      'agra': 240,
      'jaipur': 280,
    },
    // Mumbai distances
    'mumbai': {
      'pune': 150,
      'nashik': 210,
      'surat': 270,
      'ahmedabad': 530,
    },
  };

  // Check if both cities are in the distance matrix
  if (distances[from] && distances[from][to]) {
    return distances[from][to];
  }

  // If exact match not found, try to find partial matches
  for (const city in distances) {
    if (from.includes(city) || city.includes(from)) {
      for (const destCity in distances[city]) {
        if (to.includes(destCity) || destCity.includes(to)) {
          return distances[city][destCity];
        }
      }
    }
  }

  // Default fallback: estimate between 50-150 km for unknown locations
  if (from !== to) {
    return Math.max(50, Math.random() * 100 + 50);
  }

  return 0;
}

/**
 * Pricing Model for Carpooling
 * Base fare + per-kilometer rate, suitable for Indian carpooling market
 */
export interface PricingConfig {
  baseFare: number;        // Base fare per booking (₹)
  pricePerKm: number;      // Price per kilometer (₹)
  minPrice: number;        // Minimum fare (₹)
}

// Default pricing configuration for Indian market
export const DEFAULT_PRICING: PricingConfig = {
  baseFare: 50,            // ₹50 base fare
  pricePerKm: 8,           // ₹8 per kilometer
  minPrice: 50,            // Minimum ₹50
};

/**
 * Calculate ride price based on distance
 * Price per person = (baseFare + distance * pricePerKm) / numberOfSeatsBooked
 * This incentivizes sharing by reducing per-person cost
 * 
 * @param distanceInKm - Distance to be travelled in kilometers
 * @param numberOfSeatsBooked - Number of seats being booked
 * @param config - Pricing configuration (uses default if not provided)
 * @returns Price per seat in rupees
 */
export function calculatePricePerSeat(
  distanceInKm: number,
  numberOfSeatsBooked: number = 1,
  config: PricingConfig = DEFAULT_PRICING
): number {
  if (numberOfSeatsBooked < 1) {
    numberOfSeatsBooked = 1;
  }

  // Calculate total fare
  const totalFare = config.baseFare + distanceInKm * config.pricePerKm;

  // Divide by number of seats to get per-person cost
  const pricePerSeat = totalFare / numberOfSeatsBooked;

  // Apply minimum price floor
  return Math.max(pricePerSeat, config.minPrice);
}

/**
 * Calculate total price for a booking
 * 
 * @param distanceInKm - Distance to be travelled in kilometers
 * @param numberOfSeatsBooked - Number of seats being booked
 * @param config - Pricing configuration
 * @returns Total price for the booking
 */
export function calculateTotalPrice(
  distanceInKm: number,
  numberOfSeatsBooked: number = 1,
  config: PricingConfig = DEFAULT_PRICING
): number {
  return calculatePricePerSeat(distanceInKm, numberOfSeatsBooked, config) * numberOfSeatsBooked;
}

/**
 * Format price in Indian Rupees
 */
export function formatPrice(price: number): string {
  return `₹${Math.round(price)}`;
}
