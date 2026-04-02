import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { getSocket } from "@/lib/socket";
import { Phone, User, Car, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google && (window as any).google.maps) {
      resolve();
      return;
    }
    if (!apiKey) {
      reject(new Error('Google Maps API key missing - please set VITE_GOOGLE_MAPS_KEY'));
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=geometry,places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
}

export default function PassengerTracking() {
  const { rideId } = useParams<{ rideId: string }>();
  const location = useLocation();
  const mapRef = useRef<google.maps.Map | null>(null);
  const driverMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const pickupMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  
  // OTP and Ride Status States
  const [otp, setOtp] = useState<string | null>(null);
  const [rideStatus, setRideStatus] = useState<'waiting' | 'in_progress' | 'completed'>('waiting');
  const [isRideStarted, setIsRideStarted] = useState(false);

interface DriverInfo {
  name: string;
  email: string;
  carBrand: string;
  carModel: string;
  carLicensePlate: string;
  driverPhone: string;
  gender: string;
  pickupLocation: string;
  dropoffLocation: string;
  date: string;
  time: string;
}

  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    loadGoogleMaps(key)
      .then(() => setApiLoaded(true))
      .catch(console.error);
  }, []);

  // Extract driver info and OTP from location state, localStorage, or fetch from API
  useEffect(() => {
    if (!rideId) return;

    // First, try to get driver info and OTP from location state (passed from booking acceptance)
    const state = location.state as any;
    if (state?.driverInfo) {
      setDriverInfo(state.driverInfo);
      console.log("✓ Driver info loaded from location state:", state.driverInfo);
      
      // Also check for OTP in location state
      if (state?.otp) {
        setOtp(state.otp);
        setRideStatus('waiting');
        console.log("✓ OTP loaded from location state:", state.otp);
        return;
      }
    }

    // Second, try localStorage (set by socket event or polling)
    const storedBooking = localStorage.getItem(`booking_${rideId}`);
    if (storedBooking) {
      try {
        const bookingData = JSON.parse(storedBooking);
        if (bookingData.driverInfo && (Date.now() - bookingData.timestamp) < 3600000) { // 1 hour expiry
          setDriverInfo(bookingData.driverInfo);
          console.log("✓ Driver info loaded from localStorage:", bookingData.driverInfo);
          
          // ✅ EXTRACT OTP FROM LOCALSTORAGE
          if (bookingData.otp) {
            setOtp(bookingData.otp);
            setRideStatus('waiting');
            console.log("✓ OTP loaded from localStorage:", bookingData.otp);
            return; // Got everything, done!
          }
        } else {
          // Expired data, remove it
          localStorage.removeItem(`booking_${rideId}`);
        }
      } catch (error) {
        console.error("Error parsing stored booking data:", error);
        localStorage.removeItem(`booking_${rideId}`);
      }
    }

    // Third, fetch from API as fallback
    fetchDriverInfoAndOtp();
  }, [rideId, location.state]);

  // Fetch OTP from API
  const fetchOtpFromApi = async () => {
    if (!rideId) return;
    try {
      const response = await fetch(`/api/rides/${rideId}`);
      const ride = await response.json();
      if (ride?.otp) {
        setOtp(ride.otp);
        setRideStatus('waiting');
        console.log("✓ OTP fetched from API:", ride.otp);
      }
    } catch (error) {
      console.error("Failed to fetch OTP:", error);
    }
  };

  // Fetch both driver info and OTP
  const fetchDriverInfoAndOtp = async () => {
    if (!rideId) return;
    
    // Try to get from localStorage (set by socket notification)
    const storedBooking = localStorage.getItem(`booking_${rideId}`);
    if (storedBooking) {
      try {
        const bookingData = JSON.parse(storedBooking);
        if (bookingData.driverInfo && (Date.now() - bookingData.timestamp) < 3600000) { // 1 hour expiry
          setDriverInfo(bookingData.driverInfo);
          console.log("✓ Driver info loaded from localStorage:", bookingData.driverInfo);
          
          // ✓ EXTRACT OTP FROM LOCALSTORAGE
          if (bookingData.otp) {
            setOtp(bookingData.otp);
            setRideStatus('waiting');
            console.log("✓ OTP loaded from localStorage:", bookingData.otp);
            return; // Don't call API if we have everything from localStorage
          }
          
          // If no OTP in storage, fetch from API
          fetchOtpFromApi();
          return;
        } else {
          // Expired data, remove it
          localStorage.removeItem(`booking_${rideId}`);
        }
      } catch (error) {
        console.error("Error parsing stored booking data:", error);
        localStorage.removeItem(`booking_${rideId}`);
      }
    }

    // Fallback: Fetch driver info from API
    try {
      const response = await fetch(`/api/rides/${rideId}/details`);
      const data = await response.json();

      if (data.bookings && data.bookings.length > 0) {
        // Find the accepted booking
        const acceptedBooking = data.bookings.find((b: any) => b.status === 'accepted');
        if (acceptedBooking) {
          const driverData = {
            name: acceptedBooking.driverName,
            email: acceptedBooking.driverEmail,
            carBrand: acceptedBooking.carBrand,
            carModel: acceptedBooking.carModel,
            carLicensePlate: acceptedBooking.carLicensePlate,
            driverPhone: acceptedBooking.driverPhone,
            gender: acceptedBooking.driverGender || 'not specified',
            pickupLocation: acceptedBooking.pickupLocation,
            dropoffLocation: acceptedBooking.dropoffLocation,
            date: acceptedBooking.date,
            time: acceptedBooking.time,
          };
          setDriverInfo(driverData);
          console.log("✓ Driver info loaded from API:", driverData);
        }
      }
      
      // Also fetch OTP from the ride API
      const rideResponse = await fetch(`/api/rides/${rideId}`);
      const ride = await rideResponse.json();
      if (ride?.otp) {
        setOtp(ride.otp);
        setRideStatus('waiting');
        console.log("✓ OTP fetched from API:", ride.otp);
      }
    } catch (error) {
      console.error("Failed to fetch driver info or OTP:", error);
    }
  };

  useEffect(() => {
    if (!apiLoaded || !rideId) return;

    mapRef.current = new google.maps.Map(document.getElementById('map') as HTMLElement, {
      center: { lat: 0, lng: 0 },
      zoom: 14,
    });

    const mapOptions: google.maps.MapOptions = {};
    const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
    if (mapId) mapOptions.mapId = mapId;
    mapRef.current?.setOptions(mapOptions);

    // Create marker content elements
    const driverContent = document.createElement('div');
    driverContent.innerHTML = '🚗';
    driverContent.style.fontSize = '32px';
    driverContent.style.textAlign = 'center';
    driverContent.style.lineHeight = '1';

    const passengerContent = document.createElement('div');
    passengerContent.innerHTML = '🧍';
    passengerContent.style.fontSize = '32px';
    passengerContent.style.textAlign = 'center';
    passengerContent.style.lineHeight = '1';

    driverMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
      map: mapRef.current as google.maps.Map,
      title: 'Driver',
      position: { lat: 0, lng: 0 },
      content: driverContent
    });
    pickupMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
      map: mapRef.current as google.maps.Map,
      title: 'You (Passenger)',
      position: { lat: 0, lng: 0 },
      content: passengerContent
    });

    // geocode pickup in case we want to show it
    fetch(`/api/rides/${rideId}`)
      .then(res => res.json())
      .then((ride: any) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: ride.pickupLocation }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const loc = results[0].geometry.location;
            const locLiteral: google.maps.LatLngLiteral = { lat: loc.lat(), lng: loc.lng() };
            if (pickupMarkerRef.current) {
              pickupMarkerRef.current.position = locLiteral;
            }
            if (mapRef.current) {
              mapRef.current.setCenter(locLiteral);
            }
          }
        });
      })
      .catch(console.error);

    const socket = getSocket();
    socket.emit('joinRide', { rideId, userType: 'passenger' });

    socket.on('driverLocation', (coords: { lat: number; lng: number }) => {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.position = coords;
      }
    });

    // Listen for booking acceptance notifications
    socket.on('bookingAccepted', (data: any) => {
      console.log('Received booking accepted notification:', data);

      if (data.driverInfo && data.passengerInfo) {
        // Store the data and redirect to tracking page
        localStorage.setItem(`booking_${data.rideId}`, JSON.stringify({
          driverInfo: data.driverInfo,
          passengerInfo: data.passengerInfo,
          timestamp: Date.now()
        }));

        // Navigate to passenger tracking page
        window.location.href = data.redirectUrl;
      }
    });

    // Listen for ride start event (when driver verifies OTP)
    socket.on('rideStarted', (data: any) => {
      console.log('🚀 Ride started event received:', data);
      setIsRideStarted(true);
      setRideStatus('in_progress');

      // Redirect passenger to the driver's tracking page so both see the same interface
      if (rideId) {
        window.location.href = `/track-driver/${rideId}`;
      }
    });

    // Listen for ride status updates
    socket.on('rideStatusUpdate', (data: any) => {
      console.log('Ride status update:', data);
      if (data.status === 'in_progress') {
        setIsRideStarted(true);
        setRideStatus('in_progress');

        // If the ride status changes to in_progress, navigate passenger to driver view
        if (rideId) {
          window.location.href = `/track-driver/${rideId}`;
        }
      } else if (data.status === 'completed') {
        setRideStatus('completed');
      }
    });

    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (pickupMarkerRef.current) {
          pickupMarkerRef.current.position = coords;
        }
        socket.emit('locationUpdate', { rideId, userType: 'passenger', coords });
      },
      err => console.error(err),
      { enableHighAccuracy: true }
    );

    return () => {
      socket.off('driverLocation');
      socket.off('bookingAccepted');
      socket.off('rideStarted');
      socket.off('rideStatusUpdate');
      navigator.geolocation.clearWatch(watchId);
    };
  }, [apiLoaded, rideId]);

  return (
    <div className="w-full h-screen flex flex-col relative">
      <div id="map" className="w-full flex-1" />

      {/* OTP Display Card - Floating on top left when ride is waiting */}
      {otp && !isRideStarted && rideStatus === 'waiting' && (
        <Card className="absolute top-4 left-4 w-96 bg-gradient-to-br from-blue-50 to-blue-100 backdrop-blur-sm shadow-2xl border-2 border-blue-400 z-20 animate-pulse">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-blue-700">
              🔐 SHARE THIS PIN WITH YOUR DRIVER
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Large OTP Display */}
            <div className="bg-white rounded-xl p-6 border-2 border-blue-300 shadow-md">
              <p className="text-xs text-gray-600 uppercase font-bold tracking-wide mb-2">
                Your Ride PIN
              </p>
              <div className="text-6xl font-black text-center text-blue-600 tracking-widest font-mono">
                {otp}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-3 space-y-1">
              <p className="text-sm font-semibold text-blue-900">How to use:</p>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>Share this 4-digit PIN with your driver</li>
                <li>Driver enters PIN on their screen to verify</li>
                <li>Ride starts once PIN is verified ✓</li>
              </ol>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center justify-center gap-2 text-sm text-blue-700 font-semibold bg-blue-100 rounded-lg py-2">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
              Waiting for driver to verify...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ride Started Badge - Replace OTP with this when ride starts */}
      {isRideStarted && rideStatus === 'in_progress' && (
        <Card className="absolute top-4 left-4 w-80 bg-gradient-to-br from-green-50 to-green-100 backdrop-blur-sm shadow-lg border-2 border-green-400 z-20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-green-700">
              <span className="text-2xl">✓</span>
              Ride in Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-sm text-green-800 font-semibold">
                🚗 Driver verified your PIN
              </p>
              <p className="text-xs text-green-700 mt-2">
                Your ride has started. Sit back and enjoy!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Driver Contact Card - Floating on top right */}
      {driverInfo && (
        <Card className="absolute top-4 right-4 w-80 bg-white/95 backdrop-blur-sm shadow-lg border-2 border-green-200 z-10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-green-700">
              <Car className="w-5 h-5" />
              Driver Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Name:</span>
              <span className="text-gray-900">{driverInfo.name}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Phone:</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => window.open(`tel:${driverInfo.driverPhone}`, '_self')}
              >
                <Phone className="w-3 h-3 mr-1" />
                Call
              </Button>
            </div>

            <div className="pt-2 border-t">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Vehicle:</span>
                  <span className="text-gray-900 text-sm">
                    {driverInfo.carBrand} {driverInfo.carModel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">License:</span>
                  <span className="text-gray-900 text-sm font-mono">
                    {driverInfo.carLicensePlate}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div><strong>Pickup:</strong> {driverInfo.pickupLocation}</div>
                  <div><strong>Dropoff:</strong> {driverInfo.dropoffLocation}</div>
                  <div><strong>Time:</strong> {driverInfo.date} at {driverInfo.time}</div>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              📞 {driverInfo.driverPhone}
            </div>
          </CardContent>
        </Card>
      )}

      {!apiLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <div className="text-white text-lg">Loading map...</div>
        </div>
      )}
      {apiLoaded && !rideId && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <div className="text-white text-lg">No ride ID provided</div>
        </div>
      )}
    </div>
  );
}
