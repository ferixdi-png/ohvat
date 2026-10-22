# Ferixdi AI Voice Mentor

Minimal voice-first web app for the Ferixdi AI mentor. The interface is deliberately simple: one button to start or end a live voice conversation.

## Current MVP

- Node.js + Express backend.
- Browser microphone/audio via WebRTC and OpenAI Realtime.
- Short-lived client secret created on the server; the main OpenAI API key is never sent to the browser.
- Mentor instructions are loaded from the repository knowledge files at runtime.
- Optional shared access code (MENTOR_ACCESS_CODE), origin restriction (ALLOWED_ORIGIN), basic per-IP rate limit and health endpoint.
- Single-button interface with a restrained dark theme.

## Run locally

1. Install Node.js 22 or newer.
2. Copy .env.example to .env.
3. Put your real key in .env as OPENAI_API_KEY=... Never commit .env.
4. For a public deployment, set a strong MENTOR_ACCESS_CODE.
5. Run:

    npm install
    npm start

6. Open http://localhost:3000 and allow microphone access.

## Deploy to Render

1. Create a Web Service from this GitHub repository or use render.yaml as a Blueprint.
2. Set environment variables in Render: OPENAI_API_KEY (secret), MENTOR_ACCESS_CODE (strong shared code), ALLOWED_ORIGIN (optional exact deployed URL).
3. Deploy and inspect /api/health.
4. Test one short conversation before sharing the URL.

## Important

- A working Realtime API project and billing are required. Model availability depends on the OpenAI project.
- Never put the API key in HTML, frontend JavaScript, a public repository or a screenshot.
- If MENTOR_ACCESS_CODE is blank, the endpoint is public. Do not share a public URL widely before access control and spend limits are configured.
- The shared access code is only an MVP gate, not individual student authentication. For a paid course rollout, implement student accounts/allowlisting, durable rate limits and spend monitoring.
- Full semantic retrieval across all course lessons is not implemented yet. The app injects the core system prompt, practice protocol and methodology into the voice session. Lesson-level retrieval and citations are the next stage.
- The app has not yet been live-tested with your OpenAI API key. If session creation fails, verify billing and Realtime model access for the project.
- If session creation fails, verify the model is enabled for your OpenAI project.

## Knowledge files

See knowledge/SYSTEM_PROMPT_RU.md, knowledge/PRACTICE_FIRST_PROTOCOL.md, knowledge/METHOD_AND_WORKFLOW.md and knowledge/COURSE_MODULE_MAP.md.
