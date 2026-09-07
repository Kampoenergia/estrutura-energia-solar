# Atualização v1.2 — Render existente + Neon

- Reutilização do serviço pago `simulekampo`, sem novo serviço nem disco.
- Banco PostgreSQL externo, com base inicial vazia e sem migração do Kampo.
- Gravações transacionais e confirmação somente após commit; proteção contra sobrescritas concorrentes.
- Versão anterior e sete backups diários lógicos no mesmo banco; restauração por JSON.
- Produção exige DATABASE_URL e senha forte; não usa arquivo efêmero como alternativa.
- 40 testes locais aprovados; conexão com o Neon real e implantação ainda pendentes.
- Guia atual em REAPROVEITAR-RENDER.md. O Blueprint de criação de serviço pago foi retirado.

---

## Histórico anterior

# Atualização mais recente: estimativas e tráfego pago

A última revisão aprovada pelo usuário prevalece sobre o histórico abaixo:

- Resultado público com economia e retorno simples estimados e parcela “a partir de”. Sem total do sistema nem quantidade de painéis.
- Novo Meta Pixel: `1425129716157804`.
- Google Ads: `AW-17289607771`, rótulo `SJlgCKvclvAcENv0qbRA`.
- Conversão após confirmação de salvamento do formulário; WhatsApp separado; consentimento opcional para medição.
- Configuração incluída no projeto e no modelo Render. Ativação, publicação e validação externa pendentes.
- 30 testes locais aprovados, incluindo testes simulados de consentimento e destino da conversão.
- Instruções atuais em `TRAFEGO-PAGO.md`.

---

## Histórico da primeira revisão (algumas decisões foram substituídas acima)

# Revisão v1.1 · 07/09/2026

## Escopo solicitado

Revisão de visual, painel, segurança e preparação de hospedagem. Na página pública, resultado depois dos dados, sem números comerciais exatos e sem redirecionamento automático ao WhatsApp. Sugestões de metodologia antes de alterar fórmulas.

## Implementado

- Redesenho responsivo da página pública, login e painel, preservando azul/laranja e os dados fornecidos.
- Separação entre pré-análise qualitativa pública e cálculos legados internos.
- Remoção de estimativas financeiras/técnicas da resposta pública e da mensagem de WhatsApp.
- Formulário com autorização de contato, validação, estados de envio/erro e correção da digitação do valor da conta.
- UTMs e identificação de origem recebidas no servidor.
- Dashboard real, sem estatísticas de demonstração ou leads fictícios na base de operação.
- Cadastro manual, filtro, agendamento de retorno, histórico, fatura, edição, exclusão e exportação da seleção.
- Backups JSON completos; gravação atômica e proteção de arquivo corrompido.
- Sessões aleatórias e revogáveis, limitação de tentativas, validação de origem, URLs seguras e proteção de CSV contra fórmulas.
- Correção de reenvios: preservar aquisição, atribuição inicial, etapa e temperatura manual.
- Correção de telefones nacionais com DDD 55.
- Atualização da dependência transitiva sinalizada pelo npm audit, sem alterar a stack Express.
- Modelo de hospedagem com volume persistente, documentação e testes automatizados.

## Como conferir o fluxo principal

1. Abra `/captar` e confira o formulário antes do resultado.
2. Digite a conta normalmente, selecione imóvel e preencha dados de teste.
3. Autorize o contato e envie.
4. Confira a orientação sem preço, painéis, economia, parcela ou retorno definidos.
5. Aguarde: a página deve permanecer aberta. O WhatsApp só deve abrir pelo botão.
6. Revise a mensagem: deve conter dados de entrada e pedido de análise, não as estimativas internas.
7. Entre no painel e localize o contato. Defina etapa, temperatura e próximo contato.
8. Reenvie o mesmo telefone pela página pública. Confirme que não houve duplicação ou reinício de etapa/data de criação.
9. Confira filtros, CSV e backup.
10. Exclua os contatos de teste antes de iniciar o atendimento real, considerando também sua política de backups.

## Ainda depende de decisão ou configuração

- Imagens originais da marca.
- Aprovação de novas regras de cálculo (não implementadas).
- Hospedagem externa, domínio, disco e rotina de backup externo.
- Validação operacional do texto de privacidade.
- Avaliação de banco de dados/múltiplos usuários para uma etapa de crescimento.

As integrações de fontes públicas possuem tratamento de indisponibilidade. Testes automatizados de integração usam respostas simuladas; isso não garante que esses serviços responderão em uma publicação específica.
