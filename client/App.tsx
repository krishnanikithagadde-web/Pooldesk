import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Verification from "./pages/Verification";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import RideHistory from "./pages/RideHistory";
import History from "./pages/History";
import ActiveRide from "./pages/ActiveRide";
import RideOfferDetails from "./pages/RideOfferDetails";
import DriverDashboard from "./pages/DriverDashboard";
import PassengerDashboard from "./pages/PassengerDashboard";
import AcceptedRideDetail from "./pages/AcceptedRideDetail";
import DriverTracking from "./pages/DriverTracking";
import PassengerTracking from "./pages/PassengerTracking";
import DriverProfile from "./pages/DriverProfile";
import Navigation from "./components/Navigation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// define routes separately so they can be passed to createBrowserRouter
const routes = [
  { path: "/", element: <Verification /> },
  { path: "/verification", element: <Verification /> },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <SignUp /> },
  { path: "/dashboard", element: <Navigation><Dashboard /></Navigation> },
  { path: "/ride-history", element: <Navigation><RideHistory /></Navigation> },
  { path: "/history/:userId", element: <Navigation><History /></Navigation> },
  { path: "/active-ride/:rideId", element: <Navigation><ActiveRide /></Navigation> },
  { path: "/ride/:rideId", element: <Navigation><RideOfferDetails /></Navigation> },
  { path: "/accepted-ride/:rideId", element: <Navigation><AcceptedRideDetail /></Navigation> },
  { path: "/track-driver/:rideId", element: <Navigation><DriverTracking /></Navigation> },
  { path: "/track-passenger/:rideId", element: <Navigation><PassengerTracking /></Navigation> },
  { path: "/driver-dashboard", element: <Navigation><DriverDashboard /></Navigation> },
  { path: "/passenger-dashboard", element: <Navigation><PassengerDashboard /></Navigation> },
  { path: "/driver/:driverId/profile", element: <Navigation><DriverProfile /></Navigation> },
  { path: "*", element: <NotFound /> },
];

const router = createBrowserRouter(routes, {
  future: {
    v7_relativeSplatPath: true,
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
