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
// 🔒 ENDPOINT SEGURO DE LIMPEZA - LIMPA TODAS AS TABELAS
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
  
  const client = await pool.connect();
  
  try {
    console.log('⚠️ INICIANDO LIMPEZA TOTAL DO BANCO DE DADOS...');
    console.log(`👤 Autorizado por: ${req.ip} em ${new Date().toISOString()}`);
    
    // Iniciar transação
    await client.query('BEGIN');
    
    // Contar registros antes da limpeza (TODAS as tabelas)
    const statsAntes = await client.query(`
      SELECT 
        'pessoas_normal' as tabela, COUNT(*) as total FROM pessoas_normal
      UNION ALL
      SELECT 'pessoas_mir', COUNT(*) FROM pessoas_mir
      UNION ALL
      SELECT 'lexical_nome', COUNT(*) FROM lexical_nome
      UNION ALL
      SELECT 'lexical_sobrenome', COUNT(*) FROM lexical_sobrenome
      UNION ALL
      SELECT 'lexical_rua', COUNT(*) FROM lexical_rua
      UNION ALL
      SELECT 'lexical_cidade', COUNT(*) FROM lexical_cidade
      UNION ALL
      SELECT 'lexical_cep', COUNT(*) FROM lexical_cep
    `);
    
    // Desabilitar constraints temporariamente para garantir limpeza
    await client.query('SET CONSTRAINTS ALL DEFERRED');
    
    // Limpar TODAS as tabelas na ordem correta (primeiro as que têm FK)
    console.log('🗑️ Removendo registros das tabelas...');
    
    // 1. Limpar tabelas que têm foreign keys primeiro
    await client.query('DELETE FROM pessoas_mir');
    console.log('  ✅ pessoas_mir limpa');
    
    await client.query('DELETE FROM pessoas_normal');
    console.log('  ✅ pessoas_normal limpa');
    
    // 2. Limpar tabelas lexicais
    await client.query('DELETE FROM lexical_nome');
    console.log('  ✅ lexical_nome limpa');
    
    await client.query('DELETE FROM lexical_sobrenome');
    console.log('  ✅ lexical_sobrenome limpa');
    
    await client.query('DELETE FROM lexical_rua');
    console.log('  ✅ lexical_rua limpa');
    
    await client.query('DELETE FROM lexical_cidade');
    console.log('  ✅ lexical_cidade limpa');
    
    await client.query('DELETE FROM lexical_cep');
    console.log('  ✅ lexical_cep limpa');
    
    // 3. Resetar todas as sequências (IDs)
    console.log('🔄 Resetando sequências...');
    
    await client.query('ALTER SEQUENCE IF EXISTS pessoas_normal_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS pessoas_mir_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS lexical_nome_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS lexical_sobrenome_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS lexical_rua_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS lexical_cidade_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS lexical_cep_id_seq RESTART WITH 1');
    
    console.log('  ✅ Todas as sequências resetadas');
    
    // 4. Verificar se realmente limpou tudo
    const verificacao = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM pessoas_normal) as normal,
        (SELECT COUNT(*) FROM pessoas_mir) as mir,
        (SELECT COUNT(*) FROM lexical_nome) as nome,
        (SELECT COUNT(*) FROM lexical_sobrenome) as sobrenome,
        (SELECT COUNT(*) FROM lexical_rua) as rua,
        (SELECT COUNT(*) FROM lexical_cidade) as cidade,
        (SELECT COUNT(*) FROM lexical_cep) as cep
    `);
    
    // Commit da transação
    await client.query('COMMIT');
    
    console.log('✅ LIMPEZA TOTAL CONCLUÍDA COM SUCESSO!');
    console.log('📊 Verificação pós-limpeza:', verificacao.rows[0]);
    
    // Preparar relatório de registros removidos
    const registrosRemovidos = {};
    statsAntes.rows.forEach(row => {
      registrosRemovidos[row.tabela] = parseInt(row.total);
    });
    
    res.json({ 
      sucesso: true, 
      mensagem: 'Todas as tabelas foram limpas com sucesso!',
      registrosRemovidos: registrosRemovidos,
      verificacao: verificacao.rows[0],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na limpeza:', error);
    res.status(500).json({ 
      erro: 'Erro ao limpar banco de dados', 
      detalhe: error.message 
    });
  } finally {
    client.release();
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