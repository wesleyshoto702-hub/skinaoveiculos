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

**Sem tela de login recorrente:** a chave administrativa já está nas variáveis
secretas da Vercel, **nunca no bundle ou no código público**. O primeiro acesso em
um navegador novo exige uma autorização inicial (chave da loja ou convite único).
Após autorizado, o navegador recebe uma sessão HttpOnly assinada, com validade de
**até 365 dias, renovada a cada visita autorizada**. A tela normal de estoque
não mostra mais banners de desbloqueio nem pedidos de senha. Limpar cookies, trocar
de navegador ou revogar a chave exige nova autorização.

Para entregar o painel a outra pessoa **sem pedir que ela digite a chave**:
1. Entre no painel em um navegador já autorizado.
2. Acesse **Armazenamento → Entregar acesso a outra pessoa → Gerar convite de acesso**.
3. Copie o link e envie somente ao responsável pela loja. O link expira em 24h,
   pode ser usado uma única vez e nunca contém a chave permanente.
4. Quando a pessoa abrir o link, o servidor consumirá o convite e criará a
   sessão protegida naquele navegador, sem precisar digitar código.
5. Para encerrar a sessão daquele navegador, use
   **Armazenamento → Encerrar acesso neste dispositivo**.

A tabela `skinao_admin_invites` do Neon guarda **apenas o hash SHA-256** dos
convites (nunca o token em texto puro), sua validade e utilização. As funções
`createAdminInvite` e `redeemAdminInvite` exigem autorização ou um token válido,
respectivamente. Os convites são descartados do endereço antes de consultar a API.
**Nunca autorize automaticamente visitantes anônimos ou exponha as credenciais
em arquivos versionados**: isso permitiria a qualquer pessoa alterar os anúncios.

Sem autorização, o painel permanece no IndexedDB do navegador. Dados locais
são independentes e não aparecem no estoque Neon.

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
| `SKINAO_ADMIN_ACCESS_KEY` | Chave forte de administração criada e mantida pelo proprietário |
| `SKINAO_SESSION_SECRET` | Segredo aleatório independente para assinatura das sessões, com no mínimo 32 caracteres |
| `AWS_ENDPOINT_URL_S3` | `https://br-wandering-mountain-besgf38z.storage.c-9.us-east-2.aws.neon.tech` |
| `AWS_REGION` | `us-east-2` |
| `AWS_ACCESS_KEY_ID` | ID da credencial S3 da branch Neon |
| `AWS_SECRET_ACCESS_KEY` | Segredo da credencial S3 da branch Neon |
| `SKINAO_IMAGES_PUBLIC_URL` | `https://br-wandering-mountain-besgf38z.storage.c-9.us-east-2.aws.neon.tech/vehicle-images` (opcional: há um fallback público no servidor) |

As chaves de banco e armazenamento **não devem ser enviadas ao GitHub**. Crie a credencial
de objeto S3 no Neon e copie diretamente para as variáveis secretas do ambiente de hospedagem.
As oito variáveis de produção foram configuradas no novo projeto Vercel
`skinaoveiculos` pelo plugin, sem gravar segredos no repositório.
Não utilize as credenciais da produção em builds de testes não autorizados.

Sem `DATABASE_URL`, o site mostra exemplos ilustrativos e o painel continua local.
Sem chave de administração ou segredo de sessão, a edição remota fica bloqueada.
Sem credenciais de storage, upload de fotografias reais não funciona. Não publique
como concluído sem validar cadastro, upload, recorte, capa, edição, despublicação e
acesso negado sem autorização no domínio definitivo.

### Depois de configurar

1. Reinstale as dependências após atualizar `package.json` (inclui o driver Neon).
2. Execute `npm run build` e `npm test` antes de publicar.
3. Acesse `https://skinaoveiculos.vercel.app/admin`. Em um navegador já autorizado,
   o inventário abre diretamente. Em um dispositivo novo, use convite único ou
   chave de administração na autorização inicial.
4. Cadastre um veículo real, anexe fotografias e confirme a publicação.
5. Confirme no catálogo público que descrição, preço e galeria correspondem ao cadastro.
6. Se o navegador deixar de ser confiável, encerre a sessão em **Armazenamento**.

O estoque local não migra automaticamente para o Neon. A rota `/admin`
continua visível, mas operações reais são protegidas pela sessão do servidor.

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

O catálogo só reflete veículos do banco Neon se o painel estiver desbloqueado no
modo **NEON**. O modo local do navegador não publica alterações.
