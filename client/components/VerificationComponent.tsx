import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface VerificationStatus {
  isVerified: boolean;
  isFlagged: boolean;
  flagReason?: string;
  verificationDetails?: {
    _id: string;
    email: string;
    fullName: string;
    company: string;
    employeeId: string;
    verificationStatus: string;
    verifiedAt?: string;
  };
}

export default function VerificationComponent({ userId }: { userId: string }) {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    checkVerification();
  }, [userId]);

  const checkVerification = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/user/${userId}/verification-status`);

      if (!response.ok) {
        throw new Error("Failed to fetch verification status");
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
      setError(null);

      const response = await fetch(`/api/user/${userId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: "EMP" + Math.random().toString(36).substr(2, 9),
          department: "General",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to verify employee");
      }

      // Refetch status after verification
      await checkVerification();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setVerifying(false);
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
          <p className="text-red-600">Unable to load verification status</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-4">Verification Status</h2>
        <p className="text-gray-600">Ensure you are verified to participate in rides and maintain trust in the community</p>
      </div>

      {status.isFlagged && (
        <Alert className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Your account has been flagged for security reasons: {status.flagReason}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status.isVerified ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-600">Verified Employee</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-600">Not Verified</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.isVerified && status.verificationDetails ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-semibold">{status.verificationDetails.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold">{status.verificationDetails.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Company</p>
                <Badge variant="outline">{status.verificationDetails.company}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Employee ID</p>
                <p className="font-semibold">{status.verificationDetails.employeeId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Verified On</p>
                <p className="font-semibold">
                  {status.verificationDetails.verifiedAt
                    ? new Date(status.verificationDetails.verifiedAt).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800">✓ Verified</Badge>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-600">
                Get verified to unlock full access to rides and build trust in the community. Verification is quick and
                easy with your company email.
              </p>
              <Button
                onClick={handleVerify}
                disabled={verifying}
                className="w-full"
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify with Company Email"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Security Notes */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">🔒 Security Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            • Only verified company employees can participate in carpools to ensure safety and trust
          </p>
          <p>
            • Your verification is linked to your official company email domain
          </p>
          <p>
            • Drivers can view your verification status before accepting bookings
          </p>
          <p>
            • Accounts with suspicious activity will be flagged automatically
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
