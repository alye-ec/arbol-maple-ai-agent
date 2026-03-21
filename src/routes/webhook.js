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

  if (body.object === 'instagram') {
    body.entry?.forEach(entry => {
      entry.messaging?.forEach(event => {
        if (event.message && !event.message.is_echo) {
          const senderId = event.sender.id;
          const texto = event.message.text;

          if (texto) {
            procesarMensaje(senderId, texto);
          }
        }
      });
    });

    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

module.exports = router;