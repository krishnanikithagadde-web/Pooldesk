const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export interface RideSearchParams {
  pickup_distance: number;
  drop_distance: number;
  time_difference: number; // in minutes
  available_seats: number;
  gender_match: 0 | 1;
  user_id?: string;
}

export interface RideMatch {
  ride_id: string;
  match_score: number;
  cluster: number;
  probability: number;
  pickup_distance: number;
  drop_distance: number;
  time_difference: number;
  available_seats: number;
}

export interface RecommendationResponse {
  matches: RideMatch[];
  total_matches: number;
}

/**
 * Get ride recommendations from the ML service
 */
export async function getRecommendations(
  params: RideSearchParams,
  useAdvanced: boolean = false
): Promise<RecommendationResponse> {
  const endpoint = useAdvanced ? '/recommend/advanced' : '/recommend';
  
  try {
    const response = await fetch(`${ML_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`ML service error: ${response.statusText}`);
    }

    const data = await response.json() as RecommendationResponse;
    return data;
  } catch (error) {
    console.error('Error calling recommendation service:', error);
    throw error;
  }
}

/**
 * Check if ML service is healthy
 */
export async function checkMLServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('ML service health check failed:', error);
    return false;
  }
}

/**
 * Calculate parameters from user search input
 * This is a helper to convert user-facing inputs to ML model inputs
 */
export function calculateSearchParams(
  pickupLocation: string,
  dropoffLocation: string,
  departureTime: string,
  preferredSeats: number,
  userGender: string,
  riderGender?: string
): RideSearchParams {
  // TODO: Calculate actual distances from coordinates
  // For now, using mock values - in production, use Google Maps API or similar
  
  const pickupDistance = Math.random() * 50; // Mock: 0-50 km from start
  const dropDistance = Math.random() * 50;   // Mock: 0-50 km from end
  
  // Calculate time difference from current time
  const now = new Date();
  const departureDate = new Date(departureTime);
  const timeDifference = (departureDate.getTime() - now.getTime()) / (1000 * 60); // minutes
  
  // Gender match: 1 if match, 0 if not
  const genderMatch = userGender && riderGender && userGender === riderGender ? 1 : 0;
  
  return {
    pickup_distance: pickupDistance,
    drop_distance: dropDistance,
    time_difference: Math.max(timeDifference, 0), // Ensure non-negative
    available_seats: preferredSeats,
    gender_match: genderMatch as 0 | 1,
  };
}
