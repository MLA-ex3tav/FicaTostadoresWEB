import { AGENT_SKILLS, sha256Hex } from "@/lib/agent-skills";
import { SITE_URL } from "@/lib/seo";

/**
 * Índice de Agent Skills (Agent Skills Discovery RFC v0.2.0).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const base = SITE_URL.replace(/\/$/, "");

  const skills = await Promise.all(
    AGENT_SKILLS.map(async (skill) => ({
      name: skill.name,
      type: skill.type,
      description: skill.description,
      url: `${base}/.well-known/agent-skills/${skill.file}`,
      sha256: await sha256Hex(skill.content),
    })),
  );

  const index = {
    $schema: "https://agentskills.io/schema/agent-skills-index.v0.2.0.json",
    skills,
  };

  return new Response(JSON.stringify(index, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
