// src/agents/dmAgent.js
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const { getSystemPrompt } = require('./catalogLoader');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const conversationHistory = {};
const MAX_HISTORY = 10;

async function handleIncomingMessage(senderId, texto, imageUrl = null) {
  console.log(`📩 Mensaje de ${senderId} | texto: ${texto} | imagen: ${imageUrl ? 'sí' : 'no'}`);

  if (!senderId || (!texto && !imageUrl)) {
    console.error('❌ Mensaje vacío');
    return;
  }

  try {
    if (!conversationHistory[senderId]) {
      conversationHistory[senderId] = [];
    }

    const history = conversationHistory[senderId];

    // Construir el contenido del mensaje del usuario
    let userContent;

    if (imageUrl && texto) {
      // Texto + imagen
      userContent = [
        { type: 'text', text: texto },
        { type: 'image', source: { type: 'url', url: imageUrl } }
      ];
    } else if (imageUrl) {
      // Solo imagen
      userContent = [
        { type: 'text', text: '(El cliente envió una foto)' },
        { type: 'image', source: { type: 'url', url: imageUrl } }
      ];
    } else {
      // Solo texto
      userContent = texto;
    }

    history.push({ role: 'user', content: userContent });

    if (history.length > MAX_HISTORY * 2) {
      history.splice(0, 2);
    }

    const systemPrompt = await getSystemPrompt();

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: history,
    });

    const respuesta = response.content[0].text;
    console.log(`🤖 Respuesta: ${respuesta}`);

    // Guardar en historial solo el texto para no acumular imágenes en memoria
    history.push({ role: 'assistant', content: respuesta });

    await enviarMensajeInstagram(senderId, respuesta);
    console.log(`✅ Enviado a ${senderId}`);

  } catch (error) {
    console.error('❌ Error en handleIncomingMessage:', error.response?.data || error.message);
  }
}

async function enviarMensajeInstagram(recipientId, texto) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID;

  if (!token) throw new Error('Falta META_PAGE_ACCESS_TOKEN');
  if (!igAccountId) throw new Error('Falta INSTAGRAM_ACCOUNT_ID');

  console.log(`📤 Enviando a ${recipientId}...`);

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
