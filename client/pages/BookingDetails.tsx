import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Calendar, Clock, Car, User, CheckCircle, Clock as ClockIcon } from "lucide-react";
import MapComponent from "@/components/MapComponent";

interface PassengerDetail {
  seatNumber: number;
  gender: 'male' | 'female';
}

interface BookingDetail {
  _id: string;
  rideId: string;
  driverId: string;
  driverName: string;
  driverEmail: string;
  passengerId: string;
  passengerName: string;
  passengerEmail: string;
  seatsBooked: number;
  passengerDetails: PassengerDetail[];
  pickupLocation: string;
  dropoffLocation: string;
  date: string;
  time: string;
  carBrand: string;
  carModel: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  pricePerSeat?: number;
  distanceTravelledInKm?: number;
  createdAt: string;
  updatedAt: string;
}

export default function BookingDetails() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userName = localStorage.getItem("userName") || "";
  const userEmail = localStorage.getItem("userEmail") || "";
  const shiftStart = localStorage.getItem("shiftStart") || "09:00";
  const shiftEnd = localStorage.getItem("shiftEnd") || "18:00";

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        setError("Booking ID not found");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/bookings/${bookingId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load booking details");
        }

        setBooking(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load booking details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800 border-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-300";
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-300";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="w-5 h-5" />;
      case "pending":
        return <ClockIcon className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const maleCount = booking?.passengerDetails.filter(p => p.gender === 'male').length || 0;
  const femaleCount = booking?.passengerDetails.filter(p => p.gender === 'female').length || 0;

  if (isLoading) {
    return (
      <DashboardLayout
        activeTab="find"
        onTabChange={() => {}}
        userName={userName}
        userEmail={userEmail}
        shiftStart={shiftStart}
        shiftEnd={shiftEnd}
      >
        <div className="flex items-center justify-center gap-3 p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-gray-600 font-medium">Loading booking details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !booking) {
    return (
      <DashboardLayout
        activeTab="find"
        onTabChange={() => {}}
        userName={userName}
        userEmail={userEmail}
        shiftStart={shiftStart}
        shiftEnd={shiftEnd}
      >
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
          <p className="text-red-900 font-semibold mb-4">{error || "Booking not found"}</p>
          <Button onClick={() => navigate("/dashboard")} className="bg-gradient-button text-white">
            Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      activeTab="find"
      onTabChange={() => {}}
      userName={userName}
      userEmail={userEmail}
      shiftStart={shiftStart}
      shiftEnd={shiftEnd}
    >
      <div className="space-y-6">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-primary to-secondary rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-lg">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Booking Details</h1>
                <p className="text-white/80 text-sm mt-1">View your ride booking information</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-lg border-2 font-semibold flex items-center gap-2 ${getStatusColor(booking.status)}`}>
              {getStatusIcon(booking.status)}
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Booking Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Driver Information Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-primary">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="w-5 h-5 text-primary" />
                </div>
                Driver Information
              </h3>

              <div className="space-y-4">
                <div className="flex items-start justify-between pb-4 border-b border-gray-100">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Driver Name</p>
                    <p className="text-gray-900 font-semibold text-lg">{booking.driverName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Email</p>
                    <p className="text-gray-900 font-medium text-sm break-all">{booking.driverEmail}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Car Model</p>
                    <p className="text-gray-900 font-semibold mt-2">
                      {booking.carBrand} {booking.carModel}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Seats Booked</p>
                    <p className="text-gray-900 font-semibold text-2xl mt-2">{booking.seatsBooked}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ride Details Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-secondary">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <MapPin className="w-5 h-5 text-secondary" />
                </div>
                Ride Details
              </h3>

              <div className="space-y-4">
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 p-4 rounded-lg border-l-4 border-primary">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Pickup Location</p>
                  <p className="text-gray-900 font-semibold text-lg">{booking.pickupLocation}</p>
                </div>

                <div className="flex items-center justify-center py-2">
                  <div className="flex-1 h-1 bg-gray-200"></div>
                  <div className="px-4 text-gray-500 font-semibold">→</div>
                  <div className="flex-1 h-1 bg-gray-200"></div>
                </div>

                <div className="bg-gradient-to-r from-secondary/5 to-primary/5 p-4 rounded-lg border-l-4 border-secondary">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Destination</p>
                  <p className="text-gray-900 font-semibold text-lg">{booking.dropoffLocation}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0 mt-1">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Date</p>
                      <p className="text-gray-900 font-semibold">{booking.date}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-secondary/10 rounded-lg flex-shrink-0 mt-1">
                      <Clock className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Time</p>
                      <p className="text-gray-900 font-semibold">{booking.time}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                Route Map
              </h3>
              <MapComponent
                pickup={booking.pickupLocation}
                dropoff={booking.dropoffLocation}
                height="h-96"
              />
            </div>
          </div>

          {/* Right Column - Passenger Details */}
          <div className="space-y-6">
            {/* Passenger Composition */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-primary">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                Passengers
              </h3>

              <div className="space-y-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-200">
                  <p className="text-xs font-semibold text-blue-600 uppercase">Male</p>
                  <p className="text-4xl font-bold text-blue-900 mt-2">{maleCount}</p>
                </div>

                <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-lg border-2 border-pink-200">
                  <p className="text-xs font-semibold text-pink-600 uppercase">Female</p>
                  <p className="text-4xl font-bold text-pink-900 mt-2">{femaleCount}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 uppercase">Total Passengers</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">{booking.seatsBooked}</p>
                </div>
              </div>
            </div>

            {/* Pricing Information */}
            {(booking.pricePerSeat || booking.distanceTravelledInKm) && (
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.16 5.314l4.897 6.162c.205.262.205.62 0 .882l-4.897 6.162a.75.75 0 1 1-1.186-.94L10.882 12 6.974 7.254a.75.75 0 0 1 1.186-.94z"/>
                    </svg>
                  </div>
                  Pricing Details
                </h3>

                <div className="space-y-4">
                  {booking.distanceTravelledInKm && (
                    <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 uppercase">Distance</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{booking.distanceTravelledInKm.toFixed(1)} km</p>
                    </div>
                  )}

                  {booking.pricePerSeat && (
                    <>
                      <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                        <p className="text-xs font-semibold text-green-600 uppercase">Price per Seat</p>
                        <p className="text-2xl font-bold text-green-900 mt-2">₹{Math.round(booking.pricePerSeat)}</p>
                      </div>

                      <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-lg border-2 border-green-300">
                        <p className="text-xs font-semibold text-green-700 uppercase">Total Cost</p>
                        <p className="text-3xl font-bold text-green-900 mt-2">₹{Math.round(booking.pricePerSeat * booking.seatsBooked)}</p>
                        <p className="text-xs text-green-700 mt-2">
                          {booking.seatsBooked} seat{booking.seatsBooked > 1 ? 's' : ''} × ₹{Math.round(booking.pricePerSeat)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Seat Details */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-secondary">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Seat Assignment</h3>

              <div className="space-y-3">
                {booking.passengerDetails.map((passenger) => (
                  <div
                    key={passenger.seatNumber}
                    className={`p-4 rounded-lg border-2 ${
                      passenger.gender === 'male'
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-pink-50 border-pink-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">Seat {passenger.seatNumber}</span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-bold ${
                          passenger.gender === 'male'
                            ? 'bg-blue-200 text-blue-900'
                            : 'bg-pink-200 text-pink-900'
                        }`}
                      >
                        {passenger.gender.charAt(0).toUpperCase() + passenger.gender.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Card */}
            <div className={`rounded-xl shadow-lg p-6 border-l-4 ${
              booking.status === 'accepted'
                ? 'bg-green-50 border-green-500'
                : 'bg-yellow-50 border-yellow-500'
            }`}>
              <h3 className="text-lg font-bold mb-4">Booking Status</h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Status:</span>
                </p>
                <p className={`text-2xl font-bold ${
                  booking.status === 'accepted'
                    ? 'text-green-900'
                    : booking.status === 'pending'
                    ? 'text-yellow-900'
                    : 'text-gray-900'
                }`}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </p>
                {booking.status === 'pending' && (
                  <p className="text-sm text-yellow-700 mt-3 font-medium">
                    Waiting for driver to accept your booking...
                  </p>
                )}
                {booking.status === 'accepted' && (
                  <p className="text-sm text-green-700 mt-3 font-medium">
                    Driver has accepted your booking! Get ready for the ride.
                  </p>
                )}
              </div>
            </div>

            {/* Action Button */}
            <Button
              onClick={() => navigate("/dashboard")}
              className="w-full bg-gradient-button text-white font-semibold hover:shadow-lg transition-all"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
