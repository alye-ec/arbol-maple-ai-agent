const axios = require('axios');
const { preguntarAClaude } = require('../utils/claudeClient');

async function procesarMensaje(senderId, mensajeTexto) {
  console.log(`📩 Mensaje recibido de ${senderId}: ${mensajeTexto}`);
  

  try {
    if (!senderId || !mensajeTexto) {
      console.error("❌ senderId o mensajeTexto inválidos");
      return;
    }

    const respuesta = await preguntarAClaude(mensajeTexto);
    console.log(`🤖 Respuesta generada: ${respuesta}`);

    if (!respuesta || typeof respuesta !== 'string') {
      console.error("❌ Respuesta inválida de Claude");
      return;
    }

    await enviarMensajeInstagram(senderId, respuesta);
    console.log(`✅ Respuesta enviada a ${senderId}`);

  } catch (error) {
    console.error('❌ Error procesando mensaje:');
    if (error.response) {
      console.error("📡 Meta respondió:");
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

async function enviarMensajeInstagram(recipientId, texto) {
  try {
    // Para Instagram Messaging se usa el IGAA token
    const token = process.env.META_PAGE_ACCESS_TOKEN;
    const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID;

    if (!token) throw new Error("Falta INSTAGRAM_ACCESS_TOKEN en variables de entorno");
    if (!igAccountId) throw new Error("Falta INSTAGRAM_ACCOUNT_ID en variables de entorno");
    if (!recipientId) throw new Error("recipientId es undefined");
    if (!texto) throw new Error("texto vacío");

    console.log(`📤 Enviando respuesta a ${recipientId}...`);
    
    await axios.post(
      `https://graph.facebook.com/v21.0/${igAccountId}/messages`,
      {
        recipient: { id: recipientId },
        message: { text: texto }
      },
      {
        params: { access_token: token }
      }
    );

  } catch (error) {
    console.error("❌ Error enviando mensaje a Instagram:");
    if (error.response) {
      console.error("📡 Meta respondió:");
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

module.exports = { procesarMensaje };