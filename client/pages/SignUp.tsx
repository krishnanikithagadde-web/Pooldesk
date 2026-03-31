import { useState } from "react";
import { Zap, ChevronLeft, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function SignUp() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [shiftStart, setShiftStart] = useState("09:00 AM");
  const [shiftEnd, setShiftEnd] = useState("06:00 PM");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Get company and determine email domain
  const selectedCompany = localStorage.getItem("selectedCompany") || "techcorp";
  const companyDomainMap: { [key: string]: string } = {
    techcorp: "techcorp.com",
    innovatesoft: "innovatesoft.com",
    datasystems: "datasystems.com",
  };
  const emailDomain = companyDomainMap[selectedCompany] || "techcorp.com";

  const passwordRequirements = [
    { met: password.length >= 8, text: "At least 8 characters" },
    { met: /[a-z]/.test(password), text: "At least 1 lowercase letter (a-z)" },
    { met: /[A-Z]/.test(password), text: "At least 1 uppercase letter (A-Z)" },
    { met: /[0-9]/.test(password), text: "At least 1 number (0-9)" },
    { met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), text: "At least 1 special character (!@#$%^&*)" },
  ];

  const isPasswordValid = passwordRequirements.every((req) => req.met);

  // Email domain validation - check if email ends with the selected company domain
  const isEmailDomainValid = email.endsWith(`@${emailDomain}`);
  const showEmailError = email && !isEmailDomainValid;

  // Password match validation
  const passwordsMatch = password === confirmPassword;
  const showPasswordMismatchError = confirmPassword && !passwordsMatch;

  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate form
    if (
      !fullName ||
      !email ||
      !isEmailDomainValid ||
      !password ||
      !confirmPassword ||
      !passwordsMatch ||
      !isPasswordValid
    ) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          password,
          gender: gender || "prefer-not-to-say",
          shiftStart,
          shiftEnd,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Signup failed");
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

      toast.success("Account created successfully!");
      // Navigate to dashboard after successful signup
      navigate("/dashboard");
    } catch (error) {
      console.error("SignUp error:", error);
      toast.error("An error occurred during signup");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center px-4 py-8">
      {/* Back Link */}
      <div className="w-full max-w-md mb-8">
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8 text-center">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-lg mb-4">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
        <p className="text-gray-600 text-sm mt-1">
          Join PoolDesk and start carpooling today
        </p>
      </div>

      {/* Signup Card */}
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <form onSubmit={handleSignUp} className="space-y-5">
          {/* Full Name */}
          <div>
            <Label htmlFor="fullname" className="text-gray-700 text-sm font-medium flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
              </div>
              Full Name
            </Label>
            <Input
              id="fullname"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-2 bg-gray-100 border-gray-200"
            />
          </div>

          {/* Email Address */}
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
              className={`mt-2 bg-gray-100 border-2 ${
                showEmailError ? "border-red-500" : "border-gray-200"
              }`}
            />
            {showEmailError ? (
              <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
                <X className="w-3 h-3" />
                Email domain must be @{emailDomain}
              </p>
            ) : (
              <p className="text-gray-500 text-xs mt-1">
                Use your company email (name@{emailDomain})
              </p>
            )}
          </div>

          {/* Gender */}
          <div>
            <Label htmlFor="gender" className="text-gray-700 text-sm font-medium">
              Gender (Optional)
            </Label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="mt-2 w-full bg-gray-100 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Shift Start Time */}
          <div>
            <Label htmlFor="shiftstart" className="text-gray-700 text-sm font-medium flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
              </div>
              Shift Start Time
            </Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                id="shiftstart"
                type="time"
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                className="bg-gray-100 border-gray-200"
              />
              <button className="p-2 text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Shift End Time */}
          <div>
            <Label htmlFor="shiftend" className="text-gray-700 text-sm font-medium flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
              </div>
              Shift End Time
            </Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                id="shiftend"
                type="time"
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                className="bg-gray-100 border-gray-200"
              />
              <button className="p-2 text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password" className="text-gray-700 text-sm font-medium">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 bg-gray-100 border-gray-200"
            />
          </div>

          {/* Password Requirements */}
          {password && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-3">
                Password requirements:
              </p>
              <ul className="space-y-2">
                {passwordRequirements.map((req, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs">
                    {req.met ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-red-500" />
                    )}
                    <span className={req.met ? "text-green-600" : "text-red-600"}>
                      {req.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Confirm Password */}
          <div>
            <Label htmlFor="confirmpassword" className="text-gray-700 text-sm font-medium">
              Confirm Password
            </Label>
            <Input
              id="confirmpassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`mt-2 bg-gray-100 border-2 ${
                showPasswordMismatchError ? "border-red-500" : "border-gray-200"
              }`}
            />
            {showPasswordMismatchError && (
              <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
                <X className="w-3 h-3" />
                Passwords do not match
              </p>
            )}
          </div>

          {/* Create Account Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 bg-gradient-button text-white font-semibold py-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>

        {/* Sign In Link */}
        <div className="mt-4 text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
