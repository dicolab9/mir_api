const router = require('express').Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    // Contagem de registros
    const normalCount = await pool.query(`SELECT COUNT(*) FROM pessoas_normal`);
    
    // Contagem de tokens únicos
    const tokensCount = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM lexical_nome) as nomes,
        (SELECT COUNT(*) FROM lexical_sobrenome) as sobrenomes,
        (SELECT COUNT(*) FROM lexical_rua) as ruas,
        (SELECT COUNT(*) FROM lexical_cidade) as cidades,
        (SELECT COUNT(*) FROM lexical_cep) as ceps
    `);
    
    // Estimativa de bytes baseada em caracteres (1 caractere = 1 byte aproximado)
    // Tamanho médio dos campos (estimativa conservadora)
    const TAMANHO_MEDIO_NORMAL = {
      nome: 15,
      sobrenome: 20,
      rua: 25,
      cidade: 18,
      cep: 8,
      cpf: 11
    };
    
    const TAMANHO_MEDIO_TOKEN = {
      nome: 3,
      sobrenome: 5,  // composto pode ter pipe
      rua: 3,
      cidade: 3,
      cep: 3,
      cpf_mne: 6
    };
    
    const totalRegistros = Number.parseInt(normalCount.rows[0].count);
    
    // Calcular bytes estimados
    const normalBytes = totalRegistros * (
      TAMANHO_MEDIO_NORMAL.nome +
      TAMANHO_MEDIO_NORMAL.sobrenome +
      TAMANHO_MEDIO_NORMAL.rua +
      TAMANHO_MEDIO_NORMAL.cidade +
      TAMANHO_MEDIO_NORMAL.cep +
      TAMANHO_MEDIO_NORMAL.cpf
    );
    
    const mirBytes = totalRegistros * (
      TAMANHO_MEDIO_TOKEN.nome +
      TAMANHO_MEDIO_TOKEN.sobrenome +
      TAMANHO_MEDIO_TOKEN.rua +
      TAMANHO_MEDIO_TOKEN.cidade +
      TAMANHO_MEDIO_TOKEN.cep +
      TAMANHO_MEDIO_TOKEN.cpf_mne
    );
    
    // Overhead das tabelas lexicais (estimativa: ~50 bytes por token)
    const totalTokens = 
      Number.parseInt(tokensCount.rows[0].nomes || 0) +
      Number.parseInt(tokensCount.rows[0].sobrenomes || 0) +
      Number.parseInt(tokensCount.rows[0].ruas || 0) +
      Number.parseInt(tokensCount.rows[0].cidades || 0) +
      Number.parseInt(tokensCount.rows[0].ceps || 0);
    
    const lexicalBytes = totalTokens * 50;
    const totalMirBytes = mirBytes + lexicalBytes;
    
    // Economia percentual
    const economia = normalBytes > 0
      ? ((normalBytes - totalMirBytes) / normalBytes * 100).toFixed(2)
      : 0;
    
    res.json({
      normal: totalRegistros,
      mir: totalRegistros,
      normal_bytes: normalBytes,
      mir_bytes: mirBytes,
      lexical_bytes: lexicalBytes,
      total_mir: totalMirBytes,
      economia_percentual: Number.parseFloat(economia),
      detalhes: {
        registros: totalRegistros,
        tokens_unicos: totalTokens,
        explicacao: totalRegistros < 1000 
          ? "Com poucos registros, o overhead das tabelas lexicais pode não ter sido compensado ainda."
          : "Com muitos registros, o MIR/MNE começa a mostrar economia real."
      }
    });
    
  } catch (error) {
    console.error('Erro nas estatísticas:', error);
    res.status(500).json({ 
      erro: 'Erro ao buscar estatísticas', 
      detalhe: error.message 
    });
  }
});

module.exports = router;
