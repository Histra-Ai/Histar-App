import { GameClient } from "./game-client";

type PageProps = {
  params: Promise<{ gameId: string }>;
};

export default async function BunkerGamePage({ params }: PageProps) {
  const { gameId } = await params;
  return <GameClient gameId={gameId} />;
}
