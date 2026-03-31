import React from "react";
import { X, Plus, Minus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PassengerGender {
  seatNumber: number;
  gender: "male" | "female";
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (seatsToBook: number, passengerGenders: PassengerGender[]) => Promise<void>;
  availableSeats: number;
  driverName: string;
  carBrand: string;
  carModel: string;
  pickupLocation: string;
  dropoffLocation: string;
  isSubmitting?: boolean;
  pricePerSeat?: number;
  distanceTravelledInKm?: number;
}

export default function BookingModal({
  isOpen,
  onClose,
  onSubmit,
  availableSeats,
  driverName,
  carBrand,
  carModel,
  pickupLocation,
  dropoffLocation,
  isSubmitting = false,
  pricePerSeat,
  distanceTravelledInKm,
}: BookingModalProps) {
  const [seatsToBook, setSeatsToBook] = React.useState(1);
  const [passengerGenders, setPassengerGenders] = React.useState<PassengerGender[]>([
    { seatNumber: 1, gender: "male" },
  ]);

  // Count genders
  const maleCount = passengerGenders.filter((p) => p.gender === "male").length;
  const femaleCount = passengerGenders.filter((p) => p.gender === "female").length;

  // Calculate total price based on number of seats
  const totalPrice = pricePerSeat ? pricePerSeat * seatsToBook : 0;

  const handleSeatsChange = (newSeats: number) => {
    const bounded = Math.max(1, Math.min(newSeats, availableSeats));
    setSeatsToBook(bounded);

    // Adjust passenger genders array to match seat count
    const newPassengers: PassengerGender[] = [];
    for (let i = 1; i <= bounded; i++) {
      if (i <= passengerGenders.length) {
        newPassengers.push(passengerGenders[i - 1]);
      } else {
        newPassengers.push({ seatNumber: i, gender: "male" });
      }
    }
    setPassengerGenders(newPassengers);
  };

  const handleGenderChange = (seatNumber: number, gender: "male" | "female") => {
    setPassengerGenders((prev) =>
      prev.map((p) => (p.seatNumber === seatNumber ? { ...p, gender } : p))
    );
  };

  const handleSubmit = async () => {
    await onSubmit(seatsToBook, passengerGenders);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary to-secondary text-white p-6 flex items-center justify-between border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Book Ride</h2>
              <p className="text-white/80 text-sm">Select seats and passenger genders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Ride Summary */}
          <div className="bg-gray-50 rounded-xl p-6 space-y-4 border-2 border-gray-200">
            <h3 className="font-bold text-gray-900 text-lg">Ride Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Driver</p>
                <p className="text-gray-900 font-medium">{driverName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Car</p>
                <p className="text-gray-900 font-medium">
                  {carBrand} {carModel}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Pickup</p>
                <p className="text-gray-900 font-medium truncate">{pickupLocation}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Destination</p>
                <p className="text-gray-900 font-medium truncate">{dropoffLocation}</p>
              </div>
              {distanceTravelledInKm && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Distance</p>
                  <p className="text-gray-900 font-medium">{distanceTravelledInKm.toFixed(1)} km</p>
                </div>
              )}
              {pricePerSeat && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Price per Seat</p>
                  <p className="text-gray-900 font-medium">₹{Math.round(pricePerSeat)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Seats Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-lg font-bold text-gray-900">
                Number of Seats
              </label>
              <div className="text-sm text-gray-600">
                Available: <span className="font-bold text-primary">{availableSeats}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-gray-100 rounded-xl p-4">
              <button
                type="button"
                onClick={() => handleSeatsChange(seatsToBook - 1)}
                disabled={seatsToBook <= 1}
                className="p-2 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Minus className="w-5 h-5 text-gray-700" />
              </button>

              <div className="flex-1 text-center">
                <div className="text-4xl font-bold text-primary">{seatsToBook}</div>
                <p className="text-xs text-gray-600 mt-1">
                  {seatsToBook === 1 ? "seat" : "seats"} selected
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSeatsChange(seatsToBook + 1)}
                disabled={seatsToBook >= availableSeats}
                className="p-2 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Plus className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Gender Selection for Each Seat */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-lg font-bold text-gray-900">
                Passenger Genders
              </label>
              <div className="text-sm space-y-1 text-right">
                <div>
                  Male:{" "}
                  <span className="font-bold text-blue-600">{maleCount}</span>
                </div>
                <div>
                  Female:{" "}
                  <span className="font-bold text-pink-600">{femaleCount}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {passengerGenders.map((passenger) => (
                <div
                  key={passenger.seatNumber}
                  className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-primary transition"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-gray-700">
                      Seat {passenger.seatNumber}
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleGenderChange(passenger.seatNumber, "male")}
                      className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition ${
                        passenger.gender === "male"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenderChange(passenger.seatNumber, "female")}
                      className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition ${
                        passenger.gender === "female"
                          ? "bg-pink-500 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Female
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
            <p className="text-sm text-gray-700">
              <span className="font-bold text-blue-900">Summary:</span> Booking{" "}
              <span className="font-bold">{seatsToBook}</span> seat
              {seatsToBook !== 1 ? "s" : ""} with{" "}
              <span className="font-bold text-blue-600">{maleCount} male</span> and{" "}
              <span className="font-bold text-pink-600">{femaleCount} female</span> passengers
            </p>
            {pricePerSeat && totalPrice > 0 && (
              <div className="pt-3 border-t border-blue-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Total Cost:</span>
                <span className="text-2xl font-bold text-green-600">₹{Math.round(totalPrice)}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-gradient-button text-white font-semibold hover:shadow-lg transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                  Booking...
                </>
              ) : (
                "Confirm Booking"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
