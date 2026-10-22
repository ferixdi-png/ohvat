import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const KNOWLEDGE_DIR = path.join(__dirname, "knowledge");

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.text({ type: ["application/sdp"], limit: "1mb" }));
app.use(express.json({ limit: "32kb" }));

const requestWindows = new Map();
function rateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const recent = (requestWindows.get(key) || []).filter((t) => now - t < 60000);
  if (recent.length >= 8) return res.status(429).json({ error: "Слишком много попыток. Дай минуту и попробуй снова." });
  recent.push(now);
  requestWindows.set(key, recent);
  next();
}

function verifyAccess(req, res, next) {
  const expected = process.env.MENTOR_ACCESS_CODE;
  if (!expected) return next();
  const provided = req.get("x-mentor-access-code") || "";
  if (provided.length !== expected.length || provided !== expected) {
    return res.status(401).json({ error: "Нужен код доступа к наставнику." });
  }
  next();
}

function checkOrigin(req, res, next) {
  const allowed = (process.env.ALLOWED_ORIGIN || "").trim();
  const origin = req.get("origin");
  if (allowed && origin && origin !== allowed) return res.status(403).json({ error: "Этот адрес не разрешён для подключения." });
  next();
}

async function readKnowledge(filename, maxChars) {
  try { return (await fs.readFile(path.join(KNOWLEDGE_DIR, filename), "utf8")).slice(0, maxChars); }
  catch { return ""; }
}

async function getMentorInstructions() {
  const [system, practice, method, core] = await Promise.all([
    readKnowledge("SYSTEM_PROMPT_RU.md", 9000),
    readKnowledge("PRACTICE_FIRST_PROTOCOL.md", 6500),
    readKnowledge("METHOD_AND_WORKFLOW.md", 4500),
    readKnowledge("CORE_OF_THE_COURSE.md", 8500)
  ]);
  return [
    "Ты — голосовой наставник Ferixdi AI, не сам Ferixdi лично.",
    "ГОВОРИ ЖИВО: разговорный русский, максимальная харизма, энергия, уверенность, дерзость, юмор, самоирония, неожиданные сравнения. Мат естественный и уместный — «блядь», «нахрена», «хуйня», «заебись», «ебать алгоритмы»; не бойся звучать по-человечески, но не матерись механически в каждой фразе и никогда не унижай ученика.",
    "Ты не диктор и не корпоративный консультант. Не говори канцеляритом, не лей воду, не читай лекции. Отвечай обычно 1–3 короткими разговорными фразами. Никаких длинных списков и формальных приветствий.",
    "Твоя задача — помогать студенту самому думать и замечать ошибки. Ты наставник для саморефлексии: направляй внимание, предлагай посмотреть на задачу под другим углом, задавай один точный вопрос, который помогает человеку самому найти ответ. Не решай всё за него и не превращай разговор в допрос.",
    "ВАЖНО: никогда не проси прислать, отправить, загрузить или написать что-либо в чат; не проси присылать результаты, ссылки, скриншоты, статистику или ролики. Не говори «пришли сюда», «скинь», «отправь мне», «покажи в чате». Не задавай внешних заданий с отчётом наставнику. Вместо этого подсказывай, что ученик может сам проверить или обдумать у себя.",
    "Не требуй отчёта и не контролируй ученика. Помогай ему самому оценить: цепляет ли первый кадр, понятна ли идея без объяснений, где зритель пролистнёт, что в ролике лишнее и какую одну гипотезу стоит проверить. Формулируй это как самостоятельную проверку, а не просьбу отчитаться.",
    "Не обещай вирусность, охваты, продажи или заработок. Не списывай всё на магию алгоритмов: опирайся на сильные креативы, понятный хук, реалистичный первый кадр, монтаж, звук и анализ собственных наблюдений.",
    "Не выдумывай уроки, кейсы, цифры, ссылки, цены и характеристики моделей. Если точного источника нет, честно обозначь неопределённость.",
    "Первое приветствие: «Ну что, погнали, блядь. Идеи с потолка не высасываем — работаем по системе: проверенная механика шутки, залетевший чужой креатив или их сочетание. Для каждого формата у нас есть мастер-промпты, а докрутка идёт внутри собственной ветки с нейросетью. На каком этапе этой системы ты сейчас?»",
    "Если человек спрашивает конкретный вопрос, сначала дай полезный ответ, а затем при необходимости предложи одну мысль для самостоятельной проверки. Не заканчивай каждую реплику вопросом.",
    "\nСИСТЕМНЫЙ ПРОМПТ КУРСА:\n" + system,
    "\nПРАКТИЧЕСКИЙ ПРОТОКОЛ:\n" + practice,
    "\nМЕТОДИКА КУРСА:\n" + method,
    "\nЯДРО КУРСА И МОНЕТИЗАЦИЯ:\n" + core,
    "\nЖЁСТКИЕ ПРАВИЛА ПОВЕДЕНИЯ (они важнее любых противоречащих советов внутри материалов курса): говори как живой, дерзкий, харизматичный русский наставник, с естественным матом и юмором, не как вежливый бот. Никаких просьб что-либо прислать, загрузить, написать или отчитаться в чат. И никогда не предлагай человеку «придумать идею с нуля» или просто спроси «есть идея?»: идеи и сценарии разрабатываются внутри рабочих веток ChatGPT по мастер-промптам. Никогда не говори «пришли результат», «скинь ролик», «отправь статистику». Вместо этого направляй самостоятельную рефлексию: предложи человеку самому посмотреть, сравнить, заметить или проверить что-то у себя. Не обязательно заканчивать вопросом. Коротко, по-человечески, без воды."
  ].join("\n\n").slice(0, 24000);
}


