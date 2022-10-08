import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';

import { QuestionState } from '../../../../../server/src/live-room/question-states';
import type { PublicStaticRoomData } from '../../../../../server/src/rooms';
import { AdminRouter } from '../../../components/adminRouter';
import { AdminPageContainer, Heading } from '../../../components/styles';
import { routeBuilders } from '../../../routes';
import { useSelfUrl } from '../../../routes/useSelfUrl';
import { trpc } from '../../../utils/trpc';

// from https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
const rgb2hex = (c: string) =>
  '#' +
  c
    .match(/\d+/g)!
    .map((x) => (+x).toString(16).padStart(2, '0'))
    .join('');

export function RoomInfoPage(props: { roomId: string; room: PublicStaticRoomData; adminKey: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const styleDivRef = useRef<HTMLDivElement>(null);

  const [roomVoters, setRoomVoters] = useState(0);

  const selfUrl = useSelfUrl();

  trpc.useSubscription(['room.listenBoardEvents', { roomId: props.roomId }], {
    onNext: (data) => {
      switch (data.state) {
        case QuestionState.Blank:
          setRoomVoters(data.totalPeople);
          break;
        case QuestionState.ShowingQuestion:
          setRoomVoters(data.totalPeople);
          break;
        case QuestionState.ShowingResults:
          setRoomVoters(data.totalPeople);
          break;
        case QuestionState.Ended:
          setRoomVoters(0);
          break;
      }
    },
  });

  const joinLink: string | undefined = selfUrl && selfUrl + routeBuilders.shortJoin({ shortId: props.room.shortId });
  const boardLink: string | undefined = selfUrl && selfUrl + routeBuilders.shortView({ shortId: props.room.shortId });

  useEffect(() => {
    if (!styleDivRef.current || !canvasRef.current || !joinLink) {
      return;
    }

    const style = getComputedStyle(styleDivRef.current);

    void QRCode.toCanvas(canvasRef.current, joinLink, {
      margin: 0,
      width: 300,
      errorCorrectionLevel: 'low',
      color: {
        light: rgb2hex(style.backgroundColor),
        dark: rgb2hex(style.color),
      },
    });
  }, [canvasRef.current, styleDivRef.current, props.roomId, joinLink]);

  return (
    <AdminPageContainer className="gap-4">
      <AdminRouter adminKey={props.adminKey} roomId={props.roomId} />
      <div className="bg-base-300" ref={styleDivRef}></div>
      <p>People admitted into the room: {roomVoters}</p>
      <Heading>Join voting Room</Heading>
      <canvas ref={canvasRef} className="rounded-lg" />
      {joinLink && (
        <p>
          <a href={joinLink} className="text-3xl underline text-info font-mono">
            {joinLink}
          </a>
        </p>
      )}
      <div className="gap-2">
        <Heading className="text-2xl">View board</Heading>
        {joinLink && (
          <p>
            <a href={boardLink} className="text-xl underline text-info font-mono">
              {boardLink}
            </a>
          </p>
        )}
      </div>
    </AdminPageContainer>
  );
}
