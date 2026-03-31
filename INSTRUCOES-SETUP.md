# Cinema GM7 — Setup: MongoDB Atlas + Render

## Visão Geral

```
[Site HTML] → [Servidor no Render] → [Banco MongoDB Atlas]
 (frontend)     (API Node.js)          (dados na nuvem)
```

Tudo gratuito. Tempo estimado: ~15 minutos.

---

## PARTE 1: Criar o banco MongoDB Atlas (5 min)

1. Acesse **https://www.mongodb.com/atlas** e crie uma conta grátis
2. Clique **"Build a Database"**
3. Escolha **M0 FREE** (gratuito, 512MB)
4. Região: selecione **São Paulo (sa-east-1)** se disponível
5. Nome do cluster: `cinema-gm7` (ou qualquer nome)
6. Clique **Create Cluster**

### Configurar acesso:
7. Em **Database Access** → **Add New Database User**:
   - Username: `gm7user`
   - Password: crie uma senha (anote!)
   - Clique **Add User**

8. Em **Network Access** → **Add IP Address**:
   - Clique **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Isso é necessário pro Render acessar o banco
   - Clique **Confirm**

### Pegar a Connection String:
9. Volte em **Database** → clique **Connect** no seu cluster
10. Escolha **"Connect your application"**
11. Copie a connection string, será algo como:
    ```
    mongodb+srv://gm7user:<password>@cinema-gm7.xxxxx.mongodb.net/?retryWrites=true&w=majority
    ```
12. **Substitua `<password>` pela senha que você criou** no passo 7

> ⚠️ GUARDE essa string! Você vai usar no Render.

---

## PARTE 2: Deploy no Render (5 min)

### Preparar o código:
1. Acesse **https://github.com** (crie conta se não tiver)
2. Crie um **novo repositório** (pode ser privado)
3. Faça upload dos 2 arquivos da pasta `server/`:
   - `server.js`
   - `package.json`

### Criar o serviço no Render:
4. Acesse **https://render.com** e crie conta (pode logar com GitHub)
5. Clique **"New" → "Web Service"**
6. Conecte com seu repositório do GitHub
7. Configure:
   - **Name**: `cinema-gm7` (vai gerar a URL cinema-gm7.onrender.com)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**

8. Em **Environment Variables**, adicione:
   - Key: `MONGO_URI`
   - Value: a connection string do MongoDB (passo 12 acima)

9. Clique **"Create Web Service"**

> Aguarde 2-3 minutos para o deploy completar.
> Quando aparecer **"Live"**, seu servidor está rodando!

### Testar:
10. Acesse no navegador: `https://cinema-gm7.onrender.com/ping`
11. Deve aparecer: `{"success":true,"message":"Cinema GM7 API rodando!"}`

---

## PARTE 3: Configurar o site (1 min)

1. Abra o arquivo **cinema-gm7.html** no navegador
2. Na tela de configuração, cole a URL do Render:
   ```
   https://cinema-gm7.onrender.com
   ```
3. Clique **"Conectar"** — pronto!

---

## Credenciais padrão

- **Admin**: `admin` / `gm7@cinema2024`
- O login admin é criado automaticamente na primeira conexão
- Para trocar a senha, chame: POST /admin/password

---

## Observações importantes

### Plano gratuito do Render:
- O servidor **"dorme" após 15 min sem uso**
- Quando alguém acessa, ele **acorda em ~30 segundos**
- A primeira requisição pode demorar um pouquinho, depois fica rápido
- Se isso incomodar, existe a opção paga ($7/mês) que mantém sempre ligado

### Plano gratuito do MongoDB Atlas:
- 512MB de armazenamento (dá pra milhares de códigos)
- Conexões ilimitadas
- Não dorme, está sempre disponível

### Onde hospedar o HTML:
Você pode abrir o cinema-gm7.html direto do computador, mas se quiser
que todos acessem por um link, pode hospedar de graça em:
- **GitHub Pages** (grátis)
- **Netlify** (grátis, arrasta e solta)
- **Vercel** (grátis)

---

## Estrutura dos arquivos

```
server/
  ├── server.js       ← API (cola no GitHub, deploy no Render)
  └── package.json    ← Dependências

cinema-gm7.html      ← Site (abre no navegador ou hospeda)
```
