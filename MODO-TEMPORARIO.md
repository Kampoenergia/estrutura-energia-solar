# Atualização: sem Neon e sem disco

O modo padrão agora é `memory`: contatos e alterações ficam somente na memória do processo. Não há gravação automática em banco, arquivos ou backups persistentes. Reiniciar ou republicar o servidor perde esses registros.

Simulador, cálculos, WhatsApp, login, painel, filtros, edição, exportação e integrações de anúncios foram preservados. Exportações feitas voluntariamente pelo consultor ainda podem ser baixadas para seu computador.

## Aplicar esta atualização

1. Extraia `atualizacao-sem-neon-sem-disco.zip`.
2. Envie o conteúdo para a branch `atualizacao-neon` de `Kampoenergia/estrutura-energia-solar`, mantendo os caminhos das pastas.
3. Confirme as alterações nessa branch. Não excluir os demais arquivos nem criar outro serviço.

O nome da branch pode continuar `atualizacao-neon`; ele não determina o armazenamento usado.

O servidor utiliza memória por padrão. `STORAGE_MODE=memory` pode ser informado explicitamente para garantir essa escolha. Nesse modo, `DATABASE_URL` e `DATA_DIR` não são utilizados, mesmo se ainda existirem no ambiente. Nenhuma credencial ou configuração da sua conta Render foi removida ou alterada nesta entrega.

A senha do painel continua necessária em produção para proteger os contatos temporários. Deve ser exclusiva, ter pelo menos 16 caracteres e ser configurada diretamente na hospedagem. Não envie senhas em fotos ou no chat.

Não criar banco, disco ou serviço adicional. A instância Render já contratada continua com sua cobrança normal e limites de uso.

## Validação

Três testes direcionados passaram: operações em memória com rollback/concorrência, inicialização sem conexão de banco e fluxo de captura/resultado/painel/edição/exportação. Os modos anteriores permanecem disponíveis explicitamente; o teste que exige conexão PostgreSQL foi ajustado para selecionar esse modo.

Esta atualização foi validada localmente. Não foi publicada no Render. Antes da publicação ainda precisamos conferir Source, Branch, Root Directory e as configurações de produção do serviço existente.

A credencial do Neon anteriormente compartilhada deve ser invalidada na conta, mesmo que o banco não seja mais utilizado. Nenhuma conexão foi feita usando essa credencial.
