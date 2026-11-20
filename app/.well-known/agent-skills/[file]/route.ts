import { AGENT_SKILLS } from "@/lib/agent-skills";

/** Sirve el archivo markdown de cada Agent Skill. */
export const dynamic = "force-static";

export function generateStaticParams() {
  return AGENT_SKILLS.map((skill) => ({ file: skill.file }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const skill = AGENT_SKILLS.find((entry) => entry.file === file);

  if (!skill) {
    return new Response("Skill no encontrada", { status: 404 });
  }

  return new Response(skill.content, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
