const { io } = require('socket.io-client');

const BASE = process.argv[2];
const TOKEN = process.argv[3];
const ROOM_ID = process.argv[4];
const NICK = process.argv[5] || 'Tester';

const sendArg = process.argv.find((a) => a.startsWith('send='));
const SEND_TEXT = sendArg ? sendArg.slice('send='.length) : null;
const FETCH_ALL = process.argv.includes('fetchAll');
const DO_LEAVE = process.argv.includes('leave');

if (!BASE || !TOKEN || !ROOM_ID) {
  console.error(
    'Usage: node test-socket.js <BASE_URL> <ACCESS_TOKEN> <ROOM_ID> <NICKNAME> [send=<text>] [fetchAll]',
  );
  process.exit(1);
}

const socket = io(BASE, { auth: { token: TOKEN } });

function log(...args) {
  console.log(`[${NICK}]`, ...args);
}

socket.on('connect', () => {
  log('connected:', socket.id);

  // 방 입장 (DB 참여 기록 + 히스토리 수신)
  log('emit joinRoom', ROOM_ID);
  socket.emit('joinRoom', ROOM_ID);

  // 전체 메시지 가져오기 -> fetchall(option)
  if (FETCH_ALL) {
    setTimeout(() => {
      log('emit fetchAllMessages', ROOM_ID);
      socket.emit('fetchAllMessages', ROOM_ID);
    }, 800);
  }

  // 메시지 전송 => send: (option)
  if (SEND_TEXT) {
    setTimeout(() => {
      log('emit sendMessage', SEND_TEXT);
      socket.emit('sendMessage', { room_id: ROOM_ID, chat_message: SEND_TEXT });
    }, 1200);
  }

  // 방 나가기 => leave
  if (DO_LEAVE) {
    setTimeout(() => {
      log('emit leaveRoom', ROOM_ID);
      socket.emit('leaveRoom', ROOM_ID);
      setTimeout(() => process.exit(0), 300); // 약간의 대기 후 종료
    }, 1500);
  }
});

socket.on('history', (messages) => {
  log(`history (${messages.length})`);
  for (const m of messages) {
    log(`  [${new Date(m.chat_date).toLocaleTimeString()}] ${m.user_name}: ${m.chat_message}`);
  }
});

socket.on('newMessage', (m) => {
  log(`NEW [${new Date(m.chat_date).toLocaleTimeString()}] ${m.user_name}: ${m.chat_message}`);
});

socket.on('error', (e) => {
  log('error:', e);
});

// Ctrl + C 시 소켓 퇴장까지 호출 + terminal
process.on('SIGINT', () => {
  log('emit leaveRoom', ROOM_ID);
  socket.emit('leaveRoom', ROOM_ID);
  setTimeout(() => process.exit(0), 300);
});

/* 
실행법:
  node test/test-socket.js <BASE_URL> <ACCESS_TOKEN> <ROOM_ID> <user_name> [send=<text>] [fetchAll]
예시(문자 보낼때):
  node test/test-socket.js http://localhost:3000 accessToken RoomId user_name send="안녕 유빈!"
  node test/test-socket.js http://localhost:3000 accessToken RoomId user_name (fetchAll)  
각각 터미널에서 진행해야함
ex.
방 들어가기
node test/test-socket.js http://localhost:3000 accessToken roomId user_name (fetchAll)

나가기
Ctrl + C (터미널끄기)
node test/test-socket.js http://localhost:3000 accessToken roomId user_name leave
*/
