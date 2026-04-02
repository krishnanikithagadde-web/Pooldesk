import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface RideHistoryItem {
  _id: string;
  rideId: string;
  date: string;
  time: string;
  pickupLocation: string;
  dropoffLocation: string;
  distanceTravelledInKm: number;
  fareCollected: number;
  numberOfPassengers: number;
  passengerEmails: string[];
  completedAt: string;
  paymentConfirmed?: boolean;
  paymentConfirmedAt?: string;
  rideRatings: Array<{
    passengerId: string;
    rating: number;
    review?: string;
  }>;
}

export default function RideHistoryDashboard({ userId }: { userId: string }) {
  const [rides, setRides] = useState<RideHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRideHistory();
  }, [userId]);

  const fetchRideHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!userId) {
        throw new Error("User ID not found. Please log in again.");
      }

      console.log(`Fetching ride history for user: ${userId}`);
      const response = await fetch(`/api/user/${userId}/ride-history?type=driver&limit=20`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.error || "Failed to fetch ride history");
      }

      const data = await response.json();
      console.log("Ride history data:", data);
      setRides(data.rides || []);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (rides.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">No ride history available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-4">Ride History</h2>
        <p className="text-gray-600 mb-6">Total rides completed: {rides.length}</p>
      </div>

      <div className="grid gap-4">
        {rides.map((ride) => (
          <Card key={ride._id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">
                {ride.pickupLocation} → {ride.dropoffLocation}
              </CardTitle>
              <p className="text-sm text-gray-500">
                {new Date(ride.completedAt).toLocaleDateString()} at {ride.time}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Distance</p>
                  <p className="font-semibold">{ride.distanceTravelledInKm.toFixed(2)} km</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Fare</p>
                  <p className="font-semibold">₹{ride.fareCollected}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Passengers</p>
                  <p className="font-semibold">{ride.numberOfPassengers}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Payment</p>
                  <div className="space-y-1">
                    {ride.paymentConfirmed ? (
                      <Badge className="bg-green-100 text-green-800">✓ Confirmed</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-600">Pending</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Rating</p>
                  <div className="space-y-1">
                    {ride.rideRatings.length > 0 ? (
                      <div className="flex gap-2">
                        {ride.rideRatings.map((r, idx) => (
                          <Badge key={idx} variant="outline">
                            ⭐ {r.rating}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No ratings yet</p>
                    )}
                  </div>
                </div>
              </div>

              {ride.rideRatings.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-semibold mb-2">Feedback:</p>
                  <div className="space-y-2">
                    {ride.rideRatings.map((rating, idx) => (
                      <div key={idx} className="text-sm text-gray-600">
                        <p>⭐ {rating.rating} - {rating.review}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
