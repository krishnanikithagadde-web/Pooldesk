import mongoose, { Schema, Document } from 'mongoose';

export interface IRideHistory extends Document {
  rideId: string;
  driverId: string;
  driverName: string;
  driverEmail: string;
  company: string;
  pickupLocation: string;
  dropoffLocation: string;
  date: string;
  time: string;
  distanceTravelledInKm: number;
  fareCollected: number;
  numberOfPassengers: number;
  passengerEmails: string[];
  rideRatings: {
    passengerId: string;
    rating: number;
    review?: string;
  }[];
  paymentConfirmed?: boolean;
  paymentConfirmedAt?: Date;
  completedAt: Date;
  createdAt: Date;
}

const rideHistorySchema = new Schema(
  {
    rideId: { type: String, required: true, unique: true },
    driverId: { type: String, required: true, index: true },
    driverName: { type: String, required: true },
    driverEmail: { type: String, required: true },
    company: { type: String, required: true },
    pickupLocation: { type: String, required: true },
    dropoffLocation: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    distanceTravelledInKm: { type: Number, required: true },
    fareCollected: { type: Number, required: true },
    numberOfPassengers: { type: Number, required: true },
    passengerEmails: [String],
    rideRatings: [
      {
        passengerId: String,
        rating: { type: Number, min: 1, max: 5 },
        review: String,
      },
    ],
    paymentConfirmed: { type: Boolean, default: false },
    paymentConfirmedAt: Date,
    completedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

rideHistorySchema.index({ driverId: 1, completedAt: -1 });
rideHistorySchema.index({ company: 1, completedAt: -1 });

export default mongoose.models.RideHistory ||
  mongoose.model<IRideHistory>('RideHistory', rideHistorySchema);
