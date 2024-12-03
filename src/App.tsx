import { VideoPlayer } from './components/VideoPlayer/VideoPlayer'

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[1080px] aspect-video">
        <VideoPlayer videoId="74efece0-263e-4307-ba14-85df445e55d5" />
      </div>
    </div>
  )
}