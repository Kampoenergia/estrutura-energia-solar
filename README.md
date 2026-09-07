# Estrutura Energia Solar — v1.2

Versão adaptada para reutilizar o serviço Render pago existente com PostgreSQL no Neon, sem contratar outro serviço ou disco. Os arquivos originais enviados foram preservados.

**Guia atual: `REAPROVEITAR-RENDER.md`.** Não aplicar o procedimento antigo de criar um Blueprint ou adicionar disco. A criação da conta Neon, a conexão real e a implantação externa ainda estão pendentes.

## Executar localmente

Requer Node 20.12+; a hospedagem será configurada com Node 24.

```bash
npm ci
npm test
npm start
```

Em desenvolvimento, sem `DATABASE_URL`, o aplicativo usa JSON local. A senha de demonstração continua `estrutura2026`; nunca use essa senha em produção. `/captar` é a página pública, `/login` é o acesso do consultor e `/` é o painel protegido.

Em produção, são obrigatórios `DATABASE_URL` e `PANEL_SENHA` forte. A aplicação aguarda a inicialização do banco e não confirma cadastros sem persistir os dados. As credenciais devem ficar no ambiente da hospedagem, não no código ou no chat.

## Funcionalidades

- Simulação após os dados, com economia e retorno simples estimados e parcela “a partir de”. Sem total do sistema nem quantidade de painéis na resposta pública.
- WhatsApp opcional, somente por clique, sem envio automático.
- CRM com filtros, etapas, temperatura, agendamento, histórico, exportação CSV e backup JSON.
- Prospecção OpenStreetMap e consulta de CNPJ numérico, sujeitas à disponibilidade externa.
- Sessões aleatórias, limites de requisições, validação, escrita transacional no PostgreSQL e proteção de CSV.
- Meta Pixel e Google Ads com consentimento separado do contato, conversão após salvamento e WhatsApp separado. Ativação desligada por padrão.
- Em PostgreSQL: versão anterior e sete backups diários lógicos no mesmo banco. Mantenha cópia externa.

## Verificação

40 testes locais aprovados, incluindo PostgreSQL local via PGlite, transações, concorrência, falhas de gravação e consentimento de anúncios. Isso não comprova o funcionamento no Neon/Render reais ou a recepção dos eventos pelos provedores. Teste a implantação antes de anunciar.

## Documentos

- `REAPROVEITAR-RENDER.md`: implantação vigente e recuperação.
- `TRAFEGO-PAGO.md`: identificadores e validação da medição.
- `docs/CALCULOS-E-RESULTADO.md`: premissas legadas e sugestões sem alteração de fórmulas.
- `public/img/README.md`: imagens originais ainda pendentes.

A hospedagem continuará usando o serviço já pago pelo usuário. O Neon Free tem limites de uso; não é capacidade ilimitada. Nenhum recurso ou campanha foi contratado, publicado ou ativado por esta entrega.
