// src/agents/dmAgent.js
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const { getSystemPrompt } = require('./catalogLoader');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const conversationHistory = {};
const MAX_HISTORY = 10;

async function downloadImageAsBase64(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const base64 = Buffer.from(response.data).toString('base64');
  const contentType = response.headers['content-type'] || 'image/jpeg';
  return { base64, contentType };
}

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

    let userContent;

    if (imageUrl) {
      try {
        const { base64, contentType } = await downloadImageAsBase64(imageUrl);
        const imageBlock = {
          type: 'image',
          source: { type: 'base64', media_type: contentType, data: base64 }
        };
        userContent = texto
          ? [{ type: 'text', text: texto }, imageBlock]
          : [{ type: 'text', text: '(El cliente envió una foto)' }, imageBlock];
      } catch (imgError) {
        console.error('❌ Error descargando imagen:', imgError.message);
        userContent = texto || '(El cliente envió una imagen que no se pudo cargar)';
      }
    } else {
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
