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

type RideStage = "otp_pending" | "in_progress" | "completed" | "payment_summary" | "feedback";

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
  // Driver's typed OTP digits (array of 4 single-digit strings)
  const [driverOtpDigits, setDriverOtpDigits] = useState<string[]>(["", "", "", ""]);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Payment
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [completingRide, setCompletingRide] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // Feedback
  const [driverRating, setDriverRating] = useState(0);
  const [driverReview, setDriverReview] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [feedbackSkipped, setFeedbackSkipped] = useState(false);

  // (dev preview removed)

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

        ride.userType = userType;
        ride.rideId = ride._id || rideId;

        // Prefer local booking cache (set by socket or earlier flow) as source of truth for OTP stage
        const bookingCache = localStorage.getItem(`booking_${rideId}`);
        let mergedRide: any = ride;
        if (bookingCache) {
          try {
            const booking = JSON.parse(bookingCache);
            if (booking.otp) {
              setOtp(booking.otp);
              setRideStage("otp_pending");
            }
            // merge booking info into rideData for UI
            mergedRide = { ...ride, ...booking };
          } catch (e) {
            console.error("Failed to parse booking data:", e);
          }
        }

        setRideData(mergedRide);

        // Determine initial stage from server status, but handle cases where backend sets status 'completed' on accept
        if (mergedRide.status === "in_progress") {
          const verified = localStorage.getItem(`otp_verified_${rideId}`) === "true";
          if (verified) {
            setRideStage("in_progress");
            setOtpVerified(true);
          } else {
            setRideStage("otp_pending");
          }
        } else if (mergedRide.status === "completed") {
          // Some server flows mark ride as 'completed' immediately after accept — treat accepted rides as otp_pending if acceptedBy present
          if ((mergedRide as any).acceptedBy || (mergedRide as any).acceptedByName) {
            setRideStage("otp_pending");
          } else {
            // If payment confirmed, show feedback, otherwise show payment summary
            if ((mergedRide as any).paymentConfirmed) {
              setRideStage("feedback");
              setPaymentConfirmed(true);
            } else {
              setRideStage("payment_summary");
            }
          }
        }

        // Auto-seed booking cache for accepted rides so passenger sees OTP/map immediately
        try {
          const bookingKey = `booking_${rideId}`;
          const existing = localStorage.getItem(bookingKey);
          if (!existing && ((mergedRide as any).acceptedBy || (mergedRide as any).acceptedByName || mergedRide.otp)) {
            const autoBooking: any = {
              bookingId: `auto_${rideId}`,
              passengerName: mergedRide.passengerName || mergedRide.acceptedByName || 'Passenger',
              passengerPhone: mergedRide.passengerPhone || '',
              driverName: mergedRide.driverName || '',
              driverPhone: mergedRide.driverPhone || '',
              carBrand: mergedRide.carBrand || '',
              carModel: mergedRide.carModel || '',
              carLicensePlate: mergedRide.carLicensePlate || '',
              otp: mergedRide.otp || '',
              timestamp: Date.now(),
            };
            localStorage.setItem(bookingKey, JSON.stringify(autoBooking));
            // ensure UI picks it up
            setOtp(autoBooking.otp || '');
            setRideData((prev) => ({ ...(prev || {}), ...autoBooking } as any));
            setRideStage('otp_pending');
          }
        } catch (e) {
          console.error('Failed to auto-seed booking cache:', e);
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
      console.log("✓ Connected to real-time service, rideId:", rideData.rideId, "userType:", rideData.userType);

      // Join ride-specific room (both driver and passenger)
      socketRef.current?.emit("joinRide", {
        rideId: rideData.rideId,
        userType: rideData.userType,
        userId: rideData.userType === "driver" ? rideData.driverId : rideData.passengerId,
      });
      console.log(`✓ Joined ride room: ride_${rideData.rideId}`);

      // Ensure passenger joins passenger-specific room to receive detailed acceptance payload
      if (rideData.userType === 'passenger' && (rideData.passengerId || (rideData as any).bookingId)) {
        const pId = rideData.passengerId || (rideData as any).passengerId || (rideData as any).bookingPassengerId;
        if (pId) {
          socketRef.current?.emit('joinPassenger', { passengerId: pId });
          console.log(`✓ Passenger joined room: passenger_${pId}`);
        }
      }
    });

    socketRef.current.on("otpVerified", (data: any) => {
      console.log("✓ otpVerified socket event received", data);
      if (data.rideId === rideData.rideId || !data.rideId) {
        console.log("✓ OTP verified - transitioning to in_progress");
        setOtpVerified(true);
        localStorage.setItem(`otp_verified_${rideId}`, "true");
        setRideStage("in_progress");
      }
    });

    socketRef.current.on("rideStarted", (data: any) => {
      console.log("✓ rideStarted socket event received", data);
      if (data.rideId === rideData.rideId || !data.rideId) {
        console.log("✓ Ride started - transitioning to in_progress");
        setOtpVerified(true);
        localStorage.setItem(`otp_verified_${rideId}`, "true");
        setRideStage("in_progress");
      }
    });

    // When a booking is accepted the server emits bookingAccepted with OTP and driver/passenger info
    socketRef.current.on("bookingAccepted", (payload: any) => {
      console.log("✓ bookingAccepted socket payload:", payload);
      try {
        if (payload.otp) {
          setOtp(payload.otp);
        }
        // merge incoming driver/passenger info into rideData for UI
        setRideData((prev) => ({ ...(prev || {}), ...payload.driverInfo, ...payload.passengerInfo } as any));
        // ensure we show OTP panel
        setRideStage("otp_pending");
      } catch (e) {
        console.warn("Failed to apply bookingAccepted payload", e);
      }
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
      setRideStage("payment_summary");
    });

    socketRef.current.on("paymentConfirmed", (data: any) => {
      console.log("✓ Payment confirmed");
      setPaymentConfirmed(true);
      setRideStage("feedback");
    });

    socketRef.current.on("error", (error: string) => {
      console.error("Socket error:", error);
      setError(error);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [rideData, rideId]);

  // Polling fallback: check for ride status changes and OTP verification
  useEffect(() => {
    let pollTimer: number | null = null;
    const startPolling = async () => {
      if (!rideData || !rideId) return;
      if (rideStage === "in_progress" || rideStage === "rating") return; // Already transitioned

      const passengerId = (rideData as any).passengerId || (rideData as any).passenger_id || (rideData as any).bookingPassengerId;

      const poll = async () => {
        try {
          // Poll ride status to check if it's been verified and started
          const rideRes = await fetch(`/api/rides/${rideId}`);
          if (rideRes.ok) {
            const ride = await rideRes.json();
            console.log('Poll: Ride status is', ride.status);

            // If ride status is in_progress, passenger should transition
            if (ride.status === 'in_progress' && rideStage === 'otp_pending') {
              console.log('✓ Poll detected ride is in_progress - transitioning passenger');
              setOtpVerified(true);
              localStorage.setItem(`otp_verified_${rideId}`, "true");
              setRideStage("in_progress");
              // Stop polling
              if (pollTimer) {
                window.clearInterval(pollTimer);
                pollTimer = null;
              }
              return;
            }
          }

          // Also poll for accepted bookings
          if (rideData.userType === 'passenger' && passengerId) {
            const res = await fetch(`/api/passenger/${passengerId}/accepted-bookings`);
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.acceptedBookings && data.acceptedBookings.length > 0) {
              const match = data.acceptedBookings.find((b: any) => b.rideId === rideData.rideId || b.rideId === rideId);
              if (match && match.otp) {
                console.log('✓ Poll found OTP for passenger:', match.otp);
                setOtp(match.otp);
              }
            }
          }
        } catch (e) {
          console.warn('Polling failed', e);
        }
      };

      // Start polling every 2 seconds
      pollTimer = window.setInterval(poll, 2000);
      // Run immediately once
      poll();
    };

    startPolling();

    return () => {
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [rideData, rideId, rideStage]);

  // Geolocation tracking (non-blocking - doesn't prevent rendering)
  useEffect(() => {
    if (!trackingEnabled || !rideData) return;

    // Don't require geolocation to be available - gracefully degrade
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser - ETA will not be available");
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

          // Only emit if socket is connected
          socketRef.current?.emit("locationUpdate", {
            rideId: rideData.rideId,
            userType: rideData.userType,
            coords: locationData,
          });
        },
        (error) => {
          console.warn("Geolocation error:", error.code, error.message);
          // Don't block the ride - just set a non-intrusive warning
          if (error.code === error.PERMISSION_DENIED) {
            setLocationError("Location permission denied - ETA unavailable");
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            setLocationError("Location information not available");
          } else if (error.code === error.TIMEOUT) {
            setLocationError("Location request timed out");
          }
          // Don't disable tracking - keep trying
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    };

    try {
      startTracking();
    } catch (e) {
      console.warn("Failed to start geolocation tracking:", e);
      // Continue anyway - map can still be shown
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
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
    const entered = driverOtpDigits.join("");

    if (!rideId || !entered) {
      setOtpError("Please enter OTP");
      return;
    }

    if (entered.length !== 4) {
      setOtpError("OTP must be 4 digits");
      return;
    }

    try {
      setVerifyingOtp(true);
      setOtpError(null);

      console.log(`Verifying OTP for ride ${rideId}:`, entered);

      const response = await fetch(`/api/rides/${rideId}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: entered }),
      });

      console.log(`OTP verification response status: ${response.status}`);

      if (!response.ok) {
        // Try to parse JSON error, otherwise read text
        let errMsg = "Failed to verify OTP";
        try {
          const errorData = await response.json();
          errMsg = errorData.error || JSON.stringify(errorData);
        } catch (e) {
          try {
            const text = await response.text();
            if (text) errMsg = text;
          } catch (e2) {
            // ignore
          }
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      console.log('OTP verification response:', data);

      if (data.verified) {
        console.log('OTP verified successfully, transitioning to in_progress');

        // Update all state at once to ensure proper transition
        setOtpVerified(true);
        localStorage.setItem(`otp_verified_${rideId}`, "true");
        setDriverOtpDigits(["", "", "", ""]);

        // Transition to in_progress stage with a small delay to ensure state updates propagate
        setTimeout(() => {
          setRideStage("in_progress");
          console.log("Transitioned to in_progress stage");
        }, 100);

        // Notify other user (server also emits otpVerified)
        socketRef.current?.emit("otpVerified", { rideId });

        // Show success message
        alert("OTP verified! Starting ride...");
      } else {
        setOtpError("OTP verification failed. Please try again.");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to verify OTP";
      // Provide clearer guidance for network failures
      if (msg === "Failed to fetch" || msg.toLowerCase().includes('network')) {
        setOtpError('Network error: could not reach server. Check server/dev server is running and try again.');
      } else {
        setOtpError(msg);
      }
      console.error('OTP verify error:', error);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCompleteRide = async () => {
    if (!rideId) return;

    try {
      setCompletingRide(true);
      setCompleteError(null);

      const response = await fetch(`/api/rides/${rideId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distance: rideData?.distanceTravelledInKm,
        }),
      });

      if (!response.ok) {
        let errMsg = 'Failed to complete ride';
        try {
          const errBody = await response.json();
          errMsg = errBody.error || JSON.stringify(errBody);
        } catch (e) {
          try {
            const txt = await response.text();
            if (txt) errMsg = txt;
          } catch (e2) {
            // ignore
          }
        }
        throw new Error(errMsg);
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

      setRideStage("payment_summary");

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
      const msg = error instanceof Error ? error.message : 'Failed to complete ride';
      setCompleteError(msg);
      // also show an alert so driver notices immediately
      alert(msg);
    } finally {
      setCompletingRide(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!rideId) return;

    try {
      setConfirmingPayment(true);

      const response = await fetch(`/api/rides/${rideId}/confirm-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        let errMsg = 'Failed to confirm payment';
        try {
          const errBody = await response.json();
          errMsg = errBody.error || JSON.stringify(errBody);
        } catch (e) {
          try {
            const txt = await response.text();
            if (txt) errMsg = txt;
          } catch (e2) {
            // ignore
          }
        }
        throw new Error(errMsg);
      }

      setPaymentConfirmed(true);
      setRideStage("feedback");

      // Notify other user
      socketRef.current?.emit("paymentConfirmed", { rideId });
    } catch (error) {
      console.error("Error confirming payment:", error);
      const msg = error instanceof Error ? error.message : 'Failed to confirm payment';
      alert(msg);
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleSkipFeedback = async () => {
    try {
      setFeedbackSkipped(true);
      // Navigate to dashboard after skipping feedback
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (error) {
      console.error("Error skipping feedback:", error);
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

      const response = await fetch(`/api/ride-history/${historyData.rideHistoryId}/rate`, {
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

  // Auto-enable tracking when ride transitions to in_progress
  useEffect(() => {
    if (rideStage === "in_progress" && !trackingEnabled) {
      setTrackingEnabled(true);
      setLocationError(null);
    }
  }, [rideStage]);

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
            <p className="text-red-700 mb-4">
              {error ? error.replace("ValidationError:", "").trim() : "Ride not found. Please try again."}
            </p>
            <p className="text-sm text-red-600 mb-4">
              If this issue persists, please contact support or refresh the page.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
                Refresh
              </Button>
              <Button onClick={() => navigate("/dashboard")} variant="outline" className="flex-1">
                Dashboard
              </Button>
            </div>
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
            {rideStage === "payment_summary" && "Ride Completed • Confirm Payment"}
            {rideStage === "feedback" && "Share your feedback"}
          </p>
          {/* Debug info for testing */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-3 text-xs bg-blue-100 border border-blue-300 rounded px-2 py-1 text-blue-700">
              Stage: {rideStage} | Verified: {otpVerified ? "✓" : "✗"} | Tracking: {trackingEnabled ? "on" : "off"}
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <Badge
            className={`px-4 py-2 text-base ${
              rideStage === "otp_pending"
                ? "bg-orange-500 text-white"
                : rideStage === "in_progress"
                ? "bg-blue-500 text-white"
                : rideStage === "payment_summary"
                ? "bg-green-500 text-white"
                : "bg-purple-500 text-white"
            }`}
          >
            {rideStage === "otp_pending" && "🔐 Waiting for OTP Verification"}
            {rideStage === "in_progress" && "🚗 Ride In Progress"}
            {rideStage === "payment_summary" && "✓ Ride Completed"}
            {rideStage === "feedback" && "⭐ Share Feedback"}
          </Badge>
        </div>

        {/* OTP / CONFIRMATION STAGE: full-screen map with floating OTP/details panel */}
        {rideStage === "otp_pending" && (
          <div className="relative h-[calc(100vh-4rem)]">{/* full viewport minus header padding */}
            <div className="absolute inset-0 z-0">
              <MapComponent
                pickup={rideData.pickupLocation}
                dropoff={rideData.dropoffLocation}
                height="h-screen"
                currentLocation={currentLocation}
                otherLocation={otherLocation}
                userType={rideData.userType}
              />
            </div>

            {/* Floating panel: bottom on mobile, side on desktop */}
            <div className="absolute left-4 right-4 bottom-4 lg:bottom-auto lg:top-8 lg:right-8 lg:left-auto lg:w-96 z-20">
              <Card className="shadow-xl">
                <CardContent>
                  <div className="space-y-4">
                    {userType === "passenger" ? (
                      <div>
                        <p className="text-sm text-gray-600">Share this PIN with your driver</p>
                        <div className="mt-2 bg-orange-100 rounded-lg p-6 text-center">
                          <div className="text-5xl font-bold text-orange-600 font-mono tracking-wider">{otp || "----"}</div>
                        </div>
                        <div className="mt-3">
                          <p className="text-xs text-gray-500">Driver</p>
                          <div className="font-semibold">{rideData.driverName}</div>
                          <div className="text-sm text-gray-700">{rideData.carBrand} {rideData.carModel}</div>
                          {rideData.carLicensePlate && <div className="text-sm font-mono text-blue-600">{rideData.carLicensePlate}</div>}
                          <a className="mt-2 block text-center text-blue-600 font-semibold" href={`tel:${rideData.driverPhone}`}>Call Driver</a>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-600">Enter passenger PIN</p>
                        <div className="mt-2 flex justify-center gap-2">
                          {[0, 1, 2, 3].map((i) => (
                            <input
                              key={i}
                              ref={(el) => (inputRefs.current[i] = el)}
                              type="text"
                              inputMode="numeric"
                              value={driverOtpDigits[i]}
                              onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, "").slice(0, 1);
                                const next = [...driverOtpDigits];
                                next[i] = v;
                                setDriverOtpDigits(next);
                                if (v && i < 3) {
                                  inputRefs.current[i + 1]?.focus();
                                }
                                if (otpError) setOtpError(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Backspace" && !driverOtpDigits[i] && i > 0) {
                                  inputRefs.current[i - 1]?.focus();
                                }
                              }}
                              placeholder="-"
                              className="w-12 h-12 text-3xl text-center font-bold border-2 border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 tracking-widest font-mono"
                            />
                          ))}
                        </div>
                        {otpError && <div className="mt-2 text-sm text-red-600">❌ {otpError}</div>}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <Button onClick={handleVerifyOtp} disabled={verifyingOtp || driverOtpDigits.join('').length !== 4} className="bg-orange-600">{verifyingOtp ? 'Verifying...' : 'Verify'}</Button>
                          <Button onClick={() => { /* optional cancel */ }} variant="outline">Cancel</Button>
                        </div>

                        <div className="mt-4">
                          <p className="text-xs text-gray-500">Passenger</p>
                          <div className="font-semibold">{rideData.passengerName}</div>
                          <div className="text-sm text-gray-700">Seats: {rideData.seatsBooked || 1}</div>
                          <a className="mt-2 block text-center text-green-600 font-semibold" href={`tel:${rideData.passengerPhone}`}>Call Passenger</a>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* IN-PROGRESS: full-screen map with floating controls and details */}
        {rideStage === "in_progress" && (
          <div className="relative h-[calc(100vh-4rem)] bg-gray-100">
            <div className="absolute inset-0 z-0">
              <MapComponent
                pickup={rideData.pickupLocation}
                dropoff={rideData.dropoffLocation}
                height="h-screen"
                currentLocation={currentLocation}
                otherLocation={otherLocation}
                userType={rideData.userType}
              />
            </div>

            {/* Top-left small badge with ETA */}
            <div className="absolute left-4 top-4 z-20">
              <Badge className="bg-blue-100 text-blue-800">
                {eta && eta !== "--" ? `ETA: ${eta}` : "📍 Tracking..."}
              </Badge>
            </div>

            {/* Location error indicator (non-blocking) */}
            {locationError && (
              <div className="absolute left-4 top-20 z-20">
                <div className="bg-orange-100 border border-orange-300 rounded px-3 py-2 text-xs text-orange-800">
                  {locationError}
                </div>
              </div>
            )}

            {/* Floating controls panel: bottom on mobile, side on desktop */}
            <div className="absolute left-4 right-4 bottom-4 lg:bottom-auto lg:top-8 lg:right-8 lg:left-auto lg:w-96 z-20">
              <Card className="shadow-xl">
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-500">{userType === 'passenger' ? 'Driver' : 'Passenger'}</div>
                        <div className="font-semibold">{userType === 'passenger' ? rideData.driverName : rideData.passengerName}</div>
                        {userType === 'passenger' ? (
                          <div className="text-sm text-gray-700">{rideData.carBrand} {rideData.carModel}</div>
                        ) : (
                          <div className="text-sm text-gray-700">Seats: {rideData.seatsBooked}</div>
                        )}
                        {rideData.carLicensePlate && userType === 'passenger' && (
                          <div className="text-sm font-mono text-blue-600">{rideData.carLicensePlate}</div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <a href={`tel:${userType === 'passenger' ? rideData.driverPhone : rideData.passengerPhone}`} className="block px-3 py-2 bg-white rounded text-center font-semibold text-blue-600">Call</a>
                        {userType === 'driver' && (
                          <Button onClick={handleCompleteRide} disabled={completingRide} className="bg-blue-600 text-white">{completingRide ? 'Completing...' : 'Complete'}</Button>
                        )}
                      </div>
                    </div>

                    {/* Tracking controls removed - live tracking handled automatically when in-progress */}
                    {completeError && <div className="text-sm text-red-600">❌ {completeError}</div>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* PAYMENT SUMMARY STAGE */}
        {rideStage === "payment_summary" && paymentSummary && (
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

                {userType === "driver" && (
                  <Button
                    onClick={handleConfirmPayment}
                    disabled={confirmingPayment}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                  >
                    {confirmingPayment ? "Confirming..." : "✓ Payment Received"}
                  </Button>
                )}

                {userType === "passenger" && !paymentConfirmed && (
                  <div className="text-center text-sm text-gray-600">
                    Waiting for driver to confirm payment...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Driver/Passenger Info Card */}
            <Card className="border-2 border-blue-300">
              <CardHeader>
                <CardTitle className="text-center text-xl">👤 Ride Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">{userType === "passenger" ? "Driver" : "Passenger"}</p>
                  <p className="text-lg font-semibold">{userType === "passenger" ? rideData.driverName : rideData.passengerName}</p>
                  {userType === "passenger" && (
                    <>
                      <p className="text-sm text-gray-600">{rideData.carBrand} {rideData.carModel}</p>
                      {rideData.carLicensePlate && <p className="text-sm font-mono text-blue-600">{rideData.carLicensePlate}</p>}
                    </>
                  )}
                </div>

                <div className="border-t border-blue-200 pt-4">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  {paymentConfirmed ? (
                    <p className="text-lg font-semibold text-green-600">✓ Ride Completed</p>
                  ) : (
                    <p className="text-sm text-gray-600">Waiting for payment confirmation...</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* FEEDBACK STAGE */}
        {rideStage === "feedback" && paymentSummary && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feedback Card */}
            <Card className="border-2 border-yellow-300">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-center flex-1 text-2xl">⭐ Share Feedback</CardTitle>
                  <Button
                    onClick={handleSkipFeedback}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                  >
                    Skip
                  </Button>
                </div>
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
                    {submittingRating ? "Submitting..." : "Submit Feedback"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Ride Completed Info */}
            <Card className="border-2 border-green-300">
              <CardHeader>
                <CardTitle className="text-center text-2xl">✓ Ride Completed</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-gray-700 mb-4">
                    Thank you for completing your ride!
                  </p>

                  <div className="bg-green-50 rounded-lg p-4 space-y-3 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Distance</span>
                      <span className="font-semibold">{paymentSummary.distance.toFixed(2)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Total Fare</span>
                      <span className={`font-semibold text-lg ${userType === "passenger" ? "text-red-600" : "text-green-600"}`}>
                        {userType === "passenger" ? "-" : "+"} ₹{paymentSummary.totalFare}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 space-y-2">
                    <p className="font-semibold text-gray-700">{userType === "passenger" ? rideData.driverName : rideData.passengerName}</p>
                    {userType === "passenger" && (
                      <p className="text-xs">{rideData.carBrand} {rideData.carModel}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
