// src/agents/dmAgent.js
// Agente de DMs para Árbol de Maple
// Maneja mensajes de Instagram, Facebook y WhatsApp

const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT } = require('./knowledgeBase');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Historial de conversaciones en memoria (por sender ID)
// Formato: { senderId: [ {role, content}, ... ] }
const conversationHistory = {};
const MAX_HISTORY = 10; // Máximo de mensajes a recordar por conversación
console.log('🔑 API KEY:', process.env.ANTHROPIC_API_KEY ? 'encontrada' : 'NO encontrada');
async function handleIncomingMessage(senderId, userMessage) {
  try {
    // Inicializar historial si es nueva conversación
    if (!conversationHistory[senderId]) {
      conversationHistory[senderId] = [];
    }

    const history = conversationHistory[senderId];

    // Agregar mensaje del usuario al historial
    history.push({
      role: 'user',
      content: userMessage,
    });

    // Limitar historial para no exceder tokens
    if (history.length > MAX_HISTORY * 2) {
      history.splice(0, 2); // Eliminar el par más antiguo (user + assistant)
    }

    // Llamar a Claude con el system prompt y el historial completo
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: history,
    });

    const assistantMessage = response.content[0].text;

    // Agregar respuesta al historial
    history.push({
      role: 'assistant',
      content: assistantMessage,
    });

    return assistantMessage;
  } catch (error) {
    console.error('Error en handleIncomingMessage:', error);
    return 'Lo siento, tuve un problema técnico. Por favor escríbenos directamente al WhatsApp 0978860196 y te atendemos de inmediato. 🌳';
  }
}

// Limpiar historial de un usuario (por ejemplo, si pasa mucho tiempo)
function clearHistory(senderId) {
  delete conversationHistory[senderId];
}

module.exports = { handleIncomingMessage, clearHistory };
