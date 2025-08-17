const redis = require('redis');

// 1. Inicializa o Cliente Redis
const client = redis.createClient({
  url: process.env.REDIS_URL
});

// 2. Lida com Eventos de Conexão e Erro
client.on('connect', () => {
  console.log('Conectado ao Redis com sucesso!');
});

client.on('error', (err) => {
  console.error('Erro de conexão com o Redis:', err);
});

// Conecta ao Redis assim que o módulo é carregado
client.connect();

// 3. Funções de Acesso ao Estado da Sala

/**
 * Busca e parseia o estado de uma sala no Redis.
 * @param {string} roomId O ID da sala.
 * @returns {Promise<object|null>} O objeto de estado da sala ou null se não for encontrado.
 */
async function getRoomState(roomId) {
  try {
    const stateJSON = await client.get(roomId);
    return stateJSON ? JSON.parse(stateJSON) : null;
  } catch (error) {
    console.error(`Erro ao buscar o estado da sala ${roomId}:`, error);
    return null;
  }
}

/**
 * Salva o estado de uma sala no Redis com expiração de 24 horas.
 * @param {string} roomId O ID da sala.
 * @param {object} state O objeto de estado a ser salvo.
 */
async function saveRoomState(roomId, state) {
  try {
    const stateJSON = JSON.stringify(state);
    // O comando 'SET' com a opção 'EX' define a expiração em segundos.
    // 24 horas * 60 minutos * 60 segundos = 86400 segundos.
    await client.set(roomId, stateJSON, {
      EX: 86400,
    });
  } catch (error) {
    console.error(`Erro ao salvar o estado da sala ${roomId}:`, error);
  }
}

// 4. Exporta o cliente e as funções
module.exports = {
  redisClient: client,
  getRoomState,
  saveRoomState,
};
