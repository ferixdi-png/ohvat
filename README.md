# Ferixdi AI — Voice Mentor

Рабочая база знаний и спецификация голосового AI-наставника для студентов Ferixdi AI.

## Что здесь лежит
- `knowledge/SYSTEM_PROMPT_RU.md` — роль, голос и правила ответа наставника.
- `knowledge/METHOD_AND_WORKFLOW.md` — производственный цикл AI-Reels.
- `knowledge/MENTORING_AND_DISCIPLINE.md` — работа с провалами, мотивацией и анализом.
- `knowledge/PRACTICE_FIRST_PROTOCOL.md` — обязательный режим: сначала практика, вопросы о сделанном, диагностика роликов и копирование проверенных креативов.
- `knowledge/COURSE_MODULE_MAP.md` — карта 16 модулей и 131 записи уроков/практик из текущей структуры курса.
- `knowledge/SOURCE_IMPORT_STATUS.md` — прозрачный статус переноса; большие исходники могут требовать повторного импорта частями.
- `knowledge/CURRICULUM_MAP.md` — карта направлений курса и источников.
- `knowledge/GOOGLE_FLOW_OMNI_NANO_BANANA.md` — рабочая справка по инструментам с явным разделением подтверждённого и требующего проверки.
- `knowledge/VOICE_MENTOR_TECH_SPEC.md` — архитектура приложения на OpenAI API.
- `knowledge/SECURITY_AND_ROADMAP.md` — доступ студентов, приватность и план реализации.

## Импортированные оригинальные промпты

В `knowledge/course-prompts/` перенесены оригинальные файлы из исходного репозитория Ferixdi AI:
- `video-factory-v40.txt`
- `photorealism-engine.txt`
- `voice-performance.txt`
- `video-recreation-v32.txt`
- `forensic-twin-test.txt`
- `viral-scenario-hook.txt`
- `permanent-characters.txt`
- `apify-trend-scan.txt`
- `omni-10plus.txt`
- `ultra-video-clean.txt`

## Важно
Это стартовый структурированный пакет, а не утверждение, что все 131 урок уже перенесены целиком. Для полной версии нужно последовательно импортировать исходные уроки, PDF, промпты, видео и изображения из исходной базы Ferixdi AI. Не помещайте API-ключи и закрытые материалы в публичный frontend.

## Источники проекта
- Академия: https://ferixdi-png.github.io/ferixdi-ai-academy/
- Исходный репозиторий материалов: https://github.com/ferixdi-png/ferixdi-ai-academy
- Telegram: https://t.me/ferixdi_ai
- Чат создателей: https://t.me/ai_neiro_chat


## OpenAI API key
Ключ пока не вставлять в файлы репозитория. Когда будет создан backend, добавлять его в секретные переменные окружения хостинга под именем `OPENAI_API_KEY`. Локально использовать `.env` (который не коммитится); в GitHub хранить только `.env.example` без настоящего секрета.
