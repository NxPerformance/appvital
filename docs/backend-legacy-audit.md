# Auditoria do Backend Legado — Vitalissy

> Documento de referência único gerado antes da exclusão da pasta `backend/`. Objetivo: permitir reconstruir um backend novo (Express + Prisma + Postgres) com comportamento equivalente, sem depender do código antigo. Cobre `backend/src/*` e `backend/prisma/schema.prisma`. Não inclui detalhes de implementação do Stripe antigo (ver seção 6) nem SQL de migrations.

---

## 1. Resumo executivo — o que manter vs. o que reconstruir diferente

**Manter como está (comportamento a replicar fielmente):**
- O modelo de dados completo do Prisma (todas as tabelas, enums, relações, índices) — está bem desenhado e cobre todo o domínio do app.
- A lógica de negócio de quase todas as rotas: autenticação, perfil, conquistas, agendamentos, treinos (força/cardio), injetáveis, bioimpedância, fotos de progresso corporal, personal trainers (aplicação, aprovação, vínculo trainer↔cliente, logs), relatórios premium, admin (gestão de usuários/roles/aplicações), auditoria.
- O design de roles via tabela `UserRoleAssignment` (não é um enum único no `User`) — um usuário pode acumular `USER` implícito + `ADMIN` e/ou `PERSONAL_TRAINER` simultaneamente.
- O fluxo de aprovação de personal trainer (cadastro com CREF + fotos de comprovação → análise admin → concessão do role + Premium automático).
- A integração com Fitbit (OAuth2 + PKCE) como está — é a única integração de wearable "real"; as demais (Apple Health, Google Fit, Garmin) são simuladas com dados demo determinísticos.
- O serviço de auditoria (`AuditLog`) para toda ação administrativa sensível.
- A convenção de resposta em `snake_case` no JSON de saída (o Prisma internamente usa `camelCase`, mas os serializers convertem).

**Reconstruir diferente (não replicar a implementação, só o resultado funcional):**
- **Upload de arquivos**: hoje é tudo `multer.diskStorage` gravando em disco local (`UPLOAD_DIR`, servido via `/uploads` estático). Isso **não é confiável em VPS com redeploys/containers efêmeros ou múltiplas instâncias** e deve ser substituído por armazenamento de objetos externo (S3, Cloudflare R2, Supabase Storage ou Vercel Blob). Ver seção 5.
- **Pagamentos/Stripe**: toda a implementação atual (`payments.service.ts`, `payment-gateway.service.ts`, `payment-gateway-settings.service.ts`, rotas de checkout/webhook) será descartada. Uma nova conta/integração Stripe (já configurada separadamente) vai substituir isso. Documentamos apenas o *resultado funcional* esperado (seção 6), não a API antiga.
- **WorkoutX (GIFs de exercícios)**: é uma integração com uma API externa de terceiros (`api.workoutxapp.com`) mediante `WORKOUTX_API_KEY`, com um mini-proxy assinado por HMAC para evitar expor a chave no client. Isso é opcional/cosmético (galeria de exercícios) — pode ser recriado se a chave/serviço ainda existir, mas não é core do produto.

**Pontos de dívida técnica / algo a não reproduzir tal como está:**
- Uploads sem transação atômica real: em alguns fluxos (ex.: registro com foto de personal trainer) há `try/catch` manual para apagar arquivos órfãos em caso de erro — frágil, sintoma direto de usar disco local em vez de storage transacional/externo.
- Criptografia de segredos (tokens Fitbit, chaves Stripe) usa `crypto.createHash("sha256").update(JWT_SECRET)` como chave AES-256-GCM — ou seja, a chave de criptografia deriva do mesmo segredo usado para assinar JWT. Funciona, mas idealmente seria um segredo dedicado (`ENCRYPTION_KEY` próprio) na reconstrução.
- O endpoint de "webhook genérico" em `payments.routes.ts` (`POST /api/payments/webhooks/:provider` para providers que não sejam Stripe: `mercado_pago`, `pagarme`, `asaas`) nunca foi de fato implementado do lado do gateway — só existe o esqueleto de validação de assinatura HMAC + atualização de status. Não há adapters reais para esses provedores. Não vale a pena reproduzir esse esqueleto morto.
- `PaymentGatewaySetting` permite guardar config de gateway no banco (com fallback para variáveis de ambiente) — um nível de indireção que só faz sentido se o admin puder trocar chaves Stripe pela UI sem redeploy. Avaliar se a reconstrução precisa disso ou se variáveis de ambiente bastam.
- O seed (`prisma/seed.ts`) cria um usuário admin fixo com e-mail/senha hardcoded (`erykdeveloper@gmail.com` / `Admin123456`) — isso é aceitável para dev, mas deve ser trocado ou removido/alterado em produção na reconstrução (não reutilizar essa senha).

---

## 2. Modelo de dados (Prisma / PostgreSQL)

Fonte da verdade: `backend/prisma/schema.prisma`. Reproduzido quase na íntegra abaixo (fonte de verdade para a reconstrução do schema).

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  USER
  ADMIN
  PERSONAL_TRAINER
}

enum TrainerClientStatus {
  ACTIVE
  ARCHIVED
}

enum BodyProgressPhotoPose {
  FRONT
  SIDE
  BACK
  CUSTOM
}

enum TrainerApplicationStatus {
  PENDING
  APPROVED
  REJECTED
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELLED
}

enum AppointmentType {
  CONSULTA_ONLINE
  CONSULTA_PRESENCIAL
  BIOIMPEDANCIA
}

enum ProductStatus {
  ACTIVE
  INACTIVE
}

enum BillingCycle {
  ONE_TIME
  MONTHLY
}

enum OrderStatus {
  PENDING
  PAID
  CANCELLED
  EXPIRED
  REFUNDED
}

enum PaymentMethod {
  PIX
  CREDIT_CARD
}

enum PaymentStatus {
  PENDING
  PROCESSING
  PAID
  FAILED
  CANCELLED
  REFUNDED
}

enum PaymentProvider {
  MANUAL
  MERCADO_PAGO
  STRIPE
  PAGARME
  ASAAS
}

enum WearableProvider {
  APPLE_HEALTH
  GOOGLE_FIT
  GARMIN
  FITBIT
}

enum WearableConnectionStatus {
  CONNECTED
  DISCONNECTED
  NEEDS_REAUTH
}

enum WearableNotificationType {
  HEART_RATE
  RECOVERY
  SLEEP
  SYNC
  CONSENT
}

enum WearableNotificationSeverity {
  INFO
  SUCCESS
  WARNING
  CRITICAL
}

model User {
  id                  String               @id @default(uuid()) @db.Uuid
  email               String               @unique
  passwordHash        String
  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt
  profile             Profile?
  roles               UserRoleAssignment[]
  achievements        UserAchievement[]
  appointments        Appointment[]
  workouts            Workout[]
  cardioWorkouts      CardioWorkout[]
  injectables         Injectable[]
  bioimpedanceRecords BioimpedanceRecord[]
  orders              Order[]
  payments            Payment[]
  auditLogsAsActor    AuditLog[]           @relation("AuditActor")
  auditLogsAsTarget   AuditLog[]           @relation("AuditTarget")
  bodyProgressPhotos  BodyProgressPhoto[]
  trainerClients      TrainerClient[]      @relation("TrainerRelationTrainer")
  assignedTrainers    TrainerClient[]      @relation("TrainerRelationClient")
  trainerApplication  TrainerApplication?
  wearableConnections WearableConnection[]
  wearableReadings    WearableReading[]
  wearableNotifications WearableNotification[]
  wearableOAuthStates WearableOAuthState[]
}

model Profile {
  userId    String    @id @db.Uuid
  fullName  String
  phone     String?
  age       Int
  heightCm  Int
  weightKg  Decimal   @db.Decimal(10, 2)
  isPremium Boolean   @default(false)
  accountType String   @default("client")
  selectedPlan String?
  initialPaymentMethod String?
  termsAcceptedAt DateTime?
  notificationPreferences Json?
  entryDate DateTime?
  avatarUrl String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([fullName])
}

model UserRoleAssignment {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  role      UserRole
  createdAt DateTime @default(now())
  createdBy String?  @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, role])
  @@index([userId])
}

model Achievement {
  id          String            @id @default(uuid()) @db.Uuid
  name        String            @unique
  description String
  icon        String?
  sortOrder   Int               @default(1)
  createdAt   DateTime          @default(now())
  users       UserAchievement[]
}

