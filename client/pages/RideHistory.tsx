import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import PreviousRidesDashboard from "@/components/RideHistoryDashboard";
import RideOffersHistory from "./RideOffersHistory";

export default function RideHistory() {
  const navigate = useNavigate();

  // Get current user ID from localStorage
  const userId = localStorage.getItem("userId") || "";
  const [activeTab, setActiveTab] = useState("completed-rides");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header with Back Button */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/dashboard")}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-slate-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Ride History</h1>
              <p className="text-sm text-gray-400">View your completed rides and posted offers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800 border border-slate-700 p-1 rounded-lg mb-8">
            <TabsTrigger
              value="completed-rides"
              className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-blue-600"
            >
              ✓ Completed Rides
            </TabsTrigger>
            <TabsTrigger
              value="ride-offers"
              className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-blue-600"
            >
              📍 Ride Offers Posted
            </TabsTrigger>
          </TabsList>

          <TabsContent value="completed-rides" className="mt-0">
            <PreviousRidesDashboard userId={userId} />
          </TabsContent>

          <TabsContent value="ride-offers" className="mt-0">
            <RideOffersHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
