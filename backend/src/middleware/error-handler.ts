import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import multer from "multer";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const FILE_TYPE_ERROR_MESSAGES = [
  "Tipo de arquivo nao permitido",
  "Envie imagens JPG, PNG ou WebP para a comprovacao do personal",
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ message: "Dados invalidos", issues: err.issues });
    return;
  }

  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Arquivo muito grande" : err.message;
    res.status(400).json({ message });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message });
    return;
  }

  if (err instanceof Error) {
    if (FILE_TYPE_ERROR_MESSAGES.some((msg) => err.message.includes(msg))) {
      res.status(400).json({ message: err.message });
      return;
    }

    console.error(err);
    res.status(500).json({ message: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "Erro interno inesperado" });
}
