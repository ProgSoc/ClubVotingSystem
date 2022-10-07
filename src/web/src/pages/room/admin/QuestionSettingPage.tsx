import type { PublicStaticRoomData } from '../../../../../server/src/rooms';
import { AdminRouter } from '../../../components/adminRouter';
import { AdminPageContainer } from '../../../components/styles';
import { routeBuilders } from '../../../routes';

export function QuestionSettingPage(props: { roomId: string; room: PublicStaticRoomData; adminKey: string }) {
  return (
    <AdminPageContainer>
      <AdminRouter adminKey={props.adminKey} roomId={props.roomId} />
      <p>
        Join link: <a href={routeBuilders.joinRoom({ roomId: props.roomId })}>join</a>
      </p>
      <p>
        Board link: <a href={routeBuilders.viewRoomBoard({ roomId: props.roomId })}>join</a>
      </p>
    </AdminPageContainer>
  );
}
