import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Phone, Car, Calendar, Clock, AlertCircle, Navigation } from 'lucide-react';

interface AcceptedBooking {
  _id: string;
  rideId: string;
  driverId: string;
  driverName: string;
  driverEmail: string;
  driverGender?: string;
  driverPhone?: string;
  carBrand: string;
  carModel: string;
  carLicensePlate?: string;
  passengerId: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone?: string;
  seatsBooked: number;
  pickupLocation: string;
  dropoffLocation: string;
  date: string;
  time: string;
  status: string;
  acceptedAt?: string;
}

interface BookingResponse {
  driverInfo: any;
  passengerInfo: any;
}

export default function AcceptedRideDetail() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<AcceptedBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userType, setUserType] = useState<'passenger' | 'driver'>('passenger');

  useEffect(() => {
    // Try to get booking info from session storage first (coming from redirect)
    const sessionBooking = sessionStorage.getItem('acceptedBooking');
    if (sessionBooking) {
      try {
        const parsed = JSON.parse(sessionBooking);
        setBooking(parsed);
        
        // Determine user type from session
        const userId = sessionStorage.getItem('userId');
        if (userId === parsed.driverId) {
          setUserType('driver');
        } else {
          setUserType('passenger');
        }
        
        sessionStorage.removeItem('acceptedBooking');
        setLoading(false);
        return;
      } catch (e) {
        console.warn('Failed to parse session booking:', e);
      }
    }

    // Otherwise fetch from API if rideId available
    if (rideId) {
      fetchBookingDetails();
    } else {
      setError('No ride ID provided');
      setLoading(false);
    }
  }, [rideId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rides/${rideId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch ride details');
      }
      const data = await response.json();
      setBooking(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ride details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ride details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No ride information available</AlertDescription>
          </Alert>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const isPassenger = userType === 'passenger';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Ride Accepted! 🎉</h1>
          <p className="text-gray-600 mt-2">
            {isPassenger 
              ? "Here's your driver's information" 
              : "Here's your passenger's information"}
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex justify-between items-center mb-6">
          <Badge className="bg-green-500 hover:bg-green-600 text-white py-1 px-3">
            Accepted & Confirmed
          </Badge>
          <p className="text-sm text-gray-500">
            Accepted at {booking.acceptedAt ? new Date(booking.acceptedAt).toLocaleTimeString() : 'just now'}
          </p>
        </div>

        {/* Main Info Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Person Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {isPassenger ? 'Your Driver' : 'Your Passenger'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Name</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {isPassenger ? booking.driverName : booking.passengerName}
                  </p>
                </div>

                <div className="flex gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Gender</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {isPassenger 
                        ? (booking.driverGender || 'Not specified')
                        : 'Passenger'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Email</p>
                    <p className="font-medium text-gray-900 break-all">
                      {isPassenger ? booking.driverEmail : booking.passengerEmail}
                    </p>
                  </div>
                </div>

                {/* Contact Info */}
                {isPassenger && booking.driverPhone && (
                  <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-3">
                    <Phone className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Phone</p>
                      <a href={`tel:${booking.driverPhone}`} className="font-semibold text-blue-600 hover:underline">
                        {booking.driverPhone}
                      </a>
                    </div>
                  </div>
                )}

                {!isPassenger && booking.passengerPhone && (
                  <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-3">
                    <Phone className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Phone</p>
                      <a href={`tel:${booking.passengerPhone}`} className="font-semibold text-blue-600 hover:underline">
                        {booking.passengerPhone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vehicle/Location Card */}
          {isPassenger ? (
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Vehicle Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg">
                    <Car className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Vehicle</p>
                      <p className="font-semibold text-gray-900">
                        {booking.carBrand} {booking.carModel}
                      </p>
                      {booking.carLicensePlate && (
                        <p className="text-sm text-gray-600 mt-1">
                          License Plate: <span className="font-mono font-semibold">{booking.carLicensePlate}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Meeting Location</p>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="font-medium text-gray-900">{booking.pickupLocation}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Destination</p>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <p className="font-medium text-gray-900">{booking.dropoffLocation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Pickup Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 bg-green-50 p-3 rounded-lg">
                      <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Pickup Location</p>
                        <p className="font-semibold text-gray-900">{booking.pickupLocation}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-red-50 p-3 rounded-lg">
                      <MapPin className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Dropoff Location</p>
                        <p className="font-semibold text-gray-900">{booking.dropoffLocation}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Passengers</p>
                    <p className="text-lg font-semibold text-gray-900">{booking.seatsBooked} passenger(s)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Ride Details */}
        <Card className="border-0 shadow-lg mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Ride Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Date</p>
                  <p className="font-semibold text-gray-900">{booking.date}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600 mb-1">Time</p>
                  <p className="font-semibold text-gray-900">{booking.time}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {isPassenger && booking.driverPhone && (
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => window.location.href = `tel:${booking.driverPhone}`}
            >
              <Phone className="h-4 w-4 mr-2" />
              Call Driver
            </Button>
          )}

          {!isPassenger && booking.passengerPhone && (
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => window.location.href = `tel:${booking.passengerPhone}`}
            >
              <Phone className="h-4 w-4 mr-2" />
              Call Passenger
            </Button>
          )}

          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              sessionStorage.removeItem('acceptedBooking');
              navigate('/dashboard');
            }}
          >
            Back to Dashboard
          </Button>
        </div>

        {/* Info Alert */}
        <Alert className="mt-6 border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            {isPassenger 
              ? "Keep this information handy for the ride. The driver will meet you at the pickup location at the scheduled time."
              : "The passenger will be picked up from the location shown above. Make sure to arrive on time."}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
