# SE-Backend - Soil2Sale Agricultural Marketplace Backend

A robust Node.js/Express TypeScript API server for the Soil2Sale agricultural marketplace platform, featuring MongoDB integration, JWT authentication, and Telegram integration.

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [Git Branches](#git-branches)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Authentication System](#authentication-system)
6. [All Routes Documentation](#all-routes-documentation)
7. [All Models & Database Schema](#all-models--database-schema)
8. [Installation & Setup](#installation--setup)
9. [Environment Variables](#environment-variables)
10. [Running the Application](#running-the-application)
11. [API Response Format](#api-response-format)
12. [Middleware Overview](#middleware-overview)

---

## PROJECT OVERVIEW

SE-Backend is the API server powering Soil2Sale, a comprehensive agricultural marketplace connecting:
- **Farmers** - Crop producers and sellers
- **Buyers** - Crop purchasers
- **Cooperatives** - Agricultural collectives
- **Logistics Providers** - Transportation and delivery services
- **Financial Partners** - Lending and credit services
- **Admins** - Platform administrators

The backend handles user authentication, crop listings, orders, transactions, disputes, shipping, notifications, and more.

---

## GIT BRANCHES

The SE-Backend repository has the following branches:

### Current State:
```
* main (primary production branch)
  dev (development branch)
  remotes/origin/HEAD -> origin/main
  remotes/origin/dev
  remotes/origin/main
```

### Branch Strategy:
- **main** - Production-ready code, stable releases
- **dev** - Development and feature integration branch
- Feature branches created from dev branch

### How to Switch Branches:

```bash
# List all branches
git branch -a

# Switch to dev branch
git checkout dev

# Switch to main branch  
git checkout main

# Create new feature branch
git checkout -b feature/feature-name
```

---

## TECH STACK

### Core Dependencies:
- **Express.js** ^4.18.2 - Web framework
- **TypeScript** - Type-safe JavaScript
- **MongoDB + Mongoose** ^8.0.0 - NoSQL database and ODM
- **JWT (jsonwebtoken)** ^9.0.2 - Authentication tokens
- **Nodemailer** ^7.0.12 - Email service
- **node-telegram-bot-api** ^0.67.0 - Telegram bot integration
- **speakeasy** ^2.0.0 - OTP generation
- **bcryptjs** ^2.4.3 - Password hashing
- **axios** ^1.13.4 - HTTP client
- **Helmet** ^7.1.0 - Security headers
- **CORS** ^2.8.5 - Cross-origin resource sharing
- **Morgan** ^1.10.0 - HTTP request logging
- **UUID** ^13.0.0 - Unique ID generation

### Development Tools:
- **Nodemon** - Auto-restart on file changes
- **TypeScript Compiler** - TypeScript compilation

---

## PROJECT STRUCTURE

```
SE-Backend/
├── src/
│   ├── server.ts                    # Main application entry point
│   ├── config/
│   │   ├── database.ts              # MongoDB connection configuration
│   │   └── telegram.ts              # Telegram bot configuration
│   ├── controllers/                 # Business logic layer (28 controllers)
│   │   ├── authController.ts
│   │   ├── userController.ts
│   │   ├── orderController.ts
│   │   ├── transactionController.ts
│   │   ├── shipmentController.ts
│   │   ├── cropListingController.ts
│   │   ├── [... 22 more controllers]
│   ├── routes/                      # API endpoint definitions (28 routes)
│   │   ├── authRoutes.ts
│   │   ├── userRoutes.ts
│   │   ├── orderRoutes.ts
│   │   ├── [... 25 more route files]
│   ├── models/                      # Mongoose schemas & interfaces (30 models)
│   │   ├── User.ts
│   │   ├── Order.ts
│   │   ├── CropListing.ts
│   │   ├── Transaction.ts
│   │   ├── [... 26 more models]
│   ├── middlewares/
│   │   ├── auth.ts                  # JWT authentication middleware
│   │   ├── errorHandler.ts          # Global error handling
│   │   ├── validation.ts            # Input validation
│   │   ├── mail/
│   │   │   └── mailer.ts            # Email sending service
│   │   └── otp/
│   │       ├── otpService.ts        # OTP generation & validation
│   │       └── otpSender.ts         # OTP delivery via Telegram
│   └── utils/
│       ├── jwt.ts                   # JWT token generation/verification
│       ├── auditLogger.ts           # Audit logging utility
│       └── [... other utilities]
├── postman/                         # Postman collection & environment
│   ├── SE.postman_collection.json
│   └── globals/
│       └── workspace.postman_globals.json
├── .env                             # Environment variables (local)
├── .env.example                     # Environment variables template
├── package.json                     # Project dependencies
├── tsconfig.json                    # TypeScript configuration
├── nodemon.json                     # Nodemon configuration
└── .gitignore                       # Git ignore file
```

---

## AUTHENTICATION SYSTEM

### Overview

The authentication system uses a multi-step verification process combining:
- **User Registration** with mobile number and role selection
- **Telegram Integration** for OTP delivery and verification
- **JWT Tokens** for session management
- **Refresh Tokens** for long-term access
- **Email Support** for recovery and notifications

### Authentication Flow

#### 1. USER REGISTRATION

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "name": "John Farmer",
  "mobile_number": "9876543210",
  "role": "Farmer",
  "recovery_email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please link your Telegram and verify OTP.",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Farmer",
      "mobile_number": "9876543210",
      "role": "Farmer",
      "is_verified": false,
      "is_telegram_linked": false
    },
    "telegram_bot_link": "https://t.me/bot_username?start=user_id",
    "note": "Click the Telegram link to receive your verification OTP. You have 5 minutes to verify."
  }
}
```

**Process:**
1. User provides registration details
2. User is created in database (not verified initially)
3. User receives Telegram bot link
4. User must click link to link Telegram account
5. OTP is generated and sent via Telegram

#### 2. TELEGRAM LINKING & OTP RECEIPT

**Process:**
1. User clicks Telegram bot link with their user ID
2. Bot links user's Telegram chat ID to their account
3. Set `is_telegram_linked: true`
4. OTP is automatically sent via Telegram

**Telegram Integration:**
- Uses `node-telegram-bot-api` library
- OTP sent immediately after Telegram linking
- OTP valid for 5 minutes
- Stored using `speakeasy` library

#### 3. OTP VERIFICATION (Registration)

**Endpoint:** `POST /api/auth/verify-registration`

**Request Body:**
```json
{
  "userId": "user-uuid",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Registration verified successfully! You can now login.",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Farmer",
      "is_verified": true,
      "is_telegram_linked": true
    }
  }
}
```

**Validation:** Checks that:
- User exists and is not already verified
- Telegram account is linked
- OTP matches and hasn't expired

#### 4. LOGIN

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "identifier": "9876543210"  // Can be email or mobile number
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Farmer",
      "role": "Farmer"
    },
    "accessToken": "jwt_token_here",
    "refreshToken": "session_for_cookie"
  }
}
```

**Process:**
1. System validates identifier (email or mobile)
2. User fetched from database
3. User must be verified (`is_verified: true`)
4. User must have Telegram linked (`is_telegram_linked: true`)
5. Access token generated (short-lived)
6. Refresh token set in httpOnly cookie (long-lived, 7 days)

#### 5. OTP VERIFICATION (Login)

**Endpoint:** `POST /api/auth/verify-otp`

**Request Body:**
```json
{
  "identifier": "9876543210",
  "otp": "123456"
}
```

**Process:**
1. User receives OTP via Telegram during login
2. User submits OTP with identifier
3. System validates OTP
4. Session tokens issued if valid

#### 6. TOKEN REFRESH

**Endpoint:** `POST /api/auth/refresh`

**Process:**
1. Frontend sends request with refresh token (in httpOnly cookie)
2. Backend verifies refresh token
3. New access token generated
4. Original request retried with new token

**Token Details:**
- **Access Token:** Short-lived (15 mins typical), used for API requests
- **Refresh Token:** Long-lived (7 days), stored in httpOnly cookie for security

#### 7. LOGOUT

**Endpoint:** `POST /api/auth/logout`

**Process:**
1. Clear refresh token from database
2. Clear cookie from client
3. User session terminated

---

### Authentication Middleware

**File:** `src/middlewares/auth.ts`

**authenticate() Middleware:**
- Extracts JWT from `Authorization: Bearer {token}` header
- Verifies token validity
- Returns 401 if token missing or invalid
- Returns 401 if token expired
- Sets `req.user` object with decoded data if valid

**authorize(...roles) Middleware:**
- Checks user role against required roles
- Returns 403 if user lacks required role
- Used for role-based access control

**Usage Example:**
```typescript
router.use(authenticate);  // Require authentication for all routes
router.get('/admin', authorize('Admin'), getAdminData);  // Require admin role
```

---

### User Roles

The system supports 6 user roles:

1. **Farmer** - Crop producers, can list crops, submit offers
2. **Buyer** - Crop purchasers, can create orders, make offers
3. **Cooperative** - Agricultural collective organizations
4. **Logistics Provider** - Shipping and delivery services
5. **Financial Partner** - Lending and credit services
6. **Admin** - Platform managers with elevated permissions

---

### OTP System

**Implementation:** `src/middlewares/otp/`

**OTP Features:**
- Generated using `speakeasy` library
- Valid for 5 minutes
- Can be resent
- Sent via Telegram for registration and login
- Supports email fallback

**OTP Storage:**
- Stored in user document as `otp_secret`
- Time-based validation

---

## ALL ROUTES DOCUMENTATION

### 1. AUTH ROUTES
**File:** `src/routes/authRoutes.ts` → `src/controllers/authController.ts`

```
POST   /api/auth/register              Register new user
POST   /api/auth/verify-registration   Verify registration OTP
POST   /api/auth/login                 Login with email/phone
POST   /api/auth/verify-otp            Verify login OTP
POST   /api/auth/logout                Logout user
POST   /api/auth/refresh               Refresh access token
```

---

### 2. USER ROUTES
**File:** `src/routes/userRoutes.ts` → `src/controllers/userController.ts`

```
GET    /api/users                      Get all users (paginated)
GET    /api/users/:id                  Get user by ID
GET    /api/users/role                 Get users by role
POST   /api/users                      Create new user
PUT    /api/users/:id                  Update user profile
PATCH  /api/users/:id/deactivate       Deactivate user account
PATCH  /api/users/:id/activate         Activate user account
```

---

### 3. FARMER PROFILE ROUTES
**File:** `src/routes/farmerProfileRoutes.ts` → `src/controllers/farmerProfileController.ts`

```
GET    /api/farmer-profiles            Get all farmer profiles
GET    /api/farmer-profiles/:farmerId  Get farmer profile by ID
POST   /api/farmer-profiles            Create farmer profile
PUT    /api/farmer-profiles/:farmerId  Update farmer profile
DELETE /api/farmer-profiles/:farmerId  Delete farmer profile
GET    /api/farmer-profiles/stats/:farmerId    Get farmer statistics
```

---

### 4. FARMER CROPS ROUTES
**File:** `src/routes/farmerCropRoutes.ts` → `src/controllers/farmerCropController.ts`

```
GET    /api/farmer-crops               Get all farmer crops
GET    /api/farmer-crops/farmer/:farmerId     Get crops by farmer
POST   /api/farmer-crops               Add crop to farmer
PUT    /api/farmer-crops/:id           Update farmer crop
DELETE /api/farmer-crops/:id           Delete farmer crop
```

---

### 5. CROP LISTING ROUTES
**File:** `src/routes/cropListingRoutes.ts` → `src/controllers/cropListingController.ts`

```
GET    /api/crop-listings              Get all crop listings (paginated)
GET    /api/crop-listings/active       Get active listings only
GET    /api/crop-listings/:id          Get listing by ID
POST   /api/crop-listings              Create new crop listing
PUT    /api/crop-listings/:id          Update crop listing
PATCH  /api/crop-listings/:id/status   Update listing status
DELETE /api/crop-listings/:id          Delete crop listing
```

---

### 6. OFFER ROUTES
**File:** `src/routes/offerRoutes.ts` → `src/controllers/offerController.ts`

```
GET    /api/offers                     Get all offers (paginated)
GET    /api/offers/:id                 Get offer by ID
GET    /api/offers/listing/:listingId  Get offers for listing
GET    /api/offers/user/:userId        Get user offers
POST   /api/offers                     Create new offer
PUT    /api/offers/:id                 Update offer
DELETE /api/offers/:id                 Delete offer
PATCH  /api/offers/:id/status          Update offer status
```

---

### 7. NEGOTIATION ROUTES
**File:** `src/routes/negotiationRoutes.ts` → `src/controllers/negotiationController.ts`

```
GET    /api/negotiations               Get all negotiations (paginated)
GET    /api/negotiations/:id           Get negotiation by ID
POST   /api/negotiations               Create negotiation log
PUT    /api/negotiations/:id           Update negotiation
DELETE /api/negotiations/:id           Delete negotiation
PATCH  /api/negotiations/:id/status    Update negotiation status
```

---

### 8. ORDER ROUTES
**File:** `src/routes/orderRoutes.ts` → `src/controllers/orderController.ts`

```
GET    /api/orders/purchases           Get buyer orders
GET    /api/orders/sales               Get seller orders
GET    /api/orders/:id                 Get order by ID
POST   /api/orders                     Create new order
PATCH  /api/orders/:id/status          Update order status
PATCH  /api/orders/:id/payment         Update payment status
PUT    /api/orders/:id/cancel          Cancel order
```

---

### 9. WALLET ROUTES
**File:** `src/routes/walletRoutes.ts` → `src/controllers/walletController.ts`

```
GET    /api/wallets                    Get all wallets (paginated)
GET    /api/wallets/:userId            Get user wallet
POST   /api/wallets                    Create wallet
PUT    /api/wallets/:id                Update wallet balance
GET    /api/wallets/:userId/balance    Get wallet balance
```

---

### 10. TRANSACTION ROUTES
**File:** `src/routes/transactionRoutes.ts` → `src/controllers/transactionController.ts`

```
GET    /api/transactions               Get all transactions (paginated)
GET    /api/transactions/:id           Get transaction by ID
GET    /api/transactions/user/:userId  Get user transactions
POST   /api/transactions               Create transaction record
GET    /api/transactions/stats/:userId Get user transaction stats
```

---

### 11. DISPUTE ROUTES
**File:** `src/routes/disputeRoutes.ts` → `src/controllers/disputeController.ts`

```
GET    /api/disputes                   Get all disputes (paginated)
GET    /api/disputes/:id               Get dispute by ID
POST   /api/disputes                   Create new dispute
PUT    /api/disputes/:id               Update dispute
DELETE /api/disputes/:id               Delete dispute
PATCH  /api/disputes/:id/status        Update dispute status
GET    /api/disputes/:id/evidence      Get dispute evidence
```

---

### 12. LOGISTICS PROVIDER ROUTES
**File:** `src/routes/logisticsProviderRoutes.ts` → `src/controllers/logisticsProviderController.ts`

```
GET    /api/logistics-providers        Get all providers (paginated)
GET    /api/logistics-providers/:id    Get provider by ID
POST   /api/logistics-providers        Create provider profile
PUT    /api/logistics-providers/:id    Update provider
DELETE /api/logistics-providers/:id    Delete provider
GET    /api/logistics-providers/:id/vehicles      Get provider vehicles
GET    /api/logistics-providers/:id/stats         Get provider stats
```

---

### 13. VEHICLE ROUTES
**File:** `src/routes/vehicleRoutes.ts` → `src/controllers/vehicleController.ts`

```
GET    /api/vehicles                   Get all vehicles (paginated)
GET    /api/vehicles/:id               Get vehicle by ID
GET    /api/vehicles/provider/:providerId         Get provider vehicles
POST   /api/vehicles                   Add vehicle
PUT    /api/vehicles/:id               Update vehicle
DELETE /api/vehicles/:id               Delete vehicle
```

---

### 14. SHIPMENT ROUTES
**File:** `src/routes/shipmentRoutes.ts` → `src/controllers/shipmentController.ts`

```
GET    /api/shipments                  Get all shipments (paginated)
GET    /api/shipments/:id              Get shipment by ID
GET    /api/shipments/tracking/:trackingId       Track shipment
POST   /api/shipments                  Create shipment
PUT    /api/shipments/:id              Update shipment
PATCH  /api/shipments/:id/status       Update shipment status
DELETE /api/shipments/:id              Delete shipment
```

---

### 15. STORAGE FACILITY ROUTES
**File:** `src/routes/storageFacilityRoutes.ts` → `src/controllers/storageFacilityController.ts`

```
GET    /api/storage-facilities         Get all facilities (paginated)
GET    /api/storage-facilities/:id     Get facility by ID
POST   /api/storage-facilities         Create facility
PUT    /api/storage-facilities/:id     Update facility
DELETE /api/storage-facilities/:id     Delete facility
GET    /api/storage-facilities/:id/capacity      Get capacity info
```

---

### 16. BNPL LOAN ROUTES
**File:** `src/routes/bnplLoanRoutes.ts` → `src/controllers/bnplLoanController.ts`

```
GET    /api/bnpl-loans                 Get all loans (paginated)
GET    /api/bnpl-loans/:id             Get loan by ID
POST   /api/bnpl-loans                 Create loan
PUT    /api/bnpl-loans/:id             Update loan
DELETE /api/bnpl-loans/:id             Delete loan
PATCH  /api/bnpl-loans/:id/status      Update loan status
GET    /api/bnpl-loans/user/:userId    Get user loans
```

---

### 17. FINANCIAL PARTNER ROUTES
**File:** `src/routes/financialPartnerRoutes.ts` → `src/controllers/financialPartnerController.ts`

```
GET    /api/financial-partners         Get all partners (paginated)
GET    /api/financial-partners/:id     Get partner by ID
POST   /api/financial-partners         Create partner
PUT    /api/financial-partners/:id     Update partner
DELETE /api/financial-partners/:id     Delete partner
```

---

### 18. CREDIT OFFER ROUTES
**File:** `src/routes/creditOfferRoutes.ts` → `src/controllers/creditOfferController.ts`

```
GET    /api/credit-offers              Get all offers (paginated)
GET    /api/credit-offers/:id          Get offer by ID
POST   /api/credit-offers              Create credit offer
PUT    /api/credit-offers/:id          Update credit offer
DELETE /api/credit-offers/:id          Delete credit offer
```

---

### 19. ADVISORY CONTENT ROUTES
**File:** `src/routes/advisoryContentRoutes.ts` → `src/controllers/advisoryContentController.ts`

```
GET    /api/advisory-content           Get all advisory content (paginated)
GET    /api/advisory-content/:id       Get content by ID
POST   /api/advisory-content           Create advisory
PUT    /api/advisory-content/:id       Update advisory
DELETE /api/advisory-content/:id       Delete advisory
GET    /api/advisory-content/category/:category  Get by category
```

---

### 20. AI INSIGHT ROUTES
**File:** `src/routes/aiInsightRoutes.ts` → `src/controllers/aiInsightController.ts`

```
GET    /api/ai-insights                Get all insights (paginated)
GET    /api/ai-insights/:id            Get insight by ID
POST   /api/ai-insights                Generate/Create insight
PUT    /api/ai-insights/:id            Update insight
DELETE /api/ai-insights/:id            Delete insight
GET    /api/ai-insights/farmer/:farmerId         Get farmer insights
```

---

### 21. GOVERNMENT SCHEME ROUTES
**File:** `src/routes/governmentSchemeRoutes.ts` → `src/controllers/governmentSchemeController.ts`

```
GET    /api/government-schemes         Get all schemes (paginated)
GET    /api/government-schemes/:id     Get scheme by ID
POST   /api/government-schemes         Create scheme
PUT    /api/government-schemes/:id     Update scheme
DELETE /api/government-schemes/:id     Delete scheme
```

---

### 22. MARKET PRICE ROUTES
**File:** `src/routes/marketPriceRoutes.ts` → `src/controllers/marketPriceController.ts`

```
GET    /api/market-prices              Get all prices (paginated)
GET    /api/market-prices/:id          Get price by ID
GET    /api/market-prices/crop/:cropType        Get prices by crop
POST   /api/market-prices              Create price record
PUT    /api/market-prices/:id          Update price
DELETE /api/market-prices/:id          Delete price
```

---

### 23. YIELD HISTORY ROUTES
**File:** `src/routes/yieldHistoryRoutes.ts` → `src/controllers/yieldHistoryController.ts`

```
GET    /api/yield-history              Get all records (paginated)
GET    /api/yield-history/:id          Get record by ID
GET    /api/yield-history/farmer/:farmerId      Get farmer yields
POST   /api/yield-history              Create yield record
PUT    /api/yield-history/:id          Update yield record
DELETE /api/yield-history/:id          Delete yield record
```

---

### 24. NOTIFICATION ROUTES
**File:** `src/routes/notificationRoutes.ts` → `src/controllers/notificationController.ts`

```
GET    /api/notifications              Get all notifications (paginated)
GET    /api/notifications/:id          Get notification by ID
GET    /api/notifications/user/:userId Get user notifications
POST   /api/notifications              Create notification
PUT    /api/notifications/:id          Update notification
DELETE /api/notifications/:id          Delete notification
PATCH  /api/notifications/:id/read     Mark notification as read
```

---

### 25. RATING & REVIEW ROUTES
**File:** `src/routes/ratingReviewRoutes.ts` → `src/controllers/ratingReviewController.ts`

```
GET    /api/ratings-reviews/for-user/:userId    Get reviews for user
GET    /api/ratings-reviews/by-user/:userId     Get reviews by user
GET    /api/ratings-reviews/stats/:userId       Get rating statistics
GET    /api/ratings-reviews/:id                 Get review by ID
POST   /api/ratings-reviews                     Create review
PUT    /api/ratings-reviews/:id                 Update review
DELETE /api/ratings-reviews/:id                 Delete review
```

---

### 26. ASSET ROUTES
**File:** `src/routes/assetRoutes.ts` → `src/controllers/assetController.ts`

```
GET    /api/assets                     Get all assets (paginated)
GET    /api/assets/:id                 Get asset by ID
POST   /api/assets                     Create asset
PUT    /api/assets/:id                 Update asset
DELETE /api/assets/:id                 Delete asset
GET    /api/assets/user/:userId        Get user assets
```

---

### 27. AUDIT LOG ROUTES
**File:** `src/routes/auditLogRoutes.ts` → `src/controllers/auditLogController.ts`

```
GET    /api/audit-logs                 Get all audit logs (paginated)
GET    /api/audit-logs/:id             Get log by ID
GET    /api/audit-logs/user/:userId    Get user logs
POST   /api/audit-logs                 Create audit log (internal)
GET    /api/audit-logs/action/:action  Get logs by action type
```

---

### 28. TELEGRAM ROUTES
**File:** `src/routes/telegramRoutes.ts` → `src/controllers/telegramController.ts`

```
POST   /api/telegram/webhook           Telegram webhook receiver
POST   /api/telegram/send-message      Send message via Telegram
GET    /api/telegram/chat/:userId      Get chat by user
POST   /api/telegram/send-otp/:userId  Send OTP via Telegram
```

---

## ALL MODELS & DATABASE SCHEMA

### Complete List of Models (30 Total)

#### 1. **User Model**
**File:** `src/models/User.ts`

**Interface:**
```typescript
export interface IUser extends Document {
  id: string;
  created_at: Date;
  name: string;
  mobile_number: string;
  otp_secret: string;
  role: UserRole;
  aadhaar_verified: boolean;
  business_verified: boolean;
  recovery_email?: string;
  telegram_chat_id?: string;
  is_telegram_linked: boolean;
  is_verified: boolean;
  verification_otp_sent_at?: Date;
}
```

**User Roles:**
- Farmer
- Buyer
- Cooperative
- Logistics Provider
- Financial Partner
- Admin

**Indexes:**
- mobile_number (unique)
- telegram_chat_id
- created_at

---

#### 2. **RefreshToken Model**
**File:** `src/models/RefreshToken.ts`

Stores refresh tokens for session management.

---

#### 3. **FarmerProfile Model**
**File:** `src/models/FarmerProfile.ts`

Extended farmer-specific information:
- Land size
- Crops grown
- Experience level
- Location
- Bank details

---

#### 4. **FarmerCrop Model**
**File:** `src/models/FarmerCrop.ts`

Tracks crops cultivated by each farmer:
- Crop type
- Quantity
- Yield information
- Growing season

---

#### 5. **CropListing Model**
**File:** `src/models/CropListing.ts`

**Interface:**
```typescript
export interface ICropListing extends Document {
  id: string;
  created_at: Date;
  farmer_id: string;
  crop_type: string;
  quantity: number;
  price: number;
  status: string;  // active, sold, cancelled
}
```

Represents active crop offerings with:
- Farmer reference
- Crop details
- Quantity available
- Pricing
- Status tracking

---

#### 6. **Offer Model**
**File:** `src/models/Offer.ts`

Purchase/sale offers on listings:
- Offering party
- Listing reference
- Offered price
- Quantity
- Status (pending, accepted, rejected)

---

#### 7. **NegotiationLog Model**
**File:** `src/models/NegotiationLog.ts`

Records negotiation history:
- Parties involved
- Price progression
- Timeline
- Status

---

#### 8. **Order Model**
**File:** `src/models/Order.ts`

**Interface:**
```typescript
export interface IOrder extends Document {
  id: string;
  created_at: Date;
  crop_listing_id: string;
  buyer_user_id: string;
  final_price: number;
  quantity: number;
  status: OrderStatus;
  payment_status: string;
  sender_user_id: string;
}
```

**Order Status Enum:**
- CREATED
- CONFIRMED
- CANCELLED
- COMPLETED

---

#### 9. **Wallet Model**
**File:** `src/models/Wallet.ts`

User financial accounts:
- Balance
- Currency
- Account linking
- Usage history references

---

#### 10. **Transaction Model**
**File:** `src/models/Transaction.ts`

Financial transaction records:
- Payer & payee
- Amount
- Type (debit/credit)
- Status (pending, completed, failed)
- Order/shipment references

---

#### 11. **Dispute Model**
**File:** `src/models/Dispute.ts`

Conflict resolution tracking:
- Involved parties
- Related order
- Description
- Status (open, resolved, rejected)
- Evidence

---

#### 12. **DisputeEvidence Model**
**File:** `src/models/DisputeEvidence.ts`

Supporting documents for disputes:
- Type (photo, receipt, message)
- URL/content
- Uploader
- Timestamp

---

#### 13. **LogisticsProviderProfile Model**
**File:** `src/models/LogisticsProviderProfile.ts`

Shipping service provider details:
- Company name
- Coverage areas
- Vehicle types
- Rating
- Service rates

---

#### 14. **Vehicle Model**
**File:** `src/models/Vehicle.ts`

Fleet management:
- Provider reference
- Vehicle type
- Capacity
- Registration
- Current status

---

#### 15. **Shipment Model**
**File:** `src/models/Shipment.ts`

Shipping records:
- Order reference
- Pickup location
- Delivery location
- Vehicle assigned
- Tracking ID
- Status (pending, in-transit, delivered)
- Timeline

---

#### 16. **StorageFacility Model**
**File:** `src/models/StorageFacility.ts`

Storage location details:
- Operator/owner
- Location
- Capacity (units)
- Used capacity
- Stored items
- Rates

---

#### 17. **BNPLLoan Model**
**File:** `src/models/BNPLLoan.ts`

Buy Now Pay Later loans:
- Borrower
- Lender reference
- Amount
- Terms
- Status (active, paid, defaulted)

---

#### 18. **FinancialPartner Model**
**File:** `src/models/FinancialPartner.ts`

Credit service provider information:
- Company details
- Services offered
- Terms
- Contact information
- Rating

---

#### 19. **CreditOffer Model**
**File:** `src/models/CreditOffer.ts`

Credit product offerings:
- Financial partner
- Amount range
- Interest rate
- Terms
- Eligibility criteria

---

#### 20. **AdvisoryContent Model**
**File:** `src/models/AdvisoryContent.ts`

Agricultural guidance:
- Category (pest control, irrigation, etc.)
- Content
- Applicable crops
- Season
- Author

---

#### 21. **AIInsight Model**
**File:** `src/models/AIInsight.ts`

AI-generated recommendations:
- Farmer reference
- Type (yield prediction, disease detection)
- Content
- Accuracy score
- Timestamp

---

#### 22. **GovernmentScheme Model**
**File:** `src/models/GovernmentScheme.ts`

Agricultural subsidy/support programs:
- Scheme name
- Description
- Eligibility
- Benefits
- Application link
- Deadline

---

#### 23. **MarketPrice Model**
**File:** `src/models/MarketPrice.ts`

Crop pricing information:
- Crop type
- Market
- Price
- Date
- Grade/quality

---

#### 24. **YieldHistory Model**
**File:** `src/models/YieldHistory.ts`

Production records:
- Farmer reference
- Crop type
- Quantity produced
- Quality metrics
- Season/year

---

#### 25. **Notification Model**
**File:** `src/models/Notification.ts`

User notifications:
- Recipient
- Type (order, shipment, payment)
- Content
- Read status
- Created timestamp

---

#### 26. **RatingReview Model**
**File:** `src/models/RatingReview.ts`

User feedback:
- Reviewer & reviewed user
- Rating (1-5)
- Review text
- Timestamp
- Unique index on (reviewer, reviewed user)

---

#### 27. **Asset Model**
**File:** `src/models/Asset.ts`

Physical asset tracking:
- Type
- Owner
- Condition
- Location
- Value

---

#### 28. **AuditLog Model**
**File:** `src/models/AuditLog.ts`

System activity tracking:
- User performing action
- Action type
- Affected resource
- Timestamp
- Details

**Audit Actions:**
```typescript
export enum AuditAction {
  CREATE = "CREATE",
  READ = "READ",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  AUTH_FAILED = "AUTH_FAILED"
}
```

---

#### 29. **UserConsent Model**
**File:** `src/models/UserConsent.ts`

GDPR/privacy compliance:
- User reference
- Consent type
- Status
- Timestamp

---

#### 30. **NegotiationLog Model** (Additional)
**File:** `src/models/NegotiationLog.ts`

Detailed negotiation tracking for order agreements.

---

### Database Indexes Summary

Common indexing patterns across models:
```typescript
// Single field indexes
schema.index({ userId: 1 });
schema.index({ created_at: -1 });
schema.index({ status: 1 });

// Compound indexes
schema.index({ userId: 1, status: 1 });
schema.index({ farmerId: 1, cropType: 1 });

// Unique indexes
schema.index({ email: 1 }, { unique: true });
schema.index({ mobileNumber: 1 }, { unique: true });
schema.index(
  { reviewerId: 1, reviewedUserId: 1 },
  { unique: true }
);
```

---

## INSTALLATION & SETUP

### Prerequisites

- **Node.js** v14+ and **npm** v6+
- **MongoDB** local or cloud instance (MongoDB Atlas recommended)
- **Telegram Bot** created via @BotFather
- **Gmail account** (for email notifications)

### Step 1: Clone Repository

```bash
git clone https://github.com/Soil2Sale/SE-Backend.git
cd SE-Backend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Create Environment File

```bash
cp .env.example .env
```

### Step 4: Configure Environment Variables

Edit `.env` with your configuration (see below for details)

### Step 5: Start Application

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

---

## ENVIRONMENT VARIABLES

Create `.env` file with the following variables:

```bash
# SERVER
PORT=3000
NODE_ENV=development

# DATABASE
DATABASE_URL=mongodb://localhost:27017/soil2sale
# OR for MongoDB Atlas
# DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/soil2sale

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRY=15m
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=7d

# TELEGRAM
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_from_botfather
TELEGRAM_BOT_USERNAME=your_bot_username

# EMAIL
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASSWORD=your_app_specific_password
MAIL_FROM=noreply@soil2sale.com

# CLIENT
CLIENT_URL=http://localhost:3000

# LOGGING
LOG_LEVEL=debug
```

### Getting Credentials

**Telegram Bot Token:**
1. Chat with @BotFather on Telegram
2. Use `/newbot` command
3. Follow prompts to create bot
4. Copy the API token

**Gmail App Password:**
1. Enable 2-factor authentication on Gmail
2. Go to https://myaccount.google.com/apppasswords
3. Generate app-specific password
4. Use this password in `.env`

---

## RUNNING THE APPLICATION

### Development Mode

```bash
npm run dev
```

- Automatically restarts on file changes (Nodemon)
- TypeScript compiled on the fly
- Available at http://localhost:3000

### Production Build

```bash
# Compile TypeScript
npm run build

# Run compiled JavaScript
npm start
```

### API Health Check

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-02-12T10:30:00.000Z"
}
```

---

## API RESPONSE FORMAT

### Success Response

All successful API responses follow this format:

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "count": 1,
  "total": 100,
  "page": 1,
  "totalPages": 10,
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": "DetailedErrorInfo",
  "statusCode": 400
}
```

### HTTP Status Codes

- **200** - OK, request successful
- **201** - Created, resource created
- **400** - Bad Request, invalid input
- **401** - Unauthorized, authentication required
- **403** - Forbidden, insufficient permissions
- **404** - Not Found, resource doesn't exist
- **409** - Conflict, duplicate entry
- **500** - Internal Server Error

---

## MIDDLEWARE OVERVIEW

### Authentication Middleware
**File:** `src/middlewares/auth.ts`

- Verifies JWT tokens
- Extracts user information
- Handles token expiry

### Error Handler Middleware
**File:** `src/middlewares/errorHandler.ts`

- Global error catching
- Error formatting
- Logging

### Validation Middleware
**File:** `src/middlewares/validation.ts`

- Input validation
- Schema validation
- Field sanitization

### OTP Service
**File:** `src/middlewares/otp/`

- OTP generation
- OTP validation
- Telegram delivery

### Email Service
**File:** `src/middlewares/mail/`

- Email sending
- Template rendering
- Failure retries

---

## POSTMAN COLLECTION

Import the provided Postman collection to test all APIs:

**Files:**
- `postman/SE.postman_collection.json` - Complete API collection
- `postman/globals/workspace.postman_globals.json` - Environment variables

**Setup:**
1. Open Postman
2. Click "Import"
3. Select the JSON files
4. Use provided test cases

---

## PROJECT STATISTICS

- **28 Routes** - Comprehensive API endpoints
- **28 Controllers** - Business logic implementation
- **30 Database Models** - Complete data schema
- **6 User Roles** - Role-based access control
- **Pagination Support** - Efficient data retrieval
- **Transaction Tracking** - Financial integrity
- **Audit Logging** - Compliance and security

---

## SECURITY FEATURES

✓ JWT-based authentication  
✓ httpOnly cookies for tokens  
✓ Helmet.js for security headers  
✓ CORS configuration  
✓ Input validation & sanitization  
✓ Role-based access control  
✓ OTP verification  
✓ Audit logging  
✓ Environment-based configuration  

---

## COMMON TASKS

### Adding New Route

1. Create controller at `src/controllers/entityController.ts`
2. Create route at `src/routes/entityRoutes.ts`
3. Import route in `src/server.ts`
4. Add to Express app: `app.use("/api/entity", entityRoutes);`

### Adding New Model

1. Create schema at `src/models/Entity.ts`
2. Define TypeScript interface
3. Add indexes as needed
4. Export model

### Testing API

Use Postman collection or curl:

```bash
# Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name":"John", "email":"john@example.com"}'
```

---

## TROUBLESHOOTING

### MongoDB Connection Failed

- Verify DATABASE_URL in .env
- Check MongoDB service is running
- Ensure network access (if MongoDB Atlas)

### JWT Token Invalid

- Verify token format: `Authorization: Bearer {token}`
- Check token hasn't expired
- Verify JWT_SECRET matches

### OTP Not Sending

- Verify Telegram bot token
- Check user Telegram is linked
- Review bot for error messages

---

## DEPLOYMENT CHECKLIST

- [ ] Set NODE_ENV=production in .env
- [ ] Change JWT_SECRET to secure random string
- [ ] Configure MongoDB Atlas connection
- [ ] Set up email service (Gmail/SendGrid)
- [ ] Create Telegram bot
- [ ] Test all authentication flows
- [ ] Set CLIENT_URL to production domain
- [ ] Run npm run build
- [ ] Deploy on server (Heroku, AWS, etc.)

---

## CONTRIBUTING

1. Create feature branch from dev
2. Make changes
3. Test thoroughly
4. Create pull request
5. Request review
6. Merge to dev after approval
7. Merge to main for releases

---

## SUPPORT & DOCUMENTATION

- **GitHub Issues:** Report bugs and request features
- **Postman Collection:** API testing and documentation
- **Code Comments:** Inline documentation

---

## VERSION INFO

- **Current Version:** 1.0.0
- **Last Updated:** February 2026
- **Node Version:** 14+
- **Express Version:** 4.18.2
- **MongoDB Version:** 4.4+

---

## LICENSE

ISC License - See package.json

---

**Repository:** https://github.com/Soil2Sale/SE-Backend  
**Owner:** Soil2Sale Team  
**Main Branch:** main  
**Development Branch:** dev
