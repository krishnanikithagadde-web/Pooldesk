import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VerificationComponent from "@/components/VerificationComponent";
import RideHistoryDashboard from "@/components/RideHistoryDashboard";

export default function PassengerDashboard() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const userId = searchParams.get("userId") || localStorage.getItem("userId") || "";

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md mx-auto mt-20 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600 text-center">
              Please log in to access your passenger dashboard
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
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Passenger Dashboard</h1>
          <p className="text-gray-600">Book rides, view history, and manage your profile</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="rides" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white p-2 rounded-lg shadow">
            <TabsTrigger value="rides">My Rides</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="verification">Profile</TabsTrigger>
          </TabsList>

          {/* Available Rides Tab */}
          <TabsContent value="rides" className="mt-6 bg-white rounded-lg shadow p-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Find Rides</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-gray-700 mb-3">
                      Use the "Find Rides" feature in the main app to search for available rides based on your pickup
                      and drop-off locations.
                    </p>
                    <div className="space-y-2 text-sm text-left">
                      <p>
                        <strong>How to book:</strong>
                      </p>
                      <p>1. Enter your pickup and drop-off locations</p>
                      <p>2. Browse available rides from verified drivers</p>
                      <p>3. Check driver ratings and ride details</p>
                      <p>4. Request to book seats (driver must approve)</p>
                      <p>5. Complete your ride and rate your driver</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Ride History Tab */}
          <TabsContent value="history" className="mt-6 bg-white rounded-lg shadow p-6">
            <RideHistoryDashboard userId={userId} />
          </TabsContent>

          {/* Verification Tab */}
          <TabsContent value="verification" className="mt-6 bg-white rounded-lg shadow p-6">
            <VerificationComponent userId={userId} />

            <Card className="mt-6 bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base">Why Verification Matters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  • <strong>Trust & Safety:</strong> Verified employees create a safer carpool community
                </p>
                <p>
                  • <strong>Driver Confidence:</strong> Drivers are more likely to accept bookings from verified
                  passengers
                </p>
                <p>
                  • <strong>Better Experience:</strong> Access to more rides and preferred driver pools
                </p>
                <p>
                  • <strong>Company Benefits:</strong> Earn rewards and incentives as a verified company employee
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Bottom Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🚗 How Booking Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• Search for rides matching your schedule</p>
              <p>• Request to book available seats</p>
              <p>• Driver reviews and accepts/rejects</p>
              <p>• Complete the ride and rate driver</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">⭐ Ratings System</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• Rate drivers after each ride</p>
              <p>• Your ratings impact driver visibility</p>
              <p>• Provide feedback for improvement</p>
              <p>• Help maintain community quality</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💰 Cost Savings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• Share ride costs with other employees</p>
              <p>• Reduce daily commuting expenses</p>
              <p>• Track your savings over time</p>
              <p>• Support eco-friendly transportation</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
