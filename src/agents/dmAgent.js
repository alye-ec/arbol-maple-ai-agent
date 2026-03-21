const axios = require('axios');
const { preguntarAClaude } = require('../utils/claudeClient');

async function procesarMensaje(senderId, mensajeTexto) {
  console.log(`📩 Mensaje recibido de ${senderId}: ${mensajeTexto}`);

  try {
    // Obtener respuesta de Claude
    const respuesta = await preguntarAClaude(mensajeTexto);
    console.log(`🤖 Respuesta generada: ${respuesta}`);

    // Enviar respuesta por Instagram
    await enviarMensajeInstagram(senderId, respuesta);
    console.log(`✅ Respuesta enviada a ${senderId}`);

  } catch (error) {
    console.error('❌ Error procesando mensaje:', error.message);
  }
}

async function enviarMensajeInstagram(recipientId, texto) {
  await axios.post(
    `https://graph.facebook.com/v18.0/me/messages`,
    {
      recipient: { id: recipientId },
      message: { text: texto }
    },
    {
      params: { access_token: process.env.META_PAGE_ACCESS_TOKEN }
    }
  );
}

module.exports = { procesarMensaje };