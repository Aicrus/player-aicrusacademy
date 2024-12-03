// Função para alternar legendas
function toggleCaptions() {
  const video = document.querySelector('video');
  const isDisabled = video.getAttribute('data-captions-disabled') === 'true';
  
  video.setAttribute('data-captions-disabled', !isDisabled);
  
  // Opcional: Atualizar o ícone para refletir o estado
  const captionsButton = document.querySelector('.captions-button');
  if (captionsButton) {
    captionsButton.classList.toggle('captions-disabled');
  }
}

// Função para desativar legendas
function disableCaptions() {
  const video = document.querySelector('video');
  video.setAttribute('data-captions-disabled', 'true');
  
  // Desativar as legendas no player
  if (video.textTracks && video.textTracks.length > 0) {
    Array.from(video.textTracks).forEach(track => {
      track.mode = 'disabled';
    });
  }
  
  const captionsButton = document.querySelector('.captions-button');
  if (captionsButton) {
    captionsButton.classList.add('captions-disabled');
  }
}

// Listener para quando o vídeo entrar em modo PiP
document.querySelector('video').addEventListener('enterpictureinpicture', () => {
  // Verifica se as legendas estão ativas antes de desativá-las
  const video = document.querySelector('video');
  if (video.getAttribute('data-captions-disabled') !== 'true') {
    disableCaptions();
  }
});

// Adicionar evento de clique no botão de legendas
document.querySelector('.captions-button').addEventListener('click', toggleCaptions); 