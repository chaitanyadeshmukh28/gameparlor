import { MotionConfig } from 'framer-motion';
import { useGameSocket } from './net.js';
import Landing from './components/Landing.jsx';
import Lobby from './components/Lobby.jsx';
import OpsRoom from './components/OpsRoom.jsx';

export default function App() {
  const { status, state, you, code, error, create, join, send } = useGameSocket();

  let screen;
  if (!state || !you) screen = <Landing onCreate={create} onJoin={join} status={status} error={error} />;
  else if (state.phase === 'lobby') screen = <Lobby state={state} code={code} send={send} />;
  else screen = <OpsRoom state={state} code={code} send={send} error={error} />;

  // MotionConfig honors prefers-reduced-motion for every framer animation.
  return <MotionConfig reducedMotion="user">{screen}</MotionConfig>;
}
