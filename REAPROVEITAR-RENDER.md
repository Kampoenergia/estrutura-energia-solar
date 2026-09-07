# Estrutura Energia Solar v1.2 — Render existente + Neon

## Decisão confirmada

- Reutilizar o serviço Node pago `simulekampo`, sem criar outro serviço e sem adicionar disco.
- Usar um projeto PostgreSQL no Neon Free, respeitando os limites do plano.
- Começar com uma base vazia. O usuário não precisa migrar os contatos antigos.
- Preservar o repositório antigo do Kampo. A troca de código será feita apontando o Render para um novo repositório.

**O site Kampo será substituído quando a nova versão for implantada. Até agora, nenhuma alteração externa foi realizada por esta entrega.**

Este pacote substitui `estrutura-energia-solar-publicacao.zip`. Não siga o procedimento antigo de criar um serviço/Blueprint ou adicionar disco. Não há `render.yaml` neste pacote para evitar a criação acidental de recursos pagos.

## 1. Criar o banco gratuito

1. Acesse `https://neon.com` e crie/acesse sua conta.
2. Mantenha o plano **Free**. Não contrate Launch, Scale ou outros planos pagos.
3. Crie um projeto novo, por exemplo `estrutura-energia-solar`, separado de outros negócios.
4. Se disponível, prefira uma região próxima do Render atual, que está em Ohio (US East). Se as opções forem diferentes, confira a lista antes de escolher.
5. As tabelas serão criadas automaticamente pela aplicação. Não é necessário colar SQL para iniciar uma base vazia.
6. A conexão PostgreSQL do Neon será colocada **diretamente na variável `DATABASE_URL` do Render**. Ela contém uma senha: não envie a string no chat, em prints ou ao GitHub.

O plano Free tem limites de armazenamento e processamento. Monitore o uso. A escolha dele não promete capacidade ilimitada ou disponibilidade garantida.

## 2. Preparar um repositório novo

Baixe e extraia `estrutura-solar-render-existente-neon.zip`.

No GitHub, crie um repositório novo, preferencialmente privado. Envie o conteúdo extraído: `server.js`, `package.json`, `package-lock.json`, `lib/`, `public/`, `scripts/`, `tests/` e documentos devem ficar na raiz.

Não envie o ZIP como se fosse o código. Não envie `.env`, senhas, dados de clientes ou `node_modules`. Não sobrescreva o repositório `Kampoenergia/simulekampo`.

## 3. Configurar o mesmo serviço Render, de forma coordenada

Antes de alterar a origem, registre para possível retorno os valores atuais de Source, Branch, Root Directory, Build Command e Start Command. Não clique em Delete, New Service, Blueprint ou Add Disk.

Na troca, usaremos:

- **Source:** o novo repositório da Estrutura.
- **Branch:** a branch que contém os arquivos enviados.
- **Root Directory:** vazio, se `package.json` estiver na raiz. Não manter a pasta do repositório antigo.
- **Build Command:** `npm ci --omit=dev`.
- **Start Command:** `npm start`.
- **Health Check:** `/healthz`.
- **Instance Type:** manter a instância paga atual; não contratar uma segunda.

Variáveis no Render:

| Chave | Valor |
|---|---|
| `NODE_VERSION` | `24` |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Conexão do projeto Neon, inserida diretamente na hospedagem |
| `PANEL_SENHA` | Senha exclusiva, longa, com pelo menos 16 caracteres; não usar exemplos |
| `TRUST_PROXY` | `1` |
| `PREVIEW_MODE` | `0` |
| `ADS_TRACKING_ENABLED` | `false` durante a primeira verificação |
| `META_PIXEL_ID` | `1425129716157804` |
| `GOOGLE_ADS_ID` | `AW-17289607771` |
| `GOOGLE_ADS_LEAD_LABEL` | `SJlgCKvclvAcENv0qbRA` |
| `GOOGLE_ADS_WHATSAPP_LABEL` | Vazio; não reutilizar o rótulo de lead |

`DATA_DIR` não é utilizado para gravar contatos nesta produção PostgreSQL. `SITE_URL` é opcional; se configurado, use a origem exata que os visitantes acessarão. Não mantenha uma origem de outro domínio.

**Não publique com as configurações incompletas.** Esta versão se recusa a iniciar em produção sem o banco e sem uma senha apropriada; não cai silenciosamente em arquivos efêmeros.

## 4. Verificar a implantação antes de anunciar

- Conferir os logs da implantação, sem compartilhar credenciais.
- Abrir o endereço atual do serviço com **`/captar`**: essa é a página pública e o destino dos anúncios. A raiz é o painel e pode redirecionar para o login.
- Entrar por `/login`, cadastrar um contato de teste e conferir o registro.
- Reiniciar/republicar de forma controlada e confirmar que o contato continua no banco.
- Conferir celular, backup e acesso protegido.
- Confirmar dados da empresa, privacidade e condições financeiras anunciadas.
- Depois ligar `ADS_TRACKING_ENABLED=true` e validar eventos no Meta e no Google.

Não houve teste de conexão com seu projeto Neon real, mudança de configuração no Render nem confirmação de recebimento de eventos nas plataformas. Isso será conferido após você criar e configurar os recursos na sua conta.

## Backups e recuperação

O banco armazena os contatos em JSONB, em tabelas exclusivas da Estrutura. As alterações usam transação e bloqueio para evitar sobrescritas concorrentes. A confirmação do formulário só é devolvida depois do commit.

São mantidas uma versão anterior e até sete cópias diárias lógicas no próprio banco. Essas cópias também ocupam espaço do plano e **não substituem uma cópia externa segura**.

Baixe regularmente o backup JSON completo no painel. Para restaurá-lo, pare as gravações da aplicação e, em um ambiente seguro com `DATABASE_URL` configurada, use:

```bash
node scripts/restore-backup.js arquivo.json --confirmar
```

Isso substitui a base atual e mantém uma cópia anterior no banco. Não use esse comando sem conferir o arquivo e a intenção de substituir os registros.

## Limites e testes

40 testes locais foram aprovados. Os testes PostgreSQL usam uma instância local PGlite; não usam sua conta Neon. As tags de anúncios são testadas com bibliotecas simuladas, sem enviar eventos reais.

O formato JSONB preserva a compatibilidade do projeto e serializa as gravações; não foi feita validação de carga para alto volume. Caso a base cresça, avalie armazenamento por lead e a capacidade do plano.

As fórmulas não foram alteradas. O público vê economia, retorno simples e parcela estimados, mas não o total do sistema nem a quantidade de painéis. As imagens originais continuam pendentes.
