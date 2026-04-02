import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface RideStatus {
  hasActiveRide: boolean;
  activeRideId?: string;
  canCreateRide: boolean;
}

export default function RideAvailabilityControl({
  driverId,
  onRideStatusChange,
}: {
  driverId: string;
  onRideStatusChange?: (canCreate: boolean) => void;
}) {
  const [status, setStatus] = useState<RideStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkActiveRide();
    // Check every 10 seconds for updates
    const interval = setInterval(checkActiveRide, 10000);
    return () => clearInterval(interval);
  }, [driverId]);

  useEffect(() => {
    if (status && onRideStatusChange) {
      onRideStatusChange(status.canCreateRide);
    }
  }, [status, onRideStatusChange]);

  const checkActiveRide = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/driver/${driverId}/active-ride`);

      if (!response.ok) {
        throw new Error("Failed to check active ride");
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    if (!status?.activeRideId) return;

    try {
      setCompleting(true);
      setError(null);

      const response = await fetch(`/api/rides/${status.activeRideId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distance: 0, // This would come from actual tracking
          totalFare: 0, // This would be calculated
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete ride");
      }

      // Refresh status after completion
      await checkActiveRide();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!status) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-600">Unable to load ride status</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-4">Ride Status</h2>
        <p className="text-gray-600">Manage your ride availability and completion</p>
      </div>

      {error && (
        <Alert className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current Ride Status</span>
            {status.hasActiveRide ? (
              <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                <div className="h-2 w-2 bg-yellow-600 rounded-full animate-pulse" />
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="border-green-300 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                Available
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.hasActiveRide ? (
            <div className="space-y-4">
              <Alert className="border-yellow-300 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  You have an active ride in progress. Please complete it before creating a new ride.
                </AlertDescription>
              </Alert>

              <div>
                <p className="text-sm text-gray-600">Active Ride ID</p>
                <p className="font-mono text-sm font-semibold">{status.activeRideId}</p>
              </div>

              <Button
                onClick={handleCompleteRide}
                disabled={completing}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {completing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Completing Ride...
                  </>
                ) : (
                  "Mark Ride as Completed"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert className="border-green-300 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  You're available to create a new ride! Use the "Create Ride" option to post your next ride.
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  ✨ <strong>Pro Tip:</strong> Once you complete this ride and passengers rate it, your ratings will
                  appear in your analytics dashboard.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">📋 How Ride Management Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>1. Create Ride:</strong> When available, you can create a new ride and set your preferred parameters
          </p>
          <p>
            <strong>2. Accept Bookings:</strong> Passengers will request to book your ride. You can accept or reject
            bookings
          </p>
          <p>
            <strong>3. Complete Ride:</strong> After completing the ride, mark it as completed using the button above
          </p>
          <p>
            <strong>4. Get Ratings:</strong> Passengers will rate your ride, contributing to your overall rating score
          </p>
          <p>
            <strong>5. View Analytics:</strong> Check your earnings, peak hours, and most frequent routes in the
            analytics dashboard
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
