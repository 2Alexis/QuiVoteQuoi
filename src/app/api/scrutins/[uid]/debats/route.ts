import { NextResponse } from "next/server";
import { debatScrutin } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;
  const debats = debatScrutin(uid);

  if (!debats) {
    return NextResponse.json(
      { error: "Résumé des débats non disponible pour ce scrutin" },
      { status: 404 }
    );
  }

  return NextResponse.json(debats);
}
