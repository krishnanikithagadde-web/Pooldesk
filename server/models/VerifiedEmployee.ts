import mongoose, { Schema, Document } from 'mongoose';

export interface IVerifiedEmployee extends Document {
  email: string;
  fullName: string;
  company: string;
  employeeId: string;
  department: string;
  verificationStatus: 'verified' | 'pending' | 'rejected' | 'flagged';
  flagReason?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const verifiedEmployeeSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    fullName: { type: String, required: true },
    company: {
      type: String,
      enum: ['techcorp', 'innovatesoft', 'datasystems'],
      required: true,
    },
    employeeId: { type: String, required: true },
    department: { type: String },
    verificationStatus: {
      type: String,
      enum: ['verified', 'pending', 'rejected', 'flagged'],
      default: 'pending',
      index: true,
    },
    flagReason: String,
    verifiedAt: Date,
  },
  { timestamps: true }
);

verifiedEmployeeSchema.index({ verificationStatus: 1, company: 1 });

export default mongoose.models.VerifiedEmployee ||
  mongoose.model<IVerifiedEmployee>(
    'VerifiedEmployee',
    verifiedEmployeeSchema
  );
