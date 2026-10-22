# Ferixdi AI Voice Mentor

Minimal voice-first web app for the Ferixdi AI mentor. The interface is deliberately simple: one button to start or end a live voice conversation.

## Current MVP

- Node.js + Express backend.
- Browser microphone/audio via WebRTC and OpenAI Realtime.
- WebRTC SDP offer is sent to the app server, which creates the Realtime call through the GA `/v1/realtime/calls` endpoint; the main OpenAI API key never reaches the browser.
- Mentor instructions are loaded from the repository knowledge files at runtime.
- Keyword retrieval over extracted lesson text and prompt files is connected to each voice turn.
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
- Retrieval currently uses keyword matching over extracted lesson text and prompt chunks, not embeddings or a semantic search index. The extracted lesson text may omit content hidden in dynamic HTML helper blocks; this is documented in knowledge/SOURCE_IMPORT_STATUS.md.
- The app has not yet been live-tested end-to-end with the deployed OpenAI project. If call creation fails, inspect the Render logs and verify billing and Realtime model access.
- If session creation fails, verify the model is enabled for your OpenAI project.

## Knowledge files

See knowledge/SYSTEM_PROMPT_RU.md, knowledge/PRACTICE_FIRST_PROTOCOL.md, knowledge/METHOD_AND_WORKFLOW.md and knowledge/COURSE_MODULE_MAP.md.
