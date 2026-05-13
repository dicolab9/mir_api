const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config();

const cadastroRoutes = require('./routes/cadastro.routes');
const listarRoutes = require('./routes/listar.routes');
const estatisticasRoutes = require('./routes/estatisticas.routes');
const excluirRoutes = require('./routes/excluir.routes');

const app = express();

app.disable('x-powered-by');

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/cadastro', cadastroRoutes);
app.use('/listar', listarRoutes);
app.use('/estatisticas', estatisticasRoutes);
app.use('/excluir', excluirRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor MIR/MNE rodando na porta ${PORT}`);
});