import { RequestHandler } from "express";
import User from "../models/User";
import VerifiedEmployee from "../models/VerifiedEmployee";

// Verify employee email
export const verifyEmployee: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params;
    const { employeeId, department } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.status(400).json({ error: "User already verified" });
    }

    // Create verification record
    const verifiedEmployee = await VerifiedEmployee.findOneAndUpdate(
      { email: user.email },
      {
        email: user.email,
        fullName: user.fullName,
        company: user.company,
        employeeId,
        department,
        verificationStatus: "verified",
        verifiedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Update user verification status
    await User.findByIdAndUpdate(userId, {
      isVerified: true,
      verifiedAt: new Date(),
    });

    res.json({
      message: "Employee verified successfully",
      verifiedEmployee,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

// Check if user is verified
export const checkVerificationStatus: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const verifiedEmployee = await VerifiedEmployee.findOne({
      email: user.email,
    });

    res.json({
      isVerified: user.isVerified,
      isFlagged: user.isFlagged,
      flagReason: user.flagReason,
      verificationDetails: verifiedEmployee,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

// Flag suspicious user
export const flagUser: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params;
    const { flagReason } = req.body;

    if (!flagReason) {
      return res.status(400).json({ error: "Flag reason is required" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isFlagged: true,
        flagReason,
      },
      { new: true }
    );

    // Also update verification status
    await VerifiedEmployee.findOneAndUpdate(
      { email: user?.email },
      {
        verificationStatus: "flagged",
        flagReason,
      }
    );

    res.json({
      message: "User flagged successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

// Get verified employees for company
export const getVerifiedEmployees: RequestHandler = async (req, res) => {
  try {
    const { company } = req.query;

    if (!company) {
      return res.status(400).json({ error: "Company is required" });
    }

    const employees = await VerifiedEmployee.find({
      company,
      verificationStatus: "verified",
    }).select("-__v");

    res.json({
      company,
      totalVerified: employees.length,
      employees,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

// Get flagged users
export const getFlaggedUsers: RequestHandler = async (req, res) => {
  try {
    const { company } = req.query;

    let query: any = { isFlagged: true };
    if (company) {
      query.company = company;
    }

    const flaggedUsers = await User.find(query).select(
      "fullName email company flagReason isFlagged createdAt"
    );

    res.json({
      totalFlagged: flaggedUsers.length,
      users: flaggedUsers,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

// Multi-passenger authentication before ride
export const authenticatePassengers: RequestHandler = async (req, res) => {
  try {
    const { rideId, passengerIds } = req.body;

    if (!Array.isArray(passengerIds) || passengerIds.length === 0) {
      return res.status(400).json({ error: "Passenger IDs are required" });
    }

    // Check if all passengers are verified
    const passengers = await User.find({ _id: { $in: passengerIds } });

    const unverifiedPassengers = passengers.filter((p) => !p.isVerified);
    const flaggedPassengers = passengers.filter((p) => p.isFlagged);

    const allVerified = unverifiedPassengers.length === 0;
    const noFlaggedUsers = flaggedPassengers.length === 0;

    const passengerDetails = passengers.map((p) => ({
      id: p._id,
      name: p.fullName,
      email: p.email,
      company: p.company,
      isVerified: p.isVerified,
      isFlagged: p.isFlagged,
      canJoinRide: p.isVerified && !p.isFlagged,
    }));

    res.json({
      rideId,
      allVerified,
      noFlaggedUsers,
      canProceedWithRide: allVerified && noFlaggedUsers,
      totalPassengers: passengers.length,
      unverifiedCount: unverifiedPassengers.length,
      flaggedCount: flaggedPassengers.length,
      passengerDetails,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};
