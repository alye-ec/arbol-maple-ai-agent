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
router.post('/', (req, res) => {
  const body = req.body;
  console.log('📨 Payload recibido:', JSON.stringify(body));

  if (body.object === 'instagram' || body.object === 'page') {
    body.entry?.forEach(entry => {

      // Formato con changes (Meta real)
      entry.changes?.forEach(change => {
        if (change.field === 'messages' && change.value?.message) {
          const event = change.value;
          if (!event.message.is_echo && event.message.text) {
            procesarMensaje(event.sender.id, event.message.text);
          }
        }
      });

      // Formato con messaging (alternativo)
      entry.messaging?.forEach(event => {
        if (event.message && !event.message.is_echo && event.message.text) {
          procesarMensaje(event.sender.id, event.message.text);
        }
      });

    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

module.exports = router;