import React from "react";
import { MapPin, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import MapComponent from "@/components/MapComponent";
import BookingModal, { PassengerGender } from "@/components/BookingModal";

export interface RideMatch {
  ride_id: string;
  match_score: number;
  cluster: number;
  probability: number;
  pickup_distance: number;
  drop_distance: number;
  time_difference: number;
  available_seats: number;
  driverName?: string;
  driverEmail?: string;
  driverGender?: string;
  carBrand?: string;
  carModel?: string;
  time?: string;
  passengerPreference?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  distanceTravelledInKm?: number;
  pricePerSeat?: number;
}

interface RideResultsProps {
  rides: RideMatch[];
  isLoading?: boolean;
  onRideSelect?: (ride: RideMatch) => void;
  passengerName?: string;
  passengerEmail?: string;
  passengerGender?: string;
  passengerId?: string;
}

export default function RideResults({
  rides,
  isLoading = false,
  onRideSelect,
  passengerName = "",
  passengerEmail = "",
  passengerGender = "not specified",
  passengerId = "",
}: RideResultsProps) {
  const [expandedRideMap, setExpandedRideMap] = React.useState<string | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = React.useState(false);
  const [selectedRide, setSelectedRide] = React.useState<RideMatch | null>(null);
  const [bookingInProgress, setBookingInProgress] = React.useState(false);
  const [bookingSuccess, setBookingSuccess] = React.useState<{ rideId: string; bookingId: string } | null>(null);

  const handleOpenBookingModal = (ride: RideMatch) => {
    if (!passengerId || !passengerName || !passengerEmail) {
      alert("Please log in first");
      return;
    }

    setSelectedRide(ride);
    setBookingModalOpen(true);
  };

  const handleBookRide = async (seatsToBook: number, passengerDetails: PassengerGender[]) => {
    if (!selectedRide) return;

    setBookingInProgress(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideId: selectedRide.ride_id,
          passengerId,
          passengerName,
          passengerEmail,
          seatsToBook,
          passengerDetails,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to book ride");
      }

      // Call the callback if provided
      onRideSelect?.(selectedRide);

      // Show success and store booking ID
      setBookingSuccess({
        rideId: selectedRide.ride_id,
        bookingId: data.booking.id,
      });

      // join socket room for this ride to be notified of acceptance
      import('@/lib/socket').then(({ getSocket }) => {
        const socket = getSocket();
        socket.emit('joinRide', { rideId: selectedRide.ride_id, userType: 'passenger' });
        socket.on('bookingAccepted', (payload: { rideId: string }) => {
          if (payload.rideId === selectedRide.ride_id) {
            window.location.href = `/track-passenger/${selectedRide.ride_id}`;
          }
        });
      });

      // Close modal after brief delay
      setTimeout(() => {
        setBookingModalOpen(false);
        setSelectedRide(null);
      }, 1500);
    } catch (error) {
      console.error("Error booking ride:", error);
      alert(error instanceof Error ? error.message : "Failed to book ride");
    } finally {
      setBookingInProgress(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <p className="text-gray-600 font-medium">Searching for available rides...</p>
        </div>
      </div>
    );
  }

  if (rides.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="p-4 bg-gray-100 rounded-lg w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rides Found</h3>
        <p className="text-gray-600 text-sm">
          We couldn't find any available rides matching your criteria. Try adjusting your search parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900">
          Available Rides ({rides.length})
        </h3>
        <div className="text-sm text-gray-600">
          Sorted by AI match score
        </div>
      </div>

      {rides.map((ride, index) => (
        <div
          key={ride.ride_id}
          className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border-l-4 border-primary"
        >
          {/* Header with Driver Info */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <h4 className="text-lg font-bold text-gray-900">{ride.driverName || "Anonymous Driver"}</h4>
              <p className="text-sm text-gray-600">{ride.driverEmail}</p>
              {ride.driverGender && (
                <p className="text-xs text-gray-500 capitalize">Gender: {ride.driverGender}</p>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-bold text-sm">
                #{index + 1}
              </div>
            </div>
          </div>

          {/* Car and Time Info */}
          {(ride.carBrand || ride.time) && (
            <div className="mb-4 pb-4 border-b border-gray-200 flex gap-4 flex-wrap">
              {ride.carBrand && (
                <div className="text-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Car</p>
                  <p className="font-medium text-gray-900">{ride.carBrand} {ride.carModel || ""}</p>
                </div>
              )}
              {ride.time && (
                <div className="text-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Departure</p>
                  <p className="font-medium text-gray-900">{ride.time}</p>
                </div>
              )}
            </div>
          )}

          {/* Ride Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Distance Section */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Ride Distance
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {ride.distanceTravelledInKm ? `${ride.distanceTravelledInKm.toFixed(1)} km` : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Pickup: {ride.pickup_distance.toFixed(1)} km away
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.16 5.314l4.897 6.162c.205.262.205.62 0 .882l-4.897 6.162a.75.75 0 1 1-1.186-.94L10.882 12 6.974 7.254a.75.75 0 0 1 1.186-.94z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Price Per Seat
                  </p>
                  <p className="text-lg font-bold text-green-600">
                    {ride.pricePerSeat ? `₹${Math.round(ride.pricePerSeat)}` : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Shared among passengers
                  </p>
                </div>
              </div>
            </div>

            {/* Availability Section */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg flex-shrink-0">
                  <Users className="w-4 h-4 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Availability
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {ride.available_seats} seat{ride.available_seats !== 1 ? 's' : ''} available
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-gray-100 flex gap-3 flex-wrap">
            <Button
              onClick={() => handleOpenBookingModal(ride)}
              disabled={ride.available_seats === 0}
              className="flex-1 min-w-[150px] bg-gradient-button text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {ride.available_seats === 0 ? "No Seats Available" : "Book This Ride"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 min-w-[150px] flex items-center justify-center gap-2"
              onClick={() => setExpandedRideMap(expandedRideMap === ride.ride_id ? null : ride.ride_id)}
            >
              {expandedRideMap === ride.ride_id ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide Route
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  View Route
                </>
              )}
            </Button>
          </div>

          {/* Route Map - Expandable */}
          {expandedRideMap === ride.ride_id && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <MapComponent
                  pickup={ride.pickupLocation || "Pickup Location"}
                  dropoff={ride.dropoffLocation || "Destination"}
                  height="h-80"
                />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Booking Modal */}
      {selectedRide && (
        <BookingModal
          isOpen={bookingModalOpen}
          onClose={() => {
            setBookingModalOpen(false);
            setSelectedRide(null);
          }}
          onSubmit={handleBookRide}
          availableSeats={selectedRide.available_seats}
          driverName={selectedRide.driverName || "Driver"}
          carBrand={selectedRide.carBrand || "Car"}
          carModel={selectedRide.carModel || ""}
          pickupLocation={selectedRide.pickupLocation || "Pickup"}
          dropoffLocation={selectedRide.dropoffLocation || "Destination"}
          isSubmitting={bookingInProgress}
          pricePerSeat={selectedRide.pricePerSeat}
          distanceTravelledInKm={selectedRide.distanceTravelledInKm}
        />
      )}

      {/* Booking Success Message */}
      {bookingSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-50 border-2 border-green-200 rounded-lg p-6 shadow-lg z-40 max-w-sm">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100">
                <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-900">Booking Confirmed!</h3>
              <p className="text-sm text-green-700 mt-1">
                Your booking request has been sent. The driver will review it shortly.
              </p>
              <button
                onClick={() => setBookingSuccess(null)}
                className="text-sm font-semibold text-green-600 hover:text-green-700 mt-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
