import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Phone, User, MapPin } from "lucide-react";

interface PendingBooking {
  _id: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  seatsBooked: number;
  pickupLocation: string;
  dropoffLocation: string;
  date: string;
  time: string;
  passengerDetails?: Array<{
    gender: string;
    age?: number;
  }>;
}

interface PendingBookingsListProps {
  driverId: string;
}

export default function PendingBookingsList({ driverId }: PendingBookingsListProps) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingBookings();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingBookings, 30000);
    return () => clearInterval(interval);
  }, [driverId]);

  const fetchPendingBookings = async () => {
    try {
      const response = await fetch(`/api/driver/${driverId}/pending-bookings`);
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error("Failed to fetch pending bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBooking = async (bookingId: string) => {
    setProcessing(bookingId);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId })
      });

      if (response.ok) {
        const data = await response.json();

        // Navigate driver to tracking page with passenger info
        navigate(data.redirectUrl, {
          state: {
            passengerInfo: data.passengerInfo,
            driverInfo: data.driverInfo
          }
        });

        // Remove from pending list
        setBookings(prev => prev.filter(b => b._id !== bookingId));

      } else {
        const error = await response.json();
        alert(`Failed to accept booking: ${error.error}`);
      }
    } catch (error) {
      console.error("Error accepting booking:", error);
      alert("Failed to accept booking. Please try again.");
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    setProcessing(bookingId);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId })
      });

      if (response.ok) {
        // Remove from pending list
        setBookings(prev => prev.filter(b => b._id !== bookingId));
      } else {
        alert("Failed to reject booking");
      }
    } catch (error) {
      console.error("Error rejecting booking:", error);
      alert("Failed to reject booking. Please try again.");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">Loading pending bookings...</div>
        </CardContent>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p>No pending booking requests</p>
            <p className="text-sm">New requests will appear here automatically</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pending Booking Requests</h3>
        <Badge variant="secondary">{bookings.length} pending</Badge>
      </div>

      {bookings.map((booking) => (
        <Card key={booking._id} className="border-2 border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-orange-600" />
                <span>{booking.passengerName}</span>
              </div>
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                {booking.seatsBooked} seat{booking.seatsBooked > 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Contact Info */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Phone:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`tel:${booking.passengerPhone}`, '_self')}
              >
                <Phone className="w-3 h-3 mr-1" />
                {booking.passengerPhone}
              </Button>
            </div>

            {/* Route Info */}
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <div><strong>From:</strong> {booking.pickupLocation}</div>
                <div><strong>To:</strong> {booking.dropoffLocation}</div>
                <div><strong>When:</strong> {booking.date} at {booking.time}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => handleAcceptBooking(booking._id)}
                disabled={processing === booking._id}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {processing === booking._id ? 'Accepting...' : 'Accept & Start Tracking'}
              </Button>

              <Button
                variant="outline"
                onClick={() => handleRejectBooking(booking._id)}
                disabled={processing === booking._id}
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}