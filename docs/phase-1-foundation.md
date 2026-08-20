# Phase 1 Foundation

Base criada para os primeiros 3 módulos priorizados:

1. Relatórios premium
2. Evolução corporal com fotos privadas
3. Área do personal

## Backend entregue

### Novos papéis e vínculos

- `UserRole.PERSONAL_TRAINER`
- `TrainerClient`
  - vínculo entre personal e cliente
  - status `ACTIVE` e `ARCHIVED`
  - notas opcionais

### Evolução corporal

- `BodyProgressPhoto`
  - foto privada por usuário
  - poses `FRONT`, `SIDE`, `BACK`, `CUSTOM`
  - data da foto, rótulo e observações

### Relatórios premium

- endpoint consolidado para resumo por período:
  - `GET /api/reports/me?period=weekly`
  - `GET /api/reports/me?period=monthly`
  - `GET /api/reports/me?period=yearly`
- métricas atuais:
  - treinos
  - calorias
  - minutos ativos
  - distância
  - fotos de evolução no período
  - último snapshot corporal de bioimpedância

## Rotas novas

### Evolução corporal

- `GET /api/body-progress/photos`
- `POST /api/body-progress/photos`
- `DELETE /api/body-progress/photos/:id`

### Relatórios

- `GET /api/reports/me?period=weekly|monthly|yearly`

### Personal trainer

- `GET /api/trainer/clients`
- `POST /api/trainer/clients`
- `PATCH /api/trainer/clients/:assignmentId`
- `GET /api/trainer/clients/:clientId/summary`

### Admin

- `PATCH /api/admin/users/:userId/trainer-role`

## Próxima etapa sugerida

### Frontend

- tela `Relatórios Premium`
- tela `Evolução Corporal`
- dashboard `Área do Personal`

### Ajustes administrativos

- botão no admin para conceder/remover papel de personal
- listagem de vínculos trainer x cliente

### Premium

- liberar UI dos relatórios apenas para `is_premium = true`
