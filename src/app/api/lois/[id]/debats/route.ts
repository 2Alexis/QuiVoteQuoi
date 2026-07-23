import { NextResponse } from "next/server";
import { debatScrutin } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const debats = debatScrutin(id);

  if (!debats) {
    return NextResponse.json(
      { error: "Résumé des débats non disponible pour ce texte / scrutin" },
      { status: 404 }
    );
  }

  return NextResponse.json(debats);
}
