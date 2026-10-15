<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/31234505-fd1d-4376-bc00-ac8fa622347b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Configuração das capas e migração para Portainer

Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente usado
para **compilar** o frontend. O Vite incorpora esses valores no build; alterar
somente o ambiente do container que serve os arquivos estáticos não altera o
JavaScript já compilado. Recompile e publique o frontend após a mudança.

Este aplicativo utiliza a API do Supabase tanto para o banco quanto para o
Storage. PostgreSQL sozinho não oferece as rotas `/rest/v1` e `/storage/v1`.
Em uma instalação própria, a URL deve apontar para o gateway das APIs e o
proxy deve encaminhar essas rotas aos respectivos serviços. A configuração
preparada em [deployment](deployment/README.md) usa o endereço do próprio site
e mantém a autenticação do portal na rota das imagens. Um erro 405 no
upload pode indicar que a requisição chegou ao servidor estático do frontend
ou a um proxy que não encaminha POST ao Storage. `ERR_NAME_NOT_RESOLVED`
indica que o navegador não consegue resolver o hostname; nomes internos dos
containers não são endereços públicos acessíveis pelo navegador.

Ao utilizar Supabase Storage, as capas precisam estar no bucket `capas`, público para o carregamento por
`getPublicUrl`, com política de INSERT compatível com a autenticação utilizada.
O aplicativo atual não implementa login Supabase. Não coloque uma chave
`service_role` no frontend para contornar permissões.

Migrar a tabela `books` não transfere os arquivos do Storage. Preserve os
arquivos e caminhos do bucket ao transferir as capas. O campo `photoUrl` contém
URLs absolutas: após transferir os arquivos, os registros precisam apontar
para o endereço do novo Storage. Faça backup antes de alterar os registros.
Se os arquivos não foram transferidos e o Storage antigo foi removido, será
necessário recuperar as capas de um backup ou enviar os arquivos novamente.

Referências: [Storage do Supabase](https://supabase.com/docs/guides/storage/buckets/fundamentals)
e [permissões de upload](https://supabase.com/docs/guides/storage/security/access-control).
