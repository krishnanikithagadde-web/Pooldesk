import mongoose, { Schema, Document } from "mongoose";
import bcryptjs from "bcryptjs";

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  gender: string;
  shiftStart: string;
  shiftEnd: string;
  company: string;
  isVerified: boolean;
  verifiedAt?: Date;
  activeRideId?: string;
  isFlagged: boolean;
  flagReason?: string;
  totalRatings: number;
  sumRatings: number;
  averageRating: number;
  createdAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /@(techcorp|innovatesoft|datasystems)\.com$/,
        "Email must be a valid company email address",
      ],
    },
    company: {
      type: String,
      enum: ["techcorp", "innovatesoft", "datasystems"],
      required: [true, "Company is required"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not-to-say"],
      default: "prefer-not-to-say",
    },
    shiftStart: {
      type: String,
      required: [true, "Shift start time is required"],
    },
    shiftEnd: {
      type: String,
      required: [true, "Shift end time is required"],
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verifiedAt: Date,
    activeRideId: {
      type: String,
      default: null,
      index: true,
    },
    isFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    flagReason: String,
    totalRatings: {
      type: Number,
      default: 0,
      min: 0,
    },
    sumRatings: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (this: IUser) {
  if (!this.isModified("password")) {
    return;
  }

  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  return await bcryptjs.compare(password, this.password);
};

const User =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;
