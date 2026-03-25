const axios = require('axios');
const { preguntarAClaude } = require('../utils/claudeClient');

async function procesarMensaje(senderId, mensajeTexto) {
  console.log(`📩 Mensaje recibido de ${senderId}: ${mensajeTexto}`);

  try {
    // 🔹 Validación básica
    if (!senderId || !mensajeTexto) {
      console.error("❌ senderId o mensajeTexto inválidos");
      return;
    }

    // 🔹 Obtener respuesta de Claude
    const respuesta = await preguntarAClaude(mensajeTexto);
    console.log(`🤖 Respuesta generada: ${respuesta}`);

    // 🔹 Validar respuesta
    if (!respuesta || typeof respuesta !== 'string') {
      console.error("❌ Respuesta inválida de Claude");
      return;
    }

    // 🔹 Enviar respuesta por Instagram
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
    // 🔹 Validaciones
    if (!process.env.META_PAGE_ACCESS_TOKEN) {
      throw new Error("Falta META_PAGE_ACCESS_TOKEN en variables de entorno");
    }

    if (!recipientId) {
      throw new Error("recipientId es undefined");
    }

    if (!texto) {
      throw new Error("texto vacío");
    }

    console.log("📤 Enviando mensaje a Meta...");
    console.log({
      recipientId,
      texto
    });

console.log("🔑 TOKEN:", process.env.META_PAGE_ACCESS_TOKEN);

    await axios.post(
      `https://graph.facebook.com/v18.0/17841406814765027/messages`,
      {
        recipient: { id: recipientId },
        message: { text: texto }
      },
      {
        params: {
          access_token: process.env.META_PAGE_ACCESS_TOKEN
        }
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

    throw error; // 🔥 importante: vuelve a lanzar el error
  }
}

module.exports = { procesarMensaje };