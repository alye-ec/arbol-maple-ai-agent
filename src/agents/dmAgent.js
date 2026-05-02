// src/agents/dmAgent.js
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT } = require('./knowledgeBase');

console.log('🔑 API KEY:', process.env.ANTHROPIC_API_KEY ? 'encontrada' : 'NO encontrada');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Historial de conversaciones en memoria (por sender ID)
const conversationHistory = {};
const MAX_HISTORY = 10;

async function handleIncomingMessage(senderId, mensajeTexto) {
  console.log(`📩 Mensaje recibido de ${senderId}: ${mensajeTexto}`);

  if (!senderId || !mensajeTexto) {
    console.error('❌ senderId o mensajeTexto inválidos');
    return;
  }

  try {
    if (!conversationHistory[senderId]) {
      conversationHistory[senderId] = [];
    }

    const history = conversationHistory[senderId];
    history.push({ role: 'user', content: mensajeTexto });

    if (history.length > MAX_HISTORY * 2) {
      history.splice(0, 2);
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: history,
    });

    const respuesta = response.content[0].text;
    console.log(`🤖 Respuesta generada: ${respuesta}`);

    history.push({ role: 'assistant', content: respuesta });

    await enviarMensajeInstagram(senderId, respuesta);
    console.log(`✅ Respuesta enviada a ${senderId}`);

  } catch (error) {
    console.error('❌ Error en handleIncomingMessage:', error.response?.data || error.message);
  }
}

async function enviarMensajeInstagram(recipientId, texto) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID;

  if (!token) throw new Error('Falta META_PAGE_ACCESS_TOKEN en variables de entorno');
  if (!igAccountId) throw new Error('Falta INSTAGRAM_ACCOUNT_ID en variables de entorno');
  if (!recipientId) throw new Error('recipientId es undefined');
  if (!texto) throw new Error('texto vacío');

  console.log(`📤 Enviando respuesta a ${recipientId}...`);

  await axios.post(
    `https://graph.facebook.com/v21.0/${igAccountId}/messages`,
    {
      recipient: { id: recipientId },
      message: { text: texto },
    },
    { params: { access_token: token } }
  );
}

function clearHistory(senderId) {
  delete conversationHistory[senderId];
}

module.exports = { handleIncomingMessage, clearHistory };
