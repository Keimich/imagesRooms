# Contexto de Desenvolvimento: Backend da Lousa Colaborativa

Este documento resume o estado atual e as próximas etapas para o backend da aplicação.

## 1. Requisitos e Arquitetura

- **Objetivo:** Criar um backend para uma lousa digital colaborativa em tempo real.
- **Funcionalidades:**
  - Criação de salas com IDs únicos.
  - Múltiplos usuários por sala com identidade persistente (reconhece o usuário após recarregar a página).
  - Adicionar, mover, redimensionar e deletar imagens.
  - Sincronização em tempo real entre todos os participantes da sala.
- **Tecnologias Escolhidas:**
  - **Runtime:** Node.js
  - **Servidor:** Express.js
  - **Comunicação Real-Time:** Socket.IO
  - **Armazenamento de Estado:** Redis (com expiração de 24 horas por sala)
  - **Orquestração:** Docker e Docker Compose

## 2. Estrutura de Eventos Socket.IO (Atualizada)

- **Cliente -> Servidor:**
  - `joinRoom({ roomId, userName, userId })`: Para entrar em uma sala. O `userId` é o identificador persistente do cliente.
  - `imageAdded({ roomId, image })`: Adiciona uma nova imagem.
  - `imageMoved({ roomId, imageId, position })`: Move uma imagem.
  - `imageResized({ roomId, imageId, size })`: Redimensiona uma imagem.
  - `imageDeleted({ roomId, imageId })`: Deleta uma imagem.

- **Servidor -> Cliente:**
  - `currentRoomState(state)`: Enviado ao cliente ao entrar, com todo o estado da sala (usuários e imagens).
  - `userListUpdate(users)`: Broadcast para toda a sala sempre que a lista de usuários é alterada (entrada, saída ou reconexão).
  - `imageAdded`, `imageMoved`, `imageResized`, `imageDeleted`: Broadcast das ações para sincronizar os clientes.

## 3. Sugestões de Melhorias Futuras

1.  **Tratamento de Desconexão Aprimorado (Graceful Disconnect):**
    - **Problema:** Atualmente, um usuário é removido da sala imediatamente após o evento `disconnect`. Se ele apenas recarregar a página, ele "sai" e "entra" da sala, o que não é ideal.
    - **Solução:** Implementar um `setTimeout` de ~5 segundos no evento `disconnect`. Se o mesmo `userId` se reconectar nesse intervalo, o timeout é cancelado. Se não, o usuário é efetivamente removido e o evento `userListUpdate` é emitido. Isso cria uma experiência mais fluida para recarregamentos de página.

2.  **Validação de Payloads (Schema Validation):**
    - **Problema:** O servidor confia que os dados enviados pelo cliente (payloads dos eventos) estão no formato correto.
    - **Solução:** Implementar uma biblioteca de validação de schemas como `zod` ou `joi` para validar os dados de entrada de cada evento do socket. Isso tornaria o servidor mais seguro e robusto contra dados malformados.

3.  **Segurança do CORS:**
    - **Problema:** A configuração atual do CORS (`origin: "*"`) é muito permissiva e insegura para um ambiente de produção.
    - **Solução:** Em produção, a origem deve ser restrita a um array de domínios permitidos, como o domínio do frontend da aplicação.

4.  **Testes Automatizados:**
    - **Problema:** O projeto não possui uma suíte de testes.
    - **Solução:** Adicionar testes unitários e de integração usando um framework como `jest`, em conjunto com a biblioteca `socket.io-client` para simular clientes e testar os fluxos de eventos em tempo real.