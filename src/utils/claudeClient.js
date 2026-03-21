const axios = require('axios');

async function preguntarAClaude(mensajeUsuario) {
  const respuesta = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `Eres un asistente de ventas amable y profesional de Árbol de Maple, 
una fábrica ecuatoriana de muebles infantiles de madera de alta calidad. 
Fabricamos cunas, dormitorios infantiles y mobiliario escolar y preescolar.

Tu trabajo es responder preguntas de clientes potenciales por Instagram con un tono 
cercano, cálido y profesional. Siempre en español latino.

Reglas:
- Sé breve y directo (máximo 3-4 oraciones por respuesta)
- Si preguntan por precios, diles que los precios dependen del modelo y personalización, 
  e invítalos a escribir al WhatsApp para una cotización personalizada
- Si preguntan por disponibilidad o tiempos de entrega, diles que los tiempos varían 
  según el producto y que pueden consultar por WhatsApp
- Nuestro WhatsApp es: ${process.env.WHATSAPP_NUMBER}
- Si no sabes algo, no inventes — ofrece comunicarlos con el equipo
- Nunca hagas promesas de precios o fechas exactas`,
      messages: [
        { role: 'user', content: mensajeUsuario }
      ]
    },
    {
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    }
  );

  return respuesta.data.content[0].text;
}

module.exports = { preguntarAClaude };