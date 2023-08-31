import { CreateRoomPage } from '@/pages/CreateRoomPage';
import { QuestionSettingPage } from '@/pages/room/admin/QuestionSettingPage';
import { RoomInfoPage } from '@/pages/room/admin/RoomInfoPage';
import { WaitingRoomManagementPage } from '@/pages/room/admin/WaitingRoomManagemenentPage';
import { BoardPage } from '@/pages/room/BoardPage';
import { JoinWaitingRoomPage } from '@/pages/room/JoinWaitingRoomPage';
import { RoomResultsListPage } from '@/pages/room/RoomResultsListPage';
import { VotingRoomPage } from '@/pages/room/VotingRoomPage';
import { WaitingRoomPage } from '@/pages/room/WaitingRoomPage';
import { ShortRedirectPage } from '@/pages/ShortRedirectPage';
import { createBrowserRouter, useLocation, useOutlet } from 'react-router-dom';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { twMerge } from 'tailwind-merge';
import { withRoomFetched } from '@/utils/withRoomData';

import { buildBuilders, buildRoutes, path, route } from './routeBuilder';

import styles from './animations.module.css';

const routes = {
  home: route({
    path: path`/`,
    component: CreateRoomPage,
  }),
  manageWaitingRoom: route({
    path: path`/room/${'roomId'}/admin/${'adminKey'}/waiting-room`,
    component: withRoomFetched(WaitingRoomManagementPage),
  }),
  manageRoomInfo: route({
    path: path`/room/${'roomId'}/admin/${'adminKey'}`,
    component: withRoomFetched(RoomInfoPage),
  }),
  setRoomQuestions: route({
    path: path`/room/${'roomId'}/admin/${'adminKey'}/questions`,
    component: withRoomFetched(QuestionSettingPage),
  }),
  viewRoomBoard: route({
    path: path`/room/${'roomId'}/board`,
    component: withRoomFetched(BoardPage),
  }),
  viewRoomResults: route({
    path: path`/room/${'roomId'}/results`,
    component: withRoomFetched(RoomResultsListPage),
  }),
  joinRoom: route({
    path: path`/join/${'roomId'}`,
    component: JoinWaitingRoomPage,
  }),
  waitInWaitingRoom: route({
    path: path`/room/${'roomId'}/wait/${'userId'}`,
    component: withRoomFetched(WaitingRoomPage),
  }),
  votingRoom: route({
    path: path`/room/${'roomId'}/vote/${'userId'}/${'voterId'}`,
    component: withRoomFetched(VotingRoomPage),
  }),
  shortView: route({
    path: path`/b/${'shortId'}`,
    component: ShortRedirectPage((roomId) => `/room/${roomId}/board`),
  }),
  shortJoin: route({
    path: path`/j/${'shortId'}`,
    component: ShortRedirectPage((roomId) => `/join/${roomId}`),
  }),
};

export const routeBuilders = buildBuilders(routes);

export const browserRoutes = buildRoutes(routes);
// export const browserRouter = createBrowserRouter(browserRoutes);

export const browserRouter = createBrowserRouter([
  {
    path: '/',
    element: <AnimationRouter />,
    children: browserRoutes.map((route) => ({
      index: route.path === '/',
      path: route.path === '/' ? undefined : route.path,
      element: route.element,
    })),
  },
]);

function AnimationRouter() {
  const location = useLocation();
  const currentOutlet = useOutlet();

  return (
    <TransitionGroup className="w-screen h-screen relative overflow-x-hidden">
      <CSSTransition key={location.pathname} timeout={300} unmountOnExit={true}>
        {(state) => {
          const style =
            state === 'entering'
              ? styles.entering
              : state === 'exiting'
              ? styles.exiting
              : state === 'exited'
              ? styles.exited
              : undefined;
          return <div className={twMerge('absolute min-h-full', style)}>{currentOutlet}</div>;
        }}
      </CSSTransition>
    </TransitionGroup>
  );
}
