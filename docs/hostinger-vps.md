# Hostinger VPS

## Arquivos prontos

- frontend producao: [.env.production.example](/Users/wrstore/Documents/vital-app-main/.env.production.example:1)
- backend producao: [backend/.env.production.example](/Users/wrstore/Documents/vital-app-main/backend/.env.production.example:1)
- processo backend: [backend/ecosystem.config.cjs](/Users/wrstore/Documents/vital-app-main/backend/ecosystem.config.cjs:1)
- nginx: [nginx.production.conf](/Users/wrstore/Documents/vital-app-main/nginx.production.conf:1)
- deploy geral: [docs/deploy-vps.md](/Users/wrstore/Documents/vital-app-main/docs/deploy-vps.md:1)

## Estrutura recomendada na VPS

```text
/var/www/vital-app-main
  |- backend
  |- dist
  |- nginx.production.conf
```

## 1. Preparacao da VPS

Instale pacotes basicos:

```sh
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git curl build-essential
```

Instale Node 20:

```sh
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Instale PM2:

```sh
sudo npm install -g pm2
pm2 -v
```

## 2. Banco PostgreSQL

Se for usar PostgreSQL na propria VPS:

```sh
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

Crie banco e usuario:

```sh
sudo -u postgres psql
```

Dentro do `psql`:

```sql
CREATE DATABASE vitalissy;
CREATE USER vitalissy_user WITH ENCRYPTED PASSWORD 'troque-esta-senha';
GRANT ALL PRIVILEGES ON DATABASE vitalissy TO vitalissy_user;
\q
```

## 3. Subir o projeto

Clone ou envie o projeto para:

```sh
/var/www/vital-app-main
```

## 4. Configurar backend

```sh
cd /var/www/vital-app-main/backend
cp .env.production.example .env
nano .env
```

Ajuste obrigatoriamente:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`

Depois:

```sh
npm install
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## 5. Configurar frontend

```sh
cd /var/www/vital-app-main
cp .env.production.example .env
nano .env
```

Ajuste:

```sh
VITE_API_URL=https://app.vitalissy.com.br/api
```

Depois:

```sh
npm install
npm run build
```

## 6. Configurar Nginx

Copie a base:

```sh
sudo cp /var/www/vital-app-main/nginx.production.conf /etc/nginx/sites-available/vitalissy
```

Edite:

```sh
sudo nano /etc/nginx/sites-available/vitalissy
```

Troque:

- `server_name _;` pelo seu dominio
- `root /var/www/vital-app-main/dist;` se necessario

Ative:

```sh
sudo ln -s /etc/nginx/sites-available/vitalissy /etc/nginx/sites-enabled/vitalissy
sudo nginx -t
sudo systemctl restart nginx
```

## 7. Primeira validacao

Backend:

```sh
curl http://127.0.0.1:3001/api/health
```

Esperado:

```json
{"status":"ok"}
```

Frontend publicado:

- abrir o dominio no navegador
- testar cadastro
- testar login
- testar upload de avatar
- testar area admin

## Troubleshooting

### Login falha

Verifique:

```sh
pm2 logs vitalissy-backend
```

Confirme:

- backend online
- `JWT_SECRET` definido
- `CORS_ORIGIN` bate com o dominio do frontend
- `VITE_API_URL` aponta para a API correta

### Erro 500 na API

Veja logs:

```sh
pm2 logs vitalissy-backend --lines 200
```

Cheque:

- `DATABASE_URL`
- migrations aplicadas
- seed executado

### Banco nao conecta

Teste:

```sh
sudo systemctl status postgresql
```

E confirme host, porta, usuario e senha do `.env` do backend.

### Frontend abre mas API nao responde

Cheque no navegador:

- aba Network
- requisicoes para `/api`

Cheque no Nginx:

```sh
sudo nginx -t
sudo systemctl status nginx
```

### Upload de avatar nao funciona

Confirme se a pasta existe:

```sh
cd /var/www/vital-app-main/backend
mkdir -p uploads
```

E se o proxy `/uploads/` esta ativo no Nginx.

## Checklist final

1. `pm2 status` mostra backend online
2. `curl http://127.0.0.1:3001/api/health` responde
3. `npm run build` do frontend conclui
4. Nginx serve o `dist`
5. login funciona
6. CRUD principal funciona
