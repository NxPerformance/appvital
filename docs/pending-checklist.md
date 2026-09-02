# Checklist — pendências Vitalissy

> Atualizado durante a reconstrução do backend/frontend nesta sessão. Marcar conforme for resolvendo.

## Backend / infra

- [ ] **Pagamentos**: integrar a conta Stripe já conectada (hoje `POST /api/payments/checkout` é só um stub 503). `GET /api/payments/products` já funciona (lê do banco).
- [ ] **Wearables**: configurar credenciais reais do Fitbit (`FITBIT_CLIENT_ID`/`FITBIT_CLIENT_SECRET`/`FITBIT_REDIRECT_URI`) pra integração parar de cair em modo demo.
- [ ] **Upload de arquivos**: volume persistente já configurado no Easypanel (`/app/uploads`), mas ainda é disco local, não storage externo (S3/R2/Supabase Storage). Além disso, arquivos são servidos publicamente sem checagem de posse — corrigir quando migrar pra storage externo.
- [ ] **Segredo de criptografia dedicado**: tokens de wearables hoje derivam a chave AES do próprio `JWT_SECRET` — separar em `ENCRYPTION_KEY` próprio.
- [ ] **Trocar credenciais do admin de seed** (`admin@vitalissy.dev` / `VitalissyDev2026!`) antes de considerar o ambiente "produção real".
- [ ] **Tela Admin → Configurações de Pagamento** vai quebrar (404) — rotas de `payment-gateway-settings` foram puladas de propósito enquanto pagamento é stub.
- [x] `claude/dev-server-setup-d37utr` mergeada em `main` via PR #1 — Vercel "Production" agora publica as mudanças novas.
- [x] DNS de `app.vitalissy.com.br` (frontend, Vercel) e `api.vitalissy.com.br` (backend, Easypanel) resolvidos via Cloudflare. `VITE_API_URL`/`CORS_ORIGIN`/`APP_URL` configurados de acordo. Login confirmado funcionando em produção, de múltiplos dispositivos.
- [x] **PWA não atualizava sozinho**: `AppUpdatePrompt.tsx` só trocava de versão se o usuário visse um toast e clicasse em "Atualizar" a tempo (o `registerType: "autoUpdate"` do `vite.config.ts` não tinha efeito, pois o registro do service worker é manual). Provável causa real de vários "ainda não implantou"/"a mudança sumiu" reportados ao longo da sessão. Agora aplica a atualização sozinho assim que detecta uma nova versão, e passa a checar por atualização a cada 15min mesmo com o app aberto em segundo plano (PWA instalado raramente é fechado de verdade).
- [x] **Integração Anovator (balança de bioimpedância)**: `apiKey`/`gymId` configurados e testados em produção — busca automática funcionando (`POST /api/bioimpedance/admin/anovator-lookup`). Mapeamento expandido pra cobrir quase tudo que o PDF de laudo mostra: composição corporal, análise segmentada por região (braços/tronco/pernas), medidas corporais estendidas (envergadura, larguras, comprimentos), metas de exercício por tipo (aeróbico/resistência/anaeróbico), classificação de risco postural (10 categorias, nível 1-5), e agora também foto frontal/lateral (`bodyImageKey`/`sideImageKey`, servidas via proxy autenticado `GET /api/bioimpedance/photo/:id/front|side` — nunca expõe a apiKey nem depende de hotlink direto em anovator.com), pontuação geral (`score`), idade corporal (`bodyAge`) e tipo corporal (`bodyShape`, 0-8). Exibido em Evolução → Bioimpedância num novo card "Fotos do exame". Só ficam de fora: valor exato em cm/graus de postura (a API só dá o nível de risco, não o valor preciso — confirmado direto na resposta bruta), dado bruto de bioimpedância segmentar em Ω (técnico demais pra exibir ao paciente), e o esqueleto sobreposto na foto (`bodyDetect`/`sideBodyDetect` já vêm da API, mas ainda não são desenhados — próximo passo natural).

## Produto / frontend

- [ ] **UI/UX da tela de Evolução** — em andamento agora.
- [ ] Incrementos de Injetáveis estilo Ozempic (dos que já veio a ideia, ainda não implementados):
  - [ ] Próxima dose / contagem regressiva (precisa de um campo de "frequência esperada" que não existe hoje no modelo)
  - [ ] Rotação de local de aplicação (mapa do corpo, aviso de repetição)
  - [ ] Escada de titulação (protocolo de aumento gradual de dose)
  - [ ] Diário de efeitos colaterais por aplicação
  - [ ] Controle de estoque da caneta/medicamento
- [ ] **Análise do app concorrente Ozempro** — ver `docs/ozempro-analysis.md` para o plano completo do que copiar/adaptar/descartar. Itens de maior prioridade que ainda não estão na lista acima:
  - [x] Linha do Tempo de peso (inicial → atual → meta, com data estimada) — implementado em `BioimpedanciaTab.tsx`, precisa de `weight_goal_kg` cadastrado em Ajustes
  - [x] IMC atual vs. meta com régua visual de risco — implementado em `BioimpedanciaTab.tsx`
  - [ ] Botão "+" flutuante global (atalhos: Registrar Aplicação, Registrar Peso)
  - [ ] Régua de datas arrastável sincronizando peso + foto de progresso
  - [ ] Gerar Relatório do Tratamento em PDF (histórico de doses/peso/efeitos colaterais)
  - [ ] Checar compliance LGPD: telas de Política de Privacidade, Termos, Exportar meus dados, Excluir conta
- [ ] Landing page da Dra. Gabriela (projeto separado, ainda não iniciado — foi removida deste repo por engano e será refeita à parte).

## Já concluído nesta sessão

- [x] Backend reconstruído (Express + Prisma + Postgres) e publicado na VPS via Easypanel
- [x] Frontend publicado na Vercel (branch de preview)
- [x] Navegação unificada (5 itens: Início, Injetáveis, Evolução, Saúde, Perfil)
- [x] Treinos simplificado (só musculação) e movido pra complemento (Perfil)
- [x] Home redesenhada em torno de injetáveis/evolução/consultas
- [x] Layout desktop expandido (Home, Workouts, WorkoutForm)
- [x] Volume persistente de uploads configurado na VPS
- [x] Integração Anovator ativa em produção, com mapeamento completo de composição corporal, análise segmentada, medidas estendidas, metas de exercício e risco postural
- [x] Meta de peso + Linha do Tempo + IMC com régua de risco na Evolução
