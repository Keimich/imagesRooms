# Servidor da Lousa Colaborativa (imagesRooms)

Este é o serviço de backend para a aplicação de lousa colaborativa em tempo real. Ele gerencia salas, usuários e a sincronização de objetos na lousa usando Node.js, Express, Socket.IO e Redis.

## ✨ Features

- **Criação de Salas Dinâmicas:** Gere salas com IDs únicos através de uma simples chamada de API.
- **Comunicação em Tempo Real:** Sincronização instantânea de ações (adição, movimento, redimensionamento e exclusão de imagens) entre todos os participantes da sala.
- **Identidade Persistente de Usuário:** Usuários são reconhecidos ao recarregar a página, evitando duplicatas e proporcionando uma experiência fluida.
- **Estado Persistente (Temporário):** O estado de cada sala é salvo no Redis e expira após 24 horas de inatividade.
- **Pronto para Produção:** Conteinerizado com Docker e Docker Compose, utilizando `Dockerfile` multi-stage para uma imagem final leve e segura.

## 🚀 Tecnologias Utilizadas

- **Runtime:** Node.js
- **Framework:** Express.js
- **Real-Time:** Socket.IO
- **Banco de Dados / Cache:** Redis
- **Orquestração:** Docker & Docker Compose
- **Utilitários:** `uuid` para IDs únicos, `dotenv` para variáveis de ambiente.

---

## 🏃‍♂️ Como Executar o Projeto

### Pré-requisitos

- [Docker](https://www.docker.com/get-started/) e Docker Compose instalados na sua máquina.
- [Node.js](https://nodejs.org/) (para desenvolvimento local fora do Docker).

### 1. Configuração do Ambiente

1.  Clone este repositório.
2.  Crie uma cópia do arquivo de exemplo de variáveis de ambiente:
    ```bash
    cp .env.example .env
    ```
3.  Abra o arquivo `.env` e configure as variáveis. Para o ambiente Docker padrão, os valores já estão corretos.
    ```
    PORT=3000
    REDIS_URL=redis://redis:6379
    ```

### 2. Executando com Docker (Recomendado)

Com o Docker em execução, suba os contêineres da aplicação e do Redis com um único comando:

```bash
docker-compose up --build
```

O servidor estará disponível em `http://localhost:3000`.

### 3. Executando Localmente (Sem Docker)

Se preferir rodar fora do Docker, certifique-se de ter uma instância do Redis acessível e configure a `REDIS_URL` no seu arquivo `.env` corretamente. Em seguida, instale as dependências e inicie o servidor:

```bash
npm install
npm run dev
```

---

## 🛠️ API e Eventos

### Endpoint da API

- **`POST /api/rooms`**
  - Cria uma nova sala com um estado inicial vazio.
  - **Resposta:** `{ "roomId": "<id-da-sala-gerado-com-uuid>" }`

### Eventos Socket.IO

#### Cliente → Servidor

- `joinRoom({ roomId, userName, userId })`: Entra em uma sala. `userId` é o ID persistente do cliente.
- `imageAdded({ roomId, image })`: Adiciona uma nova imagem.
- `imageMoved({ roomId, imageId, position })`: Move uma imagem.
- `imageResized({ roomId, imageId, size })`: Redimensiona uma imagem.
- `imageDeleted({ roomId, imageId })`: Deleta uma imagem.

#### Servidor → Cliente

- `currentRoomState(state)`: Enviado ao cliente ao entrar, com todo o estado da sala.
- `userListUpdate(users)`: Enviado a todos na sala quando a lista de usuários muda.
- `imageAdded(image)`: Notifica a adição de uma imagem.
- `imageMoved({ imageId, position })`: Notifica a movimentação de uma imagem.
- `imageResized({ imageId, size })`: Notifica o redimensionamento de uma imagem.
- `imageDeleted({ imageId })`: Notifica a exclusão de uma imagem.

---

## 📂 Estrutura do Projeto

- `server.js`: Arquivo principal. Configura o servidor Express, o Socket.IO e todos os listeners de eventos.
- `redisClient.js`: Módulo para gerenciar a conexão com o Redis e as funções para salvar e obter o estado da sala.
- `Dockerfile`: Define as instruções para construir a imagem Docker da aplicação.
- `docker-compose.yml`: Orquestra a inicialização do contêiner da aplicação e do serviço do Redis.
- `desenvolvimento-backend.md`: Documentação técnica com o contexto de desenvolvimento e sugestões de melhorias.
