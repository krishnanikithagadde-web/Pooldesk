import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import VerificationComponent from "@/components/VerificationComponent";
import PendingBookingsList from "@/components/PendingBookingsList";

export default function DriverDashboard() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const userId =
    searchParams.get("userId") || localStorage.getItem("userId") || "";

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md mx-auto mt-20 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600 text-center">
              Please log in to access your driver dashboard
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Driver Dashboard
          </h1>
          <p className="text-gray-600">
            Manage bookings and view performance insights
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white p-2 rounded-lg shadow">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
          </TabsList>

          {/* Analytics FIRST */}
          <TabsContent value="analytics" className="mt-6 bg-white rounded-lg shadow p-6">
            <AnalyticsDashboard userId={userId} />
          </TabsContent>

          {/* Bookings */}
          <TabsContent value="bookings" className="mt-6 bg-white rounded-lg shadow p-6">
            <PendingBookingsList driverId={userId} />
          </TabsContent>

          {/* Verification */}
          <TabsContent value="verification" className="mt-6 bg-white rounded-lg shadow p-6">
            <VerificationComponent userId={userId} />
          </TabsContent>
        </Tabs>

        {/* Bottom Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🎯 Platform Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• Booking management</p>
              <p>• Passenger requests</p>
              <p>• Driver verification (optional)</p>
              <p>• Basic analytics</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💡 Best Practices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• Maintain punctuality</p>
              <p>• Communicate clearly</p>
              <p>• Accept bookings responsibly</p>
              <p>• Ensure passenger safety</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🚗 Driver Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• Plan routes in advance</p>
              <p>• Confirm pickup locations</p>
              <p>• Keep vehicle clean</p>
              <p>• Be professional</p>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}