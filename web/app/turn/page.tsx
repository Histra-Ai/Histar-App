import TurnClientPage from "./turn-client";

type TurnPageProps = {
  searchParams: Promise<{
    gameId?: string;
  }>;
};

export default async function TurnPage({ searchParams }: TurnPageProps) {
  const params = await searchParams;

  return <TurnClientPage initialGameId={params.gameId ?? ""} />;
}
