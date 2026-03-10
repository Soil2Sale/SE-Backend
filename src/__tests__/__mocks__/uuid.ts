// CJS-compatible shim for uuid v13+ (pure ESM, breaks Jest CommonJS transform)
let counter = 0;
export const v4 = (): string => `test-uuid-${++counter}-4xxx-yxxx`;
export const v1 = (): string => `test-uuid-v1-${++counter}`;
export default { v4, v1 };
