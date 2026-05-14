// services/cpf.service.js
// Funções para cálculo e validação de CPF

/**
 * Calcula o primeiro dígito verificador do CPF
 * @param {string} base - 9 primeiros dígitos do CPF
 * @returns {number} Primeiro dígito verificador
 */
function calcularPrimeiroDigito(base) {
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += Number.parseInt(base[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

/**
 * Calcula o segundo dígito verificador do CPF
 * @param {string} base - 9 primeiros dígitos do CPF
 * @param {number} primeiroDigito - Primeiro dígito verificador
 * @returns {number} Segundo dígito verificador
 */
function calcularSegundoDigito(base, primeiroDigito) {
  const parcial = base + primeiroDigito;
  let soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += Number.parseInt(parcial[i]) * (11 - i);
  }
  let resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

/**
 * Calcula os dígitos verificadores a partir da base (9 dígitos)
 * @param {string} base - 9 primeiros dígitos do CPF
 * @returns {string} CPF completo com dígitos verificadores
 */
function calcularDigitosVerificadores(base) {
  if (base.length !== 9) {
    throw new Error('Base deve ter exatamente 9 dígitos');
  }
  
  const dv1 = calcularPrimeiroDigito(base);
  const dv2 = calcularSegundoDigito(base, dv1);
  
  return `${base}${dv1}${dv2}`;
}

/**
 * Formata CPF no padrão XXX.XXX.XXX-XX
 * @param {string} cpf - CPF completo ou base de 9 dígitos
 * @returns {string} CPF formatado
 */
function formatarCPF(cpf) {
  const numeros = cpf.replace(/\D/g, '');
  if (numeros.length === 9) {
    // Se for apenas a base, calcula os dígitos
    const completo = calcularDigitosVerificadores(numeros);
    return completo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (numeros.length === 11) {
    return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return cpf;
}

/**
 * Valida se o CPF é válido
 * @param {string} cpf - CPF a ser validado
 * @returns {boolean} Verdadeiro se válido
 */
function validarCPF(cpf) {
  const numeros = cpf.replace(/\D/g, '');
  
  if (numeros.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(numeros)) return false; // CPF com todos dígitos iguais
  
  const base = numeros.substring(0, 9);
  const dv1 = calcularPrimeiroDigito(base);
  const dv2 = calcularSegundoDigito(base, dv1);
  
  return numeros === `${base}${dv1}${dv2}`;
}

module.exports = {
  calcularPrimeiroDigito,
  calcularSegundoDigito,
  calcularDigitosVerificadores,
  formatarCPF,
  validarCPF
};
