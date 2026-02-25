# Nexus Crypto Wallet — Teste Técnico Backend

Este projeto implementa uma carteira cripto simplificada em formato de API REST, desenvolvida como parte do teste técnico para a Nexus. O foco foi entregar um core sólido, com modelagem de dados auditável via ledger, autenticação com JWT, operações de depósito, swap e saque, além de listagens com paginação.

O projeto também inclui diferenciais opcionais do desafio, como cache de cotações com Redis, front-end em React consumindo a API e execução via Docker Compose.

## Contexto

A proposta do desafio é construir uma API de carteira cripto com:

- Autenticação (cadastro, login com access token e refresh token, rotas protegidas)
- Carteira e saldos (BRL, BTC e ETH, com saldo reconstruível via movimentações)
- Depósito via webhook com idempotência
- Swap com cotação real via CoinGecko e taxa fixa de 1,5%
- Saque com validação de saldo
- Ledger (movimentações detalhadas) com paginação
- Histórico de transações com paginação
- README com instruções e decisões técnicas

Requisitos e critérios de avaliação descritos no PDF do teste. (Referência: "Teste Prático - Desenvolvedor Backend | Nexus") 

## Stack

Obrigatória (conforme desafio):

- Node.js + TypeScript
- PostgreSQL
- Git

Opcional (diferenciais implementados):

- Redis (cache de cotações)
- Front-end em React integrado
- Docker / Docker Compose para execução local

## Visão Geral

O sistema funciona como uma carteira multi-token (BRL, BTC, ETH), onde toda alteração de saldo gera registros de movimentação (ledger). O saldo atual do usuário é sempre consistente e auditável, pois pode ser reconstruído a partir das movimentações.

Operações suportadas:

- Cadastro e login
- Consulta de saldos
- Depósito via webhook (com idempotencyKey)
- Cotação de swap (CoinGecko + taxa fixa)
- Execução de swap (debita origem + taxa e credita destino)
- Solicitação de saque
- Extrato de movimentações (ledger) com paginação
- Listagem de transações com paginação

## Prints (fluxo e interface)

Abaixo estão prints do ambiente em execução e algumas telas do front-end consumindo a API.

### Login

![Login](./assets/01-login.png)

### Cadastro

![Register](./assets/02-register.png)

### Dashboard e saldos

![Dashboard](./assets/03-dashboard.png)

### Swap com cotação e taxa

![Swap Quote](./assets/04-swap-quoete.png)

### Depósito via webhook (simulação)

![Deposit Webhook](./assets/05-deposit-webhook.png)

### Extrato de movimentações (ledger)

![Ledger](./assets/06-ledger.png)

### Histórico de transações

![Transactions](./assets/07-transactions.png)

### Containers em execução (Docker)

![Docker PS](./assets/08-docker.png)

## Como rodar localmente

Pré-requisitos:

- Docker e Docker Compose

Subir o ambiente:

1. Clone o repositório:
   - git clone https://github.com/GabrielG71/nexus-crypto-wallet
   - cd nexus-crypto-wallet

2. Suba os containers:
   - docker compose up -d --build

3. Acesse:
   - Front-end: http://localhost:3001
   - API: http://localhost:3000

Verificar logs (opcional):
- docker compose logs -f

Parar o ambiente:
- docker compose down

## Funcionalidades e endpoints

Abaixo está um resumo do que foi implementado conforme os requisitos do teste.

### 1) Autenticação

- Cadastro com email e senha
- Login retornando JWT (access token + refresh token)
- Middleware para proteger rotas autenticadas

Telas demonstradas nos prints:
- Login: ./assets/01-login.png
- Cadastro: ./assets/02-register.png

### 2) Carteira e saldos

- Ao cadastrar, o usuário recebe uma carteira inicial com saldo zero
- Suporte a BRL, BTC e ETH
- Saldos são armazenados e auditáveis via modelo de ledger
- Endpoint para consultar saldos

Dashboard demonstrando saldos:
- ./assets/03-dashboard.png

### 3) Depósito via webhook (idempotente)

