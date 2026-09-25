// @vitest-environment jsdom
/*
 * Поведение экрана целиком: фокус уезжает в диалог и возвращается, Escape
 * закрывает только верхний диалог, профильная карточка честно сообщает статус.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CalculatorsScreen from "../screens/CalculatorsScreen";

const hostProfile = { gender: "female", age: 32, height: 172, weight: 68, activity: 1.55, systolic: 120, diastolic: 80 };

afterEach(cleanup);
// Кэш личных данных — на весь jsdom: без очистки тесты читают правки друг друга.
beforeEach(() => window.localStorage.clear());

function dialogByTitle(title: string) {
  return screen.getByRole("dialog", { name: title });
}

describe("CalculatorsScreen", () => {
  it("рендерит все калькуляторы по секциям и статус профиля", () => {
    render(<CalculatorsScreen profile={hostProfile} onClose={() => undefined} />);
    expect(screen.getByRole("heading", { name: "Калькуляторы" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Открыть калькулятор «/ })).toHaveLength(20);
    expect(screen.getByRole("button", { name: /Личные данные/ })).toHaveAccessibleName(/Готово к расчётам/);
    expect(screen.getByRole("button", { name: /Личные данные/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("не заполненный профиль называется по именам полей", () => {
    render(<CalculatorsScreen profile={null} onClose={() => undefined} />);
    expect(screen.getByRole("button", { name: /Личные данные/ })).toHaveAccessibleName(/Не заполнено/);
  });

  it("ставит фокус в диалог, держит Tab внутри и возвращает фокус карточке", () => {
    render(<CalculatorsScreen profile={hostProfile} onClose={() => undefined} />);
    const card = screen.getByRole("button", { name: "Открыть калькулятор «Базовый обмен»" });
    card.focus();
    fireEvent.click(card);

    const dialog = dialogByTitle("Базовый обмен");
    const closeButton = within(dialog).getByRole("button", { name: "Закрыть калькулятор" });
    expect(closeButton).toHaveFocus();

    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    const last = focusable[focusable.length - 1];
    last.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    closeButton.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(card).toHaveFocus();
  });

  it("Escape закрывает только верхний диалог, если открыт профиль поверх калькулятора", () => {
    render(<CalculatorsScreen profile={hostProfile} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Открыть калькулятор «Процент жира»" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Процент жира" })).getByRole("button", { name: /заполнить личные данные/i }));

    expect(screen.getByRole("dialog", { name: "Мой профиль" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Мой профиль" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Процент жира" })).toBeInTheDocument();
  });

  it("правку профиля можно отдать хосту", () => {
    const onProfileChange = vi.fn();
    render(<CalculatorsScreen profile={hostProfile} onProfileChange={onProfileChange} onClose={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: /Личные данные/ }));
    const dialog = screen.getByRole("dialog", { name: "Мой профиль" });
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: /Вес/ }), { target: { value: "72" } });

    expect(onProfileChange).toHaveBeenCalledWith(expect.objectContaining({ weightKg: 72 }));
  });

  it("давление из настроек хоста приезжает в личные данные", () => {
    render(<CalculatorsScreen profile={hostProfile} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /Личные данные/ }));
    const dialog = screen.getByRole("dialog", { name: "Мой профиль" });
    expect(within(dialog).getByRole("spinbutton", { name: /Верхнее давление/ })).toHaveValue(120);
    expect(within(dialog).getByRole("spinbutton", { name: /Нижнее давление/ })).toHaveValue(80);
    // Давление не входит в обязательные поля: статус профиля от него не зависит.
    expect(screen.getByRole("button", { name: /Личные данные/ })).toHaveAccessibleName(/Готово к расчётам/);
  });

  it("правка веса переживает перезагрузку и возвращается из кэша", () => {
    const first = render(<CalculatorsScreen profile={hostProfile} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /Личные данные/ }));
    fireEvent.change(within(screen.getByRole("dialog", { name: "Мой профиль" })).getByRole("spinbutton", { name: /Вес/ }), { target: { value: "72" } });
    fireEvent.click(within(screen.getByRole("dialog", { name: "Мой профиль" })).getByRole("button", { name: "Закрыть профиль" }));
    first.unmount();

    render(<CalculatorsScreen profile={hostProfile} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /Личные данные/ }));
    expect(within(screen.getByRole("dialog", { name: "Мой профиль" })).getByRole("spinbutton", { name: /Вес/ })).toHaveValue(72);
  });

  it("если приложение отдало другое значение, оно свежее и перекрывает кэш", () => {
    const first = render(<CalculatorsScreen profile={hostProfile} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /Личные данные/ }));
    fireEvent.change(within(screen.getByRole("dialog", { name: "Мой профиль" })).getByRole("spinbutton", { name: /Вес/ }), { target: { value: "72" } });
    first.unmount();

    // Пользователь поправил вес в Настройках приложения — его значение важнее кэша.
    render(<CalculatorsScreen profile={{ ...hostProfile, weight: 65 }} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /Личные данные/ }));
    const dialog = screen.getByRole("dialog", { name: "Мой профиль" });
    expect(within(dialog).getByRole("spinbutton", { name: /Вес/ })).toHaveValue(65);
    // А поле, которого у хоста нет, остаётся из кэша.
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: /Талия/ }), { target: { value: "84" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Закрыть профиль" }));
    cleanup();
    render(<CalculatorsScreen profile={{ ...hostProfile, weight: 65 }} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /Личные данные/ }));
    expect(within(screen.getByRole("dialog", { name: "Мой профиль" })).getByRole("spinbutton", { name: /Талия/ })).toHaveValue(84);
  });

  it("«Вернуть данные приложения» очищает кэш, а не только экран", () => {
    const first = render(<CalculatorsScreen profile={hostProfile} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /Личные данные/ }));
    const dialog = screen.getByRole("dialog", { name: "Мой профиль" });
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: /Вес/ }), { target: { value: "72" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Вернуть данные приложения" }));
    expect(within(screen.getByRole("dialog", { name: "Мой профиль" })).getByRole("spinbutton", { name: /Вес/ })).toHaveValue(68);
    first.unmount();

    render(<CalculatorsScreen profile={hostProfile} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /Личные данные/ }));
    expect(within(screen.getByRole("dialog", { name: "Мой профиль" })).getByRole("spinbutton", { name: /Вес/ })).toHaveValue(68);
  });

  it("забитое хранилище не ломает экран: считаем только валидный кэш", () => {
    window.localStorage.setItem("calculators.profile.v1", "{это не json");
    render(<CalculatorsScreen profile={hostProfile} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /Личные данные/ }));
    expect(within(screen.getByRole("dialog", { name: "Мой профиль" })).getByRole("spinbutton", { name: /Вес/ })).toHaveValue(68);
  });

  it("закрытие экрана — всегда воля хоста", () => {
    const onClose = vi.fn();
    render(<CalculatorsScreen profile={hostProfile} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Закрыть калькуляторы" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("не тянет манусовских ресурсов и не обещает лишнего", () => {
    const { container } = render(<CalculatorsScreen profile={hostProfile} onClose={() => undefined} />);
    expect(container.innerHTML).not.toMatch(/manus/i);
    expect(document.body.innerHTML).not.toMatch(/manus/i);
  });

  it("плашки и секции одеты фирменными миниатюрами, а не векторными заглушками", () => {
    render(<CalculatorsScreen profile={hostProfile} onClose={() => undefined} />);
    const images = [...document.querySelectorAll("img")];
    // 20 плашек + 4 иконки разделов + пиктограмма шапки.
    expect(images).toHaveLength(25);
    expect(images.every((img) => /\.webp(\?|$)/.test(img.getAttribute("src") ?? ""))).toBe(true);
    // Смысл несёт соседний текст, поэтому картинки декоративные и не дублируют название.
    expect(images.every((img) => img.getAttribute("alt") === "")).toBe(true);
    // Миниатюра плашки — всегда 40×40, ряд не должен «прыгать» по высоте.
    const cards = screen.getAllByRole("button", { name: /^Открыть калькулятор «/ });
    expect(cards).toHaveLength(20);
    expect(cards.every((card) => {
      const thumb = card.querySelector("img");
      return thumb?.getAttribute("width") === "40" && thumb?.getAttribute("height") === "40";
    })).toBe(true);
    // Векторных иконок и стрелок перехода в плашках больше нет.
    expect(cards.every((card) => card.querySelector("svg") === null)).toBe(true);
    // Пиктограмма шапки — 42×42, без плитки и рамки.
    const headerIcon = document.querySelector("header img");
    expect(headerIcon?.getAttribute("width")).toBe("42");
    expect(headerIcon?.getAttribute("height")).toBe("42");
    expect(headerIcon?.className).not.toMatch(/bg-white|rounded|ring/);
  });
});
