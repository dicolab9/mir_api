const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./config/db');

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

// ============================================================
// 🔒 ENDPOINT SEGURO DE LIMPEZA COM VALIDAÇÃO
// ============================================================
app.post('/admin/limpar', async (req, res) => {
  const { senha } = req.body;
  const chaveSecreta = process.env.ADMIN_CLEAN_KEY;
  
  // Verificar se a chave está configurada
  if (!chaveSecreta) {
    console.error('❌ ADMIN_CLEAN_KEY não configurada no .env');
    return res.status(500).json({ 
      erro: 'Sistema de limpeza não configurado. Contate o administrador.' 
    });
  }
  
  // Validar senha
  if (senha !== chaveSecreta) {
    return res.status(403).json({ 
      erro: 'Senha de administrador inválida. Acesso negado.' 
    });
  }
  
  try {
    console.log('⚠️ INICIANDO LIMPEZA TOTAL DO BANCO DE DADOS...');
    console.log(`👤 Autorizado por: ${req.ip} em ${new Date().toISOString()}`);
    
    // Iniciar transação
    await pool.query('BEGIN');
    
    // Contar registros antes da limpeza
    const statsAntes = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM pessoas_normal) as pessoas_normal,
        (SELECT COUNT(*) FROM pessoas_mir) as pessoas_mir,
        (SELECT COUNT(*) FROM lexical_nome) as lexical_nome,
        (SELECT COUNT(*) FROM lexical_sobrenome) as lexical_sobrenome,
        (SELECT COUNT(*) FROM lexical_rua) as lexical_rua,
        (SELECT COUNT(*) FROM lexical_cidade) as lexical_cidade,
        (SELECT COUNT(*) FROM lexical_cep) as lexical_cep
    `);
    
    // Limpar tabelas
    await pool.query('DELETE FROM pessoas_mir');
    await pool.query('DELETE FROM pessoas_normal');
    await pool.query('DELETE FROM lexical_nome');
    await pool.query('DELETE FROM lexical_sobrenome');
    await pool.query('DELETE FROM lexical_rua');
    await pool.query('DELETE FROM lexical_cidade');
    await pool.query('DELETE FROM lexical_cep');
    
    // Resetar sequências
    await pool.query('ALTER SEQUENCE lexical_nome_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE lexical_sobrenome_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE lexical_rua_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE lexical_cidade_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE lexical_cep_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE pessoas_normal_id_seq RESTART WITH 1');
    
    // Commit da transação
    await pool.query('COMMIT');
    
    console.log('✅ LIMPEZA CONCLUÍDA COM SUCESSO!');
    
    res.json({ 
      sucesso: true, 
      mensagem: 'Banco de dados limpo com sucesso!',
      registrosRemovidos: {
        pessoas_normal: parseInt(statsAntes.rows[0].pessoas_normal),
        pessoas_mir: parseInt(statsAntes.rows[0].pessoas_mir),
        lexical_nome: parseInt(statsAntes.rows[0].lexical_nome),
        lexical_sobrenome: parseInt(statsAntes.rows[0].lexical_sobrenome),
        lexical_rua: parseInt(statsAntes.rows[0].lexical_rua),
        lexical_cidade: parseInt(statsAntes.rows[0].lexical_cidade),
        lexical_cep: parseInt(statsAntes.rows[0].lexical_cep)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Erro na limpeza:', error);
    res.status(500).json({ 
      erro: 'Erro ao limpar banco de dados', 
      detalhe: error.message 
    });
  }
});

// Endpoint para verificar status do banco
app.get('/admin/status', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM pessoas_normal) as total_normal,
        (SELECT COUNT(*) FROM pessoas_mir) as total_mir,
        (SELECT COUNT(*) FROM lexical_nome) as total_nomes_token,
        (SELECT COUNT(*) FROM lexical_sobrenome) as total_sobrenomes_token,
        (SELECT COUNT(*) FROM lexical_rua) as total_ruas_token,
        (SELECT COUNT(*) FROM lexical_cidade) as total_cidades_token,
        (SELECT COUNT(*) FROM lexical_cep) as total_ceps_token
    `);
    
    res.json(stats.rows[0]);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor MIR/MNE rodando na porta ${PORT}`);
  console.log(`🔒 Modo seguro: Limpeza requer senha administrativa`);
});

// const express = require('express');
// const cors = require('cors');
// const path = require('path');

// require('dotenv').config();

// const cadastroRoutes = require('./routes/cadastro.routes');
// const listarRoutes = require('./routes/listar.routes');
// const estatisticasRoutes = require('./routes/estatisticas.routes');
// const excluirRoutes = require('./routes/excluir.routes');

// const app = express();

// app.disable('x-powered-by');

// app.use(cors());
// app.use(express.json());

// app.use(express.static(path.join(__dirname, '../frontend')));

// app.use('/cadastro', cadastroRoutes);
// app.use('/listar', listarRoutes);
// app.use('/estatisticas', estatisticasRoutes);
// app.use('/excluir', excluirRoutes);

// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, '../frontend/index.html'));
// });

// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//   console.log(`Servidor MIR/MNE rodando na porta ${PORT}`);
// });