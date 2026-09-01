import rateLimit from "express-rate-limit";

// Slows down credential-stuffing/brute-force attempts against login without
// getting in the way of a real user mistyping their password a couple of
// times. Keyed by IP (the library's default) since there's no session yet
// at this point in the request.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas tentativas de login. Tente novamente em alguns minutos." },
});
