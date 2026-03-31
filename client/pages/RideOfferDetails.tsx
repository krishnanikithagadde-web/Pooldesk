import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Car, Users, Clock, Calendar, Phone, Mail, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import DriverAcceptedBookings from "@/components/DriverAcceptedBookings";

interface Ride {
  _id: string;
  driverId: string;
  driverName: string;
  driverEmail: string;
  driverGender: string;
  pickupLocation: string;
  dropoffLocation: string;
  date: string;
  time: string;
  carBrand: string;
  carModel: string;
  availableSeats: number;
  passengerPreference: string;
  status: string;
  acceptedBy?: string;
  acceptedByName?: string;
  acceptedByEmail?: string;
  acceptedByGender?: string;
}

interface AcceptanceNotification {
  passengerName: string;
  passengerEmail: string;
  passengerGender: string;
  showNotification: boolean;
  rideId: string;
}

export default function RideOfferDetails() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [ride, setRide] = useState<Ride | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<AcceptanceNotification | null>(null);

  // Get user details from localStorage
  const userName = localStorage.getItem("userName") || "";
  const userEmail = localStorage.getItem("userEmail") || "";
  const userGender = localStorage.getItem("userGender") || "not specified";
  const shiftStart = localStorage.getItem("shiftStart") || "09:00";
  const shiftEnd = localStorage.getItem("shiftEnd") || "18:00";

  // Fetch ride details
  useEffect(() => {
    const fetchRide = async () => {
      try {
        const response = await fetch(`/api/rides/${rideId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch ride details");
        }
        const data = await response.json();
        setRide(data);
      } catch (error) {
        console.error("Error fetching ride:", error);
        toast({
          title: "Error",
          description: "Failed to load ride details",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (rideId) {
      fetchRide();
    }
  }, [rideId, toast]);

  // Poll for incoming booking requests (in real app, use WebSocket)
  useEffect(() => {
    if (!rideId || !ride || ride.status === 'completed') return;

    const fetchBookings = async () => {
      try {
        const response = await fetch(`/api/rides/${rideId}/bookings`);
        if (!response.ok) return;

        const data = await response.json();

        // Show notification for first pending booking
        if (data.bookings && data.bookings.length > 0) {
          const firstBooking = data.bookings[0];
          setNotification({
            passengerName: firstBooking.passengerName,
            passengerEmail: firstBooking.passengerEmail,
            passengerGender: firstBooking.passengerGender,
            showNotification: true,
            rideId: firstBooking.rideId,
          });
        }
      } catch (error) {
        console.error('Error fetching bookings:', error);
      }
    };

    // Fetch immediately and then poll every 3 seconds
    fetchBookings();
    const interval = setInterval(fetchBookings, 3000);

    return () => clearInterval(interval);
  }, [rideId, ride]);

  const handleAcceptPassenger = async () => {
    if (!notification) return;

    try {
      // Find the booking ID by fetching bookings
      const bookingsResponse = await fetch(`/api/rides/${notification.rideId}/bookings`);
      if (!bookingsResponse.ok) throw new Error("Failed to fetch bookings");

      const bookingsData = await bookingsResponse.json();
      const booking = bookingsData.bookings.find(
        (b: any) => b.passengerEmail === notification.passengerEmail && b.status === 'pending'
      );

      if (!booking) {
        throw new Error("Booking not found");
      }

      // Accept the booking
      const response = await fetch(`/api/bookings/${booking._id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: ride?.driverId || "driver_temp",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to accept booking");
      }

      const data = await response.json();

      // Store accepted booking info in session for the detail page
      if (data.booking) {
        sessionStorage.setItem('acceptedBooking', JSON.stringify(data.booking));
        sessionStorage.setItem('userId', ride?.driverId || '');
      }

      // Refetch ride details
      const rideResponse = await fetch(`/api/rides/${notification.rideId}`);
      if (rideResponse.ok) {
        setRide(await rideResponse.json());
      }

      setNotification(null);
      toast({
        title: "Passenger Accepted! ✅",
        description: `${notification.passengerName} is now your passenger`,
      });

      // Redirect to driver tracking page
      setTimeout(() => {
        navigate(`/track-driver/${notification.rideId}`);
      }, 500);
    } catch (error) {
      console.error("Error accepting passenger:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept passenger",
        variant: "destructive",
      });
    }
  };

  const handleRejectPassenger = async () => {
    if (!notification) return;

    try {
      // Find the booking ID
      const bookingsResponse = await fetch(`/api/rides/${notification.rideId}/bookings`);
      if (!bookingsResponse.ok) throw new Error("Failed to fetch bookings");

      const bookingsData = await bookingsResponse.json();
      const booking = bookingsData.bookings.find(
        (b: any) => b.passengerEmail === notification.passengerEmail && b.status === 'pending'
      );

      if (!booking) {
        throw new Error("Booking not found");
      }

      // Reject the booking
      const response = await fetch(`/api/bookings/${booking._id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: ride?.driverId || "driver_temp",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject booking");
      }

      setNotification(null);
      toast({
        title: "Booking Rejected",
        description: `${notification.passengerName}'s request has been declined`,
      });
    } catch (error) {
      console.error("Error rejecting passenger:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject booking",
        variant: "destructive",
      });
    }
  };

  const handleCancelRide = async () => {
    if (!ride) return;

    try {
      const response = await fetch(`/api/rides/${ride._id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: ride.driverId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel ride");
      }

      toast({
        title: "Ride Cancelled",
        description: "Your ride has been cancelled",
      });
      navigate("/dashboard");
    } catch (error) {
      console.error("Error cancelling ride:", error);
      toast({
        title: "Error",
        description: "Failed to cancel ride",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout
        activeTab="offer"
        onTabChange={() => {}}
        userName={userName}
        userEmail={userEmail}
        shiftStart={shiftStart}
        shiftEnd={shiftEnd}
      >
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!ride) {
    return (
      <DashboardLayout
        activeTab="offer"
        onTabChange={() => {}}
        userName={userName}
        userEmail={userEmail}
        shiftStart={shiftStart}
        shiftEnd={shiftEnd}
      >
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <p className="text-gray-600">Ride not found</p>
          <Button onClick={() => navigate("/dashboard")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      activeTab="offer"
      onTabChange={() => {}}
      userName={userName}
      userEmail={userEmail}
      shiftStart={shiftStart}
      shiftEnd={shiftEnd}
    >
      <div className="space-y-6">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-secondary to-primary rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Ride Offered Successfully!</h2>
              <p className="text-white/80">Your ride is now active and waiting for passengers</p>
            </div>
            {ride.status === "completed" && (
              <div className="p-4 bg-white/20 rounded-lg">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Ride Details Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <h3 className="text-2xl font-bold text-gray-900">Ride Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Route Information */}
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pickup Location</p>
                  <p className="text-lg font-semibold text-gray-900">{ride.pickupLocation}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="p-3 bg-secondary/10 rounded-lg flex-shrink-0">
                  <MapPin className="w-6 h-6 text-secondary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Destination</p>
                  <p className="text-lg font-semibold text-gray-900">{ride.dropoffLocation}</p>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</p>
                  <p className="text-lg font-semibold text-gray-900">{ride.date}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="p-3 bg-secondary/10 rounded-lg flex-shrink-0">
                  <Clock className="w-6 h-6 text-secondary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Departure Time</p>
                  <p className="text-lg font-semibold text-gray-900">{ride.time}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Car Details */}
          <div className="border-t border-gray-200 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex gap-4">
                <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                  <Car className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Car</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {ride.carBrand} {ride.carModel}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="p-3 bg-secondary/10 rounded-lg flex-shrink-0">
                  <Users className="w-6 h-6 text-secondary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Available Seats</p>
                  <p className="text-lg font-semibold text-gray-900">{ride.availableSeats}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preference</p>
                  <p className="text-lg font-semibold text-gray-900 capitalize">{ride.passengerPreference}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Passenger Info (if accepted) */}
          {ride.acceptedBy && (
            <div className="border-t border-gray-200 pt-6 bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-green-900">Passenger Confirmed</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Name</p>
                  <p className="text-lg text-gray-900">{ride.acceptedByName}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Email</p>
                  <p className="text-lg text-gray-900">{ride.acceptedByEmail}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Gender</p>
                  <p className="text-lg text-gray-900 capitalize">{ride.acceptedByGender}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="border-t border-gray-200 pt-6 flex gap-3">
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="flex-1"
            >
              Back to Dashboard
            </Button>
            {ride.status === "active" && (
              <Button
                onClick={handleCancelRide}
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              >
                Cancel Ride
              </Button>
            )}
          </div>
        </div>

        {/* Accepted Passengers Section */}
        <div className="mt-12">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Accepted Passengers</h3>
            <p className="text-gray-600">Passengers who have booked this ride</p>
          </div>
          <DriverAcceptedBookings driverId={ride?.driverId || "driver_temp"} />
        </div>

        {/* Passenger Acceptance Notification */}
        {notification?.showNotification && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full animate-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">New Passenger Request!</h3>
              </div>

              {/* Passenger Details */}
              <div className="space-y-4 mb-8 bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-semibold text-gray-900">{notification.passengerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-semibold text-gray-900">{notification.passengerEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Gender</p>
                    <p className="font-semibold text-gray-900 capitalize">{notification.passengerGender}</p>
                  </div>
                </div>
              </div>

              {/* Accept/Reject Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleRejectPassenger}
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Reject
                </Button>
                <Button
                  onClick={handleAcceptPassenger}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Accept
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
