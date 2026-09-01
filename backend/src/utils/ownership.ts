import { HttpError } from "../middleware/error-handler.js";

// Throws 403 "Acesso negado" if a record's owner id doesn't match the
// authenticated user. Used after a preceding existence check, so reaching
// this point means the record exists but belongs to someone else.
export function assertOwner(ownerId: string, userId: string): void {
  if (ownerId !== userId) {
    throw new HttpError(403, "Acesso negado");
  }
}
