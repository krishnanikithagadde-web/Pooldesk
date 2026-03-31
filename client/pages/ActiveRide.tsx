import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Phone, Car, AlertCircle, Navigation, Loader } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MapComponent from "@/components/MapComponent";
import { io, Socket } from "socket.io-client";

interface ActiveRideData {
  rideId: string;
  bookingId: string;
  driverId: string;
  passengerId: string;
  userType: "driver" | "passenger";
  
  // Driver info for passenger
  driverName?: string;
  driverEmail?: string;
  driverPhone?: string;
  carBrand?: string;
  carModel?: string;
  carLicensePlate?: string;
  driverGender?: string;
  
  // Passenger info for driver
  passengerName?: string;
  passengerEmail?: string;
  passengerPhone?: string;
  
  // Ride details
  pickupLocation: string;
  dropoffLocation: string;
  date: string;
  time: string;
  seatsBooked?: number;
  status: "active" | "in_progress" | "completed" | "cancelled";
}

interface LocationData {
  lat: number;
  lng: number;
  timestamp: number;
}

export default function ActiveRide() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  
  const [rideData, setRideData] = useState<ActiveRideData | null>(null);
  const [userType, setUserType] = useState<"driver" | "passenger">("passenger");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Location tracking
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [otherLocation, setOtherLocation] = useState<LocationData | null>(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // OTP and ride status
  const [rideStatus, setRideStatus] = useState<'active' | 'in_progress' | 'completed' | 'cancelled'>('active');
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [startingRide, setStartingRide] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Fetch ride data
  useEffect(() => {
    const fetchRideData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!rideId) {
          throw new Error("No ride ID provided");
        }

        // Determine user type from localStorage or context
        const userType = (localStorage.getItem("userType") || "passenger") as "driver" | "passenger";
        setUserType(userType);

        const response = await fetch(`/api/rides/${rideId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch ride details");
        }

        const ride = await response.json();
        
        // Enrich with booking details if available
        const bookingData = localStorage.getItem(`booking_${rideId}`);
        if (bookingData) {
          const booking = JSON.parse(bookingData);
          ride.bookingId = booking.bookingId;
          ride.passengerName = booking.passengerName;
          ride.passengerEmail = booking.passengerEmail;
          ride.passengerPhone = booking.passengerPhone;
        }

        ride.userType = userType;
        setRideData(ride);
        setRideStatus(ride.status || 'active');
        
        // If ride is in progress and user is passenger, check if OTP is verified
        if (ride.status === 'in_progress' && userType === 'passenger') {
          // Check if OTP was already verified (you might want to store this in localStorage or check with backend)
          const verified = localStorage.getItem(`otp_verified_${rideId}`);
          setOtpVerified(verified === 'true');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMsg);
        console.error("Error fetching ride:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRideData();
  }, [rideId]);

  // Initialize WebSocket connection and location tracking
  useEffect(() => {
    if (!rideData) return;

    // Initialize Socket.io connection
    socketRef.current = io();

    socketRef.current.on("connect", () => {
      console.log("✓ Connected to real-time service");
      
      // Join the ride room with user type
      socketRef.current?.emit("joinRide", {
        rideId: rideData.rideId,
        userType: rideData.userType,
        userId: rideData.userType === "driver" ? rideData.driverId : rideData.passengerId,
      });
    });

    // Listen for other user's location
    socketRef.current.on("driverLocation", (coords: LocationData) => {
      console.log("📍 Driver location received:", coords);
      setOtherLocation(coords);
    });

    socketRef.current.on("passengerLocation", (coords: LocationData) => {
      console.log("📍 Passenger location received:", coords);
      setOtherLocation(coords);
    });

    socketRef.current.on("rideEnded", () => {
      setTrackingEnabled(false);
      alert("Ride has ended");
      navigate("/dashboard");
    });

    socketRef.current.on("error", (error: string) => {
      console.error("Socket error:", error);
      setError(error);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [rideData, navigate]);

  // Geolocation tracking
  useEffect(() => {
    if (!trackingEnabled || !rideData || !socketRef.current) return;

    // Check if browser supports geolocation
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      setTrackingEnabled(false);
      return;
    }

    const startTracking = () => {
      // Start watching position
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const locationData: LocationData = {
            lat: latitude,
            lng: longitude,
            timestamp: Date.now(),
          };

          setCurrentLocation(locationData);
          setLocationError(null);

          // Emit location to other user via WebSocket
          socketRef.current?.emit("locationUpdate", {
            rideId: rideData.rideId,
            userType: rideData.userType,
            coords: locationData,
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          let errorMsg = "Unable to get location";
          
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = "Location permission denied. Please enable it in settings.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMsg = "Location information not available.";
          } else if (error.code === error.TIMEOUT) {
            errorMsg = "Location request timed out.";
          }
          
          setLocationError(errorMsg);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    };

    startTracking();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [trackingEnabled, rideData]);

  const handleStartTracking = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      return;
    }
    setTrackingEnabled(true);
    setLocationError(null);
  };

  const handleStopTracking = () => {
    setTrackingEnabled(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
  };

  const handleCompleteRide = async () => {
    try {
      const response = await fetch(`/api/rides/${rideId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: rideData?.driverId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete ride");
      }

      alert("Ride completed successfully!");
      handleStopTracking();
      navigate("/dashboard");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to complete ride");
    }
  };

  const handleStartRide = async () => {
    if (!rideId) return;
    
    try {
      setStartingRide(true);
      const response = await fetch(`/api/rides/${rideId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to start ride");
      }

      const data = await response.json();
      setRideStatus('in_progress');
      alert(`Ride started! OTP: ${data.otp}`);
    } catch (error) {
      console.error("Error starting ride:", error);
      alert("Failed to start ride. Please try again.");
    } finally {
      setStartingRide(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!rideId || !otp) return;
    
    try {
      setVerifyingOtp(true);
      const response = await fetch(`/api/rides/${rideId}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to verify OTP");
      }

      const data = await response.json();
      if (data.verified) {
        setOtpVerified(true);
        localStorage.setItem(`otp_verified_${rideId}`, 'true');
        alert("OTP verified! Ride has started.");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      alert(error instanceof Error ? error.message : "Failed to verify OTP. Please try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card>
          <CardContent className="pt-6 flex items-center justify-center gap-3">
            <Loader className="h-6 w-6 animate-spin text-blue-500" />
            <p className="text-gray-600">Loading ride details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !rideData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <Card className="max-w-md border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Loading Ride
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-4">{error || "Ride not found"}</p>
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Active Ride</h1>
          <p className="text-gray-600">Real-time tracking • Live GPS updates</p>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <Badge className={`px-4 py-2 text-base ${
            rideStatus === 'in_progress' 
              ? 'bg-blue-500 text-white' 
              : rideStatus === 'completed'
              ? 'bg-gray-500 text-white'
              : 'bg-green-500 text-white'
          }`}>
            {rideStatus === 'in_progress' 
              ? '🚗 Ride In Progress' 
              : rideStatus === 'completed'
              ? '✅ Ride Completed'
              : '✓ Ride Active • Ready to Start'
            }
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5" />
                  Live Map Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Map Component */}
                <div className="rounded-lg overflow-hidden mb-4">
                  <MapComponent
                    pickup={rideData.pickupLocation}
                    dropoff={rideData.dropoffLocation}
                    height="h-96"
                    currentLocation={currentLocation}
                    otherLocation={otherLocation}
                    userType={rideData.userType}
                  />
                </div>

                {/* Location Status */}
                <div className="space-y-2">
                  {locationError && (
                    <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                      ⚠️ {locationError}
                    </div>
                  )}

                  {currentLocation && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                      <p className="text-blue-900">
                        📍 Your Location: {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
                      </p>
                    </div>
                  )}

                  {otherLocation && (
                    <div className="bg-purple-50 border border-purple-200 rounded p-3 text-sm">
                      <p className="text-purple-900">
                        🚗 {rideData.userType === "driver" ? "Passenger" : "Driver"} Location: {otherLocation.lat.toFixed(5)}, {otherLocation.lng.toFixed(5)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Tracking Controls */}
                <div className="flex gap-3 mt-6">
                  {!trackingEnabled ? (
                    <Button
                      onClick={handleStartTracking}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Start Live Tracking
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStopTracking}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      Stop Tracking
                    </Button>
                  )}

                  {rideData.userType === "driver" && rideStatus === 'active' && (
                    <Button
                      onClick={handleStartRide}
                      disabled={startingRide}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {startingRide ? 'Starting...' : 'Start Ride'}
                    </Button>
                  )}

                  {rideData.userType === "driver" && rideStatus === 'in_progress' && (
                    <Button
                      onClick={handleCompleteRide}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      Complete Ride
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            {/* Route Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Route Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">📍 Pickup</p>
                  <p className="font-semibold text-gray-900">{rideData.pickupLocation}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">📍 Dropoff</p>
                  <p className="font-semibold text-gray-900">{rideData.dropoffLocation}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">📅 Date & Time</p>
                  <p className="font-semibold text-gray-900">
                    {rideData.date} at {rideData.time}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Display relevant info based on user type */}
            {rideData.userType === "passenger" ? (
              // Passenger View - Show Driver Info
              <Card className="border-2 border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-lg text-green-900 flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    Driver Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Name</p>
                    <p className="font-bold text-lg text-gray-900">{rideData.driverName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Vehicle</p>
                    <p className="font-semibold text-gray-900">
                      {rideData.carBrand} {rideData.carModel}
                    </p>
                  </div>
                  {rideData.carLicensePlate && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">License Plate</p>
                      <p className="font-mono text-lg font-bold text-blue-600">
                        {rideData.carLicensePlate}
                      </p>
                    </div>
                  )}
                  <div className="pt-4 border-t border-green-200">
                    <p className="text-sm text-gray-600 mb-2">Contact</p>
                    <a
                      href={`tel:${rideData.driverPhone}`}
                      className="flex items-center gap-2 p-3 bg-white rounded-lg hover:bg-blue-100 transition"
                    >
                      <Phone className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-blue-600">{rideData.driverPhone || "N/A"}</span>
                    </a>
                    <a
                      href={`mailto:${rideData.driverEmail}`}
                      className="flex items-center gap-2 p-3 bg-white rounded-lg hover:bg-blue-100 transition mt-2 text-sm"
                    >
                      {rideData.driverEmail}
                    </a>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Driver View - Show Passenger Info
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-900">Passenger Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Name</p>
                    <p className="font-bold text-lg text-gray-900">{rideData.passengerName}</p>
                  </div>
                  {rideData.seatsBooked && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Seats Booked</p>
                      <p className="font-semibold text-gray-900">{rideData.seatsBooked}</p>
                    </div>
                  )}
                  <div className="pt-4 border-t border-blue-200">
                    <p className="text-sm text-gray-600 mb-2">Contact</p>
                    <a
                      href={`tel:${rideData.passengerPhone}`}
                      className="flex items-center gap-2 p-3 bg-white rounded-lg hover:bg-green-100 transition"
                    >
                      <Phone className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-600">{rideData.passengerPhone || "N/A"}</span>
                    </a>
                    <a
                      href={`mailto:${rideData.passengerEmail}`}
                      className="flex items-center gap-2 p-3 bg-white rounded-lg hover:bg-green-100 transition mt-2 text-sm"
                    >
                      {rideData.passengerEmail}
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* OTP Verification for Passengers */}
            {rideData.userType === "passenger" && rideStatus === 'in_progress' && !otpVerified && (
              <Card className="border-2 border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-lg text-orange-900 flex items-center gap-2">
                    🔐 Verify Ride Start
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-orange-800">
                    The driver has started the ride. Please enter the 4-digit OTP shared by your driver to verify and begin tracking.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="Enter 4-digit OTP"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      maxLength={4}
                    />
                    <Button
                      onClick={handleVerifyOtp}
                      disabled={verifyingOtp || otp.length !== 4}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {verifyingOtp ? 'Verifying...' : 'Verify'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ride Started Confirmation for Passengers */}
            {rideData.userType === "passenger" && rideStatus === 'in_progress' && otpVerified && (
              <Card className="border-2 border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-lg text-green-900 flex items-center gap-2">
                    ✅ Ride Started
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-green-800">
                    OTP verified! The ride has started and tracking is now active.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Emergency Info */}
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-lg text-yellow-900">💡 Tips</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-yellow-800">
                <ul className="space-y-2 list-disc list-inside">
                  <li>Enable tracking to share live location</li>
                  <li>Keep your phone connected to the internet</li>
                  <li>Share important emergency contacts if needed</li>
                  <li>Driver completes the ride when destination is reached</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
