# Checklist — pendências Vitalissy

> Atualizado durante a reconstrução do backend/frontend nesta sessão. Marcar conforme for resolvendo.

## Backend / infra

- [ ] **Pagamentos**: integrar a conta Stripe já conectada (hoje `POST /api/payments/checkout` é só um stub 503). `GET /api/payments/products` já funciona (lê do banco).
- [ ] **Wearables**: configurar credenciais reais do Fitbit (`FITBIT_CLIENT_ID`/`FITBIT_CLIENT_SECRET`/`FITBIT_REDIRECT_URI`) pra integração parar de cair em modo demo.
- [ ] **Upload de arquivos**: volume persistente já configurado no Easypanel (`/app/uploads`), mas ainda é disco local, não storage externo (S3/R2/Supabase Storage). Além disso, arquivos são servidos publicamente sem checagem de posse — corrigir quando migrar pra storage externo.
- [ ] **Segredo de criptografia dedicado**: tokens de wearables hoje derivam a chave AES do próprio `JWT_SECRET` — separar em `ENCRYPTION_KEY` próprio.
- [ ] **Trocar credenciais do admin de seed** (`admin@vitalissy.dev` / `VitalissyDev2026!`) antes de considerar o ambiente "produção real".
- [ ] **Tela Admin → Configurações de Pagamento** vai quebrar (404) — rotas de `payment-gateway-settings` foram puladas de propósito enquanto pagamento é stub.
- [ ] Decidir se a branch `claude/dev-server-setup-d37utr` vira a nova `main` (produção) — hoje a Vercel "Production" ainda aponta pra `main` antiga, só o Preview desta branch tem as mudanças novas.
- [ ] Resolver DNS de `app.vitalissy.com.br` (ou escolher domínio definitivo) e apontar pra VPS/Vercel de fato.
- [ ] **Integração Anovator (balança de bioimpedância)**: código pronto (`POST /api/bioimpedance/admin/anovator-lookup`, upload de laudo em PDF), mas falta a clínica se cadastrar no time comercial da Anovator (anovator.com/admin) para obter `apiKey`/`gymId` reais e configurar `ANOVATOR_API_KEY`/`ANOVATOR_GYM_ID` no backend. Até lá, a integração responde 501 "não configurada" e o admin continua preenchendo a bioimpedância manualmente (com apoio do PDF do laudo), exatamente como antes.

## Produto / frontend

- [ ] **UI/UX da tela de Evolução** — em andamento agora.
- [ ] Incrementos de Injetáveis estilo Ozempic (dos que já veio a ideia, ainda não implementados):
  - [ ] Próxima dose / contagem regressiva (precisa de um campo de "frequência esperada" que não existe hoje no modelo)
  - [ ] Rotação de local de aplicação (mapa do corpo, aviso de repetição)
  - [ ] Escada de titulação (protocolo de aumento gradual de dose)
  - [ ] Diário de efeitos colaterais por aplicação
  - [ ] Controle de estoque da caneta/medicamento
- [ ] Landing page da Dra. Gabriela (projeto separado, ainda não iniciado — foi removida deste repo por engano e será refeita à parte).

## Já concluído nesta sessão

- [x] Backend reconstruído (Express + Prisma + Postgres) e publicado na VPS via Easypanel
- [x] Frontend publicado na Vercel (branch de preview)
- [x] Navegação unificada (5 itens: Início, Injetáveis, Evolução, Saúde, Perfil)
- [x] Treinos simplificado (só musculação) e movido pra complemento (Perfil)
- [x] Home redesenhada em torno de injetáveis/evolução/consultas
- [x] Layout desktop expandido (Home, Workouts, WorkoutForm)
- [x] Volume persistente de uploads configurado na VPS
