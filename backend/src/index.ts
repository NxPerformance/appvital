import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.PORT, () => {
  console.log(`Vitalissy backend rodando na porta ${env.PORT} (${env.NODE_ENV})`);
});
