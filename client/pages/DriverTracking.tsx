import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { getSocket } from "@/lib/socket";
import { Phone, User, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Global state for Google Maps API loading
let mapsScriptLoading = false;
let mapsScriptLoaded = false;
const mapsScriptCallbacks: (() => void)[] = [];

declare global {
  interface Window {
    google: any;
  }
}

interface PassengerInfo {
  name: string;
  email: string;
  passengerPhone: string;
  gender: string;
  seatsBooked: number;
  pickupLocation: string;
  dropoffLocation: string;
}

// Helper to load Google Maps script with proper waiting
function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (mapsScriptLoaded && window.google && window.google.maps && window.google.maps.Map) {
      resolve();
      return;
    }

    if (!apiKey) {
      reject(new Error('Google Maps API key missing - please set VITE_GOOGLE_MAPS_KEY'));
      return;
    }

    if (mapsScriptLoading) {
      mapsScriptCallbacks.push(() => resolve());
      return;
    }

    mapsScriptLoading = true;

    const script = document.createElement('script');
    const params = new URLSearchParams({
      key: apiKey,
      libraries: "geometry,places,marker",
      v: "weekly",
    });

    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      mapsScriptLoaded = true;
      console.log("✓ Google Maps API loaded successfully");

      // Wait for google.maps to be fully available
      const checkGoogleMaps = () => {
        if (window.google && window.google.maps && window.google.maps.Map) {
          resolve();
          while (mapsScriptCallbacks.length > 0) {
            const callback = mapsScriptCallbacks.shift();
            if (callback) callback();
          }
        } else {
          setTimeout(checkGoogleMaps, 100);
        }
      };
      checkGoogleMaps();
    };

    script.onerror = () => {
      console.error("✗ Failed to load Google Maps API - Check API key, quota, and billing");
      reject(new Error('Failed to load Google Maps'));
      mapsScriptLoading = false;
    };

    document.head.appendChild(script);
  });
}

