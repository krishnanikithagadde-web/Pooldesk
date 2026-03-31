import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Phone, Mail, Car, Calendar, Clock, Users, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DriverInfo {
  name: string;
  email: string;
  gender: string;
  carBrand: string;
  carModel: string;
  pickupLocation: string;
  dropoffLocation: string;
  date: string;
  time: string;
}

interface BookingDetails {
  seatsBooked: number;
  pricePerSeat: number;
  distanceTravelledInKm: number;
  totalFare: number;
}

interface Booking {
  _id: string;
  rideId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  createdAt: string;
  acceptedAt?: string;
  driverInfo: DriverInfo | null;
  bookingDetails: BookingDetails;
}

interface PassengerBookingsViewProps {
  passengerId: string;
}

export default function PassengerBookingsView({ passengerId }: PassengerBookingsViewProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted'>('all');

  useEffect(() => {
    fetchBookings();
  }, [passengerId]);

  // ✅ ADD POLLING FOR NEWLY ACCEPTED BOOKINGS
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (!loading) {
        fetchBookings();
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [passengerId, loading]);

  // Socket.io listener for booking acceptance notifications
  useEffect(() => {
    if (!passengerId) return;
    let socket: any;

    const setup = async () => {
      const { getSocket } = await import('@/lib/socket');
      socket = getSocket();

      console.log('🔌 Setting up socket for passenger:', passengerId);

      // Join passenger room for this passenger (to receive booking notifications)
      socket.emit('joinPassenger', { passengerId });
      console.log('📡 Emitted joinPassenger event for passenger:', passengerId);

      // Also join ride rooms for existing bookings
      bookings.forEach(b => {
        socket.emit('joinRide', { rideId: b.rideId, userType: 'passenger', userId: passengerId });
      });

      socket.on('bookingAccepted', (data: { rideId: string; driverInfo?: any; otp?: string }) => {
        if (!data || !data.rideId) return;

        console.log('🎉 Booking accepted received:', data);
        console.log('🔍 Current location:', window.location.pathname);

        // ✓ STORE OTP AND DRIVER INFO IN LOCALSTORAGE FOR ACTIVE RIDE PAGE
        if (data.otp || data.driverInfo) {
          const bookingData = {
            rideId: data.rideId,
            driverInfo: data.driverInfo,
            otp: data.otp,
            timestamp: Date.now(),
          };
          localStorage.setItem(`booking_${data.rideId}`, JSON.stringify(bookingData));
          console.log('✓ Booking data stored:', bookingData);
        }

        // Set user type to passenger for the unified page
        localStorage.setItem('userType', 'passenger');

        // ✅ FORCE REDIRECT TO UNIFIED ACTIVE RIDE PAGE
        const trackingUrl = `/active-ride/${data.rideId}`;
        if (window.location.pathname !== trackingUrl) {
          console.log('🔄 Redirecting to:', trackingUrl);
          window.location.href = trackingUrl;
        }
      });
    };

    setup();

    return () => {
      if (socket) {
        socket.off('bookingAccepted');
      }
    };
  }, [bookings, passengerId]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/passenger/${passengerId}/bookings`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch bookings");
      }

      const data = await response.json();
      const newBookings = data.bookings || [];
      
      // ✅ CHECK FOR NEWLY ACCEPTED BOOKINGS WITH OTP VIA DEDICATED ENDPOINT
      try {
        const acceptedResponse = await fetch(`/api/passenger/${passengerId}/accepted-bookings`);
        if (acceptedResponse.ok) {
          const acceptedData = await acceptedResponse.json();
          const acceptedBookings = acceptedData.acceptedBookings || [];
          
          // Find newly accepted bookings (not in current state)
          const newlyAcceptedBooking = acceptedBookings.find((accepted: any) => 
            !bookings.some(existing => existing.rideId === accepted.rideId && existing.status === 'accepted')
          );
          
          if (newlyAcceptedBooking) {
            console.log('🎉 Newly accepted booking found via polling:', newlyAcceptedBooking);
            
            // Store complete booking data with OTP
            const bookingData = {
              rideId: newlyAcceptedBooking.rideId,
              driverInfo: newlyAcceptedBooking.driverInfo,
              passengerInfo: newlyAcceptedBooking.passengerInfo,
              otp: newlyAcceptedBooking.otp,
              timestamp: Date.now(),
            };
            localStorage.setItem(`booking_${newlyAcceptedBooking.rideId}`, JSON.stringify(bookingData));
            console.log('✓ Booking data stored via polling:', bookingData);

            // Set user type to passenger for the unified page
            localStorage.setItem('userType', 'passenger');

            // Redirect to unified active ride page
            const trackingUrl = `/active-ride/${newlyAcceptedBooking.rideId}`;
            if (window.location.pathname !== trackingUrl) {
              console.log('🔄 Redirecting to active ride page via polling:', trackingUrl);
              window.location.href = trackingUrl;
              return; // Don't update state if redirecting
            }
          }
        }
      } catch (acceptedError) {
        console.error('Failed to check accepted bookings:', acceptedError);
        // Fallback to old method if new endpoint fails
        const newlyAcceptedBooking = newBookings.find((b: any) => 
          b.status === 'accepted' && !bookings.some(existing => existing._id === b._id)
        );
        
        if (newlyAcceptedBooking) {
          console.log('🎉 Newly accepted booking found (fallback):', newlyAcceptedBooking);
          
          // Fetch OTP from the ride
          try {
            const rideResponse = await fetch(`/api/rides/${newlyAcceptedBooking.rideId}`);
            const rideData = await rideResponse.json();
            
            if (rideData.otp) {
              const bookingData = {
                rideId: newlyAcceptedBooking.rideId,
                driverInfo: {
                  name: newlyAcceptedBooking.driverName,
                  email: newlyAcceptedBooking.driverEmail,
                  carBrand: newlyAcceptedBooking.carBrand,
                  carModel: newlyAcceptedBooking.carModel,
                  carLicensePlate: newlyAcceptedBooking.carLicensePlate,
                  driverPhone: newlyAcceptedBooking.driverPhone,
                  gender: newlyAcceptedBooking.driverGender || 'not specified',
                  pickupLocation: newlyAcceptedBooking.pickupLocation,
                  dropoffLocation: newlyAcceptedBooking.dropoffLocation,
                  date: newlyAcceptedBooking.date,
                  time: newlyAcceptedBooking.time,
                },
                otp: rideData.otp,
                timestamp: Date.now(),
              };
              localStorage.setItem(`booking_${newlyAcceptedBooking.rideId}`, JSON.stringify(bookingData));
              console.log('✓ Booking data stored via polling (fallback):', bookingData);

              // Set user type to passenger for the unified page
              localStorage.setItem('userType', 'passenger');

              // Redirect to unified active ride page
              const trackingUrl = `/active-ride/${newlyAcceptedBooking.rideId}`;
              if (window.location.pathname !== trackingUrl) {
                console.log('🔄 Redirecting to active ride page via polling (fallback):', trackingUrl);
                window.location.href = trackingUrl;
                return; // Don't update state if redirecting
              }
            }
          } catch (otpError) {
            console.error('Failed to fetch OTP (fallback):', otpError);
          }
        }
      }
      
      setBookings(newBookings);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch your bookings");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-2" />
        <p className="text-gray-600">Loading your bookings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'pending', 'accepted'] as const).map(status => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
            className="capitalize"
          >
            {status === 'all' ? 'All Bookings' : getStatusLabel(status)}
            {filteredBookings.length > 0 && filter === status && (
              <span className="ml-2 px-2 py-1 text-xs bg-white rounded-full">
                {filteredBookings.length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">
              {filter === 'all' 
                ? "You don't have any bookings yet" 
                : `No ${filter} bookings at the moment`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredBookings.map(booking => (
            <Card key={booking._id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {booking.driverInfo?.carBrand} {booking.driverInfo?.carModel || 'Ride'}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Booking ID: {booking._id.toString().slice(0, 8)}
                    </p>
                  </div>
                  <Badge className={getStatusColor(booking.status)}>
                    {getStatusLabel(booking.status)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Route Information */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex gap-3">
                    <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 uppercase font-semibold">Route</p>
                      <p className="font-medium text-gray-900">
                        {booking.driverInfo?.pickupLocation || 'Pickup'}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">↓</p>
                      <p className="font-medium text-gray-900">
                        {booking.driverInfo?.dropoffLocation || 'Dropoff'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex gap-3">
                    <Calendar className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-600 uppercase font-semibold">Date</p>
                      <p className="font-medium text-gray-900">{booking.driverInfo?.date}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Clock className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-600 uppercase font-semibold">Time</p>
                      <p className="font-medium text-gray-900">{booking.driverInfo?.time}</p>
                    </div>
                  </div>
                </div>

                {/* Only show driver details if booking is accepted */}
                {booking.status === 'accepted' && booking.driverInfo && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-bold text-green-900">✓ Driver Details (Shared)</p>
                    
                    <div className="space-y-2">
                      <div className="flex gap-3">
                        <Users className="w-4 h-4 text-gray-600 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-600">Driver Name</p>
                          <p className="font-medium text-gray-900">{booking.driverInfo.name}</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Mail className="w-4 h-4 text-gray-600 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-600">Email</p>
                          <p className="font-medium text-gray-900 break-all">{booking.driverInfo.email}</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Car className="w-4 h-4 text-gray-600 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-600">Car Details</p>
                          <p className="font-medium text-gray-900">
                            {booking.driverInfo.carBrand} {booking.driverInfo.carModel}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Booking Summary */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm font-bold text-blue-900 mb-2">Booking Summary</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Seats Booked</span>
                      <span className="font-medium">{booking.bookingDetails.seatsBooked}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price per Seat</span>
                      <span className="font-medium">₹{booking.bookingDetails.pricePerSeat}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Distance</span>
                      <span className="font-medium">{booking.bookingDetails.distanceTravelledInKm.toFixed(1)} km</span>
                    </div>
                    <div className="border-t border-blue-200 pt-2 flex justify-between">
                      <span className="font-semibold text-gray-900">Total Fare</span>
                      <span className="font-bold text-blue-600">₹{booking.bookingDetails.totalFare}</span>
                    </div>
                  </div>
                </div>

                {/* Pending Message */}
                {booking.status === 'pending' && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Waiting for driver to accept your booking request...
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