model UserAchievement {
  id            String      @id @default(uuid()) @db.Uuid
  userId        String      @db.Uuid
  achievementId String      @db.Uuid
  unlockedAt    DateTime    @default(now())
  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  achievement   Achievement @relation(fields: [achievementId], references: [id], onDelete: Cascade)

  @@unique([userId, achievementId])
}

model Appointment {
  id            String            @id @default(uuid()) @db.Uuid
  userId        String            @db.Uuid
  type          AppointmentType
  status        AppointmentStatus @default(PENDING)
  scheduledDate DateTime?
  scheduledTime String?
  adminNotes    String?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  user          User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
  @@index([scheduledDate])
}

model Workout {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @db.Uuid
  date        DateTime @default(now())
  objective   String
  durationMin Int?
  calories    Int?
  workoutType String   @default("academia")
  exercises   Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, date])
}

model CardioWorkout {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @db.Uuid
  date        DateTime @default(now())
  workoutType String
  durationMin Decimal? @db.Decimal(10, 2)
  distanceKm  Decimal? @db.Decimal(10, 2)
  calories    Int?
  avgPace     String?
  avgSpeed    Decimal? @db.Decimal(10, 2)
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, date])
}

model Injectable {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @db.Uuid
  medication String
  dose       String
  date       DateTime
  time       String
  location   String
  notes      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, date])
}

model BioimpedanceRecord {
  id                     String   @id @default(uuid()) @db.Uuid
  userId                 String   @db.Uuid
  date                   DateTime
  weightKg               Decimal? @db.Decimal(10, 2)
  bodyFatPercent         Decimal? @db.Decimal(10, 2)
  musclePercent          Decimal? @db.Decimal(10, 2)
  waterPercent           Decimal? @db.Decimal(10, 2)
  visceralFat            Decimal? @db.Decimal(10, 2)
  subcutaneousFatPercent Decimal? @db.Decimal(10, 2)
  fatFreeMassKg          Decimal? @db.Decimal(10, 2)
  proteinPercent         Decimal? @db.Decimal(10, 2)
  boneMassKg             Decimal? @db.Decimal(10, 2)
  muscleMassKg           Decimal? @db.Decimal(10, 2)
  bmi                    Decimal? @db.Decimal(10, 2)
  fatWeightKg            Decimal? @db.Decimal(10, 2)
  waistHipRatio          Decimal? @db.Decimal(10, 2)
  bmrKcal                Int?
  idealWeightKg          Decimal? @db.Decimal(10, 2)
  weightControlTip       Decimal? @db.Decimal(10, 2)
  fatControlTip          Decimal? @db.Decimal(10, 2)
  muscleControlTip       Decimal? @db.Decimal(10, 2)
  dailyCalories          Int?
  waistCm                Decimal? @db.Decimal(10, 2)
  hipCm                  Decimal? @db.Decimal(10, 2)
  armCm                  Decimal? @db.Decimal(10, 2)
  thighCm                Decimal? @db.Decimal(10, 2)
  shoulderImbalanceCm    Decimal? @db.Decimal(10, 2)
  spineCurvatureCm       Decimal? @db.Decimal(10, 2)
  headTiltDegrees        Decimal? @db.Decimal(10, 2)
  trunkCurvatureDegrees  Decimal? @db.Decimal(10, 2)
  pelvisTiltDegrees      Decimal? @db.Decimal(10, 2)
  headForwardDegrees     Decimal? @db.Decimal(10, 2)
  notes                  String?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  user                   User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, date])
}

model TrainerClient {
  id         String              @id @default(uuid()) @db.Uuid
  trainerId  String              @db.Uuid
  clientId   String              @db.Uuid
  status     TrainerClientStatus @default(ACTIVE)
  notes      String?
  goals      String?
  trainingPlan String?
  createdAt  DateTime            @default(now())
  updatedAt  DateTime            @updatedAt
  trainer    User                @relation("TrainerRelationTrainer", fields: [trainerId], references: [id], onDelete: Cascade)
  client     User                @relation("TrainerRelationClient", fields: [clientId], references: [id], onDelete: Cascade)
  logs       TrainerClientLog[]

  @@unique([trainerId, clientId])
  @@index([trainerId, status])
  @@index([clientId, status])
}

model TrainerClientLog {
  id               String        @id @default(uuid()) @db.Uuid
  trainerClientId  String        @db.Uuid
  trainerId        String        @db.Uuid
  clientId         String        @db.Uuid
  title            String
  content          String
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  trainerClient    TrainerClient @relation(fields: [trainerClientId], references: [id], onDelete: Cascade)

  @@index([trainerClientId, createdAt])
  @@index([trainerId, clientId, createdAt])
}

model BodyProgressPhoto {
  id        String               @id @default(uuid()) @db.Uuid
  userId    String               @db.Uuid
  imageUrl  String
  pose      BodyProgressPhotoPose
  label     String?
  notes     String?
  takenAt   DateTime
  createdAt DateTime             @default(now())
  updatedAt DateTime             @updatedAt
  user      User                 @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, takenAt])
  @@index([pose])
}

model TrainerApplication {
  id              String                   @id @default(uuid()) @db.Uuid
  userId          String                   @unique @db.Uuid
  status          TrainerApplicationStatus @default(PENDING)
  fullName        String
  cref            String
  crefState       String
  specialties     String?
  experienceYears Int?
  instagramHandle String?
  proofNotes      String?
  selfPhotoUrl    String?
  documentPhotoUrl String?
  reviewedAt      DateTime?
  reviewedBy      String?                  @db.Uuid
  rejectionReason String?
  createdAt       DateTime                 @default(now())
  updatedAt       DateTime                 @updatedAt
  user            User                     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([status, createdAt])
}

model Product {
  id            String        @id @default(uuid()) @db.Uuid
  slug          String        @unique
  name          String
  description   String?
  priceCents    Int
  currency      String        @default("BRL")
  status        ProductStatus @default(ACTIVE)
  billingCycle  BillingCycle  @default(ONE_TIME)
  grantsPremium Boolean       @default(false)
  metadata      Json?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  orderItems    OrderItem[]

  @@index([status])
}

model Order {
  id            String      @id @default(uuid()) @db.Uuid
  userId        String      @db.Uuid
  status        OrderStatus @default(PENDING)
  subtotalCents Int
  discountCents Int         @default(0)
  totalCents    Int
  currency      String      @default("BRL")
  paidAt        DateTime?
  cancelledAt   DateTime?
  expiresAt     DateTime?
  customerEmail String
  customerName  String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  items         OrderItem[]
  payments      Payment[]

  @@index([userId, createdAt])
  @@index([status])
}

model OrderItem {
  id             String  @id @default(uuid()) @db.Uuid
  orderId        String  @db.Uuid
  productId      String  @db.Uuid
  quantity       Int     @default(1)
  unitPriceCents Int
  totalCents     Int
  productName    String
  grantsPremium  Boolean @default(false)
  order          Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product        Product @relation(fields: [productId], references: [id], onDelete: Restrict)

  @@index([orderId])
  @@index([productId])
}

model Payment {
  id                   String          @id @default(uuid()) @db.Uuid
  orderId              String          @db.Uuid
  userId               String          @db.Uuid
  provider             PaymentProvider
  method               PaymentMethod
  status               PaymentStatus   @default(PENDING)
  amountCents          Int
  currency             String          @default("BRL")
  providerPaymentId    String?
  providerPreferenceId String?
  checkoutUrl          String?
  pixQrCode            String?
  pixCopyPaste         String?
  failureReason        String?
  rawProviderPayload   Json?
  expiresAt            DateTime?
  paidAt               DateTime?
  createdAt            DateTime        @default(now())
  updatedAt            DateTime        @updatedAt
  order                Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  user                 User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([userId, createdAt])
  @@index([provider, providerPaymentId])
  @@index([status])
}

model PaymentWebhookEvent {
  id              String          @id @default(uuid()) @db.Uuid
  provider        PaymentProvider
  providerEventId String?
  eventType       String
  paymentId       String?
  payload         Json
  processedAt     DateTime?
  createdAt       DateTime        @default(now())

  @@unique([provider, providerEventId])
  @@index([provider])
  @@index([createdAt])
}

model PaymentGatewaySetting {
  id                     String          @id @default(uuid()) @db.Uuid
  provider               PaymentProvider @unique
  isActive               Boolean         @default(true)
  publishableKey         String?
  secretKeyEncrypted     String?
  webhookSecretEncrypted String?
  createdAt              DateTime        @default(now())
  updatedAt              DateTime        @updatedAt

  @@index([isActive])
}

