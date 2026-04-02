import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Mail, Users, Car, Calendar, Clock, DollarSign, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PassengerInfo {
  name: string;
  email: string;
  seatsBooked: number;
  pickupLocation: string;
  dropoffLocation: string;
  date: string;
  time: string;
  gender: string;
}

interface RideDetails {
  carBrand: string;
  carModel: string;
  pricePerSeat: number;
  distanceTravelledInKm: number;
}

interface AcceptedBooking {
  _id: string;
  rideId: string;
  status: string;
  acceptedAt: string;
  passengerInfo: PassengerInfo;
  rideDetails: RideDetails;
}

interface DriverAcceptedBookingsProps {
  driverId: string;
}

export default function DriverAcceptedBookings({ driverId }: DriverAcceptedBookingsProps) {
  const [bookings, setBookings] = useState<AcceptedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAcceptedBookings();
  }, [driverId]);

  const fetchAcceptedBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/driver/${driverId}/accepted-bookings`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch accepted bookings");
      }

      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch your accepted bookings");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-2" />
        <p className="text-gray-600">Loading accepted bookings...</p>
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
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-blue-600">{bookings.length}</p>
            <p className="text-sm text-gray-600 mt-1">Accepted Bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-green-600">
              {bookings.reduce((sum, b) => sum + b.passengerInfo.seatsBooked, 0)}
            </p>
            <p className="text-sm text-gray-600 mt-1">Total Passengers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-orange-600">
              ₹{bookings.reduce((sum, b) => sum + (b.rideDetails.pricePerSeat * b.passengerInfo.seatsBooked), 0)}
            </p>
            <p className="text-sm text-gray-600 mt-1">Expected Earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Accepted Bookings List */}
      {bookings.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">No accepted bookings yet. Passengers will appear here once you accept their requests.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {bookings.map(booking => {
            const totalFare = booking.rideDetails.pricePerSeat * booking.passengerInfo.seatsBooked;
            return (
              <Card key={booking._id} className="overflow-hidden hover:shadow-lg transition-shadow border-l-4 border-green-500">
                <CardHeader className="pb-3 bg-green-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {booking.passengerInfo.name}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {booking.passengerInfo.seatsBooked} {booking.passengerInfo.seatsBooked === 1 ? 'Passenger' : 'Passengers'}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Accepted</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Passenger Info Card */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                    <p className="text-sm font-bold text-green-900">✓ Passenger Details (Shared with You)</p>
                    
                    <div className="space-y-2">
                      <div className="flex gap-3">
                        <Mail className="w-4 h-4 text-gray-600 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-600">Email</p>
                          <p className="font-medium text-gray-900 break-all">{booking.passengerInfo.email}</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Users className="w-4 h-4 text-gray-600 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-600">Gender</p>
                          <p className="font-medium text-gray-900 capitalize">{booking.passengerInfo.gender}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Route Information */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex gap-3">
                      <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 uppercase font-semibold">Pickup Location</p>
                        <p className="font-medium text-gray-900">
                          {booking.passengerInfo.pickupLocation}
                        </p>
                        <p className="text-xs text-gray-600 mt-2">↓</p>
                        <p className="text-xs text-gray-600 uppercase font-semibold mt-2">Dropoff Location</p>
                        <p className="font-medium text-gray-900">
                          {booking.passengerInfo.dropoffLocation}
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
                        <p className="font-medium text-gray-900">{booking.passengerInfo.date}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Clock className="w-5 h-5 text-orange-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-600 uppercase font-semibold">Time</p>
                        <p className="font-medium text-gray-900">{booking.passengerInfo.time}</p>
                      </div>
                    </div>
                  </div>

                  {/* Ride & Fare Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex gap-3">
                      <Car className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-600 uppercase font-semibold">Your Car</p>
                        <p className="font-medium text-gray-900">
                          {booking.rideDetails.carBrand} {booking.rideDetails.carModel}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-600 uppercase font-semibold">Fare</p>
                        <p className="font-medium text-gray-900">
                          ₹{totalFare}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Distance */}
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Distance</p>
                    <p className="font-medium text-gray-900">{booking.rideDetails.distanceTravelledInKm.toFixed(1)} km</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1">
                      Contact Passenger
                    </Button>
                    <Button className="flex-1 bg-green-600 hover:bg-green-700">
                      Mark as Completed
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
