import { useState } from "react";
import { Zap, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get company and determine email domain
  const selectedCompany = localStorage.getItem("selectedCompany") || "techcorp";
  const companyDomainMap: { [key: string]: string } = {
    techcorp: "techcorp.com",
    innovatesoft: "innovatesoft.com",
    datasystems: "datasystems.com",
  };
  const emailDomain = companyDomainMap[selectedCompany] || "techcorp.com";

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate credentials
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Login failed");
        return;
      }

      const data = await response.json();

      // Store user data in localStorage
      localStorage.setItem("userName", data.user.fullName);
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem("userGender", data.user.gender);
      localStorage.setItem("shiftStart", data.user.shiftStart);
      localStorage.setItem("shiftEnd", data.user.shiftEnd);
      localStorage.setItem("selectedCompany", data.user.company);

      toast.success("Login successful!");
      // Navigate to dashboard after successful login
      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center px-4 py-8">
      {/* Back Link */}
      <div className="w-full max-w-md mb-8">
        <Link
          to="/verification"
          className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Verification
        </Link>
      </div>

      {/* Header */}
      <div className="mb-12 text-center">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-lg mb-4">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
        <p className="text-gray-600 text-sm mt-1">
          Sign in to your PoolDesk account
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 mb-6">
        <form onSubmit={handleSignIn} className="space-y-5">
          {/* Email */}
          <div>
            <Label htmlFor="email" className="text-gray-700 text-sm font-medium flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
              </div>
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={`john@${emailDomain}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 bg-gray-100 border-gray-200"
            />
            <p className="text-gray-500 text-xs mt-1">
              Use your company email (name@{emailDomain})
            </p>
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password" className="text-gray-700 text-sm font-medium flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
              </div>
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 bg-gray-100 border-gray-200"
            />
          </div>

          {/* Sign In Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 bg-gradient-button text-white font-semibold py-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        {/* Sign Up Link */}
        <div className="mt-4 text-center">
          <p className="text-gray-600 text-sm">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Create one now
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}
