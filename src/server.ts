import express, { Application } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/database';
import { errorHandler } from './middlewares/errorHandler';
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import farmerProfileRoutes from './routes/farmerProfileRoutes';
import farmerCropRoutes from './routes/farmerCropRoutes';
import cropListingRoutes from './routes/cropListingRoutes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/farmer-profiles', farmerProfileRoutes);
app.use('/api/farmer-crops', farmerCropRoutes);
app.use('/api/crop-listings', cropListingRoutes);

app.use(errorHandler);

try {
connectDB();
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});
} catch (error) {
console.error('Failed to start server:', error);
process.exit(1);
}
