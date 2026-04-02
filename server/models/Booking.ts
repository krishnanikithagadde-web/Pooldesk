import mongoose, { Schema, Document } from 'mongoose';

export interface PassengerDetail {
  seatNumber: number;
  gender: 'male' | 'female';
}

export interface IBooking extends Document {
  rideId: string;
  driverId: string;
  driverName: string;
  driverEmail: string;
  driverGender?: string;
  driverPhone?: string;
  carLicensePlate?: string;
  passengerId: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone?: string;
  seatsBooked: number;
  passengerDetails: PassengerDetail[];
  pickupLocation: string;
  dropoffLocation: string;
  date: string;
  time: string;
  carBrand: string;
  carModel: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  pricePerSeat?: number;
  distanceTravelledInKm?: number;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema(
  {
    rideId: { type: String, required: true, index: true },
    driverId: { type: String, required: true, index: true },
    driverName: { type: String, required: true },
    driverEmail: { type: String, required: true },
    passengerId: { type: String, required: true, index: true },
    passengerName: { type: String, required: true },
    passengerEmail: { type: String, required: true },
    seatsBooked: { type: Number, required: true, min: 1 },
    passengerDetails: [
      {
        seatNumber: { type: Number, required: true },
        gender: {
          type: String,
          enum: ['male', 'female'],
          required: true
        },
      },
    ],
    pickupLocation: { type: String, required: true },
    dropoffLocation: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    carBrand: { type: String, required: true },
    carModel: { type: String, required: true },
    carLicensePlate: { type: String },
    driverPhone: { type: String },
    passengerPhone: { type: String },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
      default: 'pending',
    },
    pricePerSeat: { type: Number },
    distanceTravelledInKm: { type: Number },
    driverGender: { type: String },
    acceptedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes for efficient queries
bookingSchema.index({ rideId: 1, status: 1 });
bookingSchema.index({ driverId: 1, status: 1 });
bookingSchema.index({ passengerId: 1, status: 1 });

export default mongoose.models.Booking || mongoose.model<IBooking>('Booking', bookingSchema);
