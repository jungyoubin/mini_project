export interface ChatRoomDocument {
  room_id: string; // uuidv4
  room_title: string;
  participants: Array<{ profile_id: string }>; // 최대 100명은 서비스에서 제어
  room_date: Date; //
}
