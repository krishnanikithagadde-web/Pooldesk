import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Calendar, Clock, Users, DollarSign, ChevronRight, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface RideOffer {
  _id: string;
  driverId: string;
  driverName: string;
  pickupLocation: string;
  dropoffLocation: string;
  date: string;
  time: string;
  totalSeats: number;
  availableSeats: number;
  bookedSeats: number;
  carBrand: string;
  carModel: string;
  pricePerSeat: number;
  status: "active" | "completed" | "cancelled";
  createdAt: string;
  distanceTravelledInKm: number;
}

export default function RideOffersHistory() {
  const [offers, setOffers] = useState<RideOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "cancelled">("all");

  const userId = localStorage.getItem("userId") || "";

  useEffect(() => {
    fetchRideOffers();
  }, [userId]);

  const fetchRideOffers = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!userId) {
        throw new Error("User ID not found. Please log in again.");
      }

      console.log(`Fetching ride offers for driver: ${userId}`);
      const response = await fetch(`/api/rides/my/rides?driverId=${userId}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.error || "Failed to fetch ride offers");
      }

      const data = await response.json();
      console.log("Ride offers data:", data);
      setOffers(data.rides || []);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOffers = filter === "all" ? offers : offers.filter((offer) => offer.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-300";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getProgressPercentage = (offer: RideOffer) => {
    return ((offer.bookedSeats / offer.totalSeats) * 100).toFixed(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-300">Loading your ride offers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Your Ride Offers</h1>
          <p className="text-gray-400">Track and manage all your posted carpooling offers</p>
        </div>

        {error && (
          <Card className="mb-6 border-red-500 bg-red-50">
            <CardContent className="pt-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {["all", "active", "completed", "cancelled"].map((status) => (
            <Button
              key={status}
              onClick={() => setFilter(status as any)}
              variant={filter === status ? "default" : "outline"}
              className={`capitalize ${
                filter === status
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-slate-700 text-gray-300 border-slate-600 hover:bg-slate-600"
              }`}
            >
              {status}
            </Button>
          ))}
        </div>

        {/* Stats Overview */}
        {filteredOffers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <p className="text-gray-400 text-sm mb-1">Total Offers</p>
                <p className="text-3xl font-bold text-white">{filteredOffers.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <p className="text-gray-400 text-sm mb-1">Total Seats Posted</p>
                <p className="text-3xl font-bold text-white">
                  {filteredOffers.reduce((sum, offer) => sum + offer.totalSeats, 0)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <p className="text-gray-400 text-sm mb-1">Total Bookings</p>
                <p className="text-3xl font-bold text-purple-400">
                  {filteredOffers.reduce((sum, offer) => sum + offer.bookedSeats, 0)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Offers List */}
        {filteredOffers.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-lg font-semibold">No ride offers found</p>
                <p className="text-gray-500 text-sm mt-1">
                  Create a new ride offer to get started
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOffers.map((offer) => (
              <Card
                key={offer._id}
                className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors cursor-pointer group"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold text-white">
                          {offer.pickupLocation} → {offer.dropoffLocation}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${getStatusColor(
                            offer.status
                          )}`}
                        >
                          {offer.status}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        {offer.carBrand} {offer.carModel}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div className="flex gap-2">
                      <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Date</p>
                        <p className="text-white font-semibold">
                          {format(new Date(offer.date + "T" + offer.time), "MMM dd")}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Time</p>
                        <p className="text-white font-semibold">{offer.time}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Distance</p>
                        <p className="text-white font-semibold">{offer.distanceTravelledInKm.toFixed(1)} km</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Users className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Seats</p>
                        <p className="text-white font-semibold">
                          {offer.bookedSeats}/{offer.totalSeats}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Price/Seat</p>
                        <p className="text-white font-semibold">₹{offer.pricePerSeat}</p>
                      </div>
                    </div>
                  </div>

                  {/* Booking Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs text-gray-500 font-semibold">SEAT OCCUPANCY</p>
                      <p className="text-sm text-gray-400">{getProgressPercentage(offer)}%</p>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all"
                        style={{ width: `${getProgressPercentage(offer)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Available/Booked Info */}
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-400">
                        {offer.availableSeats} available
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-400">
                        {offer.bookedSeats} booked
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
