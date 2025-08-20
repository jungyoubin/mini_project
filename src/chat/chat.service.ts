import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { Redis } from 'ioredis';

@Injectable()
export class ChatService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  // profile_id로 socketId 매핑하기
  // 두 키를 하나로 짝을 이루는 것으로 생각
  private kProfile(profileId: string) {
    return `socket:profile:${profileId}`;
  }

  // socketId → profile_id 역매핑하기(나중에 지울때 대비해서)
  private kOwner(socketId: string) {
    return `socket:owner:${socketId}`;
  }

  /*
  (로그인 후 소켓 연결 시 -> 최신 소켓만 유지)
  profile_id와 새 socketId를 바인딩(요소끼리의 결합)
  옛날 socketId를 가리키고 있으면 profile_id 삭제
  Redis MULTI로 양방향 키를 한 번에 갱신(프로필→소켓, 소켓→프로필) / profile . owner 동시에 하기 위해서(한 덩어리로)
  */
  async bindSocket(profileId: string, newSocketId: string): Promise<string | null> {
    const profileKey = this.kProfile(profileId);
    const oldSocketId = await this.redis.get(profileKey); // 이전 socketId 조회

    const tx = this.redis
      .multi()
      .set(profileKey, newSocketId) // profile_id -> new SocketId
      .set(this.kOwner(newSocketId), profileId); // new -> profile_id

    if (oldSocketId && oldSocketId !== newSocketId) {
      tx.del(this.kOwner(oldSocketId)); // 예전 owner 키 제거
    }

    await tx.exec();
    // 이전거 disconnect
    return oldSocketId && oldSocketId !== newSocketId ? oldSocketId : null;
  }

  /*
   (소켓 종료 시)
   socketId 기준으로 역매핑을 찾아 양방향 키를 정리한다.
   owner 키만 있고 profile 키가 없을 수도 있으니 분기 처리
  */
  async unbindBySocket(socketId: string): Promise<void> {
    const ownerKey = this.kOwner(socketId);
    const profileId = await this.redis.get(this.kOwner(socketId));

    if (!profileId) {
      await this.redis.del(ownerKey);
      return;
    }

    const profileKey = this.kProfile(profileId);
    const currentSocketId = await this.redis.get(profileKey);

    const tx = this.redis.multi().del(ownerKey); // 역방향은 항상 제거
    if (currentSocketId === socketId) {
      tx.del(profileKey); // 현재 포인터일 때만 제거
    }
    await tx.exec();
  }

  /*
   profile_id로 현재 활성 socketId를 조회한다.
   없으면 null
  */
  async getSocketIdByProfile(profileId: string): Promise<string | null> {
    return this.redis.get(this.kProfile(profileId));
  }
}
