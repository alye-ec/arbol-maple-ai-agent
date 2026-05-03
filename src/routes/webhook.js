// src/routes/webhook.js
const express = require('express');
const router = express.Router();
const { handleIncomingMessage } = require('../agents/dmAgent');

const mensajesProcesados = new Set();

// Verificación del webhook (requerido por Meta)
router.get('/', (req, res) => {
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verificado por Meta');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Token de verificación incorrecto');
    res.sendStatus(403);
  }
});

// Recepción de mensajes
router.post('/', async (req, res) => {
  const body = req.body;

  if (body.object === 'instagram' || body.object === 'page') {

    for (const entry of body.entry || []) {

      // Formato changes (Instagram real)
      for (const change of entry.changes || []) {
        if (change.value?.message) {
          const event = change.value;
          const mid = event.message?.mid;

          if (event.message.is_echo) continue;
          if (mid && mensajesProcesados.has(mid)) continue;
          if (mid) mensajesProcesados.add(mid);

          const texto = event.message.text || null;
          const imageUrl = extractImageUrl(event.message);

          if (!texto && !imageUrl) continue;

          try {
            await handleIncomingMessage(event.sender.id, texto, imageUrl);
          } catch (error) {
            console.error('❌ Error en handleIncomingMessage:', error.response?.data || error.message);
          }
        }
      }

      // Formato messaging (Instagram DMs)
      for (const event of entry.messaging || []) {
        const mid = event.message?.mid;

        if (!event.message) continue;
        if (event.message.is_echo) continue;
        if (mid && mensajesProcesados.has(mid)) continue;
        if (mid) mensajesProcesados.add(mid);

        const texto = event.message.text || null;
        const imageUrl = extractImageUrl(event.message);

        if (!texto && !imageUrl) continue;

        try {
          await handleIncomingMessage(event.sender.id, texto, imageUrl);
        } catch (error) {
          console.error('❌ Error en handleIncomingMessage:', error.response?.data || error.message);
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');

  } else {
    res.sendStatus(404);
  }
});

function extractImageUrl(message) {
  // Attachments de Instagram
  if (message.attachments && message.attachments.length > 0) {
    for (const att of message.attachments) {
      if (att.type === 'image' && att.payload?.url) {
        return att.payload.url;
      }
    }
  }
  return null;
}

module.exports = router;
