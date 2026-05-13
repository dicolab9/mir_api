const { encodeBase62 } = require('./base62');

function gerarToken(prefixo, numero) {
  return `${prefixo}${encodeBase62(numero)}`;
}

module.exports = gerarToken;