export default function DriverTracking() {
  const { rideId } = useParams<{ rideId: string }>();
  const location = useLocation();
  const mapRef = useRef<google.maps.Map | null>(null);
  const driverMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const passengerMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [passengerInfo, setPassengerInfo] = useState<PassengerInfo | null>(null);
  
  // OTP Verification States
  const [otpInput, setOtpInput] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isPassengerVerified, setIsPassengerVerified] = useState(false);

  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    loadGoogleMaps(key)
      .then(() => setApiLoaded(true))
      .catch((error) => {
        console.error("Failed to load Google Maps:", error);
        setApiLoaded(false);
        setIsLoading(false);
      });
  }, []);

  // Extract passenger info from location state or fetch from API
  useEffect(() => {
    if (!rideId) return;

    // First, try to get passenger info from location state (passed from booking acceptance)
    const state = location.state as any;
    if (state?.passengerInfo) {
      setPassengerInfo(state.passengerInfo);
      console.log("✓ Passenger info loaded from location state:", state.passengerInfo);
      return;
    }

    // Fallback: Fetch passenger info from API
    const fetchPassengerInfo = async () => {
      try {
        const response = await fetch(`/api/rides/${rideId}/details`);
        const data = await response.json();

        if (data.bookings && data.bookings.length > 0) {
          // Find the accepted booking for this driver
          const acceptedBooking = data.bookings.find((b: any) => b.status === 'accepted');
          if (acceptedBooking) {
            const passengerData = {
              name: acceptedBooking.passengerName,
              email: acceptedBooking.passengerEmail,
              passengerPhone: acceptedBooking.passengerPhone,
              gender: acceptedBooking.passengerDetails?.[0]?.gender || 'not specified',
              seatsBooked: acceptedBooking.seatsBooked,
              pickupLocation: acceptedBooking.pickupLocation,
              dropoffLocation: acceptedBooking.dropoffLocation,
            };
            setPassengerInfo(passengerData);
            console.log("✓ Passenger info loaded from API:", passengerData);
          }
        }
      } catch (error) {
        console.error("Failed to fetch passenger info:", error);
      }
    };

    fetchPassengerInfo();
  }, [rideId, location.state]);

  useEffect(() => {
    if (!apiLoaded || !rideId || !window.google || !window.google.maps || !window.google.maps.Map) return;

    try {
      // Initialize map centered broadly
      const mapElement = document.getElementById("map") as HTMLElement;
      if (!mapElement) {
        console.error("Map element not found");
        setIsLoading(false);
        return;
      }

      mapRef.current = new window.google.maps.Map(mapElement, {
        center: { lat: 0, lng: 0 },
        zoom: 14,
        mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID
      });

      // Initialize directions service and renderer
      directionsServiceRef.current = new window.google.maps.DirectionsService();
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: mapRef.current,
        suppressMarkers: true // We'll use our own markers
      });

      // Create custom emoji markers
      // Driver marker (you) - 🚗 car emoji
      const driverContent = document.createElement('div');
      driverContent.innerHTML = '🚗';
      driverContent.style.fontSize = '32px';
      driverContent.style.textAlign = 'center';
      driverContent.style.lineHeight = '1';

      // Passenger marker - 🧍 person emoji
      const passengerContent = document.createElement('div');
      passengerContent.innerHTML = '🧍';
      passengerContent.style.fontSize = '32px';
      passengerContent.style.textAlign = 'center';
      passengerContent.style.lineHeight = '1';

      // Create driver marker (you)
      driverMarkerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: 0, lng: 0 },
        title: "You (Driver)",
        content: driverContent
      });

      // Create passenger marker
      passengerMarkerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: 0, lng: 0 },
        title: "Passenger Pickup Location",
        content: passengerContent
      });

      console.log("✓ Map initialized successfully");
      setIsLoading(false);

      // Setup WebSocket listeners for location updates
      const socket = getSocket();
      socket.on('driverLocation', (data: { coords: { lat: number; lng: number } }) => {
        if (driverMarkerRef.current && data.coords) {
          driverMarkerRef.current.position = data.coords;
          console.log("🚗 Driver location updated:", data.coords);
        }
      });

      socket.on('passengerLocation', (data: { coords: { lat: number; lng: number } }) => {
        if (passengerMarkerRef.current && data.coords) {
          passengerMarkerRef.current.position = data.coords;
          console.log("📍 Passenger location updated:", data.coords);
          updateRoute();
        }
      });

      // Join ride room
      socket.emit('joinRide', { rideId });

      // Start GPS tracking
      startGPSTracking();

      // Load ride details and set initial passenger location
      loadRideDetails();

      return () => {
        socket.off('driverLocation');
        socket.off('passengerLocation');
        stopGPSTracking();
      };
    } catch (error) {
      console.error("Failed to initialize map:", error);
      setIsLoading(false);
    }
  }, [apiLoaded, rideId]);

  const startGPSTracking = () => {
    if (watchIdRef.current !== null) return; // Already tracking

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        // Update driver marker
        if (driverMarkerRef.current) {
          driverMarkerRef.current.position = coords;
        }

        // Pan map to current location
        if (mapRef.current) {
          mapRef.current.panTo(coords);
        }

        // Send location update via WebSocket
        const socket = getSocket();
        socket.emit('locationUpdate', {
          rideId,
          userType: 'driver',
          coords
        });

        console.log("📍 Driver GPS update:", coords);

        // Update route if passenger location is known
        updateRoute();
      },
      (error) => {
        console.error("GPS tracking error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const stopGPSTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const updateRoute = () => {
    if (!directionsServiceRef.current || !directionsRendererRef.current ||
        !driverMarkerRef.current?.position || !passengerMarkerRef.current?.position) {
      return;
    }

    const origin = driverMarkerRef.current.position as google.maps.LatLngLiteral;
    const destination = passengerMarkerRef.current.position as google.maps.LatLngLiteral;

    directionsServiceRef.current.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          directionsRendererRef.current?.setDirections(result);
          console.log("✓ Route updated between driver and passenger");
        } else {
          console.warn("Route calculation failed:", status);
        }
      }
    );
  };

  const loadRideDetails = async () => {
    try {
      const response = await fetch(`/api/rides/${rideId}`);
      const ride = await response.json();

      if (ride && ride.pickupLocation) {
        // Geocode pickup location
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: ride.pickupLocation }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            const coords = { lat: location.lat(), lng: location.lng() };

            // Set passenger marker to pickup location
            if (passengerMarkerRef.current) {
              passengerMarkerRef.current.position = coords;
            }

            // Center map on pickup location initially
            if (mapRef.current) {
              mapRef.current.setCenter(coords);
            }

            console.log("✓ Passenger pickup location set:", coords);
            updateRoute();
          }
        });
      }
    } catch (error) {
      console.error("Failed to load ride details:", error);
    }
  };

  // Handle OTP verification
  const handleVerifyPassenger = async () => {
    if (!rideId || !otpInput.trim()) {
      setOtpError("Please enter a 4-digit OTP");
      return;
    }

    if (otpInput.length !== 4) {
      setOtpError("OTP must be exactly 4 digits");
      return;
    }

    setOtpLoading(true);
    setOtpError(null);

    try {
      const response = await fetch(`/api/rides/${rideId}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpInput }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to verify OTP");
      }

      const data = await response.json();
      if (data.verified) {
        setIsPassengerVerified(true);
        setOtpInput('');
        setOtpError(null);
        console.log("✓ Passenger verified successfully!");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid OTP, please try again";
      setOtpError(errorMessage);
      console.error("OTP verification error:", error);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    if (!rideId) return;

    try {
      const response = await fetch(`/api/rides/${rideId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to complete ride");
      }

      alert("✓ Ride completed successfully!");
      // Redirect to dashboard or history
      window.location.href = "/driver-dashboard";
    } catch (error) {
      console.error("Error completing ride:", error);
      alert("Failed to complete ride. Please try again.");
    }
  };

  return (
    <div className="w-full h-screen flex flex-col relative">
      <div id="map" className="w-full flex-1" />

      {/* Passenger Contact Card - Floating on top right */}
      {passengerInfo && (
        <Card className="absolute top-4 right-4 w-80 bg-white/95 backdrop-blur-sm shadow-lg border-2 border-blue-200 z-10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
              <User className="w-5 h-5" />
              Passenger Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Passenger Basic Info */}
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Name:</span>
              <span className="text-gray-900">{passengerInfo.name}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Phone:</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => window.open(`tel:${passengerInfo.passengerPhone}`, '_self')}
              >
                <Phone className="w-3 h-3 mr-1" />
                Call
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Seats:</span>
              <span className="text-gray-900">{passengerInfo.seatsBooked}</span>
            </div>

            {/* Route Details */}
            <div className="pt-2 border-t">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div><strong>From:</strong> {passengerInfo.pickupLocation}</div>
                  <div><strong>To:</strong> {passengerInfo.dropoffLocation}</div>
                </div>
              </div>
            </div>

            {/* OTP Verification Section - Show only if not verified */}
            {!isPassengerVerified && (
              <div className="pt-3 border-t space-y-2">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                  <label className="text-sm font-semibold text-orange-900 block">
                    🔐 Verify Passenger
                  </label>
                  <p className="text-xs text-orange-800">
                    Enter the 4-digit OTP to verify the passenger has boarded.
                  </p>
                  
                  {/* OTP Input */}
                  <input
                    type="text"
                    value={otpInput}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setOtpInput(value);
                      if (otpError) setOtpError(null);
                    }}
                    placeholder="0000"
                    maxLength={4}
                    className="w-full px-3 py-2 border border-orange-300 rounded-md text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />

                  {/* Error Message */}
                  {otpError && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                      ❌ {otpError}
                    </div>
                  )}

                  {/* Verify Button */}
                  <Button
                    onClick={handleVerifyPassenger}
                    disabled={otpLoading || otpInput.length !== 4}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold"
                  >
                    {otpLoading ? "Verifying..." : "Verify Passenger"}
                  </Button>
                </div>
              </div>
            )}

            {/* Verification Success Badge - Show only if verified */}
            {isPassengerVerified && (
              <div className="pt-3 border-t space-y-2">
                <div className="bg-green-50 border border-green-300 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                    <span className="text-lg">✅</span>
                    Passenger Verified
                  </div>
                  <p className="text-xs text-green-800">
                    Passenger identity confirmed and ride in progress.
                  </p>

                  {/* Complete Ride Button */}
                  <Button
                    onClick={handleCompleteRide}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold mt-2"
                  >
                    ✓ Complete Ride
                  </Button>
                </div>
              </div>
            )}

            {/* Phone Number Display */}
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              📞 {passengerInfo.passengerPhone}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-20">
          <div className="text-white text-lg font-semibold">Loading map...</div>
        </div>
      )}
      {!apiLoaded && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 z-20">
          <div className="text-red-600 text-lg font-semibold">
            Failed to load Google Maps. Check your API key.
          </div>
        </div>
      )}
      {apiLoaded && !rideId && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-20">
          <div className="text-white text-lg">No ride ID provided</div>
        </div>
      )}
    </div>
  );
}