model WearableConnection {
  id                   String                     @id @default(uuid()) @db.Uuid
  userId               String                     @db.Uuid
  provider             WearableProvider
  status               WearableConnectionStatus   @default(CONNECTED)
  deviceName           String?
  externalAccountLabel String?
  accessTokenEncrypted String?
  refreshTokenEncrypted String?
  tokenExpiresAt       DateTime?
  scopes               Json?
  consentVersion       String                     @default("v1")
  connectedAt          DateTime                   @default(now())
  lastSyncAt           DateTime?
  disconnectedAt       DateTime?
  createdAt            DateTime                   @default(now())
  updatedAt            DateTime                   @updatedAt
  user                 User                       @relation(fields: [userId], references: [id], onDelete: Cascade)
  readings             WearableReading[]

  @@unique([userId, provider])
  @@index([userId, status])
  @@index([provider])
}

model WearableReading {
  id                  String              @id @default(uuid()) @db.Uuid
  userId              String              @db.Uuid
  connectionId        String?             @db.Uuid
  provider            WearableProvider
  recordedAt          DateTime
  heartRateBpm        Int?
  restingHeartRateBpm Int?
  hrvMs               Int?
  spo2Percent         Decimal?            @db.Decimal(5, 2)
  activeCalories      Int?
  steps               Int?
  sleepMinutes        Int?
  recoveryScore       Int?
  stressScore         Int?
  batteryPercent      Int?
  rawSummary          Json?
  createdAt           DateTime            @default(now())
  user                User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  connection          WearableConnection? @relation(fields: [connectionId], references: [id], onDelete: SetNull)

  @@index([userId, recordedAt])
  @@index([connectionId])
  @@index([provider, recordedAt])
}

model WearableNotification {
  id        String                         @id @default(uuid()) @db.Uuid
  userId    String                         @db.Uuid
  type      WearableNotificationType
  severity  WearableNotificationSeverity   @default(INFO)
  title     String
  message   String
  isRead    Boolean                        @default(false)
  readAt    DateTime?
  metadata  Json?
  createdAt DateTime                       @default(now())
  user      User                           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead, createdAt])
  @@index([type])
  @@index([severity])
}

model WearableOAuthState {
  id           String           @id @default(uuid()) @db.Uuid
  userId       String           @db.Uuid
  provider     WearableProvider
  state        String           @unique
  codeVerifier String
  redirectPath String?
  expiresAt    DateTime
  usedAt       DateTime?
  createdAt    DateTime         @default(now())
  user         User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, provider, expiresAt])
  @@index([expiresAt])
}

