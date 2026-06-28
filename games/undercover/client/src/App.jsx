import { useGameSocket } from './net.js';
import Landing from './components/Landing.jsx';
import Lobby from './components/Lobby.jsx';
import Room from './components/Room.jsx';

export default function App() {
  const { status, state, you, code, error, create, join, send } = useGameSocket();

  if (!state || !you) return <Landing onCreate={create} onJoin={join} status={status} error={error} />;
  if (state.phase === 'lobby') return <Lobby state={state} code={code} send={send} error={error} />;
  return <Room state={state} code={code} send={send} error={error} />;
}
