import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface AnalyticsData {
  totalRides: number;
  totalEarnings: number;
  averageDistance: string;
  averagePassengers: string;
  averageEarningsPerRide: number;
  peakHours: Array<{ hour: string; rideCount: number }>;
  mostFrequentRoutes: Array<{ route: string; frequency: number }>;
  averageRating: string;
}

export default function AnalyticsDashboard({ userId }: { userId: string }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [userId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/driver/${userId}/analytics`);

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
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

  if (!analytics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Analytics Dashboard</h2>
        <p className="text-gray-600 mb-6">AI-powered insights from your ride history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Rides</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.totalRides}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₹{analytics.totalEarnings}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Earnings/Ride</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₹{analytics.averageEarningsPerRide}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">⭐ {analytics.averageRating}</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Average Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Average Distance per Ride</p>
                <p className="text-xl font-semibold">{analytics.averageDistance} km</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Passengers</p>
                <p className="text-xl font-semibold">{analytics.averagePassengers} per ride</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Peak Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.peakHours.length > 0 ? (
                analytics.peakHours.map((hour, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-sm">{hour.hour}:00 - {parseInt(hour.hour) + 1}:00</span>
                    <span className="font-semibold">{hour.rideCount} rides</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most Frequent Routes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Most Frequent Routes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.mostFrequentRoutes.length > 0 ? (
              analytics.mostFrequentRoutes.map((route, idx) => (
                <div key={idx} className="flex justify-between items-center pb-3 border-b last:border-b-0">
                  <span className="text-sm font-medium">{route.route}</span>
                  <span className="text-sm font-semibold text-blue-600">{route.frequency} times</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No routing data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">🤖 AI Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            • Your most profitable time slot appears to be during <strong>peak hours</strong> identified in the data above
          </p>
          <p>
            • Focus on your <strong>top routes</strong> for consistent business
          </p>
          <p>
            • Your average earnings per ride: <strong>₹{analytics.averageEarningsPerRide}</strong> based on {analytics.totalRides} completed rides
          </p>
          <p>
            • Maintain your excellent rating of <strong>⭐ {analytics.averageRating}</strong> to attract more passengers
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