model AuditLog {
  id           String   @id @default(uuid()) @db.Uuid
  actorUserId  String?  @db.Uuid
  targetUserId String?  @db.Uuid
  action       String
  entityType   String
  entityId     String?
  details      Json
  createdAt    DateTime @default(now())
  actor        User?    @relation("AuditActor", fields: [actorUserId], references: [id], onDelete: SetNull)
  target       User?    @relation("AuditTarget", fields: [targetUserId], references: [id], onDelete: SetNull)

  @@index([actorUserId])
  @@index([targetUserId])
  @@index([entityType])
  @@index([createdAt])
}
```

**Observações sobre o modelo:**
- Todos os IDs são UUID gerados no Postgres (`@default(uuid())`), não IDs sequenciais.
- Valores monetários e de contagem (`priceCents`, `totalCents`, `amountCents`) são inteiros em centavos — nunca `Decimal`/`float` para dinheiro.
- Medidas corporais (peso, %gordura, circunferências etc.) usam `Decimal(10,2)` no banco, mas nas respostas JSON os serializers convertem para `Number` do JS.
- `Profile.notificationPreferences` é um `Json` livre; o valor default aplicado no app (client e servidor) é:
  ```json
  { "updates": true, "reminders": true, "account": true, "wearables": true, "email": true, "whatsapp": false }
  ```
- Praticamente todo `onDelete` é `Cascade` a partir de `User` — apagar um usuário no admin apaga em cascata perfil, treinos, injetáveis, bioimpedância, fotos, pagamentos, vínculos de personal trainer etc. (`OrderItem.product` é `Restrict`, ou seja, não se pode apagar um `Product` que já tem pedidos vinculados).

---

## 3. Autenticação / JWT / Sessão

Arquivos: `src/lib/jwt.ts`, `src/middleware/auth.ts`, `src/routes/auth.routes.ts`.

### Design geral
- Autenticação **stateless via JWT**, sem tabela de sessões nem refresh token. Não usa cookies para autenticação (o `cookie-parser` está montado no `app.ts` mas nenhuma rota lê cookies de auth) — o token é enviado pelo client via header `Authorization: Bearer <token>` e guardado no `localStorage`/estado do frontend (fora do escopo deste doc, mas relevante para a reconstrução do client).
- Payload do JWT: `{ sub: userId, email, roles: string[] }` (roles no momento da emissão — não são recalculadas até o próximo login/`/me`).
- Assinatura: HS256 via `jsonwebtoken`, segredo = `JWT_SECRET`, expiração = `JWT_EXPIRES_IN` (default `7d`).
- Middleware `requireAuth`: exige header `Authorization: Bearer <token>`; verifica o token; **busca as roles atuais do usuário no banco** (`UserRoleAssignment`) a cada requisição autenticada (não confia apenas no que está no JWT) e popula `req.auth = { userId, email, roles }`. Retorna 401 se o header estiver ausente ou o token for inválido/expirado.
- `requireAdmin`: exige `req.auth.roles` conter `ADMIN` (403 caso contrário).
- `requireRole(role, mensagem?)`: helper genérico para exigir qualquer role específico (usado para `PERSONAL_TRAINER` em `trainer.routes.ts`).

### Roles
- Enum `UserRole`: `USER`, `ADMIN`, `PERSONAL_TRAINER`.
- Modelagem **não é um campo único** no `User` — é uma tabela `UserRoleAssignment` (many-to-many lógico entre usuário e role, com `@@unique([userId, role])`), permitindo um usuário ter múltiplos roles simultâneos (ex.: cliente comum que também é personal trainer aprovado, ou admin que também é trainer). Não existe um role "USER" explícito atribuído — a ausência de qualquer role especial já implica usuário comum.
- `createdBy` em `UserRoleAssignment` registra qual admin concedeu o role (auditoria adicional, além do `AuditLog`).

### Fluxos de auth (`auth.routes.ts`)
- **`POST /api/auth/register`** (multipart/form-data, aceita `self_photo` e `document_photo` como uploads opcionais via multer):
  - Body (campos de formulário): `full_name`, `email`, `phone` (opcional, normalizado para dígitos, deve ter 10-11 dígitos com DDD), `age`, `height_cm`, `weight_kg`, `password` (mín. 6 chars), `terms_accepted` (deve ser `true`), `account_type` (`client` | `personal`, default `client`), `selected_plan` (`essential` | `premium`, default `essential`, só relevante se `client`), `initial_payment_method` (`pix` | `credit_card`, opcional), `trainer_application` (JSON stringificado, obrigatório se `account_type === "personal"`, com `cref`, `cref_state`, `specialties?`, `experience_years?`, `instagram_handle?`, `proof_notes?`).
  - Validação de CREF: regex que aceebra formatos como `123456-G/SP` ou `123456/SP`, cruzando com lista de siglas de UF brasileiras válidas.
  - Se `account_type === "personal"`: exige upload de `self_photo` e `document_photo` (JPG/PNG/WebP, até 5MB cada) — sem eles, 400. Cria o usuário **e** um registro `TrainerApplication` com status `PENDING` na mesma transação Prisma. O usuário não recebe o role `PERSONAL_TRAINER` até aprovação de um admin (ver seção 4 — Admin).
  - E-mail duplicado → 409. Se o cadastro falhar depois do upload, os arquivos enviados são apagados do disco (rollback manual, ver seção 5 sobre por que isso é frágil).
  - Sucesso: cria `User` + `Profile` (com `notificationPreferences` default, `termsAcceptedAt = now()`, `entryDate = now()`) e (se aplicável) `TrainerApplication`; hasheia a senha com `bcrypt` (10 rounds); assina e devolve o JWT + `user` + `profile` serializados.
- **`POST /api/auth/login`**: `{ email, password }` → busca usuário, compara hash com `bcrypt.compare`, 401 genérico ("Credenciais invalidas") tanto para e-mail inexistente quanto senha errada (não vaza qual dos dois está errado); devolve token + `user` + `profile`.
- **`GET /api/auth/me`** (autenticado): retorna o usuário/perfil atual recarregado do banco (roles atualizadas, status da aplicação de trainer se houver).

### Segurança de senha
- `bcryptjs`, custo 10, sem pepper adicional.

---

## 4. Rotas da API, agrupadas por arquivo

Convenções gerais válidas para (quase) todas as rotas:
- Toda rota exceto as marcadas como públicas exige `requireAuth` (Bearer token válido).
- Corpo/consulta validados com **Zod**; erro de validação → 400 com `{ message: "Dados invalidos", issues: [...] }` (tratado centralmente pelo `error-handler.ts`).
- Todas as respostas de sucesso de mutação relevante (create/update com efeito administrativo) tendem a chamar `logAudit(...)` — ver seção 8.
- Todos os campos JSON de saída usam `snake_case` (conversão feita nos serializers/rotas), enquanto o Prisma internamente é `camelCase`.

### 4.1 `auth.routes.ts` — prefixo `/api/auth`
Ver seção 3 (documentado lá para evitar duplicação).

### 4.2 `profile.routes.ts` — prefixo `/api/profile`
- **`GET /me`** (auth) — retorna o perfil do usuário logado, serializado com flags `is_admin`, `is_personal_trainer`, `trainer_application_status`, `trainer_application_id`.
- **`PATCH /me`** (auth) — atualiza campos parciais: `full_name`, `phone` (normalizado), `age`, `height_cm`, `weight_kg`, `notification_preferences` (objeto arbitrário `{chave: boolean}` que é mesclado/substituído no Json). Não permite alterar e-mail, senha ou `account_type`/`is_premium` por aqui.
- **`POST /avatar`** (auth, multipart, campo `avatar`) — upload de imagem (JPG/PNG/WebP/GIF, até 5MB). Salva em disco com nome `${userId}-avatar${ext}` (sobrescreve o avatar anterior do mesmo usuário automaticamente pelo nome de arquivo determinístico, mas com extensão possivelmente diferente — por isso o código também apaga explicitamente o arquivo anterior se o path mudar). Atualiza `Profile.avatarUrl` para `/uploads/<arquivo>`.

### 4.3 `achievements.routes.ts` — prefixo `/api/achievements`
- **`GET /catalog`** (auth) — lista todas as conquistas cadastradas (`Achievement`), ordenadas por `sortOrder`.
- **`GET /me`** (auth) — lista as conquistas desbloqueadas pelo usuário (`UserAchievement` + include `achievement`), ordenadas por `unlockedAt`.
- Não há rota para desbloquear conquista manualmente pelo cliente — o único gatilho de desbloqueio automático hoje é "Primeiro Treino" (ver `workouts.routes.ts`, seção 4.10). O seed cria 2 conquistas: "Mudança de Vida" (concedida... na verdade nunca é concedida automaticamente em código nenhum — parece dead/preparada para uso futuro) e "Primeiro Treino".

### 4.4 `appointments.routes.ts` — prefixo `/api/appointments`
Tipos de consulta (`AppointmentType`): `consulta_online`, `consulta_presencial`, `bioimpedancia` (mapeados de/para os enums do Prisma via helpers em `serializers.ts`).
- **`GET /mine`** (auth) — lista os agendamentos do próprio usuário.
- **`POST /mine`** (auth) — cria um agendamento novo com `{ type }`. Sempre nasce com `status = PENDING`, sem data/hora definidas — a marcação de data/hora é feita pelo admin depois (fluxo: cliente solicita tipo de consulta → admin confirma data/horário).
- **`DELETE /mine/:id`** (auth) — cliente só pode cancelar/remover um agendamento próprio se ele ainda estiver `PENDING` (400 se já confirmado/concluído/cancelado). Deleta o registro (não é soft-delete).
- **`GET /admin`** (auth + admin) — lista todos os agendamentos de todos os usuários, com perfil (nome, e-mail, telefone) anexado.
- **`PATCH /admin/:id`** (auth + admin) — admin define/atualiza `scheduled_date` (formato `YYYY-MM-DD`, convertido para meio-dia UTC `T12:00:00.000Z` para evitar problemas de fuso), `scheduled_time` (string livre, ex. "14:30"), `status` (`pending|confirmed|completed|cancelled`), `admin_notes`. Gera `AuditLog` (`update_appointment`).

### 4.5 `injectables.routes.ts` — prefixo `/api/injectables`
Registro de aplicações de injetáveis (ex.: hormônios/medicamentos) do próprio usuário — sem endpoints admin, é uma agenda pessoal.
- **`GET /`** (auth) — lista os registros do usuário, ordenados por data desc.
- **`POST /`** (auth) — cria `{ medication, dose, date, time, location, notes? }` (todos strings; `date`/`time` são strings livres, não `Date` ISO validado além de "1+ char").
- **`PATCH /:id`** (auth) — edita um registro; 404 se não existe, 403 se pertence a outro usuário.
- **`DELETE /:id`** (auth) — mesma checagem de posse; remove.
- Não há validação de formato de data/hora além de "não vazio" — a validação de formato fica a cargo do frontend.

### 4.6 `bioimpedance.routes.ts` — prefixo `/api/bioimpedance`
Registros de bioimpedância (medição corporal completa) são **criados exclusivamente por administradores** (não existe `POST` para o próprio usuário) — reflete o fluxo real: o usuário agenda uma consulta de bioimpedância (`AppointmentType.BIOIMPEDANCIA`) e um profissional insere os resultados manualmente depois.
- **`GET /mine`** (auth) — usuário vê seus próprios registros.
- **`GET /admin/user/:userId`** (auth + admin) — lista registros de um usuário específico.
- **`GET /admin/record/:id`** (auth + admin) — detalhe de um registro.
- **`POST /admin`** (auth + admin) — cria um novo registro para `user_id` informado no body, com ~28 campos numéricos opcionais (peso, %gordura, %músculo, água, gordura visceral, massa livre de gordura, %proteína, massa óssea, massa muscular, IMC, peso de gordura, relação cintura-quadril, TMB (kcal), peso ideal, "dicas" de controle de peso/gordura/músculo — que na prática são armazenadas como `Decimal`, provavelmente valores numéricos usados de forma pouco clara/legado —, calorias diárias recomendadas, medidas de cintura/quadril/braço/coxa, e métricas posturais: desequilíbrio de ombro, curvatura de coluna, inclinação de cabeça, curvatura de tronco, inclinação de pelve, cabeça para frente). **Não há cálculo automático no backend** — todos os valores (IMC, TMB, calorias, etc.) chegam prontos do client/admin; o backend só persiste. `notes` livre. Gera `AuditLog`.
- **`PATCH /admin/:id`** (auth + admin) — atualização parcial de qualquer subconjunto desses campos. Gera `AuditLog`.
- **`DELETE /admin/:id`** (auth + admin) — remove um registro. Gera `AuditLog`.
- Importante para a reconstrução: **nenhuma fórmula de bioimpedância (IMC, TMB, %gordura etc.) é calculada no backend** — isso acontece em outro lugar (frontend ou inserido manualmente por um profissional). O backend é um CRUD puro de métricas.

### 4.7 `body-progress.routes.ts` — prefixo `/api/body-progress`
Fotos de progresso corporal do próprio usuário (sem rotas admin).
- **`GET /photos`** (auth) — lista fotos do usuário, ordenadas por `taken_at` desc, depois `created_at` desc.
- **`POST /photos`** (auth, multipart, campo `image`) — upload de imagem (JPG/PNG/WebP/GIF, até 8MB) + body `{ pose: FRONT|SIDE|BACK|CUSTOM, label?, notes?, taken_at (ISO datetime) }`. Salva em disco com nome `${userId}-${timestamp}${ext}` (permite múltiplas fotos por usuário, ao contrário do avatar). Se a validação Zod falhar depois do upload, apaga o arquivo enviado.
- **`DELETE /photos/:id`** (auth) — 404 se não existe, 403 se não é dono; apaga o registro do banco **e** o arquivo físico do disco.

### 4.8 `reports.routes.ts` — prefixo `/api/reports`
- **`GET /me?period=weekly|monthly|yearly`** (auth) — **exclusivo para usuários Premium** (`Profile.isPremium`); retorna 403 se não for premium. Gera um relatório agregado combinando `Workout` (força) + `CardioWorkout` no intervalo:
  - `weekly`: últimos 7 dias (hoje - 6 dias até hoje, hora zerada/hora cheia).
  - `monthly`: últimos ~1 mês (do dia seguinte, 1 mês atrás, até hoje).
  - `yearly`: últimos ~1 ano.
  - Agrupa por "bucket" (dia para weekly, `YYYY-MM` para monthly, `YYYY` para yearly), somando contagem de treinos, calorias, minutos e distância (km).
  - Também retorna: totais gerais (treinos força vs. cardio, calorias, minutos ativos, distância total, contagem de fotos de progresso no período) e a métrica de bioimpedância mais recente disponível até o fim do período (peso, %gordura, massa muscular).
  - Toda a lógica de agregação roda em memória no Node (não é uma query SQL agregada) — atenção a performance se o volume de treinos crescer muito; pode valer a pena mover para agregação no banco na reconstrução.

### 4.9 `trainer.routes.ts` — prefixo `/api/trainer`
Módulo de relação personal trainer ↔ cliente. Duas camadas de auth: `router.use(requireAuth)` global, e depois `router.use(requireRole(PERSONAL_TRAINER, ...))` que se aplica só às rotas declaradas *depois* dela no arquivo — ou seja, `/my-assignment` é acessível por qualquer usuário autenticado (para ver se ele tem um trainer vinculado), mas todo o resto do arquivo exige o role `PERSONAL_TRAINER`.
- **`GET /my-assignment`** (auth, qualquer usuário) — retorna o vínculo ativo do usuário logado como *cliente* de um personal trainer (`TrainerClient` com `clientId = eu`, `status = ACTIVE`), incluindo nome/avatar do trainer. `null` se não houver.
- **`GET /search-users`** (auth + `PERSONAL_TRAINER`) — busca usuários por e-mail ou nome (`?q=`, mín. 2 chars, case-insensitive), excluindo o próprio trainer e **excluindo explicitamente usuários que já são admin ou já são personal trainer** (não é possível "recrutar" outro trainer/admin como cliente). Limite de 10 resultados.
- **`GET /clients`** (auth + `PERSONAL_TRAINER`) — lista todos os clientes vinculados a este trainer (ativos e arquivados), com perfil completo.
- **`POST /clients`** (auth + `PERSONAL_TRAINER`) — vincula um cliente (`client_id`) ao trainer logado via `upsert` em `TrainerClient` (chave única `trainerId+clientId`) — se já existia um vínculo arquivado, reativa (`status = ACTIVE`) e **zera** `goals`/`trainingPlan` anteriores. Não permite vincular a si mesmo (400).
- **`PATCH /clients/:assignmentId`** (auth + `PERSONAL_TRAINER`, dono do vínculo) — atualiza `status` (`ACTIVE`/`ARCHIVED`), `notes`, `goals`, `training_plan`. 403 se o vínculo não pertence ao trainer autenticado.
- **`GET /clients/:clientId/summary`** (auth + `PERSONAL_TRAINER`, vínculo deve estar `ACTIVE`) — dashboard do cliente: contagem de treinos (força+cardio) nos últimos 30 dias, última foto de progresso, última bioimpedância, e os 20 logs mais recentes do trainer sobre esse cliente.
- **`POST /clients/:clientId/logs`** (auth + `PERSONAL_TRAINER`, vínculo `ACTIVE`) — cria uma anotação livre (`title`, `content`) do trainer sobre o cliente (`TrainerClientLog`).

### 4.10 `workouts.routes.ts` — prefixo `/api/workouts`
Dois "tipos" de treino são modelados como tabelas separadas: `Workout` (musculação/força, com lista de exercícios em JSON livre) e `CardioWorkout` (cardio, com duração/distância/pace/velocidade).
- **`GET /strength`** / **`POST /strength`** / **`PATCH /strength/:id`** / **`DELETE /strength/:id`** (todas auth, dono apenas) — CRUD de treinos de força. Campos: `date?` (default agora), `objective`, `duration_min?`, `calories?`, `workout_type` (default `"academia"`), `exercises` (array de objetos livres — a estrutura interna de cada exercício não é validada em detalhe pelo backend, só que é um array de records).
- **`GET /cardio`** / **`POST /cardio`** / **`PATCH /cardio/:id`** / **`DELETE /cardio/:id`** (idem) — CRUD de treinos cardio: `workout_type`, `duration_min?`, `distance_km?`, `calories?`, `avg_pace?`, `avg_speed?`, `notes?`.
- **Gamificação**: toda criação de treino (força ou cardio) dispara, de forma assíncrona/"fire-and-forget" (`setImmediate`, não bloqueia a resposta), uma checagem: se esse for o **primeiro treino do usuário no total** (soma de força+cardio == 1), concede automaticamente a conquista "Primeiro Treino" (via `UserAchievement.upsert`, idempotente). Erros nesse processo são apenas logados no console, não afetam a resposta da criação do treino.
- Todas as rotas de edição/exclusão checam posse (`userId === req.auth.userId`) e retornam 403/404 apropriadamente.

### 4.11 `workoutx.routes.ts` — prefixo `/api/workoutx`
Integração com uma API de terceiros (`https://api.workoutxapp.com/v1`) para buscar GIFs demonstrativos de exercícios, com um proxy que assina/verifica os IDs para não expor a chave da API no client.
- **`GET /media?queries=nome1,nome2,...`** — em dev, sem auth; em produção, requer `requireAuth` (mesma flag controla o array `mediaAuth`). Recebe até 30 nomes de exercício separados por vírgula (deduplicados), busca cada um na API WorkoutX (com cache em memória por processo — `Map` simples, sem TTL, nunca invalidado), retorna um dicionário `{ nome_da_query: exercicio_normalizado_ou_null }`. Se `WORKOUTX_API_KEY` não estiver configurada, retorna `{ configured: false, exercises: {} }` sem chamar a API externa.
- Cada exercício normalizado ganha um campo `proxyGifUrl` (`/api/workoutx/gifs/:id?sig=...`) — o GIF real nunca é linkado direto para `api.workoutxapp.com`.
- **`GET /gifs/:id?sig=...`** (pública, mas protegida por assinatura) — valida que `id` só contém `[a-zA-Z0-9_-]`, calcula `HMAC-SHA256(id, JWT_SECRET)` em base64url (32 chars) e compara com `sig` usando `crypto.timingSafeEqual` (evita timing attack). Se válido, busca o GIF na API WorkoutX e faz proxy do binário (com `Cache-Control: public, max-age=86400`). Reusa `JWT_SECRET` como chave HMAC (não é um segredo dedicado).
- Esse módulo é opcional/acessório — só funciona se `WORKOUTX_API_KEY` estiver setada; o resto do app funciona sem ele.

