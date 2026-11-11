# SkinaoVeiculos

olá

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ed6f6a2f-2503-4474-be51-66c8866298b2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Painel e catálogo — integração Neon (novembro de 2026)

O painel `/admin` preserva cadastro e edição de veículos (marca, modelo, versão, ano,
quilometragem, cor, preço, descrição, opcionais, status, destaque e publicação),
upload de até 8 MB por foto, galeria, imagem de capa, edição do enquadramento,
recorte com arquivo derivado, restauração do original e organização das fotos.

**Login de administradores gerenciado no Neon.** A tela `/admin` contém
somente **Usuário**, **Senha**, botão de **mostrar/ocultar senha** e **Entrar**.
Não possui cadastro de contas aberto ao público.

As credenciais de cada administrador estão na tabela `skinao_admin_users`
do banco `skinao`, protegidas por hashes bcrypt do `pgcrypto`. A Vercel
não é mais a fonte de usuários ou senhas. O servidor continua usando as variáveis
de infraestrutura `DATABASE_URL` e `SKINAO_SESSION_SECRET` para acessar
a base e assinar o cookie de sessão, independentemente do provedor de hospedagem.

Colunas principais:
- `username`: login único, em letras minúsculas;
- `password_hash`: apenas o hash bcrypt (`crypt` e `gen_salt('bf',12)`),
  nunca a senha em texto puro;
- `is_active`: se o login está autorizado;
- `credential_version`: aumente ao mudar usuário/senha ou revogar sessões.

O servidor valida usuário e senha em consulta parametrizada ao Neon e verifica
`is_active` e `credential_version` em toda requisição de edição. A sessão
é HttpOnly, Secure e SameSite=Strict, válida por até 7 dias, e pode ser encerrada
com **Sair**. O limite de tentativas permanece na tabela
`skinao_admin_login_limits`.

**Definir nome de usuário e senha pelo Neon Console:**

