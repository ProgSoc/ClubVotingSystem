let id = 0;
function getNewId() {
  return id++;
}

type Location = 'inperson' | 'online';

type WithId<T> = T & { id: number };

interface WaitingRoomUser {
  studentEmail: string;
  location: Location;
  admit(id: string): void;
  decline(): void;
}

type BoardState =
  | {
      state: 'question';
      question: string;
    }
  | {
      state: 'answer';
      answer: string;
    };

interface BoardViewer {
  setState(state: BoardState): void;
}

interface WaitingRoomAdmin {
  notifyUserList(users: WaitingRoomUser[]): void;
}

export class Room {
  waitingRoom: WithId<WaitingRoomUser>[] = [];
  waitingRoomAdmins: WithId<WaitingRoomAdmin>[] = [];

  whiteboardViewers: WithId<BoardViewer>[] = [];

  constructor(readonly name: string) {}

  addWaitingRoomUser(user: WaitingRoomUser) {
    const id = getNewId();
    this.waitingRoom.push({ ...user, id });
    this.notifyAdminsWaitingRoom();
  }

  addWaitingRoomAdmin(admin: WaitingRoomAdmin) {
    const id = getNewId();
    this.waitingRoomAdmins.push({ ...admin, id });
    this.notifyAdminsWaitingRoom();
  }

  notifyAdminsWaitingRoom() {
    this.waitingRoomAdmins.forEach((admin) => {
      admin.notifyUserList(this.waitingRoom);
    });
  }
}
