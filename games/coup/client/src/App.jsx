import { useCoupSocket } from './net.js';
import Landing from './components/Landing.jsx';
import Lobby from './components/Lobby.jsx';
import Table from './components/Table.jsx';

export default function App() {
  const { status, state, you, code, error, create, join, send } = useCoupSocket();

  // Not seated yet → the landing screen.
  if (!state || !you) {
    return <Landing onCreate={create} onJoin={join} status={status} />;
  }
  // Seated but the round hasn't begun.
  if (state.phase === 'lobby') {
    return <Lobby state={state} code={code} send={send} />;
  }
  // In play.
  return <Table state={state} code={code} send={send} error={error} />;
}
