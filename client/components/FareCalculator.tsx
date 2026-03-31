import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateFareFromCoords } from "@/lib/fare";
import { MapPin, Calculator, IndianRupee } from "lucide-react";

interface FareCalculatorProps {
  onFareCalculated?: (fare: number, distance: number, time: number) => void;
}

export default function FareCalculator({ onFareCalculated }: FareCalculatorProps) {
  const [pickupAddress, setPickupAddress] = useState("HITEC City, Hyderabad");
  const [destinationAddress, setDestinationAddress] = useState("Gachibowli, Hyderabad");
  const [pickupCoords, setPickupCoords] = useState<{lat: number, lng: number} | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{lat: number, lng: number} | null>(null);
  const [fareResult, setFareResult] = useState<{
    distanceKm: number;
    timeMins: number;
    fare: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Geocode addresses to coordinates
  const geocodeAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!apiKey) return null;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results[0]) {
        const location = data.results[0].geometry.location;
        return { lat: location.lat, lng: location.lng };
      }
    } catch (err) {
      console.error('Geocoding failed:', err);
    }
    return null;
  };

  // Calculate fare when both coordinates are available
  useEffect(() => {
    if (pickupCoords && destinationCoords) {
      calculateFare();
    }
  }, [pickupCoords, destinationCoords]);

  const calculateFare = async () => {
    if (!pickupCoords || !destinationCoords) return;

    setLoading(true);
    setError(null);

    try {
      const result = await calculateFareFromCoords(pickupCoords, destinationCoords);
      setFareResult(result);

      // Notify parent component
      if (onFareCalculated) {
        onFareCalculated(result.fare, result.distanceKm, result.timeMins);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate fare');
      setFareResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePickupChange = async (address: string) => {
    setPickupAddress(address);
    const coords = await geocodeAddress(address);
    setPickupCoords(coords);
  };

  const handleDestinationChange = async (address: string) => {
    setDestinationAddress(address);
    const coords = await geocodeAddress(address);
    setDestinationCoords(coords);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Fare Calculator
        </CardTitle>
        <p className="text-sm text-gray-600">
          Fare changes based on ride distance from pickup to destination only
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Pickup Location */}
        <div className="space-y-2">
          <Label htmlFor="pickup" className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-600" />
            Pickup Location
          </Label>
          <Input
            id="pickup"
            value={pickupAddress}
            onChange={(e) => handlePickupChange(e.target.value)}
            placeholder="Enter pickup address"
            className="w-full"
          />
        </div>

        {/* Destination Location */}
        <div className="space-y-2">
          <Label htmlFor="destination" className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-600" />
            Destination
          </Label>
          <Input
            id="destination"
            value={destinationAddress}
            onChange={(e) => handleDestinationChange(e.target.value)}
            placeholder="Enter destination address"
            className="w-full"
          />
        </div>

        {/* Fare Result */}
        {fareResult && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Distance</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {fareResult.distanceKm.toFixed(1)} km
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Est. Time</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {fareResult.timeMins.toFixed(0)} min
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Fare</p>
                  <p className="text-3xl font-bold text-green-600 flex items-center justify-center gap-1">
                    <IndianRupee className="w-6 h-6" />
                    {fareResult.fare}
                  </p>
                </div>
              </div>

          <div className="mt-4 p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-700">
                  <strong>Fare Breakdown:</strong><br />
                  Base fare: ₹30 + Distance: ₹{(fareResult.distanceKm * 8).toFixed(2)} ({fareResult.distanceKm.toFixed(1)}km × ₹8/km) + Time: ₹{(fareResult.timeMins * 0.2).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Calculating fare...
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600 text-center">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
          <p className="font-semibold mb-2">💡 How fare calculation works:</p>
          <ul className="space-y-1">
            <li>• <strong>Distance Only:</strong> Fare is based ONLY on pickup to destination distance</li>
            <li>• <strong>Driver Route Ignored:</strong> Distance driver travels to pickup is NOT charged</li>
            <li>• <strong>Dynamic Pricing:</strong> Longer rides = higher fares (₹12 per km)</li>
            <li>• <strong>Real Roads:</strong> Uses actual driving routes, not straight lines</li>
          </ul>
        </div>

        {/* Test Cases */}
        <div className="text-sm text-gray-600">
          <p className="font-semibold mb-2">🧪 Test different distances:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handlePickupChange("HITEC City, Hyderabad");
                handleDestinationChange("Gachibowli, Hyderabad");
              }}
            >
              Short: HITEC → Gachibowli (~5km)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handlePickupChange("HITEC City, Hyderabad");
                handleDestinationChange("Shamshabad Airport, Hyderabad");
              }}
            >
              Long: HITEC → Airport (~40km)
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}