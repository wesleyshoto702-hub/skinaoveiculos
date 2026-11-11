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

## Administração sem login (modo local)

O endereço `/admin` abre diretamente o painel, sem conta ou senha.
Como o Supabase de administração foi removido, cadastros e fotos são guardados **apenas
no IndexedDB do navegador em uso**. Isso permite experimentar o painel sem backend,
mas **não publica dados no site, nem sincroniza entre dispositivos**. Limpar os dados
do navegador pode apagar o estoque local. O site público continua mostrando um
catálogo explicitamente ilustrativo.

**Importante:** a rota `/admin` não é privada. Para cadastrar anúncios reais e
sincronizá-los entre dispositivos ou exibi-los publicamente, conecte um backend
com autenticação, autorização no servidor e armazenamento de imagens antes de liberar
essa funcionalidade para a equipe.
