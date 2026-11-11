# Restauração do catálogo Skinão Veículos

## Resultado
- Preservar o painel `/admin` sem tela de login, temas e todos os controles de cadastro e fotografias.
- Acrescentar “Desbloquear edição” dentro do painel. Alterações reais exigem autorização no servidor; sem configuração, manter o estoque local claramente identificado como não publicado.
- Restaurar catálogo público, busca, filtros, ordenação, paginação e detalhes, exibindo somente anúncios publicados disponíveis/reservados. Os seis exemplos continuam ilustrativos e aparecem apenas sem conexão configurada ou sem anúncios publicados.
- Guardar originais e recortes no bucket existente, com upload autorizado e exclusão segura, sem credenciais no navegador.

## Dependências pendentes
Não há conexão Neon disponível nem credenciais de armazenamento/administração configuradas neste projeto. Preparar e testar tudo que não depende dessas credenciais; não criar outro banco nem inventar valores.

O proprietário deve criar a conexão do banco `skinao` do projeto `wispy-fire-71183672` em:
https://lovable.dev/connectors/neon/connect?workspace=4b09fa94051e554b9e65

As credenciais S3 e a chave escolhida de administração serão adicionadas em Project Settings → Secrets. A documentação indicará os nomes e a configuração necessária.

## Detalhes técnicos
- Usar `createServerFn` do TanStack Start. O acesso ao Neon deve passar pelo conector oficial; esta plataforma exige esse caminho em vez de `pg`/`DATABASE_URL` direto. Documentar explicitamente essa diferença.
- Usar queries parametrizadas nas tabelas existentes; não executar DDL nem alterar índices sem inspeção da conexão disponível.
- Validar entradas, publicação e todas as operações de galeria no servidor. Guardar autorização em sessão criptografada HttpOnly, com chave de sessão distinta gerada pela plataforma; comparar a chave administrativa com comparação timing-safe.
- Usar AWS SDK S3 exclusivamente no servidor com endpoint, região, credenciais e `forcePathStyle: true`; autorizar antes de assinar uploads, conferir arquivos e referências antes de cadastrar/remover fotos.
- Separar o adaptador local do remoto: falhas remotas não devem silenciosamente salvar no navegador. Não migrar nem publicar exemplos automaticamente.
- Substituir chamadas antigas ao serviço removido, mantendo os componentes de recorte e ajustes existentes.

## Verificação
- Testes de publicação, exclusão/transformação de fotos, filtros e autorização negada.
- Executar os testes pertinentes; verificar os resultados automáticos de compilação e testar painel e catálogo no navegador, incluindo celular.
- A publicação real e o upload S3 só poderão ser verificados de ponta a ponta após conexão e credenciais válidas. Registrar essa limitação e todas as instruções no README.