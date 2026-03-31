import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Phone, Car, AlertCircle, Navigation, Loader, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MapComponent from "@/components/MapComponent";
import { io, Socket } from "socket.io-client";

interface ActiveRideData {
  _id?: string;
  rideId: string;
  bookingId: string;
  driverId: string;
  passengerId?: string;
  userType: "driver" | "passenger";
  driverName?: string;
  driverEmail?: string;
  driverPhone?: string;
  carBrand?: string;
  carModel?: string;
  carLicensePlate?: string;
  driverGender?: string;
  passengerName?: string;
  passengerEmail?: string;
  passengerPhone?: string;
  pickupLocation: string;
  dropoffLocation: string;
  date: string;
  time: string;
  seatsBooked?: number;
  pricePerSeat?: number;
  distanceTravelledInKm?: number;
  status: "active" | "in_progress" | "completed" | "cancelled";
}

interface LocationData {
  lat: number;
  lng: number;
  timestamp: number;
}

interface PaymentSummary {
  totalFare: number;
  distance: number;
  pricePerSeat: number;
  seatsBooked: number;
}

type RideStage = "otp_pending" | "in_progress" | "completed" | "rating";

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
  const [eta, setEta] = useState<string>("--");

  // Ride stages
  const [rideStage, setRideStage] = useState<RideStage>("otp_pending");
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Payment
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [completingRide, setCompletingRide] = useState(false);

  // Rating
  const [driverRating, setDriverRating] = useState(0);
  const [driverReview, setDriverReview] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  // Fetch ride data
  useEffect(() => {
    const fetchRideData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!rideId) {
          throw new Error("No ride ID provided");
        }

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
          if (booking.otp) {
            setOtp(booking.otp);
          }
        }

        ride.userType = userType;
        ride.rideId = ride._id || rideId;
        setRideData(ride);

        // Determine initial stage
        if (ride.status === "in_progress") {
          const verified = localStorage.getItem(`otp_verified_${rideId}`) === "true";
          if (verified) {
            setRideStage("in_progress");
            setOtpVerified(true);
          } else {
            setRideStage("otp_pending");
          }
        } else if (ride.status === "completed") {
          setRideStage("rating");
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

  // WebSocket connection
  useEffect(() => {
    if (!rideData) return;

    socketRef.current = io();

    socketRef.current.on("connect", () => {
      console.log("✓ Connected to real-time service");
      socketRef.current?.emit("joinRide", {
        rideId: rideData.rideId,
        userType: rideData.userType,
        userId: rideData.userType === "driver" ? rideData.driverId : rideData.passengerId,
      });
    });

    socketRef.current.on("otpVerified", () => {
      console.log("✓ OTP verified by driver");
      setOtpVerified(true);
      localStorage.setItem(`otp_verified_${rideId}`, "true");
      setRideStage("in_progress");
    });

    socketRef.current.on("driverLocation", (coords: LocationData) => {
      setOtherLocation(coords);
    });

    socketRef.current.on("passengerLocation", (coords: LocationData) => {
      setOtherLocation(coords);
    });

    socketRef.current.on("rideCompleted", (data: any) => {
      console.log("✓ Ride completed by driver");
      setPaymentSummary(data.payment);
      setRideStage("rating");
    });

    socketRef.current.on("error", (error: string) => {
      console.error("Socket error:", error);
      setError(error);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [rideData, rideId]);

  // Geolocation tracking
  useEffect(() => {
    if (!trackingEnabled || !rideData || !socketRef.current) return;

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      setTrackingEnabled(false);
      return;
    }

    const startTracking = () => {
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

  // Calculate ETA based on distance
  const calculateEta = () => {
    if (!currentLocation || !otherLocation) return;

    const distanceInKm = getDistanceFromLatLng(
      currentLocation.lat,
      currentLocation.lng,
      otherLocation.lat,
      otherLocation.lng
    );

    // Assume average speed of 40 km/h in city
    const avgSpeed = 40;
    const timeInHours = distanceInKm / avgSpeed;
    const timeInMinutes = Math.round(timeInHours * 60);

    if (timeInMinutes < 1) {
      setEta("Arriving soon");
    } else if (timeInMinutes === 1) {
      setEta("1 minute");
    } else {
      setEta(`${timeInMinutes} minutes`);
    }
  };

  const getDistanceFromLatLng = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    calculateEta();
  }, [currentLocation, otherLocation]);

  const handleVerifyOtp = async () => {
    if (!rideId || !otp) {
      setOtpError("Please enter OTP");
      return;
    }

    if (otp.length !== 4) {
      setOtpError("OTP must be 4 digits");
      return;
    }

    try {
      setVerifyingOtp(true);
      setOtpError(null);

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
        localStorage.setItem(`otp_verified_${rideId}`, "true");
        setRideStage("in_progress");

        // Notify other user
        socketRef.current?.emit("otpVerified", { rideId });
      }
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : "Failed to verify OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCompleteRide = async () => {
    if (!rideId) return;

    try {
      setCompletingRide(true);

      const response = await fetch(`/api/rides/${rideId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: rideData?.driverId,
          distance: rideData?.distanceTravelledInKm,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete ride");
      }

      const data = await response.json();

      // Calculate payment
      const totalFare = data.totalFare || (rideData?.seatsBooked || 1) * (rideData?.pricePerSeat || 0);
      setPaymentSummary({
        totalFare,
        distance: rideData?.distanceTravelledInKm || 0,
        pricePerSeat: rideData?.pricePerSeat || 0,
        seatsBooked: rideData?.seatsBooked || 1,
      });

      setRideStage("rating");

      // Notify other user
      socketRef.current?.emit("rideCompleted", {
        rideId,
        payment: {
          totalFare,
          distance: rideData?.distanceTravelledInKm || 0,
          pricePerSeat: rideData?.pricePerSeat || 0,
          seatsBooked: rideData?.seatsBooked || 1,
        },
      });
    } catch (error) {
      console.error("Error completing ride:", error);
      alert(error instanceof Error ? error.message : "Failed to complete ride");
    } finally {
      setCompletingRide(false);
    }
  };

  const handleSubmitRating = async () => {
    if (driverRating === 0) {
      alert("Please select a rating");
      return;
    }

    try {
      setSubmittingRating(true);

      // Save ride to history and get the ride history ID
      const rideHistoryResponse = await fetch(`/api/rides/${rideId}/history`);
      if (!rideHistoryResponse.ok) {
        throw new Error("Failed to get ride history");
      }

      const historyData = await rideHistoryResponse.json();

      const response = await fetch(`/api/rides/history/${historyData.rideHistoryId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passengerId: userType === "passenger" ? rideData?.driverId : rideData?.passengerId,
          rating: driverRating,
          review: driverReview,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit rating");
      }

      alert("Rating submitted successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error submitting rating:", error);
      alert(error instanceof Error ? error.message : "Failed to submit rating");
    } finally {
      setSubmittingRating(false);
    }
  };

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
          <p className="text-gray-600">
            {rideStage === "otp_pending" && "OTP Verification Required"}
            {rideStage === "in_progress" && "Real-time tracking • Live GPS updates"}
            {rideStage === "rating" && "Rate your ride experience"}
          </p>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <Badge
            className={`px-4 py-2 text-base ${
              rideStage === "otp_pending"
                ? "bg-orange-500 text-white"
                : rideStage === "in_progress"
                ? "bg-blue-500 text-white"
                : "bg-green-500 text-white"
            }`}
          >
            {rideStage === "otp_pending" && "🔐 Waiting for OTP Verification"}
            {rideStage === "in_progress" && "🚗 Ride In Progress"}
            {rideStage === "rating" && "⭐ Please Rate Your Ride"}
          </Badge>
        </div>

        {/* OTP VERIFICATION STAGE */}
        {rideStage === "otp_pending" && (
          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-orange-300">
              <CardHeader>
                <CardTitle className="text-center text-2xl">🔐 Verify Ride Start</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  {userType === "driver" ? (
                    <div>
                      <p className="text-gray-700 mb-4">
                        Share this 4-digit PIN with {rideData.passengerName}
                      </p>
                      <div className="bg-orange-100 rounded-lg p-8 inline-block">
                        <p className="text-6xl font-bold text-orange-600 tracking-widest font-mono">
                          {otp || "----"}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 mt-4">
                        Waiting for passenger to verify...
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-700 mb-6">Enter the 4-digit PIN from your driver</p>
                      <div className="flex gap-2 justify-center mb-6">
                        <input
                          type="text"
                          value={otp}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                            setOtp(val);
                            if (otpError) setOtpError(null);
                          }}
                          placeholder="0000"
                          maxLength={4}
                          className="w-32 text-4xl text-center font-bold border-2 border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 tracking-widest font-mono"
                        />
                      </div>

                      {otpError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 mb-4">
                          ❌ {otpError}
                        </div>
                      )}

                      <Button
                        onClick={handleVerifyOtp}
                        disabled={verifyingOtp || otp.length !== 4}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-lg py-6"
                      >
                        {verifyingOtp ? "Verifying..." : "Verify PIN"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Ride Details */}
                <div className="border-t pt-6 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Pickup</p>
                    <p className="font-semibold">{rideData.pickupLocation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Dropoff</p>
                    <p className="font-semibold">{rideData.dropoffLocation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* IN-PROGRESS STAGE */}
        {rideStage === "in_progress" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map Section */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Navigation className="h-5 w-5" />
                      Live Route Tracking
                    </span>
                    <Badge className="bg-blue-100 text-blue-800">ETA: {eta}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Map */}
                  <div className="rounded-lg overflow-hidden">
                    <MapComponent
                      pickup={rideData.pickupLocation}
                      dropoff={rideData.dropoffLocation}
                      height="h-96"
                      currentLocation={currentLocation}
                      otherLocation={otherLocation}
                      userType={rideData.userType}
                    />
                  </div>

                  {/* Location Info */}
                  <div className="space-y-2">
                    {locationError && (
                      <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                        ⚠️ {locationError}
                      </div>
                    )}

                    {currentLocation && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                        <p className="text-blue-900">
                          📍 Your Location: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                        </p>
                      </div>
                    )}

                    {otherLocation && (
                      <div className="bg-purple-50 border border-purple-200 rounded p-3 text-sm">
                        <p className="text-purple-900">
                          🚗 {rideData.userType === "driver" ? "Passenger" : "Driver"}: {otherLocation.lat.toFixed(4)}, {otherLocation.lng.toFixed(4)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex gap-3">
                    {!trackingEnabled ? (
                      <Button onClick={handleStartTracking} className="flex-1 bg-green-600 hover:bg-green-700">
                        <Navigation className="h-4 w-4 mr-2" />
                        Start Live Tracking
                      </Button>
                    ) : (
                      <Button onClick={handleStopTracking} className="flex-1 bg-red-600 hover:bg-red-700">
                        Stop Tracking
                      </Button>
                    )}

                    {userType === "driver" && (
                      <Button onClick={handleCompleteRide} disabled={completingRide} className="flex-1 bg-blue-600 hover:bg-blue-700">
                        {completingRide ? "Completing..." : "✓ Complete Ride"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Details Panel */}
            <div className="space-y-6">
              {/* Route Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Route</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">From</p>
                    <p className="font-semibold">{rideData.pickupLocation}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">To</p>
                    <p className="font-semibold">{rideData.dropoffLocation}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Time</p>
                    <p className="font-semibold">{rideData.date} at {rideData.time}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Other User Info */}
              {userType === "passenger" ? (
                <Card className="border-2 border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-lg text-green-900 flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      Driver
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-bold">{rideData.driverName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Vehicle</p>
                      <p className="font-semibold">
                        {rideData.carBrand} {rideData.carModel}
                      </p>
                      {rideData.carLicensePlate && (
                        <p className="font-mono text-sm text-blue-600">{rideData.carLicensePlate}</p>
                      )}
                    </div>
                    <a
                      href={`tel:${rideData.driverPhone}`}
                      className="block p-2 bg-white rounded hover:bg-gray-100 text-center font-semibold text-blue-600"
                    >
                      <Phone className="h-4 w-4 inline mr-1" />
                      Call Driver
                    </a>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-900">Passenger</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-bold">{rideData.passengerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Seats</p>
                      <p className="font-semibold">{rideData.seatsBooked}</p>
                    </div>
                    <a
                      href={`tel:${rideData.passengerPhone}`}
                      className="block p-2 bg-white rounded hover:bg-gray-100 text-center font-semibold text-green-600"
                    >
                      <Phone className="h-4 w-4 inline mr-1" />
                      Call Passenger
                    </a>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* PAYMENT SUMMARY STAGE */}
        {rideStage === "rating" && paymentSummary && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Summary */}
            <Card className="border-2 border-green-300">
              <CardHeader>
                <CardTitle className="text-center text-2xl">💰 Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Price per seat</span>
                    <span className="font-semibold">₹{paymentSummary.pricePerSeat}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Seats booked</span>
                    <span className="font-semibold">×{paymentSummary.seatsBooked}</span>
                  </div>
                  <div className="border-t border-green-200 pt-3 flex justify-between text-lg font-bold">
                    <span>Total Fare</span>
                    <span className="text-green-600">₹{paymentSummary.totalFare}</span>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <p className="text-gray-600">Distance</p>
                  <p className="text-2xl font-bold">{paymentSummary.distance.toFixed(2)} km</p>
                </div>

                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
                  {userType === "passenger" ? (
                    <p>✓ You need to pay ₹{paymentSummary.totalFare} to the driver</p>
                  ) : (
                    <p>✓ You will receive ₹{paymentSummary.totalFare} from the passenger</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Rating Card */}
            <Card className="border-2 border-yellow-300">
              <CardHeader>
                <CardTitle className="text-center text-2xl">⭐ Rate Your Ride</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-gray-700 mb-4">
                    How was your experience with{" "}
                    {userType === "passenger" ? rideData.driverName : rideData.passengerName}?
                  </p>

                  {/* Star Rating */}
                  <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setDriverRating(star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-10 w-10 ${
                            star <= driverRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Review Text */}
                  <textarea
                    value={driverReview}
                    onChange={(e) => setDriverReview(e.target.value)}
                    placeholder="Share your feedback (optional)"
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    rows={3}
                  />

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmitRating}
                    disabled={submittingRating || driverRating === 0}
                    className="w-full mt-4 bg-yellow-600 hover:bg-yellow-700 text-lg py-6"
                  >
                    {submittingRating ? "Submitting..." : "Submit Rating"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