### 4.12 `wearables.routes.ts` — prefixo `/api/wearables`
Ver seção 5 dedicada (Wearables) abaixo — cobre providers, OAuth Fitbit e sincronização.

### 4.13 `admin.routes.ts` — prefixo `/api/admin`
**Toda a rota exige `requireAuth` + `requireAdmin`** (aplicado globalmente no arquivo via `router.use`).
- **`GET /payment-gateway-settings`** — resumo de configuração do gateway Stripe (ativo?, chave pública, se há chave secreta/webhook configuradas — mascaradas). *Não reconstruir tal como está* (ver seção 6).
- **`PUT /payment-gateway-settings/stripe`** — atualiza config Stripe salva no banco (`PaymentGatewaySetting`). *Não reconstruir tal como está*.
- **`GET /users`** — lista todos os usuários com perfil, roles e status de aplicação de trainer, ordenados por criação desc.
- **`PATCH /users/:userId/premium`** — `{ is_premium: boolean }`, concede/revoga Premium manualmente (fora do fluxo de pagamento). Gera `AuditLog` (`update_premium`).
- **`PATCH /users/:userId/admin-role`** — `{ is_admin: boolean }`, concede/revoga role `ADMIN` via upsert/delete em `UserRoleAssignment`. **Bloqueia um admin de remover o próprio acesso admin** (400 se `targetUserId === req.auth.userId && !is_admin`). Gera `AuditLog` (`grant_role`/`revoke_role`).
- **`PATCH /users/:userId/trainer-role`** — `{ is_personal_trainer: boolean }`, concede/revoga role `PERSONAL_TRAINER` diretamente (fora do fluxo de aplicação/aprovação — atalho administrativo). Gera `AuditLog`.
- **`GET /trainer-applications`** — lista todas as aplicações de personal trainer (pendentes primeiro, depois por data desc), com perfil do candidato anexado.
- **`PATCH /trainer-applications/:applicationId/review`** — `{ decision: "approve"|"reject", rejection_reason? }`.
  - **Aprovar**: exige que a aplicação tenha `selfPhotoUrl` e `documentPhotoUrl` preenchidos (400 caso contrário — proteção contra aprovar aplicação incompleta). Em uma transação: marca `TrainerApplication.status = APPROVED`, concede o role `PERSONAL_TRAINER` (upsert em `UserRoleAssignment`), e **concede Premium automaticamente** ao trainer aprovado (`Profile.isPremium = true`).
  - **Rejeitar**: marca `status = REJECTED` com `rejection_reason` (default "Cadastro recusado" se omitido), e garante que o role `PERSONAL_TRAINER` seja removido (caso já tivesse sido concedido por algum motivo).
  - Gera `AuditLog` (`approve_trainer_application`/`reject_trainer_application`).