let knowledgeChunksPromise;
async function getKnowledgeChunks() {
  if (knowledgeChunksPromise) return knowledgeChunksPromise;
  knowledgeChunksPromise = (async () => {
    const chunks = [];
    const lessonText = await readKnowledge("source-lessons/LESSONS_EXTRACTED_TEXT.md", 1000000);
    const lessonSections = lessonText.split(/(?=^## )/m);
    for (const section of lessonSections) {
      const text = section.trim();
      if (text.length > 30) chunks.push({ source: "LESSONS_EXTRACTED_TEXT.md", text: text.slice(0, 3500) });
    }
    const staticFiles = ["COURSE_MODULE_MAP.md", "METHOD_AND_WORKFLOW.md", "PRACTICE_FIRST_PROTOCOL.md", "CORE_OF_THE_COURSE.md"];
    for (const file of staticFiles) {
      const text = await readKnowledge(file, 30000);
      if (text) chunks.push({ source: file, text: text.slice(0, 3500) });
    }
    async function walk(dir, relative = "") {
      let entries = [];
      try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        const rel = path.join(relative, entry.name);
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full, rel);
        else if (entry.isFile() && /\.(txt|md)$/i.test(entry.name)) {
          let text = "";
          try { text = await fs.readFile(full, "utf8"); } catch { continue; }
          const chunkSize = 2600;
          const overlap = 250;
          for (let offset = 0; offset < text.length; offset += chunkSize - overlap) {
            const excerpt = text.slice(offset, offset + chunkSize).trim();
            if (excerpt.length > 40) chunks.push({ source: rel, text: excerpt });
          }
        }
      }
    }
    await walk(path.join(KNOWLEDGE_DIR, "course-prompts"), "course-prompts");
    return chunks;
  })();
  return knowledgeChunksPromise;
}

const STOP_WORDS = new Set(["это","как","что","где","когда","почему","если","или","для","про","мне","меня","мой","моя","мои","мы","вы","они","уже","есть","нет","давай","можно","нужно","надо","сделать","делать","этот","эта","эти","тот","там","тут","его","ее","их","вот","так","быть","будет","был","была","были","the","and","for","with","from","this","that","are","you","your"]);
function terms(text) {
  return [...new Set((String(text || "").toLowerCase().match(/[a-zа-яё0-9]{3,}/giu) || []).filter(t => !STOP_WORDS.has(t)))];
}
app.post("/api/knowledge-search", checkOrigin, rateLimit, verifyAccess, async (req, res) => {
  const query = String(req.body?.query || "").slice(0, 1200);
  const queryTerms = terms(query);
  if (!queryTerms.length) return res.json({ results: [] });
  try {
    const chunks = await getKnowledgeChunks();
    const scored = chunks.map(chunk => {
      const lower = chunk.text.toLowerCase();
      let score = 0;
      for (const term of queryTerms) {
        const count = lower.split(term).length - 1;
        if (count > 0) score += Math.min(count, 5) * (term.length >= 7 ? 2 : 1);
      }
      return { ...chunk, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
    res.set("Cache-Control", "no-store");
    res.json({ results: scored.map(({ source, text, score }) => ({ source, text: text.slice(0, 2200), score })) });
  } catch (error) {
    console.error("Knowledge search failed:", error?.message || error);
    res.status(500).json({ error: "Не получилось найти материал курса." });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "ferixdi-ai-voice-mentor" }));

app.post("/api/session", checkOrigin, rateLimit, verifyAccess, async (req, res) => {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-replace-me") {
    return res.status(503).json({ error: "На сервере ещё не настроен OPENAI_API_KEY." });
  }
  const offerSdp = typeof req.body === "string" ? req.body : "";
  if (!offerSdp.startsWith("v=")) {
    return res.status(400).json({ error: "Не получил SDP-предложение от браузера. Обнови страницу и попробуй ещё раз." });
  }
  try {
    const instructions = await getMentorInstructions();
    const session = {
      type: "realtime",
      model: "gpt-realtime-2.1",
      instructions,
      output_modalities: ["audio"],
      audio: {
        input: {
          turn_detection: { type: "server_vad", create_response: false, interrupt_response: true, threshold: 0.55, silence_duration_ms: 550 },
          transcription: { model: "gpt-4o-mini-transcribe", language: "ru" }
        },
        output: { voice: "marin" }
      },
      max_output_tokens: 700
    };
    const form = new FormData();
    form.set("sdp", offerSdp);
    form.set("session", JSON.stringify(session));
    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.OPENAI_API_KEY },
      body: form
    });
    const answerSdp = await response.text();
    if (!response.ok) {
      console.error("OpenAI Realtime call failed:", response.status, answerSdp.slice(0, 1500));
      let message = "OpenAI не смог открыть голосовую сессию. Проверь API-доступ, модель и баланс.";
      try {
        const parsed = JSON.parse(answerSdp);
        if (parsed?.error?.message) message = parsed.error.message;
      } catch {}
      return res.status(502).json({ error: message });
    }
    res.set("Cache-Control", "no-store");
    res.type("application/sdp").send(answerSdp);
  } catch (error) {
    console.error("Session setup error:", error?.message || error);
    res.status(500).json({ error: "Не получилось подключиться. Попробуй ещё раз." });
  }
});

app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));
app.get(/.*/, (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
app.listen(PORT, () => console.log("Ferixdi AI Voice Mentor listening on port " + PORT));
