import { useState } from "react";
import { Zap, MapPin, DollarSign, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

export default function Verification() {
  const navigate = useNavigate();
  const [selectedCompany, setSelectedCompany] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [companyPassword, setCompanyPassword] = useState("");

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    // Verify company credentials
    if (selectedCompany && companyCode && companyPassword) {
      // Store selected company in localStorage
      localStorage.setItem("selectedCompany", selectedCompany);
      // Navigate to login page after successful verification
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">PoolDesk</span>
          </div>
          <span className="text-sm text-gray-600">Professional IT Community Carpooling</span>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary via-secondary to-primary text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
                Shared rides. Shared savings.
              </h1>
              <p className="text-lg text-white/90">
                Connect with your colleagues, share the cost of commute, and save more while reducing carbon footprint.
              </p>
              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 flex-shrink-0" />
                  <span>Seamless ride matching with your schedule</span>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 flex-shrink-0" />
                  <span>Save up to 50% on commute costs</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 flex-shrink-0" />
                  <span>Verified company members only</span>
                </div>
              </div>
            </div>

            {/* Right Illustration */}
            <div className="hidden md:flex justify-center">
              <div className="relative w-full h-64">
                {/* Animated SVG illustration */}
                <svg viewBox="0 0 400 300" className="w-full h-full">
                  {/* Road */}
                  <rect x="0" y="150" width="400" height="100" fill="rgba(255,255,255,0.1)" />
                  <line x1="0" y1="180" x2="400" y2="180" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="10,10" />

                  {/* Car 1 */}
                  <g>
                    <rect x="30" y="130" width="70" height="45" rx="5" fill="#FF6B6B" opacity="0.8" />
                    <circle cx="45" cy="175" r="8" fill="#333" />
                    <circle cx="85" cy="175" r="8" fill="#333" />
                    <rect x="35" y="135" width="25" height="20" rx="2" fill="#87CEEB" />
                    <rect x="65" y="135" width="20" height="20" rx="2" fill="#87CEEB" />
                  </g>

                  {/* Car 2 */}
                  <g>
                    <rect x="150" y="120" width="70" height="45" rx="5" fill="#4ECDC4" opacity="0.8" />
                    <circle cx="165" cy="165" r="8" fill="#333" />
                    <circle cx="205" cy="165" r="8" fill="#333" />
                    <rect x="155" y="125" width="25" height="20" rx="2" fill="#87CEEB" />
                    <rect x="185" y="125" width="20" height="20" rx="2" fill="#87CEEB" />
                  </g>

                  {/* Car 3 */}
                  <g>
                    <rect x="270" y="140" width="70" height="45" rx="5" fill="#FFE66D" opacity="0.8" />
                    <circle cx="285" cy="185" r="8" fill="#333" />
                    <circle cx="325" cy="185" r="8" fill="#333" />
                    <rect x="275" y="145" width="25" height="20" rx="2" fill="#87CEEB" />
                    <rect x="305" y="145" width="20" height="20" rx="2" fill="#87CEEB" />
                  </g>

                  {/* People icons above cars */}
                  <g>
                    <circle cx="65" cy="100" r="8" fill="#FF6B6B" />
                    <circle cx="60" cy="115" r="3" fill="#FF6B6B" />
                  </g>
                  <g>
                    <circle cx="185" cy="80" r="8" fill="#4ECDC4" />
                    <circle cx="180" cy="95" r="3" fill="#4ECDC4" />
                  </g>
                  <g>
                    <circle cx="305" cy="100" r="8" fill="#FFE66D" />
                    <circle cx="300" cy="115" r="3" fill="#FFE66D" />
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Verification Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Form Header */}
              <div className="bg-gradient-to-r from-primary to-secondary p-8 text-white">
                <h2 className="text-3xl font-bold">Get Started Today</h2>
                <p className="text-white/90 mt-2">Verify your company credentials to join PoolDesk</p>
              </div>

              {/* Form Content */}
              <div className="p-8 space-y-6">
                <form onSubmit={handleVerify} className="space-y-6">
                  {/* Company Name */}
                  <div>
                    <Label htmlFor="company" className="text-gray-700 font-semibold flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      Company Name
                    </Label>
                    <select
                      id="company"
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-4 py-3 text-gray-900 font-medium focus:border-primary focus:bg-white transition"
                    >
                      <option value="">Select a company</option>
                      <option value="techcorp">TechCorp</option>
                      <option value="innovatesoft">InnovateSoft</option>
                      <option value="datasystems">DataSystems</option>
                    </select>
                    <p className="text-gray-500 text-sm mt-2">
                      Try: TechCorp, InnovateSoft, or DataSystems
                    </p>
                  </div>

                  {/* Company Code */}
                  <div>
                    <Label htmlFor="code" className="text-gray-700 font-semibold flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      Company Code
                    </Label>
                    <Input
                      id="code"
                      type="text"
                      placeholder="Enter company code"
                      value={companyCode}
                      onChange={(e) => setCompanyCode(e.target.value)}
                      className="bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-primary focus:bg-white transition"
                    />
                    <p className="text-gray-500 text-sm mt-2">
                      Try: TC2024, IS2024, or DS2024
                    </p>
                  </div>

                  {/* Company Password */}
                  <div>
                    <Label htmlFor="password" className="text-gray-700 font-semibold flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-primary" />
                      </div>
                      Company Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter company password"
                      value={companyPassword}
                      onChange={(e) => setCompanyPassword(e.target.value)}
                      className="bg-gray-50 border-2 border-gray-200 rounded-lg focus:border-primary focus:bg-white transition"
                    />
                    <p className="text-gray-500 text-sm mt-2">
                      Try: secure123, secure456, or secure789
                    </p>
                  </div>

                  {/* Verify Button */}
                  <Button
                    type="submit"
                    className="w-full mt-8 bg-gradient-button text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all duration-300 text-base"
                  >
                    Verify & Continue
                  </Button>
                </form>
              </div>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="space-y-6">
            {/* Card 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Smart Matching</h3>
              <p className="text-gray-700 text-sm">
                Get matched with colleagues based on your route and schedule
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-6 border border-teal-200">
              <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Save Money</h3>
              <p className="text-gray-700 text-sm">
                Split commute costs and save significantly every month
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Safe & Secure</h3>
              <p className="text-gray-700 text-sm">
                Only verified company members can join your rides
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-gray-600 text-sm">
            © 2024 PoolDesk. Making commuting easier, cheaper, and greener for IT professionals.
          </p>
        </div>
      </div>
    </div>
  );
}
