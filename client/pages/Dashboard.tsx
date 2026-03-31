import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Users, Search, Plus, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/DashboardLayout";
import RideResults from "@/components/RideResults";
import MapComponent from "@/components/MapComponent";
import { useToast } from "@/hooks/use-toast";

interface RideMatch {
  ride_id: string;
  match_score: number;
  cluster: number;
  probability: number;
  pickup_distance: number;
  drop_distance: number;
  time_difference: number;
  available_seats: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"find" | "offer" | "bookings">("find");
  const { toast } = useToast();
  const [isOfferingRide, setIsOfferingRide] = useState(false);

  // Get user details from localStorage
  const userName = localStorage.getItem("userName") || "";
  const userEmail = localStorage.getItem("userEmail") || "";
  const userGender = localStorage.getItem("userGender") || "not specified";
  const shiftStart = localStorage.getItem("shiftStart") || "09:00";
  const shiftEnd = localStorage.getItem("shiftEnd") || "18:00";

  // Ride Results State
  const [rideMatches, setRideMatches] = useState<RideMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Get minimum date (today)
  const [minDate, setMinDate] = useState("");
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setMinDate(today);
  }, []);

  // Find a Ride State
  const [findFrom, setFindFrom] = useState("");
  const [findTo, setFindTo] = useState("");
  const [findDate, setFindDate] = useState("");
  const [findTime, setFindTime] = useState("");
  const [findPreference, setFindPreference] = useState("any");

  // Offer a Ride State
  const [offerFrom, setOfferFrom] = useState("");
  const [offerTo, setOfferTo] = useState("");
  const [offerCarBrand, setOfferCarBrand] = useState("");
  const [offerCarModel, setOfferCarModel] = useState("");
  const [offerDate, setOfferDate] = useState("");
  const [offerTime, setOfferTime] = useState("");
  const [offerSeats, setOfferSeats] = useState("3");
  const [offerPreference, setOfferPreference] = useState("any");

  const handleFindRides = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!findFrom || !findTo || !findDate || !findTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch("/api/rides/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupLocation: findFrom,
          dropoffLocation: findTo,
          departureTime: new Date(`${findDate}T${findTime}`).toISOString(),
          requiredSeats: 1,
          userGender,
          useAdvancedMatching: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to find rides");
      }

      setRideMatches(data.matches || []);
      setShowResults(true);

      if (data.matches && data.matches.length > 0) {
        toast({
          title: "Success!",
          description: `Found ${data.matches.length} matching rides`,
        });
      } else {
        toast({
          title: "No Rides Found",
          description: "Try adjusting your search criteria",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error finding rides:", error);
      toast({
        title: "Search Error",
        description: error instanceof Error ? error.message : "Failed to search for rides",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleOfferRide = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!offerFrom || !offerTo || !offerCarBrand || !offerCarModel || !offerDate || !offerTime || !offerSeats) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsOfferingRide(true);
    try {
      const response = await fetch("/api/rides/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: "driver_" + Date.now(),
          driverName: userName,
          driverEmail: userEmail,
          driverGender: userGender,
          pickupLocation: offerFrom,
          dropoffLocation: offerTo,
          date: offerDate,
          time: offerTime,
          carBrand: offerCarBrand,
          carModel: offerCarModel,
          availableSeats: parseInt(offerSeats),
          passengerPreference: offerPreference,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to offer ride");
      }

      toast({
        title: "Success!",
        description: "Your ride has been posted successfully",
      });

      // Navigate to ride details page
      navigate(`/ride/${data.ride.id}`);
    } catch (error) {
      console.error("Error offering ride:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to offer ride",
        variant: "destructive",
      });
    } finally {
      setIsOfferingRide(false);
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      userName={userName}
      userEmail={userEmail}
      shiftStart={shiftStart}
      shiftEnd={shiftEnd}
    >
      {activeTab === "find" ? (
        <div className="space-y-6">
          {/* Header Card with Gradient */}
          <div className="bg-gradient-to-r from-primary to-secondary rounded-xl shadow-lg p-8 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Search className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-bold">Find a Ride</h2>
            </div>
            <p className="text-white/80 text-sm mt-3">
              Search for matching rides based on your shift timing
            </p>
          </div>

          {/* Form and Map Container */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form Card */}
            <form onSubmit={handleFindRides} className="bg-white rounded-xl shadow-lg p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* From */}
              <div className="md:col-span-1">
                <Label htmlFor="from" className="text-gray-700 font-semibold text-sm flex items-center gap-2 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  Pickup Location
                </Label>
                <Input
                  id="from"
                  type="text"
                  placeholder="Enter pickup location"
                  value={findFrom}
                  onChange={(e) => setFindFrom(e.target.value)}
                  className="bg-gray-50 border-2 border-gray-200 focus:border-primary focus:bg-white transition"
                />
              </div>

              {/* To */}
              <div className="md:col-span-1">
                <Label htmlFor="to" className="text-gray-700 font-semibold text-sm flex items-center gap-2 mb-3">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <MapPin className="w-4 h-4 text-secondary" />
                  </div>
                  Destination
                </Label>
                <Input
                  id="to"
                  type="text"
                  placeholder="Enter destination"
                  value={findTo}
                  onChange={(e) => setFindTo(e.target.value)}
                  className="bg-gray-50 border-2 border-gray-200 focus:border-secondary focus:bg-white transition"
                />
              </div>

              {/* Date */}
              <div className="md:col-span-1">
                <Label htmlFor="finddate" className="text-gray-700 font-semibold text-sm flex items-center gap-2 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  Date
                </Label>
                <Input
                  id="finddate"
                  type="date"
                  value={findDate}
                  onChange={(e) => setFindDate(e.target.value)}
                  min={minDate}
                  className="bg-gray-50 border-2 border-gray-200 focus:border-primary focus:bg-white transition"
                />
              </div>

              {/* Time */}
              <div className="md:col-span-1">
                <Label htmlFor="findtime" className="text-gray-700 font-semibold text-sm flex items-center gap-2 mb-3">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <Clock className="w-4 h-4 text-secondary" />
                  </div>
                  Preferred Time
                </Label>
                <Input
                  id="findtime"
                  type="time"
                  value={findTime}
                  onChange={(e) => setFindTime(e.target.value)}
                  className="bg-gray-50 border-2 border-gray-200 focus:border-secondary focus:bg-white transition"
                />
              </div>

            </div>

            {/* Driver Preference */}
            <div>
              <Label htmlFor="preference" className="text-gray-700 font-semibold text-sm flex items-center gap-2 mb-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                Driver Preference
              </Label>
              <select
                id="preference"
                value={findPreference}
                onChange={(e) => setFindPreference(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 font-medium focus:border-primary focus:bg-white transition"
              >
                <option value="any">Any</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            {/* Search Button */}
            <Button
              type="submit"
              disabled={isSearching}
              className="w-full bg-gradient-button text-white font-bold py-3 hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 rounded-lg text-base disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search Available Rides
                </>
              )}
            </Button>
            </form>

            {/* Map Card */}
            <div className="hidden lg:block">
              <MapComponent pickup={findFrom} dropoff={findTo} height="h-full min-h-96" />
            </div>
          </div>

          {/* Map on Mobile */}
          <div className="lg:hidden">
            <MapComponent pickup={findFrom} dropoff={findTo} height="h-96" />
          </div>

          {/* Ride Results */}
          {showResults && (
            <div className="mt-8">
              <RideResults
                rides={rideMatches}
                isLoading={isSearching}
                passengerName={userName}
                passengerEmail={userEmail}
                passengerGender={userGender}
                passengerId={"passenger_" + userEmail.replace(/[@.]/g, "_")}
                onRideSelect={(ride) => {
                  toast({
                    title: "Booking Sent!",
                    description: `Booking request sent to ${ride.driverName}`,
                  });
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Card with Gradient */}
          <div className="bg-gradient-to-r from-secondary to-primary rounded-xl shadow-lg p-8 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Plus className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-bold">Offer a Ride</h2>
            </div>
            <p className="text-white/80 text-sm mt-3">
              Share your ride and earn rewards with your community
            </p>
          </div>

          {/* Form and Map Container */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form Card */}
            <form onSubmit={handleOfferRide} className="bg-white rounded-xl shadow-lg p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pickup Location */}
              <div>
                <Label htmlFor="pickuplocation" className="text-gray-700 font-semibold text-sm flex items-center gap-2 mb-3">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <MapPin className="w-4 h-4 text-secondary" />
                  </div>
                  Pickup Location
                </Label>
                <Input
                  id="pickuplocation"
                  type="text"
                  placeholder="Where from"
                  value={offerFrom}
                  onChange={(e) => setOfferFrom(e.target.value)}
                  className="bg-gray-50 border-2 border-gray-200 focus:border-secondary focus:bg-white transition"
                />
              </div>

              {/* Destination */}
              <div>
                <Label htmlFor="destination" className="text-gray-700 font-semibold text-sm flex items-center gap-2 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  Destination
                </Label>
                <Input
                  id="destination"
                  type="text"
                  placeholder="Where to"
                  value={offerTo}
                  onChange={(e) => setOfferTo(e.target.value)}
                  className="bg-gray-50 border-2 border-gray-200 focus:border-primary focus:bg-white transition"
                />
              </div>

              {/* Date */}
              <div>
                <Label htmlFor="offerdate" className="text-gray-700 font-semibold text-sm flex items-center gap-2 mb-3">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <Calendar className="w-4 h-4 text-secondary" />
                  </div>
                  Date
                </Label>
                <Input
                  id="offerdate"
                  type="date"
                  value={offerDate}
                  onChange={(e) => setOfferDate(e.target.value)}
                  min={minDate}
                  className="bg-gray-50 border-2 border-gray-200 focus:border-secondary focus:bg-white transition"
                />
              </div>

              {/* Time */}
              <div>
                <Label htmlFor="offertime" className="text-gray-700 font-semibold text-sm flex items-center gap-2 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  Departure Time
                </Label>
                <Input
                  id="offertime"
                  type="time"
                  value={offerTime}
                  onChange={(e) => setOfferTime(e.target.value)}
                  className="bg-gray-50 border-2 border-gray-200 focus:border-primary focus:bg-white transition"
                />
              </div>

              {/* Car Brand */}
              <div>
                <Label htmlFor="carbrand" className="text-gray-700 font-semibold text-sm flex items-center gap-2 mb-3">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <Plus className="w-4 h-4 text-secondary" />
                  </div>
                  Car Brand
                </Label>
                <Input
                  id="carbrand"
                  type="text"
                  placeholder="e.g., Toyota, Honda"
                  value={offerCarBrand}
                  onChange={(e) => setOfferCarBrand(e.target.value)}
                  className="bg-gray-50 border-2 border-gray-200 focus:border-secondary focus:bg-white transition"
                />
              </div>

              {/* Car Model */}
              <div>
                <Label htmlFor="carmodel" className="text-gray-700 font-semibold text-sm flex items-center gap-2 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Plus className="w-4 h-4 text-primary" />
                  </div>
                  Car Model
                </Label>
                <Input
                  id="carmodel"
                  type="text"
                  placeholder="e.g., Camry, Accord"
                  value={offerCarModel}
                  onChange={(e) => setOfferCarModel(e.target.value)}
                  className="bg-gray-50 border-2 border-gray-200 focus:border-primary focus:bg-white transition"
                />
              </div>

              {/* Number of Seats */}
              <div>
                <Label htmlFor="seats" className="text-gray-700 font-semibold text-sm flex items-center gap-2 mb-3">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <Users className="w-4 h-4 text-secondary" />
                  </div>
                  Number of Seats
                </Label>
                <Input
                  id="seats"
                  type="number"
                  value={offerSeats}
                  onChange={(e) => setOfferSeats(e.target.value)}
                  className="bg-gray-50 border-2 border-gray-200 focus:border-secondary focus:bg-white transition"
                />
              </div>

              {/* Passenger Preference */}
              <div>
                <Label htmlFor="passengerpreference" className="text-gray-700 font-semibold text-sm flex items-center gap-2 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  Passenger Preference
                </Label>
                <select
                  id="passengerpreference"
                  value={offerPreference}
                  onChange={(e) => setOfferPreference(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 font-medium focus:border-primary focus:bg-white transition"
                >
                  <option value="any">Any</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            {/* Offer Button */}
            <Button
              type="submit"
              disabled={isOfferingRide}
              className="w-full bg-gradient-button text-white font-bold py-3 hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 rounded-lg text-base disabled:opacity-50"
            >
              {isOfferingRide ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Posting...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Post Your Ride
                </>
              )}
            </Button>
            </form>

            {/* Map Card */}
            <div className="hidden lg:block">
              <MapComponent pickup={offerFrom} dropoff={offerTo} height="h-full min-h-96" />
            </div>
          </div>

          {/* Map on Mobile */}
          <div className="lg:hidden">
            <MapComponent pickup={offerFrom} dropoff={offerTo} height="h-96" />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
