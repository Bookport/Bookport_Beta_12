// @vitest-environment jsdom
/*
 * Главный регресс теста: формы считают по профилю, а не по захардкоженным
 * «женщина 32 года 68 кг 172 см 1,55», как было в модуле-шаблоне.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileProvider } from "../contexts/ProfileContext";
import { CalculatorForm } from "../components/CalculatorForm";
import { calculators } from "../lib/calculatorCatalog";
import type { CalculatorId } from "../lib/calculatorCatalog";
import type { CalculatorProfile } from "../types";

const ready: CalculatorProfile = { gender: "female", ageYears: 32, heightCm: 172, weightKg: 68, activity: 1.55, goal: "maintain" };

function renderForm(calculatorId: CalculatorId, profile: CalculatorProfile = ready, props: { onOpenProfile?: () => void } = {}) {
  return render(
    <ProfileProvider initialProfile={profile}>
      <CalculatorForm calculatorId={calculatorId} onOpenProfile={props.onOpenProfile} />
    </ProfileProvider>,
  );
}

afterEach(cleanup);
// Кэш личных данных — на весь jsdom, поэтому между тестами его обнуляем.
beforeEach(() => window.localStorage.clear());

describe("форма считает по профилю", () => {
  it("показывает базовый обмен из переданных данных", () => {
    renderForm("bmr");
    expect(screen.getByText("1434")).toBeInTheDocument();
  });

  it("пересчитывает при правке веса в самой форме", () => {
    renderForm("bmr");
    fireEvent.change(screen.getByRole("spinbutton", { name: /Вес/ }), { target: { value: "80" } });
    expect(screen.getByText("1554")).toBeInTheDocument();
  });

  it("правка в одном калькуляторе видна в другом: профиль общий", () => {
    const onProfileChange = vi.fn();
    const { unmount } = render(
      <ProfileProvider initialProfile={ready} onProfileChange={onProfileChange}>
        <CalculatorForm calculatorId="bmr" />
      </ProfileProvider>,
    );

    fireEvent.change(screen.getByRole("spinbutton", { name: /Вес/ }), { target: { value: "60" } });
    unmount();

    render(
      <ProfileProvider initialProfile={{ ...ready, weightKg: 60 }}>
        <CalculatorForm calculatorId="bmr" />
      </ProfileProvider>,
    );
    expect(screen.getByText("1354")).toBeInTheDocument();
    expect(onProfileChange).toHaveBeenCalledWith(expect.objectContaining({ weightKg: 60 }));
  });

  it("без данных приложения расчёта нет — и цифр с потолка тоже", () => {
    renderForm("bmr", {});
    expect(screen.getByRole("button", { name: "Готово" })).toBeDisabled();
    expect(screen.queryByText("1434")).not.toBeInTheDocument();
    expect(screen.getByText(/не заполнено: пол, возраст, рост, вес/i)).toBeInTheDocument();
  });

  it("нехватка активности блокирует расход, но не базовый обмен", () => {
    const { unmount } = renderForm("tdee", { ...ready, activity: undefined });
    expect(screen.getByRole("button", { name: "Готово" })).toBeDisabled();
    expect(screen.getByText(/не заполнено: активность/i)).toBeInTheDocument();
    unmount();

    renderForm("bmr", { ...ready, activity: undefined });
    expect(screen.getByRole("button", { name: "Готово" })).not.toBeDisabled();
  });

  it("калорийности по умолчанию нет: подставляем суточный расход по кнопке", () => {
    renderForm("macro-goal", ready);
    // Подсказка под результатом; та же строка дублируется для скринридера у кнопки.
    expect(screen.getByText(/введите корректные значения/i, { selector: "p" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /взять суточный расход/i }));
    expect(screen.getByRole("spinbutton", { name: /целевая калорийность/i })).toHaveValue(2223);
    expect(screen.getByRole("button", { name: "Готово" })).not.toBeDisabled();
  });
});

describe("состояние невалидного ввода", () => {
  it("пустое поле убирает результат и гасит кнопку «Готово»", () => {
    renderForm("bmi");
    const weight = screen.getByRole("spinbutton", { name: /Вес/ });
    expect(screen.getByText("23.0")).toBeInTheDocument();

    fireEvent.change(weight, { target: { value: "" } });
    expect(screen.queryByText("23.0")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Готово" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Готово" })).toHaveAttribute("aria-disabled", "true");

    fireEvent.change(weight, { target: { value: "68" } });
    expect(screen.getByText("23.0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Готово" })).not.toBeDisabled();
  });

  it("выход за диапазон объясняется текстом, а не молча", () => {
    renderForm("bmi");
    fireEvent.change(screen.getByRole("spinbutton", { name: /Вес/ }), { target: { value: "400" } });
    expect(screen.getByText(/максимум 300/)).toBeInTheDocument();
  });

  it("формат темпа строгий: ММ:СС", () => {
    renderForm("pace", ready);
    const pace = screen.getByRole("textbox", { name: /Темп/ });
    fireEvent.change(pace, { target: { value: "5,30" } });
    expect(screen.getByText(/введите темп в формате ММ:СС/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Готово" })).toBeDisabled();

    fireEvent.change(pace, { target: { value: "05:30" } });
    expect(screen.queryByText(/введите темп в формате ММ:СС/i)).not.toBeInTheDocument();
  });
});

describe("каталог и формы согласованы", () => {
  it.each(calculators.map((calculator) => [calculator.id] as const))("%s рендерится и оставляет честный статус", (calculatorId) => {
    renderForm(calculatorId, ready);
    const done = screen.getByRole("button", { name: "Готово" });
    expect(done).toBeInTheDocument();
    expect(screen.getByText(/расчёт выполняется на устройстве/i)).toBeInTheDocument();
  });

  it("ни одна форма не обещает сохранение данных", async () => {
    renderForm("body-fat", { ...ready, waistCm: 78, neckCm: 33, hipsCm: 96 });
    await waitFor(() => expect(screen.getByRole("button", { name: "Готово" })).toBeInTheDocument());
    // Forbidden: promises about storing or sending anything (and leftovers from the template).
    expect(document.body.textContent).not.toMatch(/сохраняем|отправим|загруз|аккаунт|mock|demo/i);
    expect(document.body.textContent).toMatch(/никуда не сохраняется/);
  });

  it("кнопка «заполнить личные данные» ведёт к профилю, когда данных нет", () => {
    const onOpenProfile = vi.fn();
    renderForm("heart-zones", {}, { onOpenProfile });
    fireEvent.click(screen.getByRole("button", { name: /заполнить личные данные/i }));
    expect(onOpenProfile).toHaveBeenCalledTimes(1);
  });
});
