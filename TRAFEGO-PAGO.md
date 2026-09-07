# Estrutura Energia Solar — configuração de tráfego pago

## Estado desta entrega

**Meta e Google Ads estão configurados no código. A publicação, a ativação e a confirmação de recebimento nas plataformas ainda estão pendentes.**

| Configuração | Valor confirmado pelo usuário |
|---|---|
| Pixel da Meta | `1425129716157804` |
| Google Ads | `AW-17289607771` |
| Rótulo da conversão do formulário | `SJlgCKvclvAcENv0qbRA` |
| Destino completo da conversão | `AW-17289607771/SJlgCKvclvAcENv0qbRA` |

O Pixel “Eduardo” não é utilizado. Nenhuma nova ação de conversão foi criada no Google Ads. Os identificadores informados são reutilizados; o código não acessa nem altera suas contas de anúncios.

## O que será medido quando ativado

- **Meta PageView:** carregamento da integração após permitir a medição.
- **Meta Lead e conversão do Google Ads:** formulário confirmado como salvo pelo servidor.
- **Meta WhatsAppClick:** clique no WhatsApp, separado do evento Lead.
- **WhatsApp no Google Ads:** não configura uma segunda conversão por enquanto. Seria necessário um rótulo separado em `GOOGLE_ADS_WHATSAPP_LABEL`; não reutilize o rótulo de lead para isso.

O mesmo identificador opaco de evento é usado para reduzir duplicação do mesmo lead. O navegador lembra eventos recentes após consentimento. Isso não garante deduplicação ilimitada em todos os dispositivos ou nos relatórios externos.

Os eventos configurados não incluem nome, telefone, conta de luz, economia, investimento nem o endereço completo do WhatsApp com a mensagem preenchida. Uma simulação não é uma compra; não foi atribuído um valor de receita à conversão.

## Ativação no endereço definitivo

1. Publique a versão atualizada, preservando os leads existentes e usando armazenamento persistente.
2. Confirme que o endereço pertence à Estrutura Energia Solar e funciona com HTTPS.
3. Configure a senha forte do painel e as variáveis abaixo na hospedagem:

```dotenv
NODE_ENV=production
PREVIEW_MODE=0
ADS_TRACKING_ENABLED=true
META_PIXEL_ID=1425129716157804
GOOGLE_ADS_ID=AW-17289607771
GOOGLE_ADS_LEAD_LABEL=SJlgCKvclvAcENv0qbRA
GOOGLE_ADS_WHATSAPP_LABEL=
```

4. Ajuste `SITE_URL` para a origem definitiva, se for usar essa restrição. Ajuste `TRUST_PROXY` conforme a infraestrutura; o modelo Render usa `1`.
5. Salve as configurações e reinicie/republique o serviço.
6. Valide os eventos **antes de investir em anúncios**.

O `.env.example` e a configuração do aplicativo já contêm os IDs, mas mantêm `ADS_TRACKING_ENABLED=false` para evitar disparos acidentais. O modo de prévia e o ambiente de desenvolvimento bloqueiam as tags, mesmo que a variável de ativação esteja ligada.

A implantação atual reutiliza o serviço Render já pago e um banco Neon Free. Não adicionar disco nem criar outro serviço. Siga `REAPROVEITAR-RENDER.md`; `DATABASE_URL` é obrigatória em produção. Nenhuma contratação, implantação externa ou compra de mídia foi realizada por esta entrega.

## Consentimento

As bibliotecas externas só carregam após o visitante permitir a medição. A autorização de contato do formulário é separada dessa escolha. Recusar a medição não impede usar o simulador ou enviar a solicitação.

O Google recebe os estados de Consent Mode; armazenamento publicitário e uso de dados para medição dependem da permissão. Personalização e armazenamento de Analytics permanecem negados nesta configuração. Não foi instalado GA4, nem foram configuradas conversões otimizadas com dados do usuário ou a API de Conversões da Meta.

A preferência é lembrada por até 180 dias. Ao revogar após o carregamento das tags, a página é recarregada para encerrar as bibliotecas. O aviso de recarga aparece antes da decisão. A empresa deve revisar o texto de privacidade, finalidade, retenção e processo de atendimento dos titulares antes de publicar; a implementação técnica não substitui essa revisão.

## Conferência em produção

- Abra a página sem consentimento prévio: as tags não devem carregar.
- Recuse a medição e confirme que o formulário continua funcionando.
- Abra as preferências e permita a medição: confira o Pixel correto no Meta Pixel Helper e no Gerenciador de Eventos.
- Use o Google Tag Assistant para verificar o destino completo da conversão.
- Envie um formulário válido: confira o registro no CRM, o evento Lead e a conversão do Google.
- Tente enviar com dados inválidos: não deve aparecer uma conversão de lead.
- Clique no WhatsApp: não deve gerar outra conversão principal do formulário.
- Confirme no Google Ads que a ação existente representa envio de formulário. Recomenda-se usá-la como ação principal de lead e revisar a opção de contagem com o responsável pelas campanhas.
- Não instale as mesmas tags também pelo Google Tag Manager ou por uma ferramenta automática de eventos; isso pode duplicar a medição.

Na console do navegador, `estruturaAdsStatus()` informa o estado local de consentimento, bibliotecas e tentativas. **Isso não comprova que Meta ou Google receberam ou atribuíram o evento.** Bloqueadores, restrições do navegador e configurações das contas podem afetar a medição.

Os 40 testes locais incluem testes de configuração e testes com navegador simulado, sem requisições às plataformas. A validação externa ainda deve ser feita no endereço publicado.

## Links de campanha

Exemplos de parâmetros para acrescentar ao endereço `/captar`:

```text
?utm_source=meta&utm_medium=paid_social&utm_campaign=solar_joinville&utm_content=anuncio_01
?utm_source=google&utm_medium=cpc&utm_campaign=solar_joinville&utm_content=anuncio_01
```

Troque os nomes conforme cada campanha. Não coloque nomes, e-mails ou telefones em URLs/UTMs. As UTMs podem acompanhar o formulário no CRM; identificadores individuais de clique só são armazenados com permissão de medição.

## Simulador e anúncios

O resultado aprovado mantém economia e retorno simples estimados, além da parcela com “a partir de”. Total do sistema, quantidade de painéis e potência não são expostos no resultado público.

Antes de anunciar condições financeiras, confirme que os valores de referência, a expressão “a partir de” e as condições de financiamento podem ser sustentados pela empresa e pelo fornecedor de crédito. As fórmulas legadas não foram validadas tecnicamente nesta integração de tags.
