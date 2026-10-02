import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Check your .env file.");
}

const needsSupabasePoolerSsl =
  process.env.DATABASE_URL.includes("supabase.com") ||
  process.env.DATABASE_URL.includes("pooler.supabase.com");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: needsSupabasePoolerSsl ? { rejectUnauthorized: false } : undefined,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type ScenarioSeed = {
  id: string;
  kind?: string;
  title: string;
  bodySystem: string;
  description: string;
  rubric: string;
  requiredKeywords: string[];
  optionalKeywords: string[];
  requiredKeywordGroups: unknown;
  optionalKeywordGroups: unknown;
  modelAnswer: string;
  steps: Array<{
    order: number;
    title: string;
    prompt: string;
    rubric: string;
    requiredKeywordGroups: unknown;
    optionalKeywordGroups: unknown;
    modelAnswer: string;
    maxScore: number;
    passScore: number;
    formSchema: unknown;
  }>;
};

type ScenarioSeedFile = {
  generatedFrom: string[];
  scenarios: ScenarioSeed[];
};

function cleanRubricText(value: string) {
  return value.replace(/^[\s\-•·]+/, "").trim();
}

function cleanKeywordList(keywords: unknown) {
  if (!Array.isArray(keywords)) {
    return [];
  }

  return keywords
    .filter((keyword): keyword is string => typeof keyword === "string")
    .map(cleanRubricText)
    .filter(Boolean);
}

function cleanKeywordGroups(groups: unknown) {
  if (!Array.isArray(groups)) {
    return [];
  }

  return groups.flatMap((group) => {
    if (!group || typeof group !== "object") {
      return [];
    }

    const source = group as Record<string, unknown>;
    const label = typeof source.label === "string"
      ? cleanRubricText(source.label)
      : "";
    const keywords = cleanKeywordList(source.keywords);

    if (!label || keywords.length === 0) {
      return [];
    }

    return [{ ...source, label, keywords }];
  });
}

function flatKeywords(groups: unknown) {
  return cleanKeywordGroups(groups).flatMap((group) => group.keywords);
}

async function main() {
  const seedPath = join(process.cwd(), "prisma", "scenario-docx-data.json");
  const seedFile = JSON.parse(
    readFileSync(seedPath, "utf8")
  ) as ScenarioSeedFile;

  for (const [index, scenarioSeed] of seedFile.scenarios.entries()) {
    const scenario = await prisma.scenario.upsert({
      where: { id: scenarioSeed.id },
      update: {
        title: scenarioSeed.title,
        bodySystem: scenarioSeed.bodySystem,
        description: scenarioSeed.description,
        scenarioKind: scenarioSeed.kind === "test" ? "test" : "exercise",
        isEnabled: true,
        sortOrder: index + 1,
        rubric: scenarioSeed.rubric,
        requiredKeywords: cleanKeywordList(scenarioSeed.requiredKeywords),
        optionalKeywords: cleanKeywordList(scenarioSeed.optionalKeywords),
        requiredKeywordGroups: cleanKeywordGroups(scenarioSeed.requiredKeywordGroups) as object,
        optionalKeywordGroups: cleanKeywordGroups(scenarioSeed.optionalKeywordGroups) as object,
        modelAnswer: scenarioSeed.modelAnswer,
      },
      create: {
        id: scenarioSeed.id,
        title: scenarioSeed.title,
        bodySystem: scenarioSeed.bodySystem,
        description: scenarioSeed.description,
        scenarioKind: scenarioSeed.kind === "test" ? "test" : "exercise",
        isEnabled: true,
        sortOrder: index + 1,
        rubric: scenarioSeed.rubric,
        requiredKeywords: cleanKeywordList(scenarioSeed.requiredKeywords),
        optionalKeywords: cleanKeywordList(scenarioSeed.optionalKeywords),
        requiredKeywordGroups: cleanKeywordGroups(scenarioSeed.requiredKeywordGroups) as object,
        optionalKeywordGroups: cleanKeywordGroups(scenarioSeed.optionalKeywordGroups) as object,
        modelAnswer: scenarioSeed.modelAnswer,
      },
    });

    for (const stepSeed of scenarioSeed.steps) {
      const requiredKeywords = flatKeywords(stepSeed.requiredKeywordGroups);
      const optionalKeywords = flatKeywords(stepSeed.optionalKeywordGroups);

      await prisma.scenarioStep.upsert({
        where: {
          scenarioId_order: {
            scenarioId: scenario.id,
            order: stepSeed.order,
          },
        },
        update: {
          title: stepSeed.title,
          prompt: stepSeed.prompt,
          rubric: stepSeed.rubric,
          requiredKeywords,
          optionalKeywords,
          requiredKeywordGroups: cleanKeywordGroups(stepSeed.requiredKeywordGroups) as object,
          optionalKeywordGroups: cleanKeywordGroups(stepSeed.optionalKeywordGroups) as object,
          modelAnswer: stepSeed.modelAnswer,
          maxScore: stepSeed.maxScore,
          passScore: stepSeed.passScore,
          formSchema: stepSeed.formSchema as object,
        },
        create: {
          scenarioId: scenario.id,
          order: stepSeed.order,
          title: stepSeed.title,
          prompt: stepSeed.prompt,
          rubric: stepSeed.rubric,
          requiredKeywords,
          optionalKeywords,
          requiredKeywordGroups: cleanKeywordGroups(stepSeed.requiredKeywordGroups) as object,
          optionalKeywordGroups: cleanKeywordGroups(stepSeed.optionalKeywordGroups) as object,
          modelAnswer: stepSeed.modelAnswer,
          maxScore: stepSeed.maxScore,
          passScore: stepSeed.passScore,
          formSchema: stepSeed.formSchema as object,
        },
      });
    }
  }

  console.log(
    `Seed completed: ${seedFile.scenarios.length} scenarios from ${seedFile.generatedFrom.length} documents.`
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
