import React from "react";
import { cleanAnnaText } from "../utils/textUtils";

interface AnnaTextProps {
  /** Сырой текст совета Анны (может содержать \n\n как разделители абзацев). */
  text: string;
  /** Имя пользователя для очистки дублей (cleanAnnaText). */
  userName?: string;
  /** Доп. классы для внешнего контейнера. */
  className?: string;
}

/**
 * Единый рендер развёрнутых советов Анны.
 * Разбивает текст по \n\n и выводит каждый абзац отдельным <p>,
 * чтобы двойные переносы не превращались в гигантские пустоты
 * (как это происходило с whitespace-pre-wrap).
 */
export default function AnnaText({ text, userName, className = "" }: AnnaTextProps) {
  const cleaned = cleanAnnaText(text || "", userName);
  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className={className}>
      {paragraphs.map((paragraph, idx) => (
        <p key={idx} className="indent-4 mb-2 last:mb-0">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
