import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader, AlertCircle, MapPin, Calendar, DollarSign, Clock } from "lucide-react";

interface HistoryRide {
  _id: string;
  rideId: string;
  pickupLocation: string;
  dropoffLocation: string;
  date: string;
  time: string;
  distanceTravelledInKm: number;
  fareCollected: number;
  numberOfPassengers?: number;
  completedAt: Date;
  driverName?: string;
  driverEmail?: string;
  carBrand?: string;
  carModel?: string;
  status: string;
  seatsBooked?: number;
}

interface PaginationState {
  limit: number;
  skip: number;
  total?: number;
}

export default function HistoryPage() {
  const { userId } = useParams();
  const [rides, setRides] = useState<HistoryRide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userType, setUserType] = useState<"driver" | "passenger">("passenger");
  const [pagination, setPagination] = useState<PaginationState>({
    limit: 10,
    skip: 0,
  });

  // Fetch history when component mounts or params change
  useEffect(() => {
    if (userId) {
      fetchRideHistory();
    }
  }, [userType, pagination.skip, userId]);

  const fetchRideHistory = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        type: userType,
        limit: pagination.limit.toString(),
        skip: pagination.skip.toString(),
      });

      const response = await fetch(
        `/api/user/${userId}/ride-history?${params}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.statusText}`);
      }

      const data = await response.json();
      setRides(data.rides || []);
      setPagination((prev) => ({
        ...prev,
        total: data.totalCount || 0,
      }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      console.error("History fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserTypeChange = (type: "driver" | "passenger") => {
    setUserType(type);
    setPagination({ limit: 10, skip: 0 }); // Reset pagination
  };

  const handlePreviousPage = () => {
    setPagination((prev) => ({
      ...prev,
      skip: Math.max(0, prev.skip - prev.limit),
    }));
  };

  const handleNextPage = () => {
    setPagination((prev) => ({
      ...prev,
      skip: prev.skip + prev.limit,
    }));
  };

  const RideCard = ({ ride }: { ride: HistoryRide }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Route Info */}
        <div className="md:col-span-2 space-y-3">
          {/* Pickup Location */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
              <MapPin className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Pickup
              </p>
              <p className="font-semibold text-gray-900 truncate">
                {ride.pickupLocation}
              </p>
            </div>
          </div>

          {/* Route Arrow */}
          <div className="flex items-center gap-2 px-2">
            <div className="flex-1 h-px bg-gray-300"></div>
            <MapPin className="w-3 h-3 text-blue-500 rotate-90" />
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* Dropoff Location */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
              <MapPin className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Dropoff
              </p>
              <p className="font-semibold text-gray-900 truncate">
                {ride.dropoffLocation}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 space-y-3">
          {/* Date & Time */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-blue-600 font-semibold">Date</p>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(ride.completedAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Distance */}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-purple-600 font-semibold">Distance</p>
              <p className="text-sm font-semibold text-gray-900">
                {ride.distanceTravelledInKm.toFixed(1)} km
              </p>
            </div>
          </div>

          {/* Fare/Amount */}
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-green-600 font-semibold">Amount</p>
              <p className="text-sm font-bold text-green-700">
                ₹{Math.round(ride.fareCollected)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Driver/Passenger Info Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        {userType === "passenger" && ride.driverName && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Driver
              </p>
              <p className="font-semibold text-gray-900">{ride.driverName}</p>
              {ride.carBrand && ride.carModel && (
                <p className="text-sm text-gray-600">
                  {ride.carBrand} {ride.carModel}
                </p>
              )}
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
              Completed
            </span>
          </div>
        )}

        {userType === "driver" && typeof ride.numberOfPassengers === "number" && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">
                Passengers
              </p>
              <p className="font-semibold text-gray-900">
                {ride.numberOfPassengers}{" "}
                <span className="font-normal text-gray-600">
                  {ride.numberOfPassengers === 1 ? "passenger" : "passengers"}
                </span>
              </p>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
              Completed
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Ride History
          </h1>
          <p className="text-gray-600 mt-2">
            View all your completed rides and trips
          </p>
        </div>

        {/* User Type Toggle */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => handleUserTypeChange("passenger")}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              userType === "passenger"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            📍 As Passenger
          </button>
          <button
            onClick={() => handleUserTypeChange("driver")}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              userType === "driver"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            🚗 As Driver
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative w-12 h-12 mb-4">
              <Loader className="w-full h-full text-blue-500 animate-spin" />
            </div>
            <p className="text-gray-600 font-medium">Loading your ride history...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 flex gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="font-bold text-red-900">Error Loading History</p>
              <p className="text-red-700 mt-1">{error}</p>
              <button
                onClick={() => fetchRideHistory()}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Rides List */}
        {!isLoading && rides.length > 0 && (
          <>
            <div className="space-y-4 mb-8">
              {rides.map((ride) => (
                <RideCard key={ride._id} ride={ride} />
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  onClick={handlePreviousPage}
                  disabled={pagination.skip === 0}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>

                <span className="text-sm text-gray-600 font-medium">
                  Showing{" "}
                  <span className="font-bold text-gray-900">
                    {pagination.skip + 1}
                  </span>{" "}
                  —{" "}
                  <span className="font-bold text-gray-900">
                    {Math.min(
                      pagination.skip + pagination.limit,
                      pagination.total || 0
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-gray-900">
                    {pagination.total || 0}
                  </span>{" "}
                  rides
                </span>

                <button
                  onClick={handleNextPage}
                  disabled={
                    pagination.skip + pagination.limit >=
                    (pagination.total || 0)
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoading && rides.length === 0 && !error && (
          <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold text-lg">No rides yet</p>
            <p className="text-gray-500 mt-2">
              {userType === "driver"
                ? "Your completed rides will appear here once you finish driving"
                : "Your completed rides will appear here once you book and complete a trip"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
