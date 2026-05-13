const BASE62 =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function encodeBase62(numero) {

  numero = BigInt(numero);

  if (numero === 0n) return '0';

  let resultado = '';

  while (numero > 0n) {

    resultado =
      BASE62[Number(numero % 62n)] +
      resultado;

    numero = numero / 62n;
  }

  return resultado;
}

function decodeBase62(texto) {

  let resultado = 0n;

  for (const char of texto) {

    resultado =
      resultado * 62n +
      BigInt(BASE62.indexOf(char));
  }

  return resultado.toString();
}

module.exports = {
  encodeBase62,
  decodeBase62
};