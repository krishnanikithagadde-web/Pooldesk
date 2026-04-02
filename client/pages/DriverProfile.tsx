import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, MapPin, Star, AlertCircle, CheckCircle, Users, Calendar } from "lucide-react";
import { Loader2 } from "lucide-react";

interface DriverProfileData {
  driver: {
    id: string;
    fullName: string;
    email: string;
    gender: string;
    company: string;
    isVerified: boolean;
    verifiedAt?: string;
    isFlagged: boolean;
    flagReason?: string;
  };
  rating: {
    average: number;
    total: number;
    sum: number;
    distribution: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  };
  reviews: {
    total: number;
    recent: Array<{
      rating: number;
      review?: string;
      route: string;
      date: string;
    }>;
    topRated: Array<{
      rating: number;
      review?: string;
      route: string;
      date: string;
    }>;
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
    };
  };
  stats: {
    totalRidesCompleted: number;
    totalPassengers: number;
    memberSince: string;
  };
}

export default function DriverProfile() {
  const { driverId } = useParams<{ driverId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DriverProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDriverProfile();
  }, [driverId]);

  const fetchDriverProfile = async () => {
    if (!driverId) {
      setError("Invalid driver ID");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/driver/${driverId}/profile`);

      if (!response.ok) {
        throw new Error("Failed to fetch driver profile");
      }

      const data = await response.json();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card className="border-red-200 bg-red-50 max-w-md mx-auto">
          <CardContent className="pt-6">
            <p className="text-red-600">{error || "Driver not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { driver, rating, reviews, stats } = profile;

  const getRatingColor = (avg: number) => {
    if (avg >= 4.5) return "text-green-600";
    if (avg >= 3.5) return "text-yellow-600";
    if (avg >= 2.5) return "text-orange-600";
    return "text-red-600";
  };

  const getSentimentPercentage = (count: number) => {
    const total = reviews.sentiment.positive + reviews.sentiment.neutral + reviews.sentiment.negative;
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Driver Info Card */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="pt-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{driver.fullName}</h1>
                <p className="text-gray-600 mb-3">{driver.email}</p>
                <div className="flex gap-3 flex-wrap">
                  {driver.isVerified && (
                    <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                  <Badge variant="outline" className="capitalize">
                    {driver.gender}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {driver.company}
                  </Badge>
                  {driver.isFlagged && (
                    <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Flagged
                    </Badge>
                  )}
                </div>
              </div>

              {/* Big Rating Display */}
              <div className="text-right">
                <div className={`text-6xl font-bold ${getRatingColor(rating.average)} mb-2`}>
                  {rating.average.toFixed(1)}
                </div>
                <div className="flex justify-end gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-6 w-6 ${
                        i < Math.floor(rating.average)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-600">{rating.total} reviews</p>
              </div>
            </div>

            {driver.isFlagged && driver.flagReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800 font-semibold">Flagged for: {driver.flagReason}</p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-gray-600 text-sm mb-1">Total Rides</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalRidesCompleted}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-gray-600 text-sm mb-1">Total Passengers</p>
                <p className="text-3xl font-bold text-purple-600">{stats.totalPassengers}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-gray-600 text-sm mb-1">Member Since</p>
                <p className="text-lg font-bold text-green-600">{stats.memberSince}</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-gray-600 text-sm mb-1">Verified</p>
                <p className="text-lg font-bold text-indigo-600">
                  {driver.isVerified ? "Yes" : "No"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rating Distribution and Sentiment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Rating Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rating Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((stars) => (
                  <div key={stars} className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < stars ? "bg-yellow-400" : "bg-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium w-12">{stars} star</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full"
                        style={{
                          width: `${
                            rating.total > 0
                              ? (rating.distribution[stars as keyof typeof rating.distribution] /
                                  rating.total) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold w-8">
                      {rating.distribution[stars as keyof typeof rating.distribution]}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sentiment Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Feedback Sentiment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-green-700">Positive (4-5 ⭐)</span>
                    <span className="text-sm font-bold text-green-600">
                      {reviews.sentiment.positive} ({getSentimentPercentage(reviews.sentiment.positive)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${getSentimentPercentage(reviews.sentiment.positive)}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Neutral (3 ⭐)</span>
                    <span className="text-sm font-bold text-gray-600">
                      {reviews.sentiment.neutral} ({getSentimentPercentage(reviews.sentiment.neutral)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gray-500 h-2 rounded-full"
                      style={{
                        width: `${getSentimentPercentage(reviews.sentiment.neutral)}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-red-700">Negative (1-2 ⭐)</span>
                    <span className="text-sm font-bold text-red-600">
                      {reviews.sentiment.negative} ({getSentimentPercentage(reviews.sentiment.negative)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{
                        width: `${getSentimentPercentage(reviews.sentiment.negative)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reviews Section */}
        {reviews.total > 0 ? (
          <div className="space-y-6">
            {/* Top Rated Rides */}
            {reviews.topRated.length > 0 && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-lg">✨ Top Rated Experiences</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reviews.topRated.map((review, idx) => (
                      <div key={idx} className="pb-4 border-b last:border-b-0">
                        <div className="flex items-start gap-3">
                          <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className="h-4 w-4 fill-yellow-400 text-yellow-400"
                              />
                            ))}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              {review.route}
                            </p>
                            {review.review && (
                              <p className="text-sm text-gray-700 mt-2 italic">"{review.review}"</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Reviews */}
            {reviews.recent.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Reviews ({reviews.total} total)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reviews.recent.map((review, idx) => (
                      <div key={idx} className="pb-4 border-b last:border-b-0">
                        <div className="flex items-start gap-3">
                          <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              {review.route}
                            </p>
                            {review.review && (
                              <p className="text-sm text-gray-700 mt-2">"{review.review}"</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(review.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <Star className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-lg">No reviews yet</p>
                <p className="text-gray-400 text-sm">Once passengers rate their rides, reviews will appear here</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
