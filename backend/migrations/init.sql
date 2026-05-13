CREATE TABLE IF NOT EXISTS pessoas_normal (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100),
  sobrenome VARCHAR(200),
  rua VARCHAR(150),
  casa VARCHAR(20),
  cidade VARCHAR(100),
  cep VARCHAR(20),
  cpf VARCHAR(14)
);

CREATE TABLE IF NOT EXISTS lexical_nome (
  id SERIAL PRIMARY KEY,
  token VARCHAR(10) UNIQUE,
  valor VARCHAR(100) UNIQUE,
  frequencia INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS lexical_sobrenome (
  id SERIAL PRIMARY KEY,
  token VARCHAR(10) UNIQUE,
  valor VARCHAR(100) UNIQUE,
  frequencia INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS lexical_rua (
  id SERIAL PRIMARY KEY,
  token VARCHAR(10) UNIQUE,
  valor VARCHAR(150) UNIQUE,
  frequencia INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS lexical_cidade (
  id SERIAL PRIMARY KEY,
  token VARCHAR(10) UNIQUE,
  valor VARCHAR(100) UNIQUE,
  frequencia INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS lexical_cep (
  id SERIAL PRIMARY KEY,
  token VARCHAR(10) UNIQUE,
  valor VARCHAR(20) UNIQUE,
  frequencia INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pessoas_mir (
  id SERIAL PRIMARY KEY,
  nome_token VARCHAR(10),
  sobrenome_token VARCHAR(300),
  rua_token VARCHAR(10),
  casa VARCHAR(20),
  cidade_token VARCHAR(10),
  cep_token VARCHAR(10),
  cpf_mne VARCHAR(20)
);