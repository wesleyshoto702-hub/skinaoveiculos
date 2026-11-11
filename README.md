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

**Sem tela de login:** o painel abre diretamente em modo local (IndexedDB).
Cadastros locais ficam neste navegador e **não são publicados nem sincronizados**.
Para ativar operações no estoque real, use **Desbloquear edição** dentro do painel.
A chave é verificada no servidor e uma sessão assinada HttpOnly controla todas as
operações remotas. Não remova as verificações de autorização das server functions.

### Banco de dados já provisionado

- Projeto Neon: `SkinaoVeiculos` (`wispy-fire-71183672`).
- Banco PostgreSQL: `skinao`, branch `main`.
- Tabelas: `vehicles` e `vehicle_images`, com fotos relacionadas por `vehicle_id`.
- Neon Object Storage: bucket `vehicle-images` com leitura pública e escrita autenticada.
- O código original do banco Supabase foi substituído por TanStack Start server functions,
  que usam `@neondatabase/serverless` e o SDK S3 somente no servidor.

**Atenção:** o repositório não contém as antigas linhas do banco removido.
O banco Neon recém-criado está vazio. Os seis veículos demonstrativos da
homepage continuam sendo apenas exemplos, não estoque real.

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
O plugin Neon conectado ao ChatGPT **não preenche automaticamente** as variáveis da hospedagem.

Sem `DATABASE_URL`, o site mostra exemplos ilustrativos e o painel continua local.
Sem chave de administração ou segredo de sessão, a edição remota fica bloqueada.
Sem credenciais de storage, upload de fotografias reais não funciona. Não publique
como concluído sem validar cadastro, upload, recorte, capa, edição, despublicação e
acesso negado sem autorização no domínio definitivo.

### Depois de configurar

1. Reinstale as dependências após atualizar `package.json` (inclui o driver Neon).
2. Execute `npm run build` e `npm test` antes de publicar.
3. Acesse `/admin`, clique em **Desbloquear edição**, informe a chave definida na hospedagem.
4. Cadastre um veículo real, anexe fotografias e confirme a publicação.
5. Confirme no catálogo público que descrição, preço e galeria correspondem ao cadastro.
6. Use **Bloquear edição** ao concluir.

O estoque local não migra automaticamente para o Neon. A rota `/admin`
continua visível, mas operações reais são protegidas pela sessão do servidor.
