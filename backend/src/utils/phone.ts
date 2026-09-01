import { HttpError } from "../middleware/error-handler.js";

// Brazilian phone: DDD (2 digits) + number (8 or 9 digits) = 10 or 11 digits
// total. Shared by the register and profile-update phone-normalization
// paths so the accepted format can't drift between the two.
export function assertValidPhoneDigits(digits: string): void {
  if (digits.length < 10 || digits.length > 11) {
    throw new HttpError(400, "Telefone invalido, informe DDD + numero");
  }
}
