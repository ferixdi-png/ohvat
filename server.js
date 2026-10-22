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
  const [system, practice, method] = await Promise.all([
    readKnowledge("SYSTEM_PROMPT_RU.md", 9000),
    readKnowledge("PRACTICE_FIRST_PROTOCOL.md", 6500),
    readKnowledge("METHOD_AND_WORKFLOW.md", 4500)
  ]);
  return [
    "Ты — голосовой наставник Ferixdi AI, не сам Ferixdi лично.",
    "Общайся по-русски, как харизматичный уверенный друг: энергично, прямо, с юмором и естественным матом, если он усиливает мысль. Не читай лекции и не лей воду. Не унижай ученика и не обещай вирусность.",
    "Твоя задача — вместе со студентом ебать алгоритмы не магическими секретами, а сильными креативами, практикой и анализом цифр.",
    "Обычно отвечай 1–4 короткими фразами. Задавай не больше одного вопроса за раз. Не используй markdown, заголовки, длинные списки и формальные приветствия.",
    "Сначала выясняй, что ученик уже сделал. Если он застрял — возвращай к конкретному ролику, первому кадру, проверенной механике, паузам в CapCut, живому звуку и метрикам. Не притворяйся, что видел ролик или знаешь результаты, если их не прислали.",
    "Не выдумывай уроки, кейсы, цифры, ссылки, цены и характеристики моделей. Если точного источника нет, честно скажи, что нужно проверить.",
    "Когда студент начинает разговор, начни коротко: «Ну что, погнали. Что сейчас делаем — ролик разбираем или ты пока застрял на идее?»",
    "\nСИСТЕМНЫЙ ПРОМПТ КУРСА:\n" + system,
    "\nПРАКТИЧЕСКИЙ ПРОТОКОЛ:\n" + practice,
    "\nМЕТОДИКА КУРСА:\n" + method
  ].join("\n\n").slice(0, 24000);
}

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "ferixdi-ai-voice-mentor" }));

app.post("/api/session", checkOrigin, rateLimit, verifyAccess, async (_req, res) => {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-replace-me") {
    return res.status(503).json({ error: "На сервере ещё не настроен OPENAI_API_KEY." });
  }
  try {
    const instructions = await getMentorInstructions();
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.OPENAI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: 600 },
        session: {
          type: "realtime",
          model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-1.5",
          instructions,
          output_modalities: ["audio"],
          audio: {
            input: {
              turn_detection: { type: "server_vad", threshold: 0.55, silence_duration_ms: 550 },
              transcription: { model: "gpt-4o-mini-transcribe", language: "ru" }
            },
            output: { voice: "marin" }
          },
          max_output_tokens: 700
        }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("OpenAI session creation failed:", response.status, JSON.stringify(data).slice(0, 1500));
      return res.status(502).json({ error: "OpenAI не смог открыть голосовую сессию. Проверь API-доступ, модель и баланс." });
    }
    const value = data?.value || data?.client_secret?.value;
    if (!value) {
      console.error("Unexpected client secret response:", JSON.stringify(data).slice(0, 1000));
      return res.status(502).json({ error: "OpenAI вернул неожиданный ответ при создании сессии." });
    }
    res.set("Cache-Control", "no-store");
    res.json({ client_secret: value });
  } catch (error) {
    console.error("Session setup error:", error?.message || error);
    res.status(500).json({ error: "Не получилось подключиться. Попробуй ещё раз." });
  }
});

app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));
app.get(/.*/, (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
app.listen(PORT, () => console.log("Ferixdi AI Voice Mentor listening on port " + PORT));
