import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RideAvailabilityControl from "@/components/RideAvailabilityControl";
import RideHistoryDashboard from "@/components/RideHistoryDashboard";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import VerificationComponent from "@/components/VerificationComponent";
import PendingBookingsList from "@/components/PendingBookingsList";

export default function DriverDashboard() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const userId = searchParams.get("userId") || localStorage.getItem("userId") || "";
  const [canCreateRide, setCanCreateRide] = useState(true);

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
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Driver Dashboard</h1>
          <p className="text-gray-600">Manage your rides, view analytics, and track your earnings</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="rides" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white p-2 rounded-lg shadow">
            <TabsTrigger value="rides">Rides</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
          </TabsList>

          {/* Ride Management Tab */}
          <TabsContent value="rides" className="mt-6 bg-white rounded-lg shadow p-6">
            <RideAvailabilityControl
              driverId={userId}
              onRideStatusChange={setCanCreateRide}
            />

            {/* Create Ride Button Info */}
            {canCreateRide && (
              <Card className="mt-6 bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="text-green-900">✓ Ready to Create Ride</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-green-800 mb-4">
                    You're ready to create a new ride! Click the "Create Ride" button in the main navigation to post
                    your ride.
                  </p>
                  <div className="bg-white p-3 rounded border border-green-200">
                    <p className="text-sm text-gray-700">
                      <strong>What happens next:</strong> Once you create a ride, passengers in your area can request
                      to book seats. You'll need to accept or reject each booking. After all passengers join, mark the
                      ride as completed.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="mt-6 bg-white rounded-lg shadow p-6">
            <PendingBookingsList driverId={userId} />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6 bg-white rounded-lg shadow p-6">
            <AnalyticsDashboard userId={userId} />
          </TabsContent>

          {/* Ride History Tab */}
          <TabsContent value="history" className="mt-6 bg-white rounded-lg shadow p-6">
            <RideHistoryDashboard userId={userId} />
          </TabsContent>

          {/* Verification Tab */}
          <TabsContent value="verification" className="mt-6 bg-white rounded-lg shadow p-6">
            <VerificationComponent userId={userId} />
          </TabsContent>
        </Tabs>

        {/* Bottom Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🎯 Platform Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• Real-time ride tracking and management</p>
              <p>• AI-powered analytics and insights</p>
              <p>• Passenger verification system</p>
              <p>• Ratings and reviews</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💡 Best Practices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• Maintain high ratings (4.5+)</p>
              <p>• Complete rides on time</p>
              <p>• Verify all passengers</p>
              <p>• Track earnings regularly</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📞 Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• 24/7 customer support</p>
              <p>• Dispute resolution</p>
              <p>• Payment support</p>
              <p>• Report suspicious users</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
