import { VideoPlayer } from './components/VideoPlayer/VideoPlayer'

export default function App() {
  return (
    <div className="h-screen w-screen bg-zinc-950">
      <div className="h-full w-full">
        <VideoPlayer videoId="74efece0-263e-4307-ba14-85df445e55d5" />
      </div>
    </div>
  );
}