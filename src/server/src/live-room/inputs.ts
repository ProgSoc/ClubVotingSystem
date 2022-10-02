import type { Location } from '@prisma/client';

export interface JoinWaitingRoomParams {
  studentEmail: string;
  location: Location;
}
