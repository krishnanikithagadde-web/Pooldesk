import React, { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Loader, AlertCircle } from "lucide-react";

interface LocationData {
  lat: number;
  lng: number;
  timestamp?: number;
}

interface MapComponentProps {
  pickup: string;
  dropoff: string;
  height?: string;
  onRouteReady?: (distance: number, duration: string) => void;
  currentLocation?: LocationData | null;
  otherLocation?: LocationData | null;
  userType?: "driver" | "passenger";
}

interface RouteData {
  distanceKm: number;
  durationText: string;
}

declare global {
  interface Window {
    google: any;
  }
}

let mapsScriptLoading = false;
let mapsScriptLoaded = false;
const mapsScriptCallbacks: (() => void)[] = [];

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

export default function MapComponent({
  pickup,
  dropoff,
  height = "h-96",
  onRouteReady,
  currentLocation,
  otherLocation,
  userType = "passenger",
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);
  const markersRef = useRef<any>({ current: null, other: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);

  // Load Google Maps API script
  useEffect(() => {
    if (!API_KEY) {
      console.error("❌ VITE_GOOGLE_MAPS_KEY environment variable is not set");
      setError("Maps API key not configured. Check your .env file.");
      setIsLoading(false);
      return;
    }

    const loadMapsAPI = () => {
      if (mapsScriptLoaded && window.google) {
        initializeMap();
      } else if (mapsScriptLoading) {
        mapsScriptCallbacks.push(() => initializeMap());
      } else {
        mapsScriptLoading = true;
        const script = document.createElement("script");
        
        // Build URL with proper parameters
        const params = new URLSearchParams({
          key: API_KEY,
          libraries: "places,directions,geometry",
          v: "weekly",
        });
        
        script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          mapsScriptLoaded = true;
          console.log("✓ Google Maps API loaded successfully");
          initializeMap();
          while (mapsScriptCallbacks.length > 0) {
            const callback = mapsScriptCallbacks.shift();
            if (callback) callback();
          }
        };

        script.onerror = () => {
          console.error("✗ Failed to load Google Maps API - Check API key, quota, and billing");
          setError(
            "Failed to load Google Maps. Verify API key in Google Cloud Console."
          );
          setIsLoading(false);
          mapsScriptLoading = false;
        };

        document.head.appendChild(script);
      }
    };

    loadMapsAPI();
  }, []);

  const initializeMap = () => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return; // Already initialized

    try {
      if (!window.google || !window.google.maps) {
        console.error("Google Maps not available");
        setError("Google Maps library not available");
        setIsLoading(false);
        return;
      }

      // Default center (Hyderabad, India)
      const defaultCenter = { lat: 17.3850, lng: 78.4867 };

      const mapInstance = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        center: defaultCenter,
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: false,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      mapInstanceRef.current = mapInstance;
      directionsServiceRef.current = new window.google.maps.DirectionsService();
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: mapInstance,
        suppressMarkers: false,
      });

      setError(null);
      setIsLoading(false);
      console.log("✓ Map initialized successfully");
    } catch (err) {
      console.error("Error initializing map:", err);
      setError("Failed to initialize map");
      setIsLoading(false);
    }
  };

  // Update route when pickup or dropoff changes
  useEffect(() => {
    if (!mapInstanceRef.current || !directionsServiceRef.current || !directionsRendererRef.current) {
      return;
    }

    if (!pickup || !dropoff) {
      directionsRendererRef.current.setDirections({ routes: [] });
      return;
    }

    displayRoute();
  }, [pickup, dropoff]);

  const displayRoute = async () => {
    if (!directionsServiceRef.current || !directionsRendererRef.current || !pickup || !dropoff) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`Calculating route from "${pickup}" to "${dropoff}"`);

      const result = await directionsServiceRef.current.route({
        origin: pickup,
        destination: dropoff,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });

      if (result.status === window.google.maps.DirectionsStatus.OK) {
        directionsRendererRef.current.setDirections(result);

        // Extract route data
        const route = result.routes[0];
        if (route?.legs?.[0]) {
          const leg = route.legs[0];
          const distanceKm = leg.distance.value / 1000;
          const durationText = leg.duration.text;
          
          const data: RouteData = {
            distanceKm,
            durationText,
          };
          
          setRouteData(data);
          
          if (onRouteReady) {
            onRouteReady(distanceKm, durationText);
          }
          
          console.log(
            `✓ Route: ${leg.distance.text} | Duration: ${durationText}`
          );
        }
        setError(null);
      } else if (result.status === "ZERO_RESULTS") {
        console.warn("No route found between locations");
        setError("No route found between these locations. Check the addresses.");
      } else if (result.status === "REQUEST_DENIED") {
        console.error("Directions API request denied - check API key permissions");
        setError("Maps API not properly configured. Enable Directions API.");
      } else {
        console.error(`Directions error: ${result.status}`);
        setError(`Unable to calculate route: ${result.status}`);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load route";
      console.error("Route calculation error:", err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Update live location markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;

    // Update current user location marker
    if (currentLocation) {
      if (markersRef.current.current) {
        markersRef.current.current.setPosition(
          new window.google.maps.LatLng(currentLocation.lat, currentLocation.lng)
        );
      } else {
        markersRef.current.current = new window.google.maps.Marker({
          position: { lat: currentLocation.lat, lng: currentLocation.lng },
          map: mapInstanceRef.current,
          title: userType === "driver" ? "🚗 You (Driver)" : "👤 You (Passenger)",
          icon: userType === "driver" 
            ? "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
            : "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
        });
      }
    }

    // Update other user location marker
    if (otherLocation) {
      if (markersRef.current.other) {
        markersRef.current.other.setPosition(
          new window.google.maps.LatLng(otherLocation.lat, otherLocation.lng)
        );
      } else {
        markersRef.current.other = new window.google.maps.Marker({
          position: { lat: otherLocation.lat, lng: otherLocation.lng },
          map: mapInstanceRef.current,
          title: userType === "driver" ? "👤 Passenger" : "🚗 Driver",
          icon: userType === "driver"
            ? "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
            : "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        });
      }
    }
  }, [currentLocation, otherLocation, userType]);

  return (
    <div className={`${height} relative rounded-xl shadow-md overflow-hidden border-2 border-blue-200`}>
      {/* Map Container */}
      <div
        ref={mapRef}
        className="w-full h-full bg-gray-200"
        style={{ minHeight: "300px" }}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
            <Loader className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="text-sm font-medium text-gray-700">Loading map...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-50 border-2 border-red-200 rounded-lg p-4 shadow-md z-10 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">Map Error</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Info Overlay */}
      {!isLoading && pickup && dropoff && (
        <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur rounded-lg p-4 shadow-md z-10 max-w-xs">
          <div className="space-y-2">
            {/* Pickup */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                <MapPin className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase">From</p>
                <p className="text-sm font-bold text-gray-900 truncate">
                  {pickup}
                </p>
              </div>
            </div>

            {/* Divider & Route Info */}
            <div className="flex items-center gap-2 px-2">
              <div className="flex-1 h-px bg-gray-300"></div>
              <Navigation className="w-4 h-4 text-blue-500 rotate-90 flex-shrink-0" />
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>

            {/* Route Stats */}
            {routeData && (
              <div className="bg-blue-50 rounded px-3 py-2">
                <div className="flex justify-between items-center gap-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Distance</p>
                    <p className="text-sm font-bold text-blue-600">
                      {routeData.distanceKm.toFixed(1)} km
                    </p>
                  </div>
                  <div className="w-px h-8 bg-blue-200"></div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Duration</p>
                    <p className="text-sm font-bold text-blue-600">
                      {routeData.durationText}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Dropoff */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                <MapPin className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase">To</p>
                <p className="text-sm font-bold text-gray-900 truncate">
                  {dropoff}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !pickup && !dropoff && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/50 backdrop-blur z-5">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <MapPin className="w-12 h-12 text-blue-400 mx-auto mb-3 opacity-70" />
            <p className="text-gray-600 font-medium text-sm">Enter pickup and destination</p>
            <p className="text-gray-500 text-xs mt-2">Route will display on the map</p>
          </div>
        </div>
      )}
    </div>
  );
}