- **`GET /audit-logs`** — últimos 100 registros de `AuditLog`, mais recentes primeiro.
- **`GET /orders`** — últimos 100 pedidos (com usuário/perfil, itens, pagamentos) — visão administrativa de vendas.
- **`GET /products`** — lista todos os produtos cadastrados (ativos e inativos).
- **`DELETE /users/:userId`** — exclui um usuário (cascade apaga tudo relacionado). Bloqueia auto-exclusão (400 se `targetUserId === req.auth.userId`). Gera `AuditLog` (`delete_user`) **antes** de apagar (para o log sobreviver ao cascade, já que `AuditLog.actorUserId`/`targetUserId` usam `onDelete: SetNull`).

---

## 5. Upload de arquivos — ⚠️ substituir por storage externo

**Situação atual: tudo em disco local via `multer.diskStorage`.** Três pontos de upload:

| Uso | Rota | Diretório | Tipos aceitos | Limite | Nome do arquivo |
|---|---|---|---|---|---|
| Avatar de perfil | `POST /api/profile/avatar` | `${UPLOAD_DIR}/` (raiz) | JPG/PNG/WebP/GIF | 5 MB | `${userId}-avatar.<ext>` (determinístico, sobrescreve) |
| Fotos de progresso corporal | `POST /api/body-progress/photos` | `${UPLOAD_DIR}/body-progress/` | JPG/PNG/WebP/GIF | 8 MB | `${userId}-${timestamp}.<ext>` (múltiplas fotos por usuário) |
| Comprovação de personal trainer (selfie + documento) | `POST /api/auth/register` (multipart, campos `self_photo`/`document_photo`) | `${UPLOAD_DIR}/trainer-applications/` | JPG/PNG/WebP | 5 MB cada | `${crypto.randomUUID()}.<ext>` (nome aleatório) |

- Os arquivos são servidos publicamente e sem autenticação via `express.static` montado em `app.ts`: `app.use("/uploads", express.static(path.resolve(env.UPLOAD_DIR)))`. Ou seja, hoje **qualquer URL `/uploads/...` é pública** — inclusive fotos de progresso corporal e documentos de comprovação de personal trainer, sem checagem de posse. Isso é algo a **corrigir** na reconstrução (URLs assinadas/privadas, ou pelo menos não previsíveis, para dados sensíveis como fotos de progresso e documentos pessoais).
- `UPLOAD_DIR` é criado no boot de cada arquivo de rota que precisa dele (`fs.mkdirSync(..., { recursive: true })`) — não há um único ponto central de inicialização.
- Rollback manual de arquivo em caso de erro de validação/gravação no banco (delete do arquivo físico em `catch`) — funciona, mas é o tipo de complexidade que desaparece ao usar storage de objetos com URLs assinadas (upload direto do client para o bucket, ou multipart→bucket sem etapa intermediária em disco).

**Recomendação explícita para a reconstrução**: usar armazenamento de objetos externo (S3, Cloudflare R2, Supabase Storage ou Vercel Blob) para os três casos acima. Local disk não é confiável em VPS com deploys/restarts, contêineres efêmeros, ou qualquer cenário com mais de uma instância do backend rodando. Ao mesmo tempo, aproveitar a reconstrução para tornar fotos de progresso e documentos de trainer **não publicamente acessíveis** (URLs assinadas com expiração, ou proxy autenticado).

---

## 6. Pagamentos — o que o app PRECISA (nível de produto, não implementação)

> A implementação atual em `payments.routes.ts`, `payments.service.ts`, `payment-gateway.service.ts` e `payment-gateway-settings.service.ts` será **totalmente descartada**. Uma nova integração Stripe (conta separada, já configurada) vai substituir isso na reconstrução. Esta seção documenta apenas os **resultados funcionais** que o sistema de pagamentos precisa entregar, para orientar a reimplementação — sem detalhes da API Stripe antiga.

### Funcionalidades/resultados de negócio que o pagamento precisa cobrir
1. **Catálogo de produtos comprável**: pelo menos um produto "Premium" (assinatura mensal, hoje R$ 19,90/mês) que, quando pago, libera o acesso Premium do usuário (`Profile.isPremium = true`). O modelo já suporta produtos com `billing_cycle` (`ONE_TIME` ou `MONTHLY`) e uma flag `grants_premium` por item — ou seja, o catálogo pode crescer além de "só Premium" no futuro (produtos avulsos que também concedem Premium, ou produtos que não concedem nada além de si mesmos).
2. **Checkout iniciado pelo usuário logado**: usuário escolhe um produto e um método de pagamento (hoje: PIX ou cartão de crédito) e recebe de volta uma URL de checkout hospedada (ou QR/código PIX) para concluir o pagamento fora do backend — **o backend nunca recebe nem armazena dados de cartão**.
3. **Confirmação assíncrona e confiável via webhook**: o Premium só é liberado depois que o provedor de pagamento confirma o pagamento via webhook assinado (nunca confiar apenas no retorno do navegador/redirect de sucesso) — o "retorno do navegador" pode no máximo confirmar/consultar o status, não decidir liberar acesso sozinho.
4. **Idempotência de webhook**: o mesmo evento de pagamento não deve ser processado duas vezes (o sistema atual guarda um registro por `(provider, event_id)` e marca como processado).
5. **Histórico de pedidos do usuário**: usuário consegue ver seus próprios pedidos/pagamentos passados (status, valor, data).
6. **Histórico administrativo**: admin consegue ver todos os pedidos e pagamentos de todos os usuários (para suporte/auditoria financeira).
7. **Concessão automática de Premium**: assim que um pagamento é confirmado como pago, se qualquer item do pedido tiver `grants_premium = true`, o perfil do usuário é marcado como Premium automaticamente (sem intervenção manual).
8. **Concessão manual de Premium pelo admin** (fora do fluxo de pagamento) — já existe hoje (`PATCH /api/admin/users/:userId/premium`) e deve continuar existindo independente de como o pagamento é reimplementado — é usado para casos excepcionais (cortesias, correções, trainers aprovados que ganham Premium automaticamente ao serem aprovados).
9. **Rastreamento de status de pedido/pagamento** ao longo do tempo: pendente → processando → pago / falhou / cancelado / reembolsado (estados já modelados nos enums `OrderStatus` e `PaymentStatus` — mantê-los é razoável mesmo trocando o provedor).

### O que explicitamente NÃO precisa ser reproduzido
- O adapter específico do Stripe antigo (`payment-gateway.service.ts`), incluindo criação de Checkout Session, verificação de assinatura de webhook Stripe, retrieve de sessão etc. — a nova integração Stripe traz sua própria forma de fazer isso.
- A tabela `PaymentGatewaySetting` de configuração de gateway "trocável pela UI admin" com chaves criptografadas no banco — avaliar se a nova conta Stripe realmente precisa disso ou se variáveis de ambiente simples resolvem.
- O esqueleto morto de webhook genérico para `mercado_pago`/`pagarme`/`asaas` (nunca teve adapter real implementado).
- O e-commerce genérico de "Product" com múltiplos itens por pedido, se o produto final continuar sendo apenas uma assinatura Premium única — mas o modelo já dá suporte a isso caso seja necessário expandir o catálogo.

---

## 7. Wearables (Fitbit, Google Fit, Garmin, Apple Health)

Arquivos: `src/services/wearables.service.ts`, `src/routes/wearables.routes.ts`. Prefixo de rotas: `/api/wearables`.

