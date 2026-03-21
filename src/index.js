require('dotenv').config();
const express = require('express');
const webhookRoutes = require('./routes/webhook');

const app = express();
app.use(express.json());

// Rutas
app.use('/webhook', webhookRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    mensaje: '🍁 Árbol de Maple AI Agent funcionando' 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🍁 Servidor corriendo en puerto ${PORT}`);
});