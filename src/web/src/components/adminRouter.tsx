import { Link } from 'react-router-dom';
import { routeBuilders } from '@/routes';
import { twMerge } from 'tailwind-merge';

const AdminLink = (props: { path: string; name: string }) => {
  const selected = window.location.pathname === props.path;

  return (
    <Link to={props.path}>
      <button className={twMerge('btn', selected && 'btn-secondary')}>{props.name}</button>
    </Link>
  );
};

export const AdminRouter = (props: { className?: string; roomId: string; adminKey: string }) => {
  return (
    <div className={twMerge('flex gap-4 mb-8', props.className)}>
      <AdminLink
        path={routeBuilders.manageRoomInfo({ roomId: props.roomId, adminKey: props.adminKey })}
        name="Room Info"
      />
      <AdminLink
        path={routeBuilders.manageWaitingRoom({ roomId: props.roomId, adminKey: props.adminKey })}
        name="Waiting Room"
      />
      <AdminLink
        path={routeBuilders.setRoomQuestions({ roomId: props.roomId, adminKey: props.adminKey })}
        name="Set Questions"
      />
    </div>
  );
};
