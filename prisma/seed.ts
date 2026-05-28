import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Check your .env file.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const scenario = await prisma.scenario.upsert({
    where: {
      id: "back-pain-scenario-001",
    },
    update: {
      title: "Acute Lower Back Pain",
      bodySystem: "Musculoskeletal System",
      description:
        "A 55-year-old female patient presents with lower back pain in an outpatient department setting. The student should assess the chief complaint, collect present illness using COLDSPA, screen for red flags, provide initial nursing advice, and identify referral needs.",
      rubric:
        "Evaluate whether the student can safely assess lower back pain, collect complete clinical information, screen for red flags, provide appropriate initial nursing advice, and identify when medical referral is required.",
      requiredKeywords: [
        "back pain",
        "assessment",
        "red flags",
        "rest",
        "medical care",
      ],
      optionalKeywords: [
        "pain severity",
        "duration",
        "numbness",
        "weakness",
        "warm compress",
      ],
      requiredKeywordGroups: [
        {
          label: "Back pain problem",
          keywords: ["ปวดหลัง", "back pain", "lower back pain"],
        },
        {
          label: "Clinical assessment",
          keywords: ["ประเมิน", "ซักประวัติ", "ตรวจร่างกาย", "assessment"],
        },
        {
          label: "Red flag screening",
          keywords: [
            "อาการอันตราย",
            "อาการชา",
            "ชา",
            "อ่อนแรง",
            "มีไข้",
            "ไข้",
            "ปัสสาวะผิดปกติ",
            "red flag",
            "numbness",
            "weakness",
            "fever",
            "bladder",
            "bowel",
          ],
        },
        {
          label: "Initial care advice",
          keywords: [
            "พัก",
            "พักผ่อน",
            "หลีกเลี่ยงการยกของหนัก",
            "ไม่ยกของหนัก",
            "ประคบอุ่น",
            "rest",
            "avoid heavy lifting",
            "warm compress",
          ],
        },
        {
          label: "Referral or medical care",
          keywords: [
            "พบแพทย์",
            "ส่งต่อ",
            "ไปโรงพยาบาล",
            "medical care",
            "refer",
            "referral",
          ],
        },
      ],
      optionalKeywordGroups: [
        {
          label: "Pain severity",
          keywords: ["ระดับความปวด", "คะแนนความปวด", "pain score", "severity"],
        },
        {
          label: "Pain duration",
          keywords: ["ระยะเวลา", "กี่วัน", "นานเท่าไร", "duration"],
        },
        {
          label: "Pain relief",
          keywords: ["ยาแก้ปวด", "พารา", "pain relief", "paracetamol"],
        },
      ],
      modelAnswer:
        "The student should assess the location, severity, onset, and duration of the pain, screen for red flags such as numbness, weakness, fever, trauma, or bladder and bowel problems, advise rest and avoidance of heavy lifting, and recommend medical care if symptoms worsen or neurological symptoms appear.",
    },
    create: {
      id: "back-pain-scenario-001",
      title: "Acute Lower Back Pain",
      bodySystem: "Musculoskeletal System",
      description:
        "A 55-year-old female patient presents with lower back pain in an outpatient department setting. The student should assess the chief complaint, collect present illness using COLDSPA, screen for red flags, provide initial nursing advice, and identify referral needs.",
      rubric:
        "Evaluate whether the student can safely assess lower back pain, collect complete clinical information, screen for red flags, provide appropriate initial nursing advice, and identify when medical referral is required.",
      requiredKeywords: [
        "back pain",
        "assessment",
        "red flags",
        "rest",
        "medical care",
      ],
      optionalKeywords: [
        "pain severity",
        "duration",
        "numbness",
        "weakness",
        "warm compress",
      ],
      requiredKeywordGroups: [
        {
          label: "Back pain problem",
          keywords: ["ปวดหลัง", "back pain", "lower back pain"],
        },
        {
          label: "Clinical assessment",
          keywords: ["ประเมิน", "ซักประวัติ", "ตรวจร่างกาย", "assessment"],
        },
        {
          label: "Red flag screening",
          keywords: [
            "อาการอันตราย",
            "อาการชา",
            "ชา",
            "อ่อนแรง",
            "มีไข้",
            "ไข้",
            "ปัสสาวะผิดปกติ",
            "red flag",
            "numbness",
            "weakness",
            "fever",
            "bladder",
            "bowel",
          ],
        },
        {
          label: "Initial care advice",
          keywords: [
            "พัก",
            "พักผ่อน",
            "หลีกเลี่ยงการยกของหนัก",
            "ไม่ยกของหนัก",
            "ประคบอุ่น",
            "rest",
            "avoid heavy lifting",
            "warm compress",
          ],
        },
        {
          label: "Referral or medical care",
          keywords: [
            "พบแพทย์",
            "ส่งต่อ",
            "ไปโรงพยาบาล",
            "medical care",
            "refer",
            "referral",
          ],
        },
      ],
      optionalKeywordGroups: [
        {
          label: "Pain severity",
          keywords: ["ระดับความปวด", "คะแนนความปวด", "pain score", "severity"],
        },
        {
          label: "Pain duration",
          keywords: ["ระยะเวลา", "กี่วัน", "นานเท่าไร", "duration"],
        },
        {
          label: "Pain relief",
          keywords: ["ยาแก้ปวด", "พารา", "pain relief", "paracetamol"],
        },
      ],
      modelAnswer:
        "The student should assess the location, severity, onset, and duration of the pain, screen for red flags such as numbness, weakness, fever, trauma, or bladder and bowel problems, advise rest and avoidance of heavy lifting, and recommend medical care if symptoms worsen or neurological symptoms appear.",
    },
  });

  const steps = [
    {
      order: 1,
      title: "Initial Pain Assessment",
      prompt:
        "The patient reports lower back pain. What key assessment questions should you ask first?",
      rubric:
        "The answer should include pain location, pain severity, onset, duration, and factors that make the pain better or worse.",
      requiredKeywords: ["location", "severity", "onset", "duration"],
      optionalKeywords: ["radiation", "movement", "pain scale", "history"],
      requiredKeywordGroups: [
        {
          label: "Pain location",
          keywords: [
            "ปวดตรงไหน",
            "ตำแหน่งที่ปวด",
            "บริเวณไหน",
            "หลังส่วนล่าง",
            "บั้นเอว",
            "location",
            "where is the pain",
          ],
        },
        {
          label: "Pain severity",
          keywords: [
            "ระดับความปวด",
            "คะแนนความปวด",
            "ปวดกี่คะแนน",
            "pain score",
            "severity",
          ],
        },
        {
          label: "Pain onset",
          keywords: [
            "เริ่มปวด",
            "เริ่มมีอาการ",
            "ปวดมานาน",
            "onset",
            "started",
          ],
        },
        {
          label: "Pain duration",
          keywords: [
            "ปวดนานเท่าไร",
            "แต่ละครั้งนานเท่าไร",
            "ระยะเวลา",
            "duration",
          ],
        },
      ],
      optionalKeywordGroups: [
        {
          label: "Pain radiation",
          keywords: ["ปวดร้าว", "ร้าวลงขา", "radiation"],
        },
        {
          label: "Aggravating factor",
          keywords: [
            "ปวดมากขึ้น",
            "ขยับตัว",
            "ยกของ",
            "movement",
            "worse",
          ],
        },
        {
          label: "Relieving factor",
          keywords: ["อาการดีขึ้น", "พัก", "ยาแก้ปวด", "better", "relief"],
        },
      ],
      modelAnswer:
        "I would ask about the location of the pain, severity using a pain scale, when the pain started, how long it has lasted, whether it radiates anywhere, and what movements make it better or worse.",
    },
    {
      order: 2,
      title: "Red Flag Screening",
      prompt:
        "What red flag symptoms should you check before giving basic nursing advice?",
      rubric:
        "The answer should screen for neurological symptoms, infection signs, trauma history, and bladder or bowel problems.",
      requiredKeywords: ["numbness", "weakness", "fever", "trauma"],
      optionalKeywords: [
        "bladder",
        "bowel",
        "saddle anesthesia",
        "weight loss",
      ],
      requiredKeywordGroups: [
        {
          label: "Numbness",
          keywords: ["ชา", "อาการชา", "numbness"],
        },
        {
          label: "Weakness",
          keywords: ["อ่อนแรง", "ขาอ่อนแรง", "weakness"],
        },
        {
          label: "Fever",
          keywords: ["ไข้", "ตัวร้อน", "fever"],
        },
        {
          label: "Trauma",
          keywords: ["อุบัติเหตุ", "กระแทก", "หกล้ม", "trauma", "injury"],
        },
      ],
      optionalKeywordGroups: [
        {
          label: "Bladder or bowel symptoms",
          keywords: [
            "ปัสสาวะ",
            "อุจจาระ",
            "กลั้นปัสสาวะไม่ได้",
            "bladder",
            "bowel",
          ],
        },
        {
          label: "Saddle anesthesia",
          keywords: ["ชาบริเวณก้น", "saddle anesthesia"],
        },
        {
          label: "Unexplained weight loss",
          keywords: ["น้ำหนักลด", "weight loss"],
        },
      ],
      modelAnswer:
        "I would check for numbness, weakness, fever, recent trauma, bladder or bowel problems, saddle anesthesia, unexplained weight loss, or worsening neurological symptoms.",
    },
    {
      order: 3,
      title: "Initial Nursing Advice",
      prompt:
        "If there are no red flags, what safe initial nursing advice can you provide?",
      rubric:
        "The answer should provide safe conservative care advice and avoid unsafe or overly aggressive recommendations.",
      requiredKeywords: ["rest", "avoid heavy lifting", "warm compress", "monitor"],
      optionalKeywords: [
        "gentle movement",
        "hydration",
        "pain relief",
        "follow up",
      ],
      requiredKeywordGroups: [
        {
          label: "Rest",
          keywords: ["พัก", "พักผ่อน", "rest"],
        },
        {
          label: "Avoid heavy lifting",
          keywords: [
            "หลีกเลี่ยงการยกของหนัก",
            "ไม่ยกของหนัก",
            "avoid heavy lifting",
          ],
        },
        {
          label: "Warm compress",
          keywords: ["ประคบอุ่น", "warm compress"],
        },
        {
          label: "Monitor symptoms",
          keywords: ["สังเกตอาการ", "ติดตามอาการ", "monitor"],
        },
      ],
      optionalKeywordGroups: [
        {
          label: "Gentle movement",
          keywords: ["ขยับเบา ๆ", "gentle movement"],
        },
        {
          label: "Pain relief",
          keywords: ["ยาแก้ปวด", "พารา", "pain relief", "paracetamol"],
        },
        {
          label: "Follow up",
          keywords: ["ติดตาม", "follow up"],
        },
      ],
      modelAnswer:
        "I would advise short-term rest, avoiding heavy lifting, using a warm compress, gentle movement as tolerated, monitoring symptoms, and following up if the pain does not improve.",
    },
    {
      order: 4,
      title: "Referral Decision",
      prompt:
        "When should the patient seek medical care or be referred to a healthcare provider?",
      rubric:
        "The answer should explain urgent referral signs and worsening symptoms that need professional medical evaluation.",
      requiredKeywords: ["medical care", "worsening pain", "numbness", "weakness"],
      optionalKeywords: [
        "fever",
        "trauma",
        "bladder",
        "bowel",
        "emergency",
      ],
      requiredKeywordGroups: [
        {
          label: "Seek medical care",
          keywords: ["พบแพทย์", "ไปโรงพยาบาล", "medical care"],
        },
        {
          label: "Worsening pain",
          keywords: ["ปวดมากขึ้น", "อาการแย่ลง", "worsening pain"],
        },
        {
          label: "Numbness",
          keywords: ["ชา", "อาการชา", "numbness"],
        },
        {
          label: "Weakness",
          keywords: ["อ่อนแรง", "ขาอ่อนแรง", "weakness"],
        },
      ],
      optionalKeywordGroups: [
        {
          label: "Fever",
          keywords: ["ไข้", "fever"],
        },
        {
          label: "Trauma",
          keywords: ["อุบัติเหตุ", "trauma"],
        },
        {
          label: "Bladder or bowel symptoms",
          keywords: ["ปัสสาวะ", "อุจจาระ", "bladder", "bowel"],
        },
        {
          label: "Emergency",
          keywords: ["ฉุกเฉิน", "emergency"],
        },
      ],
      modelAnswer:
        "The patient should seek medical care if the pain gets worse, does not improve, or if numbness, weakness, fever, trauma, bladder or bowel problems, or other neurological symptoms occur.",
    },
  ];

  for (const step of steps) {
    await prisma.scenarioStep.upsert({
      where: {
        scenarioId_order: {
          scenarioId: scenario.id,
          order: step.order,
        },
      },
      update: {
        title: step.title,
        prompt: step.prompt,
        rubric: step.rubric,
        requiredKeywords: step.requiredKeywords,
        optionalKeywords: step.optionalKeywords,
        requiredKeywordGroups: step.requiredKeywordGroups,
        optionalKeywordGroups: step.optionalKeywordGroups,
        modelAnswer: step.modelAnswer,
      },
      create: {
        scenarioId: scenario.id,
        order: step.order,
        title: step.title,
        prompt: step.prompt,
        rubric: step.rubric,
        requiredKeywords: step.requiredKeywords,
        optionalKeywords: step.optionalKeywords,
        requiredKeywordGroups: step.requiredKeywordGroups,
        optionalKeywordGroups: step.optionalKeywordGroups,
        modelAnswer: step.modelAnswer,
      },
    });
  }

  console.log("Seed completed: Back Pain scenario with Thai-first keyword groups.");
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