- Endpoint POST /webhooks/deposit para simular notificação de serviço externo
- Payload: { userId, token, amount, idempotencyKey }
- Validação de idempotencyKey para evitar duplicação
- Crédito no token correto
- Erro caso usuário ou token não existam

Fluxo demonstrado:
- ./assets/05-deposit-webhook.png

### 4) Swap (cotação e execução)

Cotação:

- Endpoint para cotar swap utilizando cotação real (CoinGecko)
- Taxa fixa de 1,5% aplicada sobre o valor
- Retorna quantidade de destino, taxa cobrada e cotação utilizada
- Cache de cotação em Redis para evitar chamadas repetidas (diferencial)

Execução:

- Valida saldo suficiente (incluindo taxa)
- Debita token de origem + taxa
- Credita token de destino
- Registra transação e movimentações correspondentes

Fluxo demonstrado:
- ./assets/04-swap-quoete.png
- ./assets/06-ledger.png
- ./assets/07-transactions.png

### 5) Saque

- Endpoint para solicitar saque de um token
- Valida saldo suficiente
- Debita saldo (transferência é mock)
- Registra a transação e a movimentação no ledger

Movimentações e transações do saque aparecem em:
- ./assets/06-ledger.png
- ./assets/07-transactions.png

### 6) Ledger (movimentações)

- Toda alteração de saldo gera movimentação no ledger
- Tipos suportados:
  - DEPOSIT
  - SWAP_IN
  - SWAP_OUT
  - SWAP_FEE
  - WITHDRAWAL
- Cada movimentação registra:
  - tipo
  - token
  - valor
  - saldo anterior
  - saldo novo
  - data/hora
- Endpoint para consultar extrato com paginação

Extrato demonstrado:
- ./assets/06-ledger.png

### 7) Histórico de transações

- Endpoint para listar transações do usuário com paginação
- Tipos:
  - DEPOSIT
  - SWAP
  - WITHDRAWAL
- Registra tokens envolvidos, valores, taxa (quando aplicável) e data/hora

Tela demonstrada:
- ./assets/07-transactions.png

## Decisões técnicas

### Ledger como fonte de verdade

O projeto foi estruturado para que o saldo seja consistente e auditável. Toda operação que altera saldo escreve movimentações no ledger com saldo anterior e saldo novo, permitindo reconstrução do estado e rastreabilidade total.

Essa abordagem reduz risco de inconsistência e facilita auditoria e debugging de casos de borda (como swaps e taxas).

### Idempotência no depósito

O endpoint de depósito via webhook valida idempotencyKey para impedir crédito duplicado. Isso reflete um cenário real comum em integrações com serviços externos, onde o mesmo evento pode ser reenviado.

### Cotações e taxa de swap

A cotação utiliza uma API pública (CoinGecko) para trazer um valor real. Foi aplicada uma taxa fixa de 1,5% conforme o enunciado. O retorno da cotação inclui a taxa e a cotação utilizada, tornando o cálculo transparente.

### Redis para cache de cotações

Como diferencial, as cotações são cacheadas no Redis com um TTL curto. Isso reduz chamadas repetidas para a API externa em um curto intervalo, melhora performance e torna o sistema mais resiliente.

### Docker para padronizar execução

O ambiente completo (backend, frontend, postgres e redis) roda via Docker Compose. Isso simplifica a execução local e reduz variações de ambiente na avaliação.

## Estrutura do banco de dados (descrição)

A modelagem é centrada em:

- Usuário (credenciais e identificação)
- Carteira vinculada ao usuário
- Movimentações (ledger) como registros de alteração de saldo por token
- Transações como agrupadores lógicos das operações (depósito, swap, saque)
- Controle de idempotência para depósitos

A consistência é garantida pelo registro de movimentações em cada alteração, com saldo anterior e saldo novo.

## Aprendizados e pontos de atenção

Durante o desenvolvimento, os pontos mais críticos foram:

- Garantir consistência do ledger em swaps (origem, taxa e destino) sem quebrar o saldo
- Evitar duplicidade no depósito com idempotencyKey
- Tratar validações de saldo e erro de token/usuário de forma clara
- Reduzir dependência de API externa com cache

## Autor

Gabriel Gonçalves
