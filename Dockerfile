# Estágio 1: Builder - Instala dependências e compila assets se necessário
FROM node:18-alpine AS builder

WORKDIR /app

# Copia os arquivos de manifesto de pacote e instala todas as dependências (incluindo dev)
COPY package*.json ./
RUN npm install

# Copia o restante do código da aplicação
COPY . .

# --- 

# Estágio 2: Production - Cria a imagem final e enxuta
FROM node:18-alpine

WORKDIR /app

# Copia apenas as dependências de produção do estágio de build
# Isso evita a necessidade de um `npm install` completo novamente
COPY --from=builder /app/node_modules ./node_modules

# Copia o código da aplicação do estágio de build
COPY --from=builder /app .

# Expõe a porta que a aplicação usa
EXPOSE 3000

# Define o comando para iniciar a aplicação
CMD ["node", "server.js"]
