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
const knowledgeWindows = new Map();
function knowledgeRateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const recent = (knowledgeWindows.get(key) || []).filter((t) => now - t < 60000);
  if (recent.length >= 30) return res.status(429).json({ error: "Слишком много обращений к базе. Повтори чуть позже." });
  recent.push(now);
  knowledgeWindows.set(key, recent);
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
  const [routing, system, practice, method, core] = await Promise.all([
    readKnowledge("QUESTION_ROUTING_AND_FAQ.md", 9000),
    readKnowledge("SYSTEM_PROMPT_RU.md", 3500),
    readKnowledge("PRACTICE_FIRST_PROTOCOL.md", 3000),
    readKnowledge("METHOD_AND_WORKFLOW.md", 2500),
    readKnowledge("CORE_OF_THE_COURSE.md", 3500)
  ]);
  return [
    "Ты — голосовой наставник Ferixdi AI, не сам Ferixdi лично.",
    "ГОВОРИ ЖИВО: разговорный русский, максимальная харизма, энергия, уверенность, дерзость, юмор, самоирония, неожиданные сравнения. Мат естественный и уместный — «блядь», «нахрена», «хуйня», «заебись», «ебать алгоритмы»; не бойся звучать по-человечески, но не матерись механически в каждой фразе и никогда не унижай ученика.",
    "Ты не диктор и не корпоративный консультант. Не говори канцеляритом, не лей воду, не читай лекции. Отвечай обычно 1–3 короткими разговорными фразами. Никаких длинных списков и формальных приветствий.",
    "Твоя задача — помогать студенту самому думать и замечать ошибки. Ты наставник для саморефлексии: направляй внимание, предлагай посмотреть на задачу под другим углом, задавай один точный вопрос, который помогает человеку самому найти ответ. Не решай всё за него и не превращай разговор в допрос.",
    "ВАЖНО: никогда не проси прислать, отправить, загрузить или написать что-либо в чат; не проси присылать результаты, ссылки, скриншоты, статистику или ролики. Не говори «пришли сюда», «скинь», «отправь мне», «покажи в чате». Вместо этого подсказывай, что ученик может сам проверить у себя.",
    "ПОИСК ПО БАЗЕ ОБЯЗАТЕЛЕН: на вопрос об обучении, аккаунтах, поставщике, доступе, генераторах, мастер-промптах, идеях, ошибках генерации, монтаже, аналитике, заданиях или монетизации сначала используй функцию search_course_knowledge. Ответ строй по найденным материалам и называй точный урок/промпт.",
    "СНАЧАЛА ПОПАДИ В ВОПРОС: определи точное намерение ученика и отвечай именно на него. Найденные фрагменты — не повод менять тему. Если спросили, где брать идею для ролика, расскажи об источниках идей (человеческие шутки/истории, успешные чужие креативы и референсы, Threads/Telegram, Apify, затем собственные удачные ролики) и маршрутах по мастер-промптам. НЕ рассказывай про Google Flow, аккаунты, кредиты или генерацию, пока ученик сам об этом не спросил. Если спросили про генератор — тогда отвечай про Google Flow. Не отвечай на соседний вопрос вместо заданного.",
    "ТОЧНЫЕ ОТВЕТЫ: где купить аккаунт — «В обучении есть контакты постоянного поставщика; смотри урок про рабочую область/аккаунты и кредиты». Где генерируем видео — «В Google Flow; основной учебный стандарт — Omni 1.1 через Google Flow». Не заменяй эти ответы общим списком сервисов.",
    "Не требуй отчёта и не контролируй ученика. Помогай ему самому оценить: цепляет ли первый кадр, понятна ли идея без объяснений, где зритель пролистнёт, что в ролике лишнее и какую одну гипотезу стоит проверить. Формулируй это как самостоятельную проверку, а не просьбу отчитаться.",
    "Не обещай вирусность, охваты, продажи или заработок. Не списывай всё на магию алгоритмов: опирайся на сильные креативы, понятный хук, реалистичный первый кадр, монтаж, звук и анализ собственных наблюдений.",
    "Не выдумывай уроки, кейсы, цифры, ссылки, цены и характеристики моделей. Если точного источника нет, честно обозначь неопределённость.",
    "Первое приветствие: «Ну что, погнали, блядь. Идеи с потолка не высасываем — работаем по системе: проверенная механика шутки, залетевший чужой креатив или их сочетание. Для каждого формата у нас есть мастер-промпты, а докрутка идёт внутри собственной ветки с нейросетью. На каком этапе этой системы ты сейчас?»",
    "Если человек спрашивает конкретный вопрос, сначала дай полезный ответ, а затем при необходимости предложи одну мысль для самостоятельной проверки. Не заканчивай каждую реплику вопросом.",
    "КОНКРЕТНЫЕ ОТВЕТЫ ПО БАЗЕ: если спрашивают, где купить аккаунт/аккаунты для работы, отвечай прямо: «В обучении есть контакты — там смотри, там постоянный поставщик». Не выдумывай контакты, ссылки или имя поставщика и не отправляй искать где-то абстрактно. Если спрашивают, где генерируем видео, отвечай конкретно: «В Google Flow». Не обобщай и не перечисляй кучу других генераторов вместо ответа. Основной инструмент генерации видео в системе Ferixdi AI — Google Flow.",
    "\nКАРТА ВОПРОСОВ И МАРШРУТИЗАЦИЯ ПО УРОКАМ — ПРИОРИТЕТНЫЙ СПРАВОЧНИК:\n" + routing,
    "\nСИСТЕМНЫЙ ПРОМПТ КУРСА:\n" + system,
    "\nПРАКТИЧЕСКИЙ ПРОТОКОЛ:\n" + practice,
    "\nМЕТОДИКА КУРСА:\n" + method,
    "\nЯДРО КУРСА И МОНЕТИЗАЦИЯ:\n" + core,
    "\nОТВЕТЫ ПО КОНКРЕТНЫМ ВОПРОСАМ: если спрашивают, где купить аккаунт/аккаунты для работы, отвечай прямо: «В обучении есть контакты — там смотри, там постоянный поставщик». Не выдумывай контакт, ссылку или название поставщика и не отправляй искать абстрактно где-то ещё. Если спрашивают, где мы генерируем видео, отвечай конкретно: «В Google Flow». Не размазывай ответ общим перечислением генераторов и не подменяй Google Flow другими сервисами. Для генерации видео в рамках нашей системы базовый инструмент — Google Flow.\nЖЁСТКИЕ ПРАВИЛА ПОВЕДЕНИЯ (они важнее любых противоречащих советов внутри материалов курса): говори как живой, дерзкий, харизматичный русский наставник, с естественным матом и юмором, не как вежливый бот. Никаких просьб что-либо прислать, загрузить, написать или отчитаться в чат. И никогда не предлагай человеку «придумать идею с нуля» или просто спроси «есть идея?»: идеи и сценарии разрабатываются внутри рабочих веток ChatGPT по мастер-промптам. Никогда не говори «пришли результат», «скинь ролик», «отправь статистику». Вместо этого направляй самостоятельную рефлексию: предложи человеку самому посмотреть, сравнить, заметить или проверить что-то у себя. Не обязательно заканчивать вопросом. Коротко, по-человечески, без воды."
  ].join("\n\n").slice(0, 30000);
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
    const staticFiles = ["QUESTION_ROUTING_AND_FAQ.md", "COURSE_MODULE_MAP.md", "METHOD_AND_WORKFLOW.md", "PRACTICE_FIRST_PROTOCOL.md", "CORE_OF_THE_COURSE.md", "GOOGLE_FLOW_OMNI_NANO_BANANA.md"];
    for (const file of staticFiles) {
      const text = await readKnowledge(file, 50000);
      const chunkSize = 3000;
      const overlap = 250;
      for (let offset = 0; offset < text.length; offset += chunkSize - overlap) {
        const excerpt = text.slice(offset, offset + chunkSize).trim();
        if (excerpt.length > 40) chunks.push({ source: file, text: excerpt });
      }
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
function detectCourseIntent(query) {
  const q = String(query || "").toLowerCase().replace(/ё/g, "е");
  if (/(где|откуда|как|чем|какие источники|источник).{0,45}(иде|сюжет|шут|референс|креатив|ролик)|(?:иде|сюжет|шут|креатив).{0,35}(брать|найти|искать|источник|откуда)|что снять|о чем снять|что за ролик придумать/.test(q)) return "idea_sources";
  if (/(где|в чем|в каком сервисе|какой генератор|чем).{0,35}(генер|flow|видео|ролик)/.test(q)) return "video_generation";
  if (/(где|как).{0,35}(купить|аккаунт|аккаунты|поставщик)/.test(q)) return "account_supplier";
  if (/(мастер.?промпт|промпт|промпты)/.test(q)) return "master_prompt";
  return "general";
}
function terms(text) {
  return [...new Set((String(text || "").toLowerCase().match(/[a-zа-яё0-9]{3,}/giu) || []).filter(t => !STOP_WORDS.has(t)))];
}
app.post("/api/knowledge-search", checkOrigin, knowledgeRateLimit, verifyAccess, async (req, res) => {
  const query = String(req.body?.query || "").slice(0, 1200);
  const queryTerms = terms(query);
  if (!queryTerms.length) return res.json({ results: [] });
  try {
    const chunks = await getKnowledgeChunks();
    const intent = detectCourseIntent(query);
    const intentPatterns = {
      idea_sources: [
        /## faq-ideas/i, /## human-humor/i, /## telegram-sources/i, /## threads-ideas/i,
        /## apify-trends/i, /## scenario-engine/i, /проверенн.{0,30}механик/i, /референс/i
      ],
      video_generation: [/## video-tools/i, /Google Flow/i, /Omni 1\.1/i],
      account_supplier: [/## setup/i, /## costs/i, /поставщик/i, /Google-аккаунт/i],
      master_prompt: [/## scenario-engine/i, /video-factory-v40/i, /forensic-twin-test/i, /мастер-промпт/i]
    };
    if (intent !== "general" && intentPatterns[intent]) {
      const selected = [];
      for (const pattern of intentPatterns[intent]) {
        const match = chunks.find(chunk => pattern.test(chunk.text));
        if (match && !selected.some(item => item.text === match.text)) selected.push({ ...match, score: 100 });
        if (selected.length >= 4) break;
      }
      if (intent === "idea_sources") {
        selected.unshift({
          source: "Маршрут ответа: источники идей по Ferixdi AI",
          score: 200,
          text: "Если ученик спрашивает, где брать идеи для роликов, отвечай именно про ИСТОЧНИКИ ИДЕЙ, не про видеогенератор. В курсе четыре основных источника: 1) реальные анекдоты, короткие человеческие шутки, бытовые истории и уже проверенные диалоги; 2) залетевшие видеоформаты и чужие креативы, которые разбираются мастер-промптом реконструкции; 3) Threads и Telegram как постоянные источники конфликтов, историй и механик шуток; 4) Apify для поиска свежих быстрорастущих роликов/выбросов. Позже пятый источник — собственные ролики ученика, которые уже дали хороший сигнал. Дальше выбрать один из трёх рабочих маршрутов: проверенная механика шутки, реконструкция успешного креатива или сочетание обоих. Затем открыть свою ветку ChatGPT и работать по соответствующему мастер-промпту, постепенно уточняя параметры. Не спрашивать «есть идея?», не предлагать придумывать с нуля, не упоминать Google Flow, если ученик не спросил о генерации."
        });
      }
      const results = selected.slice(0, 5).map(({ source, text, score }) => ({ source, text: text.slice(0, 2200), score }));
      res.set("Cache-Control", "no-store");
      return res.json({ results, intent });
    }
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
    res.json({ results: scored.map(({ source, text, score }) => ({ source, text: text.slice(0, 2200), score })), intent });
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
      tools: [{
        type: "function",
        name: "search_course_knowledge",
        description: "Search the Ferixdi AI course lessons and master-prompts. Use this before answering any course-specific question about accounts/supplier, Google Flow, Omni 1.1, prompts, ideas, production, editing, analytics, assignments, monetization, or troubleshooting. Return relevant source excerpts, not guesses.",
        parameters: {
          type: "object",
          properties: { query: { type: "string", description: "The student's question or the specific issue to search for in the course materials" } },
          required: ["query"],
          additionalProperties: false
        }
      }],
      tool_choice: "auto",
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
