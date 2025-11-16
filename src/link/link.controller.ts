import { Controller, Get, Header, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { RoomService } from './room.service';

@Controller()
export class LinkController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  getStatus(): { status: string; message: string } {
    return {
      status: 'ok',
      message: 'link backend is running',
    };
  }

  @Get('room/:id')
  @Header('Content-Type', 'text/html')
  getRoomPage(@Param('id') id: string, @Res() res: Response): void {
    const room = this.roomService.getRoom(id);
    if (!room) {
      res.status(404).send('<h1>Комната не найдена</h1>');
      return;
    }

    res.send(this.renderRoomPage(room.id));
  }

  private renderRoomPage(roomId: string): string {
    return `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Комната ${roomId}</title>
    <style>
      :root {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #0f172a;
        background-color: #f8fafc;
      }

      body {
        margin: 0;
        padding: 16px;
        background: #0f172a;
      }

      .card {
        max-width: 960px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
      }

      h1 {
        margin-top: 0;
        font-size: 1.8rem;
      }

      #status {
        margin-bottom: 16px;
        padding: 12px;
        border-radius: 8px;
        background: #e0f2fe;
        color: #0369a1;
      }

      .videos {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 16px;
        margin-bottom: 16px;
      }

      .video-wrapper {
        background: #0f172a;
        border-radius: 12px;
        padding: 12px;
        color: #e2e8f0;
        min-height: 240px;
      }

      video {
        width: 100%;
        height: 240px;
        background: #1e293b;
        border-radius: 8px;
        object-fit: cover;
      }

      video.hidden {
        display: none;
      }

      #noVideoHint {
        margin-top: 12px;
        color: #94a3b8;
      }

      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      button {
        flex: 1;
        padding: 12px 16px;
        border-radius: 10px;
        border: none;
        font-size: 1rem;
        cursor: pointer;
        transition: opacity 0.2s ease;
      }

      button.primary {
        background: #0ea5e9;
        color: #ffffff;
      }

      button.danger {
        background: #ef4444;
        color: #ffffff;
      }

      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Комната связи</h1>
      <div id="status">Подключаемся...</div>
      <div class="videos">
        <div class="video-wrapper">
          <h2>Собеседник</h2>
          <video id="remoteVideo" autoplay playsinline></video>
        </div>
        <div class="video-wrapper">
          <h2>Вы</h2>
          <video id="localVideo" autoplay playsinline muted class="hidden"></video>
          <div id="noVideoHint">Видео выключено, звук идёт.</div>
        </div>
      </div>
      <div class="controls">
        <button id="toggleVideo" class="primary">Включить видео</button>
        <button id="hangupBtn" class="danger">Отбой</button>
      </div>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
      (function () {
        const roomId = '${roomId}';
        const statusEl = document.getElementById('status');
        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        const toggleVideoBtn = document.getElementById('toggleVideo');
        const hangupBtn = document.getElementById('hangupBtn');
        const noVideoHint = document.getElementById('noVideoHint');

        const socket = io();
        const iceConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

        let isInitiator = false;
        let peerConnection = null;
        let localStream = null;
        let audioTrack = null;
        let audioSender = null;
        let videoTrack = null;
        let videoSender = null;

        const setStatus = (text) => {
          statusEl.textContent = text;
        };

        const ensureAudioStream = async () => {
          if (localStream && audioTrack) {
            return;
          }
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            audioTrack = stream.getAudioTracks()[0];
            localStream = new MediaStream([audioTrack]);
          } catch (error) {
            setStatus('Нужно разрешить доступ к микрофону.');
            throw error;
          }
        };

        const ensurePeerConnection = async () => {
          if (peerConnection) {
            return;
          }
          await ensureAudioStream();
          peerConnection = new RTCPeerConnection(iceConfig);

          peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit('signal', { roomId, payload: { type: 'candidate', candidate: event.candidate } });
            }
          };

          peerConnection.ontrack = (event) => {
            remoteVideo.srcObject = event.streams[0];
          };

          peerConnection.onconnectionstatechange = () => {
            if (!peerConnection) {
              return;
            }
            if (['disconnected', 'failed'].includes(peerConnection.connectionState)) {
              setStatus('Соединение разорвано. Можно перезагрузить страницу, чтобы попробовать снова.');
            }
          };

          if (audioTrack && !audioSender) {
            audioSender = peerConnection.addTrack(audioTrack, localStream);
          }
          if (videoTrack && !videoSender) {
            videoSender = peerConnection.addTrack(videoTrack, localStream);
          }
        };

        const createAndSendOffer = async () => {
          if (!peerConnection) {
            await ensurePeerConnection();
          }
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          socket.emit('signal', { roomId, payload: offer });
        };

        const handleOffer = async (offer) => {
          await ensurePeerConnection();
          await peerConnection.setRemoteDescription(offer);
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.emit('signal', { roomId, payload: answer });
        };

        const handleAnswer = async (answer) => {
          if (!peerConnection) {
            return;
          }
          await peerConnection.setRemoteDescription(answer);
        };

        const handleCandidate = async ({ candidate }) => {
          if (!peerConnection || !candidate) {
            return;
          }
          try {
            await peerConnection.addIceCandidate(candidate);
          } catch (error) {
            console.error('ICE candidate error', error);
          }
        };

        const renegotiate = async () => {
          if (!peerConnection) {
            return;
          }
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          socket.emit('signal', { roomId, payload: offer });
        };

        const enableVideo = async () => {
          if (videoTrack) {
            return;
          }
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoTrack = stream.getVideoTracks()[0];
            if (!localStream) {
              localStream = new MediaStream();
            }
            localStream.addTrack(videoTrack);
            localVideo.srcObject = localStream;
            localVideo.classList.remove('hidden');
            noVideoHint.classList.add('hidden');
            if (peerConnection) {
              videoSender = peerConnection.addTrack(videoTrack, localStream);
              await renegotiate();
            }
            toggleVideoBtn.textContent = 'Выключить видео';
          } catch (error) {
            setStatus('Не удалось включить видео. Проверьте камеру и разрешения.');
          }
        };

        const disableVideo = async () => {
          if (!videoTrack) {
            return;
          }
          videoTrack.stop();
          if (localStream) {
            localStream.removeTrack(videoTrack);
          }
          videoTrack = null;
          if (videoSender && peerConnection) {
            peerConnection.removeTrack(videoSender);
            videoSender = null;
            await renegotiate();
          }
          localVideo.srcObject = null;
          localVideo.classList.add('hidden');
          noVideoHint.classList.remove('hidden');
          toggleVideoBtn.textContent = 'Включить видео';
        };

        const toggleVideo = async () => {
          if (videoTrack) {
            await disableVideo();
          } else {
            await enableVideo();
          }
        };

        const leaveRoom = () => {
          socket.emit('leaveRoom', { roomId });
          cleanUp();
          setStatus('Вызов завершён. Обновите страницу, чтобы начать заново.');
          toggleVideoBtn.disabled = true;
          hangupBtn.disabled = true;
        };

        const cleanUp = () => {
          if (peerConnection) {
            peerConnection.ontrack = null;
            peerConnection.close();
            peerConnection = null;
          }
          if (localStream) {
            localStream.getTracks().forEach((track) => track.stop());
            localStream = null;
          }
          videoTrack = null;
          audioTrack = null;
          audioSender = null;
          videoSender = null;
          localVideo.srcObject = null;
          remoteVideo.srcObject = null;
        };

        toggleVideoBtn.addEventListener('click', () => {
          toggleVideo().catch((error) => console.error(error));
        });
        hangupBtn.addEventListener('click', () => leaveRoom());

        socket.on('connect', () => {
          socket.emit('joinRoom', { roomId });
        });

        socket.on('joined', async ({ initiator }) => {
          isInitiator = Boolean(initiator);
          await ensurePeerConnection();
          setStatus('Вы в комнате. Ждём собеседника...');
        });

        socket.on('waiting', () => setStatus('Ждём подключения второго участника...'));

        socket.on('ready', async () => {
          setStatus('Собеседник подключился. Устанавливаем соединение...');
          if (isInitiator) {
            await createAndSendOffer();
          }
        });

        socket.on('signal', async ({ payload }) => {
          if (!payload) {
            return;
          }
          if (payload.type === 'offer') {
            await handleOffer(payload);
          } else if (payload.type === 'answer') {
            await handleAnswer(payload);
          } else if (payload.type === 'candidate') {
            await handleCandidate(payload);
          }
        });

        socket.on('peer-left', () => {
          setStatus('Собеседник отключился. Можно подождать нового подключения.');
          cleanUp();
          toggleVideoBtn.textContent = 'Включить видео';
          toggleVideoBtn.disabled = false;
          hangupBtn.disabled = false;
        });

        socket.on('room-full', () => {
          setStatus('Комната уже занята. Создайте новую ссылку.');
          toggleVideoBtn.disabled = true;
          hangupBtn.disabled = true;
        });

        socket.on('room-error', (message) => {
          setStatus(message || 'Комната недоступна.');
          toggleVideoBtn.disabled = true;
          hangupBtn.disabled = true;
        });

        window.addEventListener('beforeunload', () => {
          socket.emit('leaveRoom', { roomId });
        });
      })();
    </script>
  </body>
</html>`;
  }
}
