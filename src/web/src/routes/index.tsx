import { ClassNames, css, keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import type { RefObject } from 'react';
import { createRef } from 'react';
import { createBrowserRouter, useLocation, useOutlet } from 'react-router-dom';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

import { CreateRoomPage } from '../pages/CreateRoomPage';
import { QuestionSettingPage } from '../pages/room/admin/QuestionSettingPage';
import { RoomInfoPage } from '../pages/room/admin/RoomInfoPage';
import { WaitingRoomManagementPage } from '../pages/room/admin/WaitingRoomManagemenentPage';
import { BoardPage } from '../pages/room/BoardPage';
import { JoinWaitingRoomPage } from '../pages/room/JoinWaitingRoomPage';
import { VotingRoomPage } from '../pages/room/VotingRoomPage';
import { WaitingRoomPage } from '../pages/room/WaitingRoomPage';
import { ShortRedirectPage } from '../pages/ShortRedirectPage';
import { withRoomFetched } from '../utils/withRoomData';
import { buildBuilders, buildRoutes, path, route } from './routeBuilder';

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
    component: BoardPage,
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
    path: path`/room/${'roomId'}/vote/${'voterId'}`,
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

const refs: Record<string, RefObject<HTMLDivElement>> = Object.fromEntries(
  browserRoutes.map((route) => [route.path, createRef()])
);

// Wait 50% then slide in from the right
const enterAnimation = keyframes`
  0% {
    opacity: 0;
    transform: translateX(100vw);
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
`;

// Slide out to the left
const exitAnimation = keyframes`
  0% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-100vw);
  }
`;

const AnimationContainer = styled(TransitionGroup)`
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
`;

const PageContainer = styled.div`
  position: absolute;
  height: 100%;
`;

const enteringStyle = css`
  animation: ${enterAnimation} 0.3s ease-out;
`;

const exitingStyle = css`
  opacity: 0;
  animation: ${exitAnimation} 0.3s cubic-bezier(0.86, 0.12, 0.91, 0.68);
`;

const exitedStyle = css`
  opacity: 0;
`;

// FIXME: Actually get this working properly
function AnimationRouter() {
  const location = useLocation();
  const currentOutlet = useOutlet();
  const nodeRef = refs[location.pathname];

  return (
    <AnimationContainer>
      <CSSTransition key={location.pathname} nodeRef={nodeRef} timeout={300} unmountOnExit={true}>
        {(state) => {
          const style =
            state === 'entering'
              ? enteringStyle
              : state === 'exiting'
              ? exitingStyle
              : state === 'exited'
              ? exitedStyle
              : undefined;
          return (
            <ClassNames>
              {({ css, cx }) => (
                <PageContainer
                  ref={nodeRef}
                  className={css`
                    ${style}
                  `}
                >
                  {currentOutlet}
                </PageContainer>
              )}
            </ClassNames>
          );
        }}
      </CSSTransition>
    </AnimationContainer>
  );
}
