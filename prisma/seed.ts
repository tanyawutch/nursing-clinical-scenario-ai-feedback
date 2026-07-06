import "dotenv/config";
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

const prisma = new PrismaClient({
  adapter,
});

type KeywordGroupSeed = {
  label: string;
  keywords: string[];
  points?: number;
  category?: string;
  avoidNegation?: boolean;
};

type FormFieldSeed = {
  id: string;
  labelTh: string;
  labelEn: string;
  placeholderTh: string;
  placeholderEn: string;
  rows?: number;
};

function group(
  label: string,
  keywords: string[],
  points = 1,
  category = "General",
  avoidNegation = true
): KeywordGroupSeed {
  return { label, keywords, points, category, avoidNegation };
}

function field(
  id: string,
  labelTh: string,
  labelEn: string,
  placeholderTh: string,
  placeholderEn: string,
  rows = 4
): FormFieldSeed {
  return { id, labelTh, labelEn, placeholderTh, placeholderEn, rows };
}

const scenarioDescription = [
  "ผู้ป่วยหญิงไทย อายุ 55 ปี ชื่อ นางดอกไม้ น้ำหอม อาชีพค้าขาย มาที่ห้องตรวจแผนกผู้ป่วยนอก โรงพยาบาลชุมชน ด้วยอาการสำคัญปวดหลัง",
  "ผู้ป่วยรูปร่างท้วม แต่งกายสะอาด สีหน้าเรียบเฉย นั่งอยู่ในห้องตรวจ ยืนขายของตลอดทั้งวันและยกของหนักด้วยท่าทางไม่เหมาะสม",
  "ปฏิเสธโรคประจำตัว ปฏิเสธแพ้ยา ไม่สูบบุหรี่ ไม่ดื่มสุรา ดื่มน้ำหวานและน้ำอัดลมเป็นประจำ 2-3 แก้วต่อวัน และไม่ได้ออกกำลังกาย",
].join(" ");

const scenarioModelAnswer = [
  "Final diagnosis: Muscle strain / Back pain / Low back pain.",
  "PI summary: ปวดหลังส่วนล่างแบบตื้อ ๆ ปวดมากเมื่อขยับ ทำงาน หรือยกของ อาการทุเลาเมื่อพักหรือรับประทานพาราเซตามอล ไม่มีปวดร้าวลงขา ไม่มีชา/อ่อนแรง ไม่มีไข้ ไม่มีปัสสาวะแสบขัด",
  "PE: tenderness and muscle spasm at lower back, limited lumbar ROM due to pain, motor power 5/5, SLRT negative, kidney punch negative.",
].join("\n");

