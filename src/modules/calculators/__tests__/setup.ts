/**
 * Настройки окружения тестов модуля: матчеры jest-dom для vitest.
 * Файл подключается в `setupFiles` конфигурации vitest и попадает в программу
 * TypeScript, чтобы `toBeInTheDocument` и остальные матчеры были типизированы.
 */

import "@testing-library/jest-dom/vitest";
