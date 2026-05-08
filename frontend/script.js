async function cadastrar() {

  const body = {
    nome: document.getElementById('nome').value,
    sobrenome: document.getElementById('sobrenome').value,
    rua: document.getElementById('rua').value,
    casa: document.getElementById('casa').value,
    cidade: document.getElementById('cidade').value,
    cep: document.getElementById('cep').value,
    cpf: document.getElementById('cpf').value
  };

  const response = await fetch('http://localhost:3000/cadastro', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  document.getElementById('resultado').innerHTML = `
    <h2>Cadastro Realizado</h2>

    <h3>Modo Tradicional</h3>
    <pre>${JSON.stringify(data.normal, null, 2)}</pre>

    <h3>MIR + MNE</h3>
    <pre>${JSON.stringify(data.mir, null, 2)}</pre>
  `;
}

async function estatisticas() {

  const response = await fetch(
    'http://localhost:3000/estatisticas'
  );

  const data = await response.json();

  document.getElementById('stats').textContent =
    JSON.stringify(data, null, 2);
}