# Armazenamento de capas no Portainer

Estado: armazenamento e rota Nginx publicados e verificados no Portainer em
15/10/2026. Upload pela interface retornou "Imagem carregada com sucesso!".
Leitura byte a byte e gravação no volume verificadas; a imagem continuou
acessível após reiniciar o serviço. Uma requisição sem sessão ao Nginx recebeu
302 para o login do portal. Nenhum livro fictício foi criado.

A stack de produção está no repositório `sectidev/InovaLivros`, diferente do
remote deste checkout (`nicolasnzr1010/InovaLivros`). Não publicar o frontend
deste checkout sobre a produção sem reconciliar essas versões.

## Diagnóstico confirmado

- Nginx da stack `inova-livros` encaminha `/rest/v1/` para `api:3000`.
- Não há rota `/storage/v1/`, nem volume de imagens no container do site.
- A autenticação existente usa `auth_request /__secti/check` no server.
- Os registros antigos ainda têm URLs do projeto Supabase removido.
- O hostname antigo não resolve no servidor; não foi possível recuperar as capas.

## Configuração publicada

1. Preservar uma cópia da configuração original da stack e suas variáveis.
2. Com autorização específica, desvincular a stack do Git para edição no Portainer.
   O repositório Git não será removido; o Compose passará a ser gerido no Portainer.
3. Publicar `storage.compose.yml` na stack separada `inova-livros-armazenamento`,
   incluindo o volume nomeado `inova_livros_capas`. O serviço não publica portas
   no host. Usa a imagem oficial `node:24.18.0-bookworm-slim` disponível no servidor.
4. Inserir `storage-nginx.conf` dentro do server existente. Preservar o
   `auth_request` para que upload e leitura continuem protegidos pelo portal.
   Incorporar essa inserção ao comando de inicialização da stack para persistir
   após a recriação do container.
5. Atualizar a stack do site com `portainer-web.compose.yml`, verificar saúde, upload multipart compatível com o SDK,
   leitura byte a byte, bloqueio sem login e persistência após reiniciar o Storage.

O arquivo `portainer-original.compose.yml` preserva a configuração original sem
credenciais. As variáveis privadas permanecem no Portainer. A primeira tentativa
de implantação conjunta falhou; o site foi restabelecido com a configuração
original antes de implantar o armazenamento separadamente. O arquivo
`portainer-storage.compose.yml` registra essa tentativa e não é a configuração
ativa; use os dois arquivos indicados acima para reproduzir a implantação.

O adaptador aceita arquivos PNG, JPEG e WEBP de até 10 MB, valida a assinatura
e a extensão, restringe nomes de arquivo e não sobrescreve arquivos existentes.
Não oferece exclusão ou modificação de arquivos. Os arquivos de teste de produção
devem ser conservados como diagnóstico, sem inserir livros fictícios no acervo.

Teste local: `node --test deployment/storage-server.test.cjs`.

Para recuperar as imagens antigas, importar os arquivos originais ou backup
no volume preservando os nomes. Atualizar as URLs dos livros somente após
confirmar a existência de cada arquivo no novo armazenamento e fazer backup
dos registros. A ausência desses arquivos não é resolvida migrando o banco.

O usuário informou que não possui backup do bucket. Não foram encontrados
volumes anteriores de capas no inventário do Portainer nem arquivos de capa no
checkout local. As capas antigas não foram recuperadas; suas URLs e os livros
foram preservados. Sem os arquivos originais, um backup ou acesso ao Storage
anterior, não é possível restaurar as imagens originais a partir desses links.
