import { Router } from "express";
import { readFileSync } from "fs";
import { authRouter } from "./auth.routes.js";
import { profileRouter } from "./profile.routes.js";
import { achievementsRouter } from "./achievements.routes.js";
import { appointmentsRouter } from "./appointments.routes.js";
import { injectablesRouter } from "./injectables.routes.js";
import { bioimpedanceRouter } from "./bioimpedance.routes.js";
import { bodyProgressRouter } from "./body-progress.routes.js";
import { reportsRouter } from "./reports.routes.js";
import { trainerRouter } from "./trainer.routes.js";
import { workoutsRouter } from "./workouts.routes.js";
import { exercisesRouter } from "./exercises.routes.js";
import { wearablesRouter } from "./wearables.routes.js";
import { adminRouter } from "./admin.routes.js";
import { paymentsRouter } from "./payments.routes.js";

export const router = Router();

// Lê o commit git gravado em build-time (ver backend/Dockerfile). Permite
// confirmar, sem acesso ao painel de deploy, se o código rodando em produção
// realmente corresponde ao último merge — sem isso, uma tela mostrando
// comportamento antigo depois de um "deploy" pode ser um build que não
// pegou o código novo, e não dá pra saber olhando só pela resposta da API.
function readGitSha() {
  try {
    return readFileSync("GIT_SHA", "utf-8").trim() || "unknown";
  } catch {
    return "unknown";
  }
}

const gitSha = readGitSha();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", git_sha: gitSha });
});

router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/achievements", achievementsRouter);
router.use("/appointments", appointmentsRouter);
router.use("/injectables", injectablesRouter);
router.use("/bioimpedance", bioimpedanceRouter);
router.use("/body-progress", bodyProgressRouter);
router.use("/reports", reportsRouter);
router.use("/trainer", trainerRouter);
router.use("/workouts", workoutsRouter);
router.use("/exercises", exercisesRouter);
router.use("/wearables", wearablesRouter);
router.use("/admin", adminRouter);
router.use("/payments", paymentsRouter);
