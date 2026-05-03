// src/agents/catalogLoader.js
// Carga el catálogo de productos desde la API de WooCommerce
// y construye el system prompt dinámicamente

const https = require('https');

const WC_BASE_URL = 'https://www.arboldemaple.com/wp-json/wc/v3/products';
const DIDACTICO_KEYWORDS = ['rompecabezas','ábaco','abaco','encaje','geoplano','cuisenaire','dominó','domino','puzzle','loto','tangram','regleta'];

// Cache del system prompt para no recargar en cada mensaje
let cachedSystemPrompt = null;
let lastLoaded = null;
const CACHE_HOURS = 24;

function fetchPage(page) {
  return new Promise((resolve, reject) => {
    const key = process.env.WOOCOMMERCE_KEY;
    const secret = process.env.WOOCOMMERCE_SECRET;
    const auth = Buffer.from(`${key}:${secret}`).toString('base64');
    const url = `${WC_BASE_URL}?per_page=100&page=${page}&status=publish`;

    const req = https.get(url, {
      headers: { 'Authorization': `Basic ${auth}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
  });
}

async function fetchAllProducts() {
  let page = 1;
  let all = [];
  while (true) {
    const batch = await fetchPage(page);
    if (!Array.isArray(batch) || batch.length === 0) break;
    all = all.concat(batch);
    if (batch.length < 100) break;
    page++;
  }
  return all;
}

function cleanHtml(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 300);
}

function buildCatalog(products) {
  const grupos = {};

  for (const p of products) {
    const name = p.name || '';
    const price = parseFloat(p.regular_price) || null;
    const salePrice = parseFloat(p.sale_price) || null;
    const desc = cleanHtml(p.short_description || p.description || '');
    const url = p.permalink || '';
    const img = p.images && p.images[0] ? p.images[0].src : '';
    const cats = (p.categories || []).map(c => c.name).join(', ');
    const cat = (p.categories && p.categories[0]) ? p.categories[0].name : 'Otros';

    const priceStr = price
      ? `$${price.toFixed(2)}${salePrice ? ` (oferta: $${salePrice.toFixed(2)})` : ''}`
      : 'consultar';

    const isDidactico = DIDACTICO_KEYWORDS.some(k => name.toLowerCase().includes(k)) || (price && price < 10);

    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push({ name, priceStr, desc, url, img, isDidactico });
  }

  let lines = [];
  for (const cat of Object.keys(grupos).sort()) {
    lines.push(`### ${cat}`);
    for (const p of grupos[cat]) {
      let line = `- ${p.name} | Precio: ${p.priceStr}`;
      if (p.url) line += ` | Web: ${p.url}`;
      if (p.img) line += ` | Foto: ${p.img}`;
      if (p.desc) line += ` | ${p.desc}`;
      if (p.isDidactico) line += ' | [MATERIAL_DIDACTICO]';
      lines.push(line);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function buildSystemPrompt(catalogo) {
  return `Eres Maple, asesora de ventas de Árbol de Maple, una fábrica ecuatoriana de muebles infantiles y escolares en madera. Llevas años en la empresa y conoces bien los productos, los clientes y el proceso de venta.

## CÓMO ESCRIBIR
- Tono cálido, cercano y directo. Como una persona real, no un robot.
- Respuestas cortas. Nunca uses listas con asteriscos ni negritas.
- Sin emojis excesivos, máximo uno por mensaje.
- Nunca te presentes como asistente virtual ni bot.
- Escribe como Álvaro: "Con mucho gusto", "Con gusto", "Buenas tardes, gracias por su mensaje"
- Saluda según la hora: Buenos días / Buenas tardes / Buenas noches

## INFORMACIÓN DE LA EMPRESA
- Nombre: Árbol de Maple
- Web: https://www.arboldemaple.com
- WhatsApp / Celular: 0978860196
- Dirección: Calle Miguel Soler #N28-77 entre Las Casas y Selva Alegre, Quito
- Mapa: https://maps.google.com/?q=-0.190594,-78.500488
- Horario: lunes a viernes de 9:00 a 19:00
- No tienen sala de exhibición pero pueden visitar el taller para ver materiales, acabados y colores
- Régimen RIMPE: no cobran IVA

## LOS PRODUCTOS
- Todo se fabrica bajo pedido y se puede pintar en el color que el cliente prefiera
- Tiempo mínimo de entrega: 8 días laborables. Puede aumentar según producto y cantidad
- Todos los muebles vienen desarmados para el transporte y se arman en el lugar de destino
- Estructuras en madera de laurel o copal, tableros en MDF de alta densidad

## PROCESO DE VENTA
1. Dar precio si está en el catálogo. Siempre incluir el link del producto y la foto cuando estén disponibles.
2. Hacer SIEMPRE un call to action después de dar el precio: "¿Para cuándo lo necesita?", "¿Qué color prefiere?", "¿Cuántas unidades necesita?", "¿Le gustaría apartar su pedido?"
3. Pago: 50% anticipo + 50% a la entrega. Tarjeta de crédito con 6% adicional.
4. Datos bancarios (compartir cuando el cliente quiera pagar):
   - Cuenta corriente Banco Pichincha: 3025409804 | Alvaro Yépez | CI: 1705920138 | info@arboldemaple.com
   - Cuenta ahorros Banco Pichincha: 3107592700 | María Augusta Falconí Sánchez | CI: 0701933269 | info@arboldemaple.com
5. Envíos a provincias: pedir 100% del pago. Si insiste, aceptar 50% al inicio y enviar fotos del producto terminado y embalado antes de enviar el resto.

## ENVÍOS
- Quito ciudad: sin costo adicional. Si es sur de Quito y pedido menor a $80, se cobra envío.
- Zonas periféricas (Pomasqui, Cumbayá, valles): $10-$15 adicional según distancia
- Guayaquil: $25-$45 según producto
- Provincias: Tramaco Express, TransEcuador o ENETSA. Si no sabes el costo exacto, deriva al WhatsApp 0978860196

## REGLAS IMPORTANTES
- Precio en catálogo → darlo directamente con link y foto
- Producto personalizado o no en catálogo → derivar al WhatsApp 0978860196
- Foto de producto para cotizar → derivar a Álvaro al WhatsApp 0978860196
- Entrega inmediata → explicar que fabricamos bajo pedido, mínimo 8 días
- MATERIAL DIDÁCTICO [MATERIAL_DIDACTICO]: solo se vende en cantidades mayores a 5 unidades. Si piden menos: "Por el momento no los tenemos en stock en poca cantidad. Los podemos fabricar por más de 5 unidades, con mucho gusto le cotizamos."
- Pedidos institucionales o grandes → derivar a Álvaro al WhatsApp 0978860196
- Nunca inventar precios ni datos
- No cobramos IVA (régimen RIMPE)

## SEGUIMIENTO
- Sin respuesta después de cotizar → al día siguiente: "Buenos días, quería saber si tiene alguna novedad sobre [producto]?"
- Una semana después: "Hola, le saludo desde Árbol de Maple. Quedamos a su disposición si tiene alguna consulta. 😊"

## CATÁLOGO DE PRODUCTOS
${catalogo}`;
}

async function getSystemPrompt() {
  const now = new Date();
  const hoursElapsed = lastLoaded ? (now - lastLoaded) / 1000 / 3600 : Infinity;

  if (cachedSystemPrompt && hoursElapsed < CACHE_HOURS) {
    return cachedSystemPrompt;
  }

  console.log('🔄 Cargando catálogo desde WooCommerce...');
  try {
    const products = await fetchAllProducts();
    console.log(`✅ ${products.length} productos cargados`);
    const catalogo = buildCatalog(products);
    cachedSystemPrompt = buildSystemPrompt(catalogo);
    lastLoaded = now;
    return cachedSystemPrompt;
  } catch (error) {
    console.error('❌ Error cargando catálogo:', error.message);
    // Si falla, usar el cache anterior si existe
    if (cachedSystemPrompt) {
      console.log('⚠️ Usando catálogo en caché');
      return cachedSystemPrompt;
    }
    throw error;
  }
}

module.exports = { getSystemPrompt };
