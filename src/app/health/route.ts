// Point de contrôle léger, sans accès à la base. Un service de ping gratuit
// (UptimeRobot, cron-job.org…) l'appelle toutes les ~10 min : chaque requête
// réveille l'instance Render et remet à zéro le minuteur de mise en veille.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true, ts: Date.now() });
}