const steps = [
  {
    order: 1,
    title: "ซักประวัติการเจ็บป่วยปัจจุบันด้วย COLDSPA",
    prompt:
      "ซักประวัติ Present Illness ของผู้ป่วยปวดหลังโดยใช้หลัก COLDSPA ให้ครบถ้วน",
    maxScore: 18,
    passScore: 15,
    rubric:
      "ประเมินการซักประวัติ PI ด้วย COLDSPA รวม 18 keywords ควรตอบได้ตรงอย่างน้อย 15 keywords",
    formSchema: {
      instructionTh:
        "ตอบเป็นคำถามที่นักศึกษาจะใช้ซักประวัติผู้ป่วย แยกตามหัวข้อ COLDSPA",
      instructionEn:
        "Write the questions you would ask the patient, organized by COLDSPA.",
      fields: [
        field(
          "characteristic",
          "Characteristic - ลักษณะอาการปวด",
          "Characteristic - pain characteristic",
          "เช่น ลักษณะอาการปวดเป็นแบบไหน ปวดตื้อ แปล๊บ หรือร้าวหรือไม่",
          "Ask about the character of pain."
        ),
        field(
          "onset",
          "Onset - เวลาเริ่มมีอาการ",
          "Onset - symptom onset",
          "เช่น เริ่มปวดเมื่อไร ปวดมากี่วันแล้ว",
          "Ask when the pain started."
        ),
        field(
          "location",
          "Location - ตำแหน่งที่ปวด",
          "Location - pain location",
          "เช่น ปวดตรงไหนของหลัง ชี้ตำแหน่งได้ไหม",
          "Ask where the pain is located."
        ),
        field(
          "duration",
          "Duration - ระยะเวลาที่ปวด",
          "Duration - pain duration",
          "เช่น แต่ละครั้งปวดนานเท่าไร ปวดตลอดวันหรือไม่",
          "Ask how long each episode lasts."
        ),
        field(
          "severity",
          "Severity - ระดับความรุนแรง",
          "Severity - pain severity",
          "เช่น ให้คะแนนความปวด 1-10 ได้กี่คะแนน",
          "Ask for pain score from 1 to 10."
        ),
        field(
          "pattern",
          "Pattern/Precipitating factor - สิ่งกระตุ้นและสิ่งที่ทำให้อาการทุเลา",
          "Pattern/Precipitating factor",
          "เช่น ทำอะไรแล้วปวดมากขึ้น ทำอย่างไรแล้วปวดลดลง",
          "Ask what worsens and relieves the pain."
        ),
        field(
          "associated",
          "Associated symptoms - อาการร่วม",
          "Associated symptoms",
          "เช่น มีไข้ ปวดร้าวลงขา ชา ขาอ่อนแรง หรือปัสสาวะผิดปกติหรือไม่",
          "Ask about fever, radiating pain, numbness, weakness, and urinary symptoms."
        ),
      ],
    },
    requiredKeywordGroups: [
      group("ลักษณะของอาการปวด", ["ลักษณะ", "ปวดแบบ", "ตื้อ", "แปล๊บ", "characteristic"], 2, "COLDSPA"),
      group("เวลาเริ่มปวด", ["เริ่มปวด", "ปวดมา", "กี่วัน", "นานเท่าไร", "onset"], 2, "COLDSPA"),
      group("ตำแหน่งปวด", ["ตำแหน่ง", "ตรงไหน", "บริเวณ", "หลังส่วนล่าง", "บั้นเอว", "location"], 2, "COLDSPA"),
      group("ระยะเวลาที่ปวด", ["แต่ละครั้ง", "ระยะเวลา", "ปวดตลอด", "duration"], 2, "COLDSPA"),
      group("ระดับความปวด", ["คะแนนความปวด", "ระดับความปวด", "pain score", "severity", "1-10"], 2, "COLDSPA"),
      group("ปัจจัยกระตุ้น", ["ปวดมากขึ้น", "กำเริบ", "ยกของ", "ขยับ", "ทำงาน", "worse"], 2, "COLDSPA"),
      group("ปัจจัยบรรเทา", ["ปวดลดลง", "ทุเลา", "พัก", "ยาแก้ปวด", "relief"], 2, "COLDSPA"),
      group("ไข้", ["ไข้", "ตัวร้อน", "fever"], 1, "Associated", false),
      group("ปวดร้าวลงขา", ["ร้าวลงขา", "ปวดร้าว", "radiating"], 1, "Associated", false),
      group("ชา/อ่อนแรง", ["ชา", "อ่อนแรง", "numbness", "weakness"], 1, "Associated", false),
      group("ปัสสาวะผิดปกติ", ["ปัสสาวะ", "แสบขัด", "urinary", "bladder"], 1, "Associated", false),
    ],
    optionalKeywordGroups: [
      group("ROS", ["review of system", "ทบทวนอาการตามระบบ", "ROS"], 1, "Optional"),
      group("COLDSPA", ["COLDSPA"], 1, "Optional"),
    ],
    modelAnswer:
      "ควรถามครบ COLDSPA ได้แก่ ลักษณะอาการปวด, เริ่มปวดเมื่อไร, ตำแหน่ง, ระยะเวลา, ระดับความปวด, ปัจจัยที่ทำให้ปวดมากขึ้น/ทุเลา และอาการร่วม เช่น ไข้ ปวดร้าวลงขา ชา อ่อนแรง และปัสสาวะผิดปกติ",
  },
  {
    order: 2,
    title: "ตั้งสมมติฐานโรค 3 โรคและให้เหตุผล",
    prompt:
      "ตั้ง Differential diagnosis 3 โรค เรียงจากโรคที่นึกถึงมากที่สุดไปน้อยที่สุด พร้อมเหตุผลประกอบ",
    maxScore: 10,
    passScore: 8,
    rubric:
      "ให้คะแนนจากการระบุโรค 3 ลำดับและเหตุผลประกอบ ได้แก่ Muscle strain, HNP/Sciatica, Osteoporosis",
    formSchema: {
      instructionTh: "กรอกโรคที่นึกถึงและเหตุผลประกอบให้ครบทั้ง 3 ลำดับ",
      instructionEn: "Enter three differential diagnoses with supporting reasons.",
      fields: [
        field("dx1", "โรคลำดับที่ 1 และเหตุผล", "Diagnosis 1 and rationale", "เช่น Muscle strain เพราะ...", "Example: Muscle strain because...", 5),
        field("dx2", "โรคลำดับที่ 2 และเหตุผล", "Diagnosis 2 and rationale", "เช่น HNP เพราะ...", "Example: HNP because...", 5),
        field("dx3", "โรคลำดับที่ 3 และเหตุผล", "Diagnosis 3 and rationale", "เช่น Osteoporosis เพราะ...", "Example: Osteoporosis because...", 5),
      ],
    },
    requiredKeywordGroups: [
      group("โรคลำดับที่ 1 Muscle strain/Back pain/Low back pain", ["muscle strain", "back pain", "low back pain", "กล้ามเนื้อส่วนหลังเคล็ด"], 1, "Diagnosis"),
      group("เหตุผลตำแหน่งชัดเจน", ["ตำแหน่งชัดเจน", "หลังส่วนล่าง", "บั้นเอว"], 1, "Reason 1"),
      group("เหตุผล mechanical pain", ["mechanical pain", "ปวดเมื่อเคลื่อนไหว", "ขยับ", "พักแล้วทุเลา"], 1, "Reason 1"),
      group("เหตุผลยกของหนัก/ท่าทางไม่เหมาะสม", ["ยกของหนัก", "ท่าทางไม่เหมาะสม", "อิริยาบถ"], 1, "Reason 1"),
      group("โรคลำดับที่ 2 HNP/Sciatica", ["herniated nucleus pulposus", "HNP", "sciatica"], 1, "Diagnosis"),
      group("เหตุผล HNP ปวดหลังส่วนล่าง", ["ปวดหลังส่วนล่าง", "lower back"], 1, "Reason 2"),
      group("เหตุผล HNP ปวดตื้อ/ไม่มี neuro deficit", ["ปวดตื้อ", "dull pain", "ไม่ร้าวลงขา", "ไม่มีขาอ่อนแรง", "ไม่ชา"], 1, "Reason 2", false),
      group("โรคลำดับที่ 3 Osteoporosis", ["osteoporosis", "กระดูกพรุน"], 1, "Diagnosis"),
      group("เหตุผล Osteoporosis เพศหญิงวัยหมดประจำเดือน", ["เพศหญิง", "วัยหมดประจำเดือน", "55"], 1, "Reason 3"),
      group("เหตุผล Osteoporosis น้ำอัดลม/ปวดตื้อ", ["น้ำอัดลม", "น้ำหวาน", "ปวดตื้อ"], 1, "Reason 3"),
    ],
    optionalKeywordGroups: [],
    modelAnswer:
      "1) Muscle strain/Back pain/Low back pain เพราะปวดหลังส่วนล่างชัดเจน เป็น mechanical pain ปวดเมื่อเคลื่อนไหวหรือยกของหนัก และทุเลาเมื่อพัก 2) HNP/Sciatica เพราะมีปวดหลังส่วนล่างและประวัติยกของหนัก แต่ไม่มีปวดร้าวลงขาหรือขาอ่อนแรง 3) Osteoporosis เพราะเป็นหญิงวัยหมดประจำเดือน ดื่มน้ำอัดลมเป็นประจำ และมีปวดหลังแบบตื้อ",
  },
  {
    order: 3,
    title: "วางแผนการตรวจเพื่อช่วย Differential diagnosis",
    prompt:
      "ระบุการตรวจทางห้องปฏิบัติการ/รังสีที่เหมาะสมและแปลผลที่ช่วยประกอบการวินิจฉัยแยกโรค",
    maxScore: 3,
    passScore: 3,
    rubric:
      "การตรวจที่ต้องการคือ Film L-S spine หรือ X-ray lumbar spine AP พร้อมแปลผลสำหรับ Muscle strain, HNP และ Osteoporosis",
    formSchema: {
      instructionTh: "ระบุชื่อการตรวจและผลที่คาดว่าจะพบในแต่ละโรค",
      instructionEn: "Specify the investigation and expected findings for each diagnosis.",
      fields: [
        field("investigation", "การตรวจที่ควรส่ง", "Investigation", "เช่น Film L-S spine / X-ray lumbar spine AP", "Example: Film L-S spine / X-ray lumbar spine AP", 3),
        field("interpretation", "การแปลผล", "Interpretation", "เช่น Muscle strain ปกติ, HNP abnormal L4-L5, Osteoporosis bone density ลดลง", "Example: normal for muscle strain; L4-L5 abnormality for HNP; decreased bone density for osteoporosis", 5),
      ],
    },
    requiredKeywordGroups: [
      group("Film L-S spine/X-ray lumbar spine AP", ["film l-s spine", "x-ray lumbar spine", "lumbar spine ap", "เอกซเรย์", "x-ray"], 1, "Investigation"),
      group("Muscle strain ผลปกติ", ["normal", "ปกติ"], 1, "Interpretation"),
      group("HNP/Osteoporosis แปลผลผิดปกติ", ["l4-l5", "compression", "decrease bone density", "bone density", "มวลกระดูก", "โปร่งแสง", "ผิดปกติ"], 1, "Interpretation"),
    ],
    optionalKeywordGroups: [],
    modelAnswer:
      "ส่ง Film L-S spine/X-ray lumbar spine AP โดย Muscle strain มักได้ผลปกติ, HNP อาจพบความผิดปกติหรือ compression ที่ L4-L5, Osteoporosis อาจพบ bone density ลดลงหรือกระดูกโปร่งแสงมากกว่าปกติ",
  },
  {
    order: 4,
    title: "วางแผนการรักษาและการพยาบาล",
    prompt:
      "วางแผนการรักษาโรคเบื้องต้นและการพยาบาลที่เหมาะสมกับผู้ป่วยรายนี้",
    maxScore: 8,
    passScore: 6,
    rubric:
      "ประเมิน specific treatment, symptomatic treatment และ nursing care รวม 8 คะแนน",
    formSchema: {
      instructionTh:
        "ระบุแผนการรักษา ยาที่ให้พร้อม dose/route/time/จำนวน และแผนการพยาบาล",
      instructionEn:
        "Provide treatment, medication details, and nursing care plan.",
      fields: [
        field("specific", "Specific treatment", "Specific treatment", "ระบุว่ามีหรือไม่มี specific treatment", "State whether specific treatment is required.", 3),
        field("symptomatic", "Symptomatic treatment", "Symptomatic treatment", "ระบุยา ขนาด วิธีให้ เวลา และจำนวน เช่น Ibuprofen 400 mg 1 tab oral tid.pc #20 tabs", "Include medication, dose, route, timing, and amount.", 6),
        field("nursing", "Plan for nursing care", "Plan for nursing care", "เช่น สังเกตและประเมินอาการปวดหลัง ให้ Paracetamol เมื่อ pain score > 5", "Include observation, pain assessment, and paracetamol when pain score > 5.", 5),
      ],
    },
    requiredKeywordGroups: [
      group("Specific treatment ไม่มี", ["ไม่มี", "no specific", "specific treatment ไม่มี"], 1, "Treatment"),
      group("Ibuprofen 400 mg", ["ibuprofen", "brufen", "400"], 1, "Medication"),
      group("Paracetamol 500 mg", ["paracetamol", "พารา", "500"], 1, "Medication"),
      group("Methyl salicylate", ["methyl salicylate", "ยานวด", "ทายา"], 1, "Medication"),
      group("Route/time/amount", ["oral", "tid", "pc", "prn", "q 4-6", "tabs", "tube", "หลังอาหาร"], 1, "Medication"),
      group("สังเกต/ประเมินอาการปวดหลัง", ["สังเกต", "ประเมิน", "อาการปวดหลัง", "pain score"], 1, "Nursing"),
      group("ให้ยา Paracetamol", ["ให้ยา", "paracetamol", "พารา"], 1, "Nursing"),
      group("pain score > 5", ["pain score > 5", "คะแนนมากกว่า 5", "> 5"], 1, "Nursing"),
    ],
    optionalKeywordGroups: [],
    modelAnswer:
      "Specific treatment ไม่มี Symptomatic treatment ได้แก่ Ibuprofen 400 mg 1 tab oral tid.pc #20 tabs, Paracetamol 500 mg 2 tab oral PRN for pain q 4-6 hr #10 tabs, Methyl salicylate apply at right lower back #1 tube Nursing care: สังเกตและประเมินอาการปวดหลัง และให้ Paracetamol 500 mg 2 tabs oral เมื่อ pain score > 5",
  },
  {
    order: 5,
    title: "ให้คำแนะนำผู้ป่วยตามหลัก DMETHOD",
    prompt:
      "ระบุคำแนะนำผู้ป่วยรายนี้ตามหลัก DMETHOD ให้ครบถ้วน",
    maxScore: 18,
    passScore: 14,
    rubric:
      "ให้คำแนะนำตามหลัก DMETHOD ต้องได้อย่างน้อย 14 จาก 18 keywords",
    formSchema: {
      instructionTh: "ให้คำแนะนำแยกตาม D-M-E-T-H-O-D โดยภาษาหลักเป็นภาษาไทย",
      instructionEn: "Provide patient education using DMETHOD.",
      fields: [
        field("disease", "D - Disease", "D - Disease", "อธิบายโรค สาเหตุ และการกลับเป็นซ้ำ", "Explain diagnosis, cause, prognosis, and recurrence.", 4),
        field("medication", "M - Medication", "M - Medication", "อธิบายยา Ibuprofen, Paracetamol และข้อควรระวัง", "Explain medications and precautions.", 5),
        field("treatment", "T - Treatment", "T - Treatment", "แนะนำการประคบเย็นและยาทาคลายกล้ามเนื้อ", "Advise cold compress and topical medicine.", 4),
        field("health", "H - Health", "H - Health", "แนะนำท่าทางยกของ การนั่ง และการออกกำลังกาย", "Advise posture, lifting, sitting, and exercise.", 4),
        field("outpatient", "O - Out patient", "O - Out patient", "อธิบายอาการที่ต้องกลับมาตรวจซ้ำ เช่น ปวดมากขึ้นหรือร้าวลงขา", "Explain follow-up and red flags.", 4),
        field("diet", "D - Diet", "D - Diet", "แนะนำลด/งดน้ำหวานและน้ำอัดลม", "Advise reducing sugary drinks and soda.", 3),
      ],
    },
    requiredKeywordGroups: [
      group("วินิจฉัยกล้ามเนื้อส่วนหลังเคล็ด", ["กล้ามเนื้อส่วนหลังเคล็ด", "muscle strain", "วินิจฉัย"], 1, "Disease"),
      group("สาเหตุท่าทางไม่เหมาะสม/ยกของหนัก", ["ท่าทางที่ไม่เหมาะสม", "ยกของหนัก", "อิริยาบถ"], 1, "Disease"),
      group("รักษาหายและกลับเป็นซ้ำได้", ["รักษาให้หาย", "กลับเป็นซ้ำ", "ซ้ำได้"], 1, "Disease"),
      group("Ibuprofen/Brufen", ["ibuprofen", "brufen"], 1, "Medication"),
      group("ระคายเคืองกระเพาะ/หลังอาหาร", ["ระคายเคือง", "กระเพาะ", "หลังอาหาร"], 1, "Medication"),
      group("Paracetamol", ["paracetamol", "พารา"], 1, "Medication"),
      group("Paracetamol ไม่เกิน 8 เม็ด/ตับ", ["8 เม็ด", "ไม่ควรรับประทานติดต่อกัน", "พิษต่อตับ", "ตับ"], 1, "Medication"),
      group("ประคบเย็น", ["ประคบเย็น", "cold compress"], 1, "Treatment"),
      group("ยาทา/ยานวด", ["ทายา", "ยานวด", "methyl salicylate"], 1, "Treatment"),
      group("ท่าทางยกของที่ถูกต้อง", ["ท่าทางที่ถูกต้อง", "ยกของ", "ergonomic"], 1, "Health"),
      group("การนั่ง", ["การนั่ง", "นั่ง"], 1, "Health"),
      group("การออกกำลังกาย", ["ออกกำลังกาย", "exercise"], 1, "Health"),
      group("อาการจะค่อยๆ ทุเลา", ["ทุเลา", "ดีขึ้น"], 1, "Outpatient"),
      group("กลับมาตรวจถ้าปวดมากขึ้น", ["ปวดหลังเป็นมากขึ้น", "ปวดมากขึ้น", "กลับมาตรวจ"], 1, "Outpatient"),
      group("กลับมาตรวจถ้าร้าวลงขา", ["ร้าวลงขา", "ปวดร้าว"], 1, "Outpatient"),
      group("ลดน้ำหวาน", ["ลดน้ำหวาน", "งดน้ำหวาน", "น้ำหวาน"], 1, "Diet"),
      group("ลดน้ำอัดลม", ["ลดน้ำอัดลม", "งดน้ำอัดลม", "น้ำอัดลม"], 1, "Diet"),
      group("ลดความเสี่ยงโรคไม่ติดต่อเรื้อรัง", ["โรคไม่ติดต่อเรื้อรัง", "ncd", "พฤติกรรมเสี่ยง"], 1, "Diet"),
    ],
    optionalKeywordGroups: [],
    modelAnswer:
      "D: โรคคือกล้ามเนื้อส่วนหลังเคล็ดจากการยกของหนัก/ท่าทางไม่เหมาะสม รักษาหายได้แต่กลับเป็นซ้ำได้ M: Ibuprofen ระคายเคืองกระเพาะควรกินหลังอาหาร Paracetamol ไม่เกิน 8 เม็ด/วันและไม่กินติดต่อกันนานเพราะเสี่ยงพิษต่อตับ T: ประคบเย็นและใช้ยาทาบริเวณที่ปวด H: แนะนำท่ายกของ การนั่ง และออกกำลังกาย O: ถ้าปวดมากขึ้นหรือปวดร้าวลงขาให้กลับมาตรวจ D: ลดน้ำหวานและน้ำอัดลม",
  },
];

