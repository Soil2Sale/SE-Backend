import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateAccessToken = (userId: Types.ObjectId, email: string, role: string): string => {
  const payload: TokenPayload = {
    userId: userId.toString(),
    email,
    role
  };

  const options: jwt.SignOptions = {
    expiresIn: (process.env.JWT_ACCESS_EXPIRY) as jwt.SignOptions['expiresIn']
  };

  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, options);
};

export const generateRefreshToken = (userId: Types.ObjectId, email: string, role: string): string => {
  const payload: TokenPayload = {
    userId: userId.toString(),
    email,
    role
  };

  const options: jwt.SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRY) as jwt.SignOptions['expiresIn']
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, options);
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as TokenPayload;
};

export const getRefreshTokenExpiry = (): Date => {
  const expiryString = process.env.JWT_REFRESH_EXPIRY!;
  const match = expiryString.match(/^(\d+)([smhd])$/);
  
  if (!match) {
    throw new Error('Invalid JWT_REFRESH_EXPIRY format');
  }

  const value = parseInt(match[1]);
  const unit = match[2];
  const now = new Date();

  switch (unit) {
    case 's':
      return new Date(now.getTime() + value * 1000);
    case 'm':
      return new Date(now.getTime() + value * 60 * 1000);
    case 'h':
      return new Date(now.getTime() + value * 60 * 60 * 1000);
    case 'd':
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    default:
      throw new Error('Invalid time unit');
  }
};
