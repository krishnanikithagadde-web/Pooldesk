import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  MapPin,
  Users,
  Shield,
} from "lucide-react";
import { useState } from "react";

interface NavLink {
  label: string;
  path: string;
  icon: ReactNode;
  description?: string;
}

const NAV_LINKS: NavLink[] = [
  { label: "Home", path: "/dashboard", icon: <Home className="h-5 w-5" /> },
  { label: "Ride History", path: "/ride-history", icon: <History className="h-5 w-5" /> },
  { label: "Driver Analytics", path: "/driver-dashboard", icon: <BarChart3 className="h-5 w-5" /> },
  // { label: "Driver Verification", path: "/driver-dashboard?tab=verification", icon: <Shield className="h-5 w-5" /> },
];

export default function Navigation({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Desktop Sidebar */}
      <div className="hidden md:fixed md:left-0 md:top-0 md:h-screen md:w-64 md:bg-slate-800 md:border-r md:border-slate-700 md:flex md:flex-col md:p-6">
        {/* Logo/Brand */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">PoolDesk</h2>
          <p className="text-xs text-gray-400 mt-1">Carpooling Platform</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-2">
          {NAV_LINKS.map((link) => (
            <Button
              key={link.path}
              onClick={() => navigate(link.path)}
              variant="ghost"
              className={`w-full justify-start gap-3 ${
                isActive(link.path)
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "text-gray-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {link.icon}
              <span>{link.label}</span>
            </Button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="space-y-2 border-t border-slate-700 pt-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-gray-400 hover:text-white hover:bg-slate-700"
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Button>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </Button>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-xl font-bold text-white">PoolDesk</h2>
          <Button
            onClick={() => setMobileOpen(!mobileOpen)}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="border-t border-slate-700 p-4 space-y-2">
            {NAV_LINKS.map((link) => (
              <Button
                key={link.path}
                onClick={() => {
                  navigate(link.path);
                  setMobileOpen(false);
                }}
                variant="ghost"
                className={`w-full justify-start gap-3 ${
                  isActive(link.path)
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "text-gray-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Button>
            ))}
            <div className="border-t border-slate-700 pt-2 mt-2 space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-gray-400 hover:text-white hover:bg-slate-700"
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Button>
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-900/20"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="md:ml-64">
        {children}
      </div>
    </div>
  );
}
