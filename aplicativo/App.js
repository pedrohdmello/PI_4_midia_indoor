import React, { useEffect, useState } from 'react';
import { View, Image, Text, ActivityIndicator, TouchableOpacity, StyleSheet, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video } from 'expo-av';
import base64 from 'react-native-base64';
import RenderHtml from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const servidor_playlist = 'http://129.148.24.46:8081/playlist';

export default function ReprodutorDePlaylist() {
  const [playlist, setPlaylist] = useState([]);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [exibindoPlaylist, setExibindoPlaylist] = useState(false); // Novo estado para controlar a exibição
  const { width } = useWindowDimensions();

   // Função para salvar a playlist no AsyncStorage
   const salvarPlaylistLocal = async (novaPlaylist) => {
    try {
      await AsyncStorage.setItem('ultimaPlaylist', JSON.stringify(novaPlaylist));
      console.log('Playlist salva localmente');
    } catch (erro) {
      console.error('Erro ao salvar playlist localmente:', erro);
    }
  };
  
   // Função para carregar a playlist do AsyncStorage ao iniciar o aplicativo
   const carregarPlaylistLocal = async () => {
    try {
      const playlistSalva = await AsyncStorage.getItem('playlistAtual');
      if (playlistSalva) {
        const novaPlaylist = JSON.parse(playlistSalva);
        setPlaylist(novaPlaylist);
        setIndiceAtual(0);
        setExibindoPlaylist(true);
        console.log('Playlist carregada do armazenamento local');
      } else {
        console.log('Nenhuma playlist encontrada localmente. Baixando do servidor.');
        buscarPlaylist();
      }
    } catch (erro) {
      console.error('Erro ao carregar playlist local:', erro);
    }
  };
  
  // Função para buscar a playlist
  
  const buscarPlaylist = async () => {
    try {
      setCarregando(true);
      await AsyncStorage.removeItem('ultimaPlaylist');

      const response = await fetch(servidor_playlist, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({userId: 1}),
      });

      if (!response.ok) {
        const errorText = await response.text(); // Lê o texto do erro em caso de falha
        throw new Error(`Erro ao baixar a playlist: ${errorText}`);
      }      

  const dadosPlaylist = await response.json();
  console.log('Nova Playlist:', dadosPlaylist);

  const novaPlaylist = dadosPlaylist.map(item => ({
    fileContent: item.file.fileContent,
    fileName: item.file.fileName,
    time: item.time,
  }));

  setPlaylist(novaPlaylist); // Atualiza a playlist no estado
  salvarPlaylistLocal(novaPlaylist); // Salva a nova playlist localmente

  // Salvar a playlist no servidor
  await fetch(`${servidor_playlist}/salvarPlaylist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ playlist: novaPlaylist }),
  });

  setIndiceAtual(0); // Reinicia o índice para a nova playlist
  setExibindoPlaylist(true); // Define para exibir a playlist após baixá-la
} catch (erro) {
  console.error('Erro ao baixar playlist:', erro.message);
  alert('Servidor offline. Carregue a playlist local.');
} finally {
  setCarregando(false);
}
};

  // Função para identificar o tipo de mídia a partir da extensão do arquivo
  const obterTipoDeMidia = (fileName) => {
    const formato = fileName.split('.').pop().toLowerCase();
    switch (formato) {
      case 'jpg':
      case 'jpeg':
      case 'png':
        return 'image';
      case 'mp4':
        return 'video';
      case 'txt':
        return 'text';
      case 'html':
        return 'html';
      default:
        return 'unsupported';
    }
  };

  // Função para exibir a mídia atual e passar para a próxima após o tempo definido
  const reproduzirMidiaAtual = () => {
    const midiaAtual = playlist[indiceAtual];

    setTimeout(() => {
      // Move para o próximo item ou volta ao primeiro
      setIndiceAtual((indiceAnterior) => (indiceAnterior + 1) % playlist.length);
    }, midiaAtual.time * 1000); // Tempo em milissegundos
  };

  useEffect(() => {
    if (exibindoPlaylist && playlist.length > 0) reproduzirMidiaAtual();
  }, [indiceAtual, playlist, exibindoPlaylist]);

  const renderizarMidia = () => {
    const midiaAtual = playlist[indiceAtual];
    const { fileContent, fileName } = midiaAtual;
    const tipoDeMidia = obterTipoDeMidia(fileName);
    const urlArquivo = `data:${tipoDeMidia};base64,${fileContent}`;

    if (tipoDeMidia === 'image') {
      return <Image source={{ uri: urlArquivo }} style={styles.midia} resizeMode="contain" />;
    } else if (tipoDeMidia === 'video') {
      return (
        <Video
          source={{ uri: urlArquivo }}
          style={styles.midia}
          useNativeControls
          resizeMode="contain"
          shouldPlay
        />
      );
    } else if (tipoDeMidia === 'text') {
      const textoDecodificado = base64.decode(fileContent);
      return (
        <View style={styles.midia}>
          {typeof textoDecodificado === 'string' ? (
            <Text>{textoDecodificado}</Text>
          ) : (
            <Text>Erro ao exibir o texto</Text>
          )}
        </View>
      );
    } else if (tipoDeMidia === 'html') {
      const htmlContent = base64.decode(fileContent);
      return (
        <View style={styles.midia}>
          <RenderHtml
            contentWidth={width}
            source={{ html: htmlContent }}
            style={{ flex: 1 }} // Define flex para ocupar o espaço total
          />
        </View>
      );
    } else {
      return <Text>Formato de mídia não suportado</Text>;
    }
  };

  // useEffect(() => {
  //   carregarPlaylistLocal();
  // }, []);
  
  const voltarParaSelecao = () => {
    setExibindoPlaylist(false);
    setIndiceAtual(0);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {carregando ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : exibindoPlaylist ? (
        <View style={{ flex: 1, width: '100%' }}>
          <TouchableOpacity onPress={voltarParaSelecao} style={{ position: 'absolute', top: 40, left: 20, zIndex: 1 }}>
            <Ionicons name="arrow-back" size={30} color="black" />
          </TouchableOpacity>
          {renderizarMidia()}
        </View>
      ) : (
        <View style={styles.container}>
        <Button title="Baixar playlist do Servidor" onPress={buscarPlaylist} />
        <View style={styles.spacer} />
        <Button title="Carregar playlist local" onPress={carregarPlaylistLocal} />
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  spacer: {
    marginVertical: 10,
  },
  midia: {
    flex: 1, 
    width: '100%',
    height: '100%',
    padding: 20,
    bottom: -50,
    justifyContent: 'center',
    alignItems: 'center', 
  },
  botaoVoltar: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
  },
});