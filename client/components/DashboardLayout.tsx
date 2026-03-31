import { Zap, LogOut, Database, History } from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: "find" | "offer" | "bookings";
  onTabChange: (tab: "find" | "offer" | "bookings") => void;
  userName: string;
  userEmail: string;
  shiftStart: string;
  shiftEnd: string;
}

export function DashboardLayout({
  children,
  activeTab,
  onTabChange,
  userName,
  userEmail,
  shiftStart,
  shiftEnd,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-secondary shadow-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          {/* Logo and Branding */}
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">PoolDesk</h1>
              <p className="text-xs text-white/80">
                Welcome, {userName.split(' ')[0]}
              </p>
            </div>
          </div>

          {/* User Info and Actions */}
          <div className="flex items-center gap-8">
            {/* Time Display */}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-white">{userEmail}</p>
              <p className="text-xs text-white/80">
                {shiftStart} - {shiftEnd}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <button className="p-2.5 text-white hover:bg-white/20 rounded-lg transition-all duration-300 hover:scale-110">
                <Database className="w-5 h-5" />
              </button>
              <Link
                to="/ride-history"
                className="px-4 py-2 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 transition-all duration-300 hover:shadow-md border border-white/30"
              >
                <History className="w-4 h-4" />
                Ride History
              </Link>
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-primary bg-white rounded-lg hover:bg-gray-100 flex items-center gap-2 transition-all duration-300 hover:shadow-md"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white/70 backdrop-blur-md border-b border-gray-200/50 sticky top-[73px] z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => onTabChange("find")}
              className={`py-4 px-6 font-semibold text-sm transition-all duration-300 relative ${
                activeTab === "find"
                  ? "text-primary"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Find a Ride
              {activeTab === "find" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary"></div>
              )}
            </button>
            <button
              onClick={() => onTabChange("offer")}
              className={`py-4 px-6 font-semibold text-sm transition-all duration-300 relative ${
                activeTab === "offer"
                  ? "text-secondary"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Offer a Ride
              {activeTab === "offer" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-secondary to-primary"></div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
