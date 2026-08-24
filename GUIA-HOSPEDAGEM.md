# Estrutura Energia Solar — guia rápido de hospedagem

## O que este projeto tem

- Landing pública em `/captar`, com simulador preliminar de energia solar.
- Captura de nome, WhatsApp, cidade, tipo de imóvel e conta média.
- Abertura automática do WhatsApp comercial com uma mensagem preenchida.
- Painel protegido por senha em `/`.
- Prospecção de empresas, galpões, supermercados, condomínios e outros perfis no OpenStreetMap.
- Funil com etapas, observações, score, pitch, WhatsApp e exportação CSV.
- Consulta opcional de CNPJ por fontes públicas.

## Dados configurados

- Marca: **Estrutura Energia Solar**
- Região: **Guaramirim, Jaraguá do Sul, Joinville e região**
- WhatsApp de atendimento: **(47) 98902-2728**
- Endereço público encontrado: **Rua 28 de Agosto, 682 — Centro, Guaramirim/SC**
- Senha local padrão do painel: **estrutura2026**

> Para trocar a senha no Render, crie/edite a variável `PANEL_SENHA` em Environment.

## Rodar no computador

Na pasta do projeto:

```bash
npm install
npm start
```

Depois abra:

- Público: `http://localhost:3000/captar`
- Painel: `http://localhost:3000/`

## Publicar no Render

1. Crie um repositório novo no GitHub, por exemplo `estrutura-energia-solar`.
2. Envie para a raiz do repositório os arquivos `server.js`, `package.json`, esta pasta `public` e este guia.
3. No Render, crie um **Web Service** conectado ao repositório.
4. Use:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Em **Environment**, opcionalmente crie `PANEL_SENHA`.
6. O link público dos clientes será o link do Render seguido de `/captar`.

### Atenção no GitHub

Ao arrastar a pasta pública, abra a pasta extraída até enxergar `server.js`, `package.json` e `public`. Se enviar apenas a pasta pai, o GitHub pode criar caminhos errados como `agente leads/public/...`. O correto é aparecer `public/captar.html`, `public/index.html` e `public/img/...`.

## Como os números são calculados

- Valor estimado do sistema: quantidade estimada de placas × **R$ 1.500**.
- Parcela exibida: financiamento de até **72 meses**, sem entrada, calculado pela menor condição interna cadastrada e apresentado ao cliente como **“a partir de”**.
- Parcela exibida: o cliente vê apenas o valor estimado da parcela do financiamento, em até 72 meses.
- Payback: valor estimado do sistema ÷ economia mensal estimada, mostrado em meses e anos.

Os números são uma estimativa inicial para gerar uma conversa comercial. Não são uma proposta nem uma garantia de economia, quantidade de placas, investimento ou payback. A proposta definitiva deve considerar a fatura, a insolação, o telhado/solo, estrutura, equipamentos, instalação, tarifa e análise técnica.

## Armazenamento no Render gratuito

Os leads ficam em `data/leads.json`. Em hospedagens gratuitas, o disco pode ser reiniciado em uma nova publicação ou em determinados reinícios. Exporte o CSV com frequência até configurar armazenamento persistente ou um banco de dados.