### Providers suportados (enum `WearableProvider`)
`APPLE_HEALTH`, `GOOGLE_FIT`, `GARMIN`, `FITBIT`. **Apenas o Fitbit tem integração OAuth real com a API do provedor.** Os outros três (Apple Health, Google Fit, Garmin) são **simulados** — a "conexão" apenas cria um registro `WearableConnection` marcado como `CONNECTED` sem nenhuma troca OAuth de fato, e as leituras (`WearableReading`) são geradas com dados demo determinísticos (função `buildDemoReading`, com pequenos offsets fixos por provider + variação baseada no minuto atual, para simular alguma variação "real" nos dados demo).

### Modelo de dados envolvido
- `WearableConnection`: 1 conexão ativa por `(userId, provider)` (`@@unique`). Guarda `status` (`CONNECTED`/`DISCONNECTED`/`NEEDS_REAUTH`), tokens **criptografados** (`accessTokenEncrypted`/`refreshTokenEncrypted`, ver abaixo), `tokenExpiresAt`, `scopes` (json), `lastSyncAt`.
- `WearableReading`: leituras pontuais (batimento, batimento de repouso, HRV, SpO2, calorias ativas, passos, minutos de sono, score de recuperação, score de estresse, bateria do dispositivo) associadas a uma conexão.
- `WearableNotification`: notificações geradas automaticamente (tipos: `HEART_RATE`, `RECOVERY`, `SLEEP`, `SYNC`, `CONSENT`; severidades: `INFO`/`SUCCESS`/`WARNING`/`CRITICAL`), com flag de lida/não lida.
- `WearableOAuthState`: estado transitório do fluxo OAuth do Fitbit (PKCE) — `state` único, `codeVerifier`, `redirectPath` desejado pelo frontend, expiração de 10 minutos, `usedAt` para evitar replay.

### Criptografia de tokens
- AES-256-GCM, chave derivada de `SHA-256(JWT_SECRET)` (mesmo segredo do JWT — ver nota de dívida técnica na seção 1), formato armazenado: `v1:<iv_base64>:<tag_base64>:<ciphertext_base64>`.

### Fluxo OAuth do Fitbit (único provider real)
1. **`GET /api/wearables/fitbit/authorize`** (auth) — gera PKCE (`code_verifier` aleatório de 48 bytes, `code_challenge = SHA256(code_verifier)` em base64url), gera um `state` aleatório de 32 bytes, salva tudo em `WearableOAuthState` (expira em 10 min), e retorna a URL de autorização do Fitbit (`https://www.fitbit.com/oauth2/authorize`) com `scope = activity heartrate sleep profile`, `response_type=code`, `code_challenge_method=S256`, `redirect_uri` = `FITBIT_REDIRECT_URI` (env) ou fallback `${APP_URL}/api/wearables/fitbit/callback`.
2. **`GET /api/wearables/fitbit/callback`** (pública, chamada pelo Fitbit) — recebe `code`+`state` (ou `error`); valida o `state` contra `WearableOAuthState` (existe, é do provider Fitbit, não expirado, não usado ainda); troca o `code` por tokens (`POST` para `https://api.fitbit.com/oauth2/token`, autenticado com Basic Auth `client_id:client_secret`, incluindo `code_verifier` do PKCE); busca o perfil do usuário na Fitbit para rótulo de exibição; marca o `state` como usado; chama `connectWearable(...)` com os tokens (criptografados antes de salvar); **redireciona o navegador de volta para o app** (`${APP_URL}${redirectPath}?fitbit=connected|denied|error&error=...`) — não retorna JSON, é sempre um redirect (fluxo OAuth clássico via navegador).
3. **`POST /api/wearables/sync`** (auth) — busca a conexão `CONNECTED` mais recente do usuário; se for Fitbit com token válido, chama a API real do Fitbit (`createFitbitReading`) buscando, para o dia atual: `activities/date/{date}` (passos, calorias ativas, minutos ativos, batimento de repouso), `sleep/date/{date}` (minutos dormidos), `activities/heart/date/{date}/1d` e `.../1min` (batimento intraday, usado como "último batimento"). Calcula heuristicamente `recoveryScore` e `stressScore` a partir de sono e batimento de repouso (fórmulas simples, não são padrão médico — ex.: `recoveryScore = clamp(55 + min(25, sleepMin/18) + max(0, 12 - |restingHR-62|))`). Se a chamada à API Fitbit falhar por qualquer motivo, cai num fallback silencioso: gera uma notificação de "sincronização parcial" e usa dados demo (mesma função `buildDemoReading` usada pelos providers simulados) — ou seja, **o sistema nunca falha visivelmente uma sincronização**, sempre produz alguma leitura.
   - Access token é renovado automaticamente (`refreshFitbitToken`) se estiver a menos de 5 minutos de expirar.
4. Após cada sync, gera notificações automáticas condicionais: sempre uma de "sincronizado com sucesso"; se `recoveryScore < 70`, gera aviso de recuperação baixa; se `restingHeartRateBpm >= 75`, gera aviso de batimento de repouso elevado.

### Outras rotas
- **`GET /summary`** (auth) — retorna: conexão ativa (se houver, mesmo que não seja Fitbit), última leitura, últimas 8 notificações, contagem de não lidas.
- **`POST /connect`** (auth) — conecta um provider **sem OAuth real** (usado para Apple Health/Google Fit/Garmin, e também pode ser chamado para Fitbit sem tokens — nesse caso fica como conexão "demo"): `{ provider, device_name?, external_account_label? }`. Faz upsert da conexão, gera uma primeira leitura (real se Fitbit com token, senão demo) e duas notificações (consentimento + primeira sincronização).
- **`DELETE /connection`** (auth) — desconecta todas as conexões não-desconectadas do usuário, apaga os tokens armazenados, gera notificação de "conexão removida".
- **`PATCH /notifications/:id/read`** (auth) — marca uma notificação específica como lida.
- **`POST /notifications/read-all`** (auth) — marca todas como lidas.

### Nota de segurança explícita no código
Um comentário/campo no `rawSummary` das leituras demo diz literalmente: *"No raw OAuth token is exposed through API responses."* — os endpoints de summary/sync nunca devolvem os tokens criptografados/decriptografados ao client, apenas metadados derivados.

---

## 8. Middleware e questões transversais

### `app.ts` — pipeline de middlewares (nessa ordem)
1. `helmet()` — headers de segurança padrão.
2. `cors({ origin: <CORS_ORIGIN split por vírgula>, credentials: true })` — suporta múltiplas origens (lista separada por vírgula na env `CORS_ORIGIN`); se só houver uma origem, passa como string, senão como array.
3. `cookie-parser()` — montado mas não usado para autenticação (nenhuma rota lê `req.cookies` para auth); pode ser vestigial.
4. `express.json({ limit: "2mb" })` — com captura do **raw body** em `req.rawBody` via `verify` callback (necessário para validar assinatura de webhook Stripe, que exige o corpo bruto não re-serializado).
5. `express.urlencoded({ extended: true })`.
6. `express.static` em `/uploads` servindo `UPLOAD_DIR` — **sem autenticação** (ver seção 5, ponto a corrigir).
7. Router principal em `/api`.
8. `errorHandler` como último middleware (tratamento de erro centralizado).

### Tratamento de erros (`middleware/error-handler.ts`)
- `ZodError` → 400 com `{ message: "Dados invalidos", issues: [...] }` (array bruto de issues do Zod).
- `multer.MulterError` → 400, mensagem especial "Arquivo muito grande" se o código for `LIMIT_FILE_SIZE`, senão a mensagem padrão do multer.
- Erros customizados de tipo de arquivo (`"Tipo de arquivo nao permitido"`, `"Envie imagens JPG, PNG ou WebP para a comprovacao do personal"`) → 400 com a mensagem literal.
- Qualquer outro `Error` → 500 com `error.message` **exposta ao client** (não há sanitização — vazamento potencial de detalhes internos em produção; considerar mascarar mensagens genéricas de erro 500 na reconstrução).
- Qualquer coisa não-`Error` → 500 genérico "Erro interno inesperado".

### `utils/async-handler.ts`
Wrapper padrão para rotas assíncronas Express (`(req,res,next) => handler(req,res,next).catch(next)`) — usado em absolutamente todas as rotas para propagar rejeições de Promise ao `errorHandler`.

### `utils/params.ts`
`getRouteParam(value, name)` — helper para extrair um param de rota tipado como string única (Express permite `string | string[] | undefined`), lançando erro se ausente/inválido. Usado em toda rota com `:id`/`:userId`/etc.