async function main() {
  const scenario = await prisma.scenario.upsert({
    where: {
      id: "back-pain-scenario-001",
    },
    update: {
      title: "อาการปวดหลังเฉียบพลัน",
      bodySystem: "ระบบกระดูกและกล้ามเนื้อ",
      description: scenarioDescription,
      rubric:
        "ประเมินการดูแลผู้ป่วยปวดหลังใน OPD ตามเอกสาร V2 Scenario Back pain รวม 5 งาน: COLDSPA, Differential diagnosis, Investigation, Treatment/Nursing care และ DMETHOD",
      requiredKeywords: [
        "COLDSPA",
        "Muscle strain",
        "Film L-S spine",
        "Ibuprofen",
        "DMETHOD",
      ],
      optionalKeywords: ["HNP", "Osteoporosis", "Paracetamol"],
      requiredKeywordGroups: [
        group("Final diagnosis Muscle strain/Back pain/Low back pain", [
          "muscle strain",
          "back pain",
          "low back pain",
          "กล้ามเนื้อส่วนหลังเคล็ด",
        ]),
        group("Plan for treatment", ["ibuprofen", "paracetamol", "methyl salicylate"]),
        group("Patient education DMETHOD", ["DMETHOD", "น้ำหวาน", "น้ำอัดลม"]),
      ],
      optionalKeywordGroups: [],
      modelAnswer: scenarioModelAnswer,
    },
    create: {
      id: "back-pain-scenario-001",
      title: "อาการปวดหลังเฉียบพลัน",
      bodySystem: "ระบบกระดูกและกล้ามเนื้อ",
      description: scenarioDescription,
      rubric:
        "ประเมินการดูแลผู้ป่วยปวดหลังใน OPD ตามเอกสาร V2 Scenario Back pain รวม 5 งาน: COLDSPA, Differential diagnosis, Investigation, Treatment/Nursing care และ DMETHOD",
      requiredKeywords: [
        "COLDSPA",
        "Muscle strain",
        "Film L-S spine",
        "Ibuprofen",
        "DMETHOD",
      ],
      optionalKeywords: ["HNP", "Osteoporosis", "Paracetamol"],
      requiredKeywordGroups: [
        group("Final diagnosis Muscle strain/Back pain/Low back pain", [
          "muscle strain",
          "back pain",
          "low back pain",
          "กล้ามเนื้อส่วนหลังเคล็ด",
        ]),
        group("Plan for treatment", ["ibuprofen", "paracetamol", "methyl salicylate"]),
        group("Patient education DMETHOD", ["DMETHOD", "น้ำหวาน", "น้ำอัดลม"]),
      ],
      optionalKeywordGroups: [],
      modelAnswer: scenarioModelAnswer,
    },
  });

  await prisma.attempt.deleteMany({
    where: {
      scenarioId: scenario.id,
    },
  });

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
        maxScore: step.maxScore,
        passScore: step.passScore,
        requiredKeywords: step.requiredKeywordGroups.flatMap((item) => item.keywords),
        optionalKeywords: step.optionalKeywordGroups.flatMap((item) => item.keywords),
        requiredKeywordGroups: step.requiredKeywordGroups,
        optionalKeywordGroups: step.optionalKeywordGroups,
        formSchema: step.formSchema,
        modelAnswer: step.modelAnswer,
      },
      create: {
        scenarioId: scenario.id,
        order: step.order,
        title: step.title,
        prompt: step.prompt,
        rubric: step.rubric,
        maxScore: step.maxScore,
        passScore: step.passScore,
        requiredKeywords: step.requiredKeywordGroups.flatMap((item) => item.keywords),
        optionalKeywords: step.optionalKeywordGroups.flatMap((item) => item.keywords),
        requiredKeywordGroups: step.requiredKeywordGroups,
        optionalKeywordGroups: step.optionalKeywordGroups,
        formSchema: step.formSchema,
        modelAnswer: step.modelAnswer,
      },
    });
  }

  console.log("Seed completed: Back Pain V2 rubric with Thai-first workflow.");
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
