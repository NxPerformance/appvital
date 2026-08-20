import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Dados invalidos",
      issues: error.issues,
    });
  }

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      message: error.code === "LIMIT_FILE_SIZE" ? "Arquivo muito grande" : error.message,
    });
  }

  if (error instanceof Error) {
    if (
      error.message === "Tipo de arquivo nao permitido" ||
      error.message === "Envie imagens JPG, PNG ou WebP para a comprovacao do personal"
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: error.message,
    });
  }

  return res.status(500).json({
    message: "Erro interno inesperado",
  });
}
