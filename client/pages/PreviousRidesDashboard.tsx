import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Calendar, Users, DollarSign, Star, Filter, Download } from "lucide-react";
import { format } from "date-fns";

interface CompletedRide {
  _id: string;
  rideId: string;
  pickupLocation: string;
  dropoffLocation: string;
  date: string;
  time: string;
  distanceTravelledInKm: number;
  fareCollected: number;
  numberOfPassengers: number;
  paymentConfirmed?: boolean;
  paymentConfirmedAt?: string;
  completedAt: string;
  rideRatings: Array<{
    passengerId: string;
    rating: number;
    review?: string;
  }>;
}

export default function PreviousRidesDashboard() {
  const [completedRides, setCompletedRides] = useState<CompletedRide[]>([]);
  const [filteredRides, setFilteredRides] = useState<CompletedRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<"all" | "month" | "week">("all");
  const [sortBy, setSortBy] = useState<"date" | "earnings" | "rating">("date");

  const userId = localStorage.getItem("userId") || "";

  useEffect(() => {
    fetchRideHistory();
  }, [userId]);

  useEffect(() => {
    filterAndSortRides();
  }, [completedRides, searchTerm, filterPeriod, sortBy]);

  const fetchRideHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!userId) {
        throw new Error("User ID not found. Please log in again.");
      }

      // Determine if user is driver or passenger based on context
      const userType = localStorage.getItem("userType") || "driver";

      console.log(`Fetching ${userType} ride history for user: ${userId}`);

      const response = await fetch(`/api/user/${userId}/ride-history?type=${userType}&limit=50`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.error || "Failed to fetch ride history");
      }

      const data = await response.json();
      console.log("Ride history data:", data);
      setCompletedRides(data.rides || []);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err instanceof Error ? err.message : "An error occurred while fetching ride history");
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortRides = () => {
    let filtered = [...completedRides];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (ride) =>
          ride.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ride.dropoffLocation.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply date filter
    if (filterPeriod !== "all") {
      const now = new Date();
      const cutoffDate = new Date();

      if (filterPeriod === "week") {
        cutoffDate.setDate(now.getDate() - 7);
      } else if (filterPeriod === "month") {
        cutoffDate.setMonth(now.getMonth() - 1);
      }

      filtered = filtered.filter((ride) => new Date(ride.completedAt) >= cutoffDate);
    }

    // Apply sorting
    if (sortBy === "earnings") {
      filtered.sort((a, b) => b.fareCollected - a.fareCollected);
    } else if (sortBy === "rating") {
      const getAvgRating = (ride: CompletedRide) =>
        ride.rideRatings.length > 0
          ? ride.rideRatings.reduce((sum, r) => sum + r.rating, 0) / ride.rideRatings.length
          : 0;
      filtered.sort((a, b) => getAvgRating(b) - getAvgRating(a));
    } else {
      filtered.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    }

    setFilteredRides(filtered);
  };

  const getAverageRating = (ride: CompletedRide) => {
    if (ride.rideRatings.length === 0) return 0;
    return (ride.rideRatings.reduce((sum, r) => sum + r.rating, 0) / ride.rideRatings.length).toFixed(1);
  };

  const getTotalStats = () => {
    if (filteredRides.length === 0) return { totalEarnings: 0, totalDistance: 0, totalPassengers: 0 };
    return {
      totalEarnings: filteredRides.reduce((sum, ride) => sum + ride.fareCollected, 0),
      totalDistance: filteredRides.reduce((sum, ride) => sum + ride.distanceTravelledInKm, 0),
      totalPassengers: filteredRides.reduce((sum, ride) => sum + ride.numberOfPassengers, 0),
    };
  };

  const stats = getTotalStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-300">Loading your ride history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Previous Rides</h1>
          <p className="text-gray-400">Track your completed rides and carpooling history</p>
        </div>

        {error && (
          <Card className="mb-6 border-red-500 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-gray-400 text-sm mb-1">Total Rides</div>
              <div className="text-3xl font-bold text-white">{filteredRides.length}</div>
              <div className="text-xs text-gray-500 mt-2">Showing {filteredRides.length} rides</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-gray-400 text-sm mb-1 flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Total Earnings
              </div>
              <div className="text-3xl font-bold text-green-400">₹{stats.totalEarnings}</div>
              <div className="text-xs text-gray-500 mt-2">From selected rides</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-gray-400 text-sm mb-1 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Total Distance
              </div>
              <div className="text-3xl font-bold text-blue-400">{stats.totalDistance.toFixed(1)} km</div>
              <div className="text-xs text-gray-500 mt-2">Miles covered</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-gray-400 text-sm mb-1 flex items-center gap-1">
                <Users className="h-4 w-4" />
                Total Passengers
              </div>
              <div className="text-3xl font-bold text-purple-400">{stats.totalPassengers}</div>
              <div className="text-xs text-gray-500 mt-2">People carpooled</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Search by Location</label>
              <Input
                placeholder="Search pickup or dropoff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-2">Time Period</label>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value as "all" | "month" | "week")}
                className="w-full bg-slate-700 border border-slate-600 text-white p-2 rounded"
              >
                <option value="all">All Time</option>
                <option value="month">Last Month</option>
                <option value="week">Last Week</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "earnings" | "rating")}
                className="w-full bg-slate-700 border border-slate-600 text-white p-2 rounded"
              >
                <option value="date">Newest First</option>
                <option value="earnings">Highest Earnings</option>
                <option value="rating">Highest Rating</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Rides List */}
        {filteredRides.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-lg">No rides found</p>
                <p className="text-gray-500 text-sm">Complete some rides to see them here</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRides.map((ride) => {
              const avgRating = getAverageRating(ride);
              return (
                <Card
                  key={ride._id}
                  className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors"
                >
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      {/* Route */}
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-500 mb-1">ROUTE</p>
                        <p className="text-white font-semibold">
                          {ride.pickupLocation.split(",")[0]}
                        </p>
                        <p className="text-gray-400 text-sm flex items-center gap-1 my-2">
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          <span>{ride.distanceTravelledInKm.toFixed(1)} km</span>
                        </p>
                        <p className="text-white font-semibold">
                          {ride.dropoffLocation.split(",")[0]}
                        </p>
                      </div>

                      {/* Date & Time */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">DATE & TIME</p>
                        <p className="text-white font-semibold flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-400" />
                          {format(new Date(ride.completedAt), "MMM dd, yyyy")}
                        </p>
                        <p className="text-gray-400 text-sm mt-1">{ride.time}</p>
                      </div>

                      {/* Earnings & Passengers */}
                      <div className="flex gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">FARE</p>
                          <p className="text-white font-semibold text-lg">₹{ride.fareCollected}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">PASSENGERS</p>
                          <p className="text-white font-semibold flex items-center gap-1">
                            <Users className="h-4 w-4 text-purple-400" />
                            {ride.numberOfPassengers}
                          </p>
                        </div>
                      </div>

                      {/* Payment Status */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">PAYMENT</p>
                        {ride.paymentConfirmed ? (
                          <Badge className="bg-green-500 text-white">✓ Confirmed</Badge>
                        ) : (
                          <Badge className="bg-orange-500 text-white">⏳ Pending</Badge>
                        )}
                      </div>

                      {/* Rating */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">RATING</p>
                        {ride.rideRatings.length > 0 ? (
                          <div>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <p className="text-white font-semibold">{avgRating}</p>
                            </div>
                            <p className="text-gray-400 text-xs mt-1">
                              {ride.rideRatings.length} rating{ride.rideRatings.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        ) : (
                          <p className="text-gray-400 text-sm">Not rated yet</p>
                        )}
                      </div>
                    </div>

                    {/* Passenger Feedback */}
                    {ride.rideRatings.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <p className="text-xs text-gray-500 mb-3 font-semibold">PASSENGER FEEDBACK</p>
                        <div className="space-y-2">
                          {ride.rideRatings.map((rating, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <div className="flex gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < rating.rating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-600"
                                    }`}
                                  />
                                ))}
                              </div>
                              <p className="text-gray-300 text-sm flex-1">
                                {rating.review || "No comment provided"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
