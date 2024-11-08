// import express from 'express';
// import fetch from 'node-fetch';

// const app = express();
// const port = 8080;

// app.use(express.json());

// // URL do servidor de arquivos
// const FILE_SERVER_URL = 'http://129.148.24.46:8086/file/download';

// // Variável para armazenar a última playlist baixada
// let ultimaPlaylistCache = null;

// // Função para obter a última playlist armazenada localmente
// const obterUltimaPlaylistLocal = () => ultimaPlaylistCache;

// // Rota para receber o ID da playlist e user
// app.post('/playlist', async (req, res) => {
//   console.log('Corpo da requisição recebido:', req.body);
//   let { playlistId, userId } = req.body;

//   try {
//     if (!playlistId || !userId) {
//       console.warn('Parâmetros faltando, usando última playlist disponível.');
//       const ultimaPlaylist = obterUltimaPlaylistLocal();

//       if (ultimaPlaylist) {
//         return res.status(200).json(ultimaPlaylist);
//       } else {
//         return res.status(404).send('Nenhuma playlist disponível localmente.');
//       }
//     }

//     // Faz a requisição ao servidor de arquivos
//     const fileServerResponse = await fetch(FILE_SERVER_URL, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ user: userId, playlist: playlistId }),
//     });

//     if (fileServerResponse.ok) {
//       const playlistData = await fileServerResponse.json();
//       console.log('Playlist baixada com sucesso:', playlistData);

//       // Atualiza o cache com a nova playlist
//       ultimaPlaylistCache = playlistData;

//       res.status(200).json(playlistData);
//     } else {
//       console.error('Erro ao baixar playlist do servidor de arquivos.');
//       res.status(500).send('Erro ao baixar a playlist.');
//     }
//   } catch (error) {
//     console.error('Erro ao processar a requisição:', error);

//     // Em caso de erro, retorna a última playlist armazenada, se disponível
//     if (ultimaPlaylistCache) {
//       console.log('Retornando a última playlist armazenada localmente.');
//       res.status(200).json(ultimaPlaylistCache);
//     } else {
//       res.status(500).send('Erro ao processar a requisição e nenhuma playlist local está disponível.');
//     }
//   }
// });

// app.listen(port, () => {
//   console.log(`Servidor HTTP rodando na porta ${port}.`);
// });


import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';

const app = express();
const port = 8080;

// URL do servidor de arquivos
const FILE_SERVER_URL = 'http://129.148.24.46:8086/file/download';

// Caminho do arquivo para armazenamento da última playlist
const caminhoArquivoPlaylist = './playlistAtual.json';

app.use(express.json());

// Função para carregar a última playlist do arquivo local
const carregarUltimaPlaylistLocal = () => {
  if (fs.existsSync(caminhoArquivoPlaylist)) {
    const dados = fs.readFileSync(caminhoArquivoPlaylist, 'utf-8');
    return JSON.parse(dados);
  }
  return null;
};

// Função para salvar a última playlist no arquivo local
const salvarUltimaPlaylistLocal = (playlist) => {
  fs.writeFileSync(caminhoArquivoPlaylist, JSON.stringify(playlist));
};

// Carrega a playlist do arquivo ao iniciar o servidor
let ultimaPlaylistCache = carregarUltimaPlaylistLocal();

// Rota para receber o ID da playlist e o user
app.post('/playlist', async (req, res) => {
  console.log('Corpo da requisição recebido:', req.body);
  const { playlistId, userId } = req.body;

  try {
    if (!playlistId || !userId) {
      console.warn('Parâmetros faltando, usando última playlist disponível.');
      if (ultimaPlaylistCache) {
        return res.status(200).json(ultimaPlaylistCache);
      } else {
        return res.status(404).send('Nenhuma playlist disponível localmente.');
      }
    }

    // Faz a requisição ao servidor de arquivos
    const fileServerResponse = await fetch(FILE_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: userId, playlist: playlistId }),
    });

    if (fileServerResponse.ok) {
      const playlistData = await fileServerResponse.json();
      console.log('Playlist baixada com sucesso:', playlistData);

      // Atualiza o cache e salva a nova playlist no arquivo local
      ultimaPlaylistCache = playlistData;
      salvarUltimaPlaylistLocal(playlistData);

      res.status(200).json(playlistData);
    } else {
      console.error('Erro ao baixar playlist do servidor de arquivos.');
      res.status(500).send('Erro ao baixar a playlist.');
    }
  } catch (error) {
    console.error('Erro ao processar a requisição:', error);

    // Em caso de erro, retorna a última playlist armazenada, se disponível
    if (ultimaPlaylistCache) {
      console.log('Retornando a última playlist armazenada localmente.');
      res.status(200).json(ultimaPlaylistCache);
    } else {
      res.status(500).send('Erro ao processar a requisição e nenhuma playlist local está disponível.');
    }
  }
});

app.listen(port, () => {
  console.log(`Servidor HTTP rodando na porta ${port}.`);
});
