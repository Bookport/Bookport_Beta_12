/**
 * Поведение модального окна экрана: ловушка фокуса, Escape, блокировка прокрутки
 * и возврат фокуса на элемент, который открыл диалог.
 *
 * Общий хук для диалога калькулятора и диалога личных данных — раньше логика
 * дублировалась в двух компонентах.
 */

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function useDialogBehavior<T extends HTMLElement>({ onClose, returnFocusElement, initialFocus }: {
  onClose: () => void;
  returnFocusElement?: HTMLElement | null;
  /** Куда поставить фокус при открытии; по умолчанию — на сам диалог. */
  initialFocus?: RefObject<HTMLElement | null>;
}): RefObject<T | null> {
  const dialogRef = useRef<T | null>(null);
  // Колбэки хоста пересоздаются каждый рендер, а окно живёт одну «сессию»:
  // свежие значения держим в ref, иначе эффект пересобирается на каждом чужом
  // обновлении и успевает вернуть фокус наружу до закрытия.
  const latest = useRef({ onClose, returnFocusElement, initialFocus });
  useEffect(() => {
    latest.current = { onClose, returnFocusElement, initialFocus };
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (latest.current.initialFocus?.current ?? dialog).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      // Если поверх этого диалога открыт другой, Escape и Tab принадлежат верхнему.
      const stack = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
      if (stack.length > 0 && stack[stack.length - 1] !== dialog) return;

      if (event.key === "Escape") {
        event.preventDefault();
        latest.current.onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const [first, last] = [focusable[0], focusable[focusable.length - 1]];
      const active = document.activeElement;
      if (!dialog.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      const target = latest.current.returnFocusElement;
      if (target?.isConnected) target.focus();
    };
    // Эффект открывает и закрывает окно вместе с самим диалогом.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return dialogRef;
}
