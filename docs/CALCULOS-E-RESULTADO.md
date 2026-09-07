# Resultado público e cálculos internos

## Apresentação aprovada na última revisão

O visitante preenche os dados antes de ver a simulação. O resultado mostra:

- Economia mensal e anual estimada.
- Prazo de retorno simples aproximado.
- Parcela estimada com **“A partir de R$ …/mês”** em destaque e prazo de referência.

O total do sistema, a quantidade de painéis e a potência não aparecem na resposta pública nem na mensagem do WhatsApp. O WhatsApp abre somente por clique; nenhuma mensagem é enviada automaticamente.

Para uma conta informada de R$ 700/mês, os parâmetros atuais produzem R$ 640/mês de economia estimada, parcela de referência de R$ 522,67 em 72 meses e retorno simples de aproximadamente 33 meses. Esses valores são resultados de uma fórmula simplificada, não uma proposta validada.

A parcela e as condições finais dependem da análise e aprovação aplicáveis. O retorno simples não considera juros do financiamento nem outros custos. A empresa deve confirmar as condições comerciais antes de anunciar a expressão “a partir de”.

## Regras antigas preservadas, sem recalibração

O arquivo `lib/solar.js` mantém as fórmulas do servidor enviado:

- Conta mínima considerada: R$ 150.
- Tarifas de referência por perfil: residencial 0,82; comercial 0,86; industrial 0,95; rural 0,86 R$/kWh.
- Painéis: arredondamento da conta em reais dividido por 50, mínimo de 3.
- Potência nominal por painel: 550 W.
- Preço de referência: R$ 1.500 por painel.
- Conta residual simplificada: R$ 60.
- Economia de referência: conta menos residual, sem modelo energético/regulatório completo.
- Financiamento de referência: fórmula de prestação fixa, taxa interna de 1,8% ao mês e prazo de 72 meses.
- Retorno simples: investimento dividido pela economia mensal, sem juros, manutenção, reajustes, degradação ou outras despesas.

**Preservação não é validação.** Os testes conferem que a refatoração não alterou essas regras, não que elas representam uma proposta correta.

## Melhorias que recomendo avaliar antes de mudar os cálculos

| Tema | Limitação atual | Próxima decisão recomendada |
|---|---|---|
| Consumo | Estimado pelo valor da conta e tarifa fixa | Ler o consumo histórico em kWh e a composição da fatura |
| Dimensionamento | Painéis proporcionais ao valor em reais | Modelo com irradiação, orientação, inclinação, sombreamento, perdas e limites da instalação |
| Conta remanescente | R$ 60 para qualquer cenário | Considerar modalidade tarifária, custos mínimos/demanda, tributos e regras aplicáveis |
| Investimento | Valor fixo por painel | Orçamento separado de equipamentos, inversores, estrutura, instalação, projeto e eventuais adequações |
| Financiamento | Uma taxa e um prazo internos | Usar condições efetivamente disponíveis; informar custos, CET e aprovação na proposta aplicável |
| Retorno | Payback simples sem despesas adicionais | Incorporar custos relevantes e documentar as premissas; não chamar de garantia |
| Estabelecimentos prospectados | Consumo presumido pelo segmento | Não tratar estimativa de segmento como fatura ou consumo confirmado |

Esses parâmetros devem ser aprovados pela empresa e pelo responsável técnico, com revisão das condições comerciais e regras vigentes. **Nenhuma dessas novas metodologias foi implementada sem sua aprovação.**

## Separação entre atendimento e proposta

No CRM, as referências completas ficam recolhidas em “Referência de cálculo · uso interno”. Total do sistema, quantidade de painéis e potência permanecem internos. O público recebe somente economia, retorno e parcela estimados. A exportação CSV identifica as colunas internas; não use o arquivo como orçamento.

Os dados de interesse, etapa, retorno agendado, fatura recebida e histórico são independentes dessa referência. É possível atender o lead e preparar uma proposta manual sem se vincular aos números antigos.
