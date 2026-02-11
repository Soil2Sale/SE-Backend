import AuditLog, { AuditAction } from "../models/AuditLog";

/**
 * Creates an audit log entry in the database
 * @param userId - The ID of the user performing the action
 * @param action - The audit action type from AuditAction enum
 * @param entityType - Type of entity being acted upon (e.g., 'User', 'Order', 'CropListing')
 * @param entityId - The ID of the entity being acted upon
 * @returns Promise<void>
 */
export const createAuditLog = async (
  userId: string,
  action: AuditAction,
  entityType: string,
  entityId: string,
): Promise<void> => {
  try {
    await AuditLog.create({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
    });
  } catch (error) {
    // Log error but don't throw to prevent audit logging from breaking main functionality
    console.error("Failed to create audit log:", error);
  }
};