### `utils/serializers.ts`
Funções centrais de serialização compartilhadas entre rotas: `serializeUser`, `serializeProfile` (com `notification_preferences` mesclado com defaults), e mapeamentos bidirecionais de enum↔string para `AppointmentType`/`AppointmentStatus` (o client usa strings minúsculas tipo `"consulta_online"`, o Prisma usa enums maiúsculos `CONSULTA_ONLINE`).

### Auditoria (`services/audit.service.ts`)
- Uma única função `logAudit({ actorUserId?, targetUserId?, action, entityType, entityId?, details? })` que grava em `AuditLog`. `details` é um JSON livre por ação.
- Ações auditadas hoje: `update_payment_gateway_settings`, `update_premium`, `grant_role`/`revoke_role` (com `role` no details), `approve_trainer_application`/`reject_trainer_application`, `delete_user`, `update_appointment`, `create_bioimpedance_record`/`update_bioimpedance_record`/`delete_bioimpedance_record`, `create_checkout`.
- Não há um enum fechado de `action`/`entityType` — são strings livres (`string`), então a reconstrução deve manter disciplina de nomenclatura consistente mas não há validação de schema aqui.
- Log é assíncrono, chamado com `await` mas **não bloqueia a resposta em nenhum caso crítico visto** (é chamado antes do `res.json`/`res.status().send()` na maioria das rotas — ou seja, se o audit log falhar, a operação principal ainda pode ter sido bem-sucedida mas a resposta HTTP não é enviada até o log terminar; não há tratamento de erro dedicado para falha do log em si, então uma falha no audit log faria a rota inteira retornar 500 mesmo que a operação principal (ex.: `prisma.user.delete`) já tenha sido concluída — comportamento a revisar/melhorar na reconstrução, idealmente logging assíncrono/best-effort sem bloquear ou falhar a resposta).

---

## 9. Variáveis de ambiente

Fonte: `src/config/env.ts` (validação via Zod — o processo falha ao subir se uma env obrigatória estiver ausente/inválida), cruzado com `.env.example` e `.env.production.example`.

| Variável | Obrigatória? | Default | Para quê serve | Manter ou substituir? |
|---|---|---|---|---|
| `PORT` | não | `3001` | Porta HTTP do servidor Express | Manter |
| `NODE_ENV` | não | `development` | `development`/`test`/`production` — afeta comportamento (ex.: auth de mídia do WorkoutX, fallback de assinatura de webhook) | Manter |
| `DATABASE_URL` | **sim** | — | Connection string do Postgres (usado pelo Prisma) | Manter |
| `JWT_SECRET` | **sim** (mín. 8 chars) | — | Segredo de assinatura do JWT; também reaproveitado como chave-base para criptografia AES de tokens de wearables/gateway e para HMAC do proxy de GIFs do WorkoutX | Manter (mas considerar separar em segredos dedicados na reconstrução — ver seção 1) |
| `JWT_EXPIRES_IN` | não | `7d` | Validade do token JWT | Manter |
| `UPLOAD_DIR` | não | `./uploads` | Diretório local onde multer grava arquivos | **Substituir** pelo destino de storage externo (S3/R2/Supabase/Vercel Blob) |
| `CORS_ORIGIN` | não | `http://localhost:8080` | Origens permitidas no CORS, separadas por vírgula | Manter |
| `APP_URL` | não (mas validado como URL) | `http://localhost:8080` | URL pública do frontend — usada para montar redirects (OAuth Fitbit, sucesso/cancelamento de pagamento) | Manter |
| `PAYMENT_PROVIDER` | não | `manual` | Provider de pagamento ativo por padrão (`manual`\|`mercado_pago`\|`stripe`\|`pagarme`\|`asaas`) — hoje só `manual` e `stripe` têm implementação real | **Reavaliar** ao reconstruir pagamentos |
| `PAYMENT_WEBHOOK_SECRET` | não | — | Segredo HMAC para validar webhooks de gateways não-Stripe (esqueleto nunca implementado de fato) | **Substituir/descartar** |
| `STRIPE_SECRET_KEY` | não | — | Chave secreta da API Stripe (integração antiga) | **Substituir** pela nova conta Stripe |
| `STRIPE_WEBHOOK_SECRET` | não | — | Segredo de assinatura de webhook Stripe (integração antiga) | **Substituir** pela nova conta Stripe |
| `PAYMENT_SUCCESS_PATH` | não | `/premium?payment=success` | Path do frontend para redirect de sucesso de checkout | Manter (conceito), ajustar se a UI mudar |
| `PAYMENT_CANCEL_PATH` | não | `/premium?payment=cancelled` | Path do frontend para redirect de cancelamento de checkout | Manter (conceito) |
| `GOOGLE_FIT_CLIENT_ID` / `GOOGLE_FIT_CLIENT_SECRET` | não | — | Reservadas para uma futura integração OAuth real com Google Fit — **não são usadas em nenhum lugar do código atual** (Google Fit hoje é 100% simulado) | Manter se planejar implementar de verdade |
| `FITBIT_CLIENT_ID` / `FITBIT_CLIENT_SECRET` | não (mas obrigatórias em runtime para o fluxo Fitbit funcionar) | — | Credenciais OAuth do app Fitbit — usadas de fato no fluxo real de wearables | Manter |
| `FITBIT_REDIRECT_URI` | não | — (fallback calculado a partir de `APP_URL`) | Redirect URI cadastrada no app Fitbit; se vazia, é derivada de `APP_URL` | Manter |
| `GARMIN_CLIENT_ID` / `GARMIN_CLIENT_SECRET` | não | — | Reservadas para futura integração real com Garmin — **não usadas em nenhum lugar do código atual** (Garmin é 100% simulado) | Manter se planejar implementar de verdade |
| `APPLE_HEALTH_TEAM_ID` / `APPLE_HEALTH_KEY_ID` | não | — | Reservadas para futura integração real com Apple Health (que exige app iOS nativo com HealthKit — não é uma API REST tradicional) — **não usadas em nenhum lugar do código atual** | Manter se planejar implementar de verdade |
| `WORKOUTX_API_KEY` | não | — | Chave da API de terceiros WorkoutX (GIFs de exercícios) | Manter se o serviço/chave ainda existir; opcional |

**Notas:**
- Variáveis relacionadas a pagamento/Stripe a serem substituídas pela nova integração: `PAYMENT_PROVIDER`, `PAYMENT_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (e possivelmente `PAYMENT_SUCCESS_PATH`/`PAYMENT_CANCEL_PATH`, dependendo de como a nova integração lida com redirects).
- Todas as demais variáveis (banco, JWT, upload, CORS, app URL, wearables, WorkoutX) são independentes de pagamento e devem ser mantidas/portadas.
- `.env.production.example` mostra que em produção o `PAYMENT_PROVIDER` era `"stripe"` e o domínio de referência era `https://app.vitalissy.com.br` — apenas como contexto histórico de deploy, não vincula a reconstrução a esse domínio necessariamente.

---

## 10. Stack técnica e observações de build/deploy (contexto, não normativo)

- Node 20 (Dockerfile usa `node:20-alpine`), TypeScript, `type: module` (ESM puro, imports com `.js` mesmo em arquivos `.ts`).
- Dependências principais: `express`, `@prisma/client` + `prisma`, `bcryptjs`, `jsonwebtoken`, `multer`, `zod`, `cors`, `helmet`, `cookie-parser`, `stripe` (a ser removida/substituída).
- Scripts npm relevantes: `dev` (`tsx watch`), `build` (`tsc`), `start` (`node dist/src/index.js`), `prisma:generate`, `prisma:migrate`, `prisma:deploy`, `prisma:seed`.
- Deploy original: Docker multi-stage (build → runner), ou PM2 via `ecosystem.config.cjs` (fork mode, 1 instância, restart automático, limite de 512MB). O `CMD` do Dockerfile roda `prisma:deploy` + `prisma:seed` + `start` no boot do container — o seed roda em todo boot (é idempotente via `upsert`/checagem de existência, então é seguro, mas vale revisar se esse comportamento é desejado na reconstrução).
- Havia documentação de deploy já existente em `docs/deploy-vps.md`, `docs/dokploy-vps.md`, `docs/hostinger-vps.md` (não cobertos em detalhe aqui pois o escopo desta auditoria é o código de `backend/src`, mas ficam como referência complementar para o próximo deploy em VPS).
