import mongoose, { Schema, Document, Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

export interface IRefreshToken extends Document {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  revoked_at?: Date;
}

interface IRefreshTokenModel extends Model<IRefreshToken> {
  verifyToken(plainToken: string): Promise<IRefreshToken | null>;
  createToken(
    userId: string,
    plainToken: string,
    expiresAt: Date,
  ): Promise<IRefreshToken>;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
    },
    user_id: {
      type: String,
      required: true,
      ref: "User",
    },
    token_hash: {
      type: String,
      required: true,
      unique: true,
    },
    expires_at: {
      type: Date,
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
    revoked_at: {
      type: Date,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

refreshTokenSchema.pre("save", function (next) {
  if ((this as any).token && !this.token_hash) {
    const plainToken = (this as any).token;
    this.token_hash = crypto
      .createHash("sha256")
      .update(plainToken)
      .digest("hex");

    delete (this as any).token;
  }
  next();
});

refreshTokenSchema.index({ user_id: 1 });
refreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

refreshTokenSchema.statics.createToken = async function (
  userId: string,
  plainToken: string,
  expiresAt: Date,
): Promise<IRefreshToken> {
  const tokenHash = crypto
    .createHash("sha256")
    .update(plainToken)
    .digest("hex");

  return await this.create({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });
};

refreshTokenSchema.statics.verifyToken = async function (plainToken: string) {
  const tokenHash = crypto
    .createHash("sha256")
    .update(plainToken)
    .digest("hex");

  return await this.findOne({
    token_hash: tokenHash,
    revoked_at: null,
    expires_at: { $gt: new Date() },
  });
};

const RefreshToken = mongoose.model<IRefreshToken, IRefreshTokenModel>(
  "RefreshToken",
  refreshTokenSchema,
);

export default RefreshToken;
