import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      validate: {
        validator: function (email) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: "Invalid email format",
      },
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      trim: true,
      index: true,
    },
    confirmPassword:
      {
        type: String,
        required: true,
        minlength: 6,
        trim: true,
        index: true,
      },
    bio: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    profilePic: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    nativeLanguage: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    learningLanguage: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    emailVerified: { type: Boolean, default: false },
    otpHash: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
    otpLastSentAt: { type: Date, select: false },
    twoFactorEmailOnLogin: { type: Boolean, default: true },
    lockUntil: { type: Date, select: false },

  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  const isPasswordCorrect = await bcrypt.compare(enteredPassword, this.password);
  return isPasswordCorrect;
};

const User = mongoose.model("User", userSchema);

export default User;
