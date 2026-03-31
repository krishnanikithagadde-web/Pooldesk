import { DemoResponse } from "@shared/api";
import { useEffect, useState } from "react";
import FareCalculator from "@/components/FareCalculator";

export default function Index() {
  const [exampleFromServer, setExampleFromServer] = useState("");
  // Fetch users on component mount
  useEffect(() => {
    fetchDemo();
  }, []);

  // Example of how to fetch data from the server (if needed)
  const fetchDemo = async () => {
    try {
      const response = await fetch("/api/demo");
      const data = (await response.json()) as DemoResponse;
      setExampleFromServer(data.message);
    } catch (error) {
      console.error("Error fetching hello:", error);
    }
  };

  const handleFareCalculated = (fare: number, distance: number, time: number) => {
    console.log(`Fare calculated: ₹${fare} for ${distance.toFixed(1)}km, ${time.toFixed(0)}mins`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            🚗 Pooldesk - Carpooling App
          </h1>
          <p className="text-slate-600">
            Dynamic fare calculation based on ride distance
          </p>
        </div>

        {/* Fare Calculator Demo */}
        <FareCalculator onFareCalculated={handleFareCalculated} />

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2">📏 Distance-Based</h3>
            <p className="text-gray-600 text-sm">
              Fare changes based ONLY on pickup to destination distance. Driver's route to pickup is never charged.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2">💰 Dynamic Pricing</h3>
            <p className="text-gray-600 text-sm">
              ₹50 base fare + ₹8 per km. Matches actual booking prices with minimum ₹50 fare.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2">🗺️ Real Routes</h3>
            <p className="text-gray-600 text-sm">
              Uses Google Maps Directions API for actual driving distances, not straight-line measurements.
            </p>
          </div>
        </div>

        <p className="mt-4 hidden max-w-md">{exampleFromServer}</p>
      </div>
    </div>
  );
}
