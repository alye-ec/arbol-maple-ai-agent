const express = require('express');
const router = express.Router();
const { procesarMensaje } = require('../agents/dmAgent');

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
  console.log('📨 Payload recibido:', JSON.stringify(body));

  if (body.object === 'instagram' || body.object === 'page') {

    for (const entry of body.entry || []) {

      // 🔹 Formato changes (Instagram real)
      for (const change of entry.changes || []) {
        if (change.value?.message) {
          const event = change.value;

          if (!event.message.is_echo && event.message.text) {
            try {
              await procesarMensaje(event.sender.id, event.message.text);
            } catch (error) {
              console.error("❌ Error en procesarMensaje:");
              console.error(error.response?.data || error.message);
            }
          }
        }
      }

      // 🔹 Formato messaging (fallback)
      for (const event of entry.messaging || []) {
        if (event.message && !event.message.is_echo && event.message.text) {
          try {
            await procesarMensaje(event.sender.id, event.message.text);
          } catch (error) {
            console.error("❌ Error en procesarMensaje:");
            console.error(error.response?.data || error.message);
          }
        }
      }

    }

    res.status(200).send('EVENT_RECEIVED');

  } else {
    res.sendStatus(404);
  }
});

module.exports = router;