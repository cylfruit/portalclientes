import { type NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticatedApiUser,
  filterRowsForPortalUser,
} from "@/lib/auth";
import {
  fetchEmbarqueRowsWithSeasonFallback,
  fetchEmbarqueSeasons,
  resolveDefaultEmbarqueSeasonCode,
} from "@/lib/clickhouse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedApiUser(request);

  if (auth.response || !auth.user) {
    return (
      auth.response ??
      NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    );
  }

  const user = auth.user;
  const { searchParams } = request.nextUrl;
  const season = searchParams.get("season")?.trim() || null;
  const search = searchParams.get("search") ?? undefined;
  const seasons = await fetchEmbarqueSeasons();
  const resolvedSeason =
    season ??
    resolveDefaultEmbarqueSeasonCode(seasons) ??
    process.env.CLICKHOUSE_DEFAULT_SEASON?.trim() ??
    null;

  const rows = await fetchEmbarqueRowsWithSeasonFallback({
    season: resolvedSeason,
    search: search ?? null,
    seasons,
  });

  const filteredRows = filterRowsForPortalUser(rows, user);

  return NextResponse.json({
    rows: filteredRows,
    seasons,
    defaultSeason: resolvedSeason,
  });
}
