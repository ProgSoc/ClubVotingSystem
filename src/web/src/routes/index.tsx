import type { RefObject } from 'react';
import { createRef } from 'react';
import { createBrowserRouter, useLocation, useOutlet } from 'react-router-dom';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

import { CreateRoomPage } from '../pages/CreateRoomPage';
import { WaitingRoomManagementPage } from '../pages/room/admin/WaitingRoomManagemenentPage';
import { JoinWaitingRoomPage } from '../pages/room/JoinWaitingRoomPage';
import { VotingRoomPage } from '../pages/room/VotingRoomPage';
import { WaitingRoomPage } from '../pages/room/WaitingRoomPage';
import { ShortRedirectPage } from '../pages/ShortRedirectPage';
import { buildBuilders, buildRoutes, path, route } from './routeBuilder';

const routes = {
  home: route({
    path: path`/`,
    component: CreateRoomPage,
  }),
  manageWaitingRoom: route({
    path: path`/room/${'roomId'}/admin/${'adminKey'}`,
    component: WaitingRoomManagementPage,
  }),
  joinRoom: route({
    path: path`/join/${'roomId'}`,
    component: JoinWaitingRoomPage,
  }),
  waitInWaitingRoom: route({
    path: path`/room/${'roomId'}/wait/${'userId'}`,
    component: WaitingRoomPage,
  }),
  votingRoom: route({
    path: path`/room/${'roomId'}/vote/${'voterId'}`,
    component: VotingRoomPage,
  }),
  shortView: route({
    path: path`/v/${'shortId'}`,
    component: ShortRedirectPage('room'),
  }),
  shortJoin: route({
    path: path`/j/${'shortId'}`,
    component: ShortRedirectPage('join'),
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

// FIXME: Actually get this working properly
function AnimationRouter() {
  const location = useLocation();
  const currentOutlet = useOutlet();
  const nodeRef = refs[location.pathname];

  return (
    <>
      <TransitionGroup>
        <CSSTransition key={location.pathname} nodeRef={nodeRef} timeout={0} classNames="page" unmountOnExit={true}>
          {(state) => (
            <div ref={nodeRef} className="page">
              {currentOutlet}
            </div>
          )}
        </CSSTransition>
      </TransitionGroup>
    </>
  );
}
