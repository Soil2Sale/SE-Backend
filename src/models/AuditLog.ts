import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum AuditAction {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  
  CROP_LISTING_CREATED = 'CROP_LISTING_CREATED',
  CROP_LISTING_STATUS_CHANGED = 'CROP_LISTING_STATUS_CHANGED',
  OFFER_CREATED = 'OFFER_CREATED',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  OFFER_REJECTED = 'OFFER_REJECTED',
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
  
  NEGOTIATION_STARTED = 'NEGOTIATION_STARTED',
  NEGOTIATION_CLOSED = 'NEGOTIATION_CLOSED',
  
  SHIPMENT_CREATED = 'SHIPMENT_CREATED',
  SHIPMENT_STATUS_CHANGED = 'SHIPMENT_STATUS_CHANGED',
  DELIVERY_CONFIRMED = 'DELIVERY_CONFIRMED',
  
  TRANSACTION_INITIATED = 'TRANSACTION_INITIATED',
  TRANSACTION_SUCCESS = 'TRANSACTION_SUCCESS',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  REFUND_INITIATED = 'REFUND_INITIATED',
  BNPL_CREATED = 'BNPL_CREATED',
  BNPL_REPAYMENT_DEDUCTED = 'BNPL_REPAYMENT_DEDUCTED',
  
  DISPUTE_RAISED = 'DISPUTE_RAISED',
  DISPUTE_STATUS_CHANGED = 'DISPUTE_STATUS_CHANGED',
  
  NOTIFICATION_SENT = 'NOTIFICATION_SENT',
  
  ADMIN_SCHEME_UPDATED = 'ADMIN_SCHEME_UPDATED',
  ADMIN_ADVISORY_UPDATED = 'ADMIN_ADVISORY_UPDATED',
  ADMIN_DISPUTE_ACTION = 'ADMIN_DISPUTE_ACTION',
  ADMIN_ORDER_MODIFIED = 'ADMIN_ORDER_MODIFIED',
  ADMIN_TRANSACTION_MODIFIED = 'ADMIN_TRANSACTION_MODIFIED'
}

export interface IAuditLog extends Document {
  id: string;
  created_at: Date;
  user_id: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: true
    },
    user_id: {
      type: String,
      required: true,
      ref: 'User'
    },
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: true
    },
    entity_type: {
      type: String,
      required: true
    },
    entity_id: {
      type: String,
      required: true
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

auditLogSchema.index({ user_id: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ entity_type: 1, entity_id: 1 });
auditLogSchema.index({ created_at: -1 });
auditLogSchema.index({ id: 1 });

const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

export default AuditLog;