1. Em [console.neon.tech](https://console.neon.tech), selecione
   `SkinaoVeiculos` → **Postgres database → SQL Editor**.
2. Escolha a branch `main` e o banco `skinao`.
3. Execute a consulta abaixo, substituindo `meuusuario` e
   `SENHA_NOVA_FORTE_AQUI`:

```sql
UPDATE skinao_admin_users
SET username = 'meuusuario',
    password_hash = crypt('SENHA_NOVA_FORTE_AQUI', gen_salt('bf', 12)),
    credential_version = credential_version + 1
WHERE username = 'admin';
```

4. Confira **somente** os metadados, sem selecionar `password_hash`:

```sql
SELECT username, is_active, updated_at
FROM skinao_admin_users;
```

5. Acesse `https://skinaoveiculos.vercel.app/admin` usando seu novo
   nome e senha. Se já mudou o nome anteriormente, altere também o
   `WHERE username = '...'` para o nome atual.

**Cuidado:** o SQL Editor da Neon mantém histórico de consultas. O comando
acima inclui a senha na consulta e, portanto, pode aparecer nesse histórico.
Não compartilhe o histórico, não salve a consulta como modelo e, quando possível,
prefira executar a alteração por um formulário seguro ou um cliente SQL com
parâmetros de consulta. Senhas nunca devem ser salvas no código-fonte.

### Equipe e acessos — funcionários cadastrados pelo painel

O item **Armazenamento** do menu foi substituído por **Equipe e acessos**.
O administrador principal existente foi preservado como `owner`; seus
dados e senha não mudaram. Na página ele aparece como **Administrador principal**.

O proprietário pode, sem abrir Neon ou alterar variáveis na hospedagem:

1. Abrir **Equipe e acessos → Adicionar funcionário**.
2. Informar um endereço de e-mail válido (Gmail, Outlook, domínio próprio etc.).
3. Definir uma senha inicial com 12 a 72 caracteres, contendo letras e números.
4. Clicar em **Criar acesso**. A conta nasce ativa imediatamente.
5. Enviar o e-mail e a senha ao funcionário por canal privado. O funcionário
   entra em `/admin` normalmente; não existe registro público no login.
6. Na lista, **Suspender**, **Reativar** ou **Alterar senha** do funcionário.

O cadastro usa bcrypt com `pgcrypto` **somente no servidor**. Nenhuma senha
em texto puro é guardada no banco ou devolvida ao navegador. As consultas são
parametrizadas e exigem uma sessão ativa do `owner`.

Permissões:
- **owner**: gerencia funcionários e todas as operações do estoque;
- **staff**: cadastra e edita veículos, fotografias e publicações;
  **não** gerencia outras contas e **não** exclui veículos definitivamente.
- A suspensão e a troca de senha incrementam `credential_version`, revogando
  sessões antigas. A conta do proprietário não pode ser suspensa por essas APIs.

As tabelas continuam no projeto Neon existente: `skinao_admin_users` agora
tem as colunas `role` e `last_login_at`. A migração que já foi aplicada está
versionada em `db/migrations/20261111_team_access.sql`.
Há limite de 30 contas de funcionários e a criação de um e-mail já cadastrado
é rejeitada, inclusive se a conta estiver suspensa. Contas desativadas ficam
preservadas e podem ser reativadas sem perda de dados.

**Importante:** usar um e-mail como login não cria uma caixa postal nem envia
automaticamente credenciais ao funcionário; o proprietário deve fornecê-las
por um canal seguro. Os acessos são gerenciados no próprio painel sem configurar
a Vercel para cada funcionário. A hospedagem continua executando a aplicação.

### Banco de dados já provisionado

- Projeto Neon: `SkinaoVeiculos` (`wispy-fire-71183672`).
- Banco PostgreSQL: `skinao`, branch `main`.
- Tabelas: `vehicles` e `vehicle_images`, com fotos relacionadas por `vehicle_id`.
- Neon Object Storage: bucket `vehicle-images` com leitura pública e escrita autenticada.
- O código original do banco Supabase foi substituído por TanStack Start server functions,
  que usam `@neondatabase/serverless` e o SDK S3 somente no servidor.

**Atenção:** o repositório não contém as antigas linhas do banco removido.
Em 11/11/2026 foram importados **6 veículos demonstrativos e 13 referências de
imagens** diretamente da vitrine existente: Polo, Onix, Compass, Strada, Corolla
e Ranger. Marca, versão, ano, KM, preço, opcionais e fotos foram preservados.
Os registros usam `is_demo=true` e `demo_source_id=1..6`. O Jeep Compass,
excluído durante um teste, foi recuperado em 11/11/2026 com as duas fotos e
informações originais, sem afetar os outros registros.
Os seis exemplos foram marcados como publicados para refletir a vitrine que
já aparecia no site. No painel, **Publicar** e **Despublicar** são ações
independentes com confirmação. Despublicar define `is_published=false`, mantém
dados/fotos no Neon e oculta o veículo no catálogo; Publicar define
`is_published=true` e restaura sua visibilidade. A listagem de veículos
possui os controles **Publicar / Despublicar / Editar (lápis) / Excluir (lixeira)**,
nessa ordem. **Excluir definitivamente** exige uma confirmação em destaque e
digitar a palavra `EXCLUIR`; o endpoint é autorizado no servidor. A exclusão
remove o veículo do PostgreSQL, elimina as referências via CASCADE e tenta apagar
do S3 apenas os arquivos pertencentes ao bucket da loja. Falhas na limpeza
de objetos são reportadas, sem esconder que o cadastro já foi excluído.
A exclusão de fotografia individual também permanece com aviso.

O catálogo só lê os exemplos `is_demo=true AND is_published=true` quando
não há veículos reais publicados: **editar um exemplo visível no painel atualiza
a vitrine ilustrativa**. Quando existem veículos reais publicados, eles
substituem a vitrine de demonstração. Um exemplo não pode virar anúncio real
sem trocar as imagens ilustrativas por fotografias reais.

As imagens de exemplo são referências às URLs originais do Unsplash, **não
cópias físicas no bucket**. Ao cadastrar fotos reais ou salvar recortes, os
novos arquivos são armazenados no bucket Neon `vehicle-images`.
O site original não possui descrição individual desses seis veículos; esses
campos foram importados vazios, sem dados inventados. A importação é idempotente
e não deve sobrescrever futuras edições feitas no painel.

### Variáveis necessárias no runtime do servidor (nunca no JavaScript do navegador)

Configure na **hospedagem que executa TanStack Start com SSR/server functions**.
Não use prefixo `VITE_` para segredos.

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | Connection string PostgreSQL **pooled** do banco `skinao`, obtida no console Neon |
| `SKINAO_ADMIN_ACCESS_KEY` | Configuração antiga; o login atual usa `skinao_admin_users` e não depende desta variável |
| `SKINAO_SESSION_SECRET` | Segredo aleatório independente para assinatura das sessões, com no mínimo 32 caracteres |
| `AWS_ENDPOINT_URL_S3` | `https://br-wandering-mountain-besgf38z.storage.c-9.us-east-2.aws.neon.tech` |
| `AWS_REGION` | `us-east-2` |
| `AWS_ACCESS_KEY_ID` | ID da credencial S3 da branch Neon |
| `AWS_SECRET_ACCESS_KEY` | Segredo da credencial S3 da branch Neon |
| `SKINAO_IMAGES_PUBLIC_URL` | `https://br-wandering-mountain-besgf38z.storage.c-9.us-east-2.aws.neon.tech/vehicle-images` (opcional: há um fallback público no servidor) |

As chaves de banco e armazenamento **não devem ser enviadas ao GitHub**. Crie a credencial
de objeto S3 no Neon e copie diretamente para as variáveis secretas do ambiente de hospedagem.
As variáveis de infraestrutura de produção foram configuradas no projeto Vercel
`skinaoveiculos` pelo plugin, sem gravar segredos no repositório.
Não utilize as credenciais da produção em builds de testes não autorizados.

Sem `DATABASE_URL`, o catálogo público pode mostrar exemplos de fallback e o painel exibe indisponibilidade.
Sem autorização válida no servidor, o painel exibe acesso restrito e não executa consultas administrativas.
Sem credenciais de storage, upload de fotografias reais não funciona. Não publique
como concluído sem validar cadastro, upload, recorte, capa, edição, despublicação e
acesso negado sem autorização no domínio definitivo.

### Login e testes da publicação

1. Defina as credenciais em `skinao_admin_users` pelo SQL Editor do Neon.
2. Acesse `https://skinaoveiculos.vercel.app/admin`: a tela
   de login deve aparecer antes do inventário.
3. Entre com seu usuário e senha do Neon; a sessão é assinada no servidor.
4. Confira o estoque, anúncios e fotos, e teste o botão **Sair**.
5. Confira se senha incorreta não autoriza acesso e se dez falhas bloqueiam
   tentativas adicionais por quinze minutos.
6. Confirme que as rotas de gravação rejeitam visitantes sem sessão válida.
7. Como proprietário, abra **Equipe e acessos**, cadastre um funcionário
   e verifique login, suspensão, reativação e alteração de senha.
8. Confira que uma sessão de funcionário não consegue criar contas nem
   excluir veículos definitivamente.

Nenhuma senha de usuário precisa ser configurada na Vercel. As chaves de
infraestrutura da hospedagem permanecem privadas e não são expostas ao navegador.

### Avisos e prevenção de perda acidental

- **Publicar**: pede confirmação e mostra se o veículo é um exemplo ilustrativo.
- **Despublicar**: botão vermelho ao lado de Publicar; pede confirmação,
  explica que fotos e dados permanecem salvos e permite republicar depois.
- **Editar a publicação no formulário**: pede confirmação se o estado mudar.
- **Sair de uma edição não salva**: avisa antes de descartar dados e ao fechar a aba.
- **Converter exemplo em anúncio real**: exige fotos reais e confirmação.
- **Excluir veículo definitivamente**: exige digitar `EXCLUIR`, diferente de
  **Despublicar**, que apenas oculta e permite republicação.
- **Excluir fotografia**: alerta que a remoção da foto é permanente; se a última
  for excluída, o veículo é automaticamente despublicado, mas permanece salvo.

O catálogo público consulta o banco diretamente. Edições pelo painel exigem
login e uma sessão administrativa válida, sem convites ou criação de contas.
