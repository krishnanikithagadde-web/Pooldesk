import { RequestHandler } from "express";
import { connectToDatabase } from "../db";
import User from "../models/User";

export const handleSignUp: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const { fullName, email, password, gender, shiftStart, shiftEnd } =
      req.body;

    // Validate required fields
    if (!fullName || !email || !password || !shiftStart || !shiftEnd) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Extract company from email domain
    const emailDomain = email.split("@")[1];
    let company = "";

    if (emailDomain === "techcorp.com") {
      company = "techcorp";
    } else if (emailDomain === "innovatesoft.com") {
      company = "innovatesoft";
    } else if (emailDomain === "datasystems.com") {
      company = "datasystems";
    } else {
      res.status(400).json({ error: "Invalid company email domain" });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ error: "User with this email already exists" });
      return;
    }

    // Create new user
    const user = new User({
      fullName,
      email,
      password,
      gender: gender || "prefer-not-to-say",
      shiftStart,
      shiftEnd,
      company,
    });

    await user.save();

    // Return user data without password
    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        gender: user.gender,
        shiftStart: user.shiftStart,
        shiftEnd: user.shiftEnd,
        company: user.company,
      },
    });
  } catch (error: any) {
    console.error("SignUp error:", error);

    if (error.name === "ValidationError") {
      res.status(400).json({
        error: Object.values(error.errors)
          .map((e: any) => e.message)
          .join(", "),
      });
      return;
    }

    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleLogin: RequestHandler = async (req, res) => {
  try {
    await connectToDatabase();

    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Compare passwords
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Return user data without password
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        gender: user.gender,
        shiftStart: user.shiftStart,
        shiftEnd: user.shiftEnd,
        company: user.company,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
