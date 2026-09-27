interface AccessDeniedScreenProps {
  text: string;
  siteUrl?: string;
  hint: string;
}

// Экран отказа доступа (этап 1.12). Текст всегда приходит с сервера (auth-middleware в
// server.ts), ссылка — из ACCESS_SITE_URL; если сервер её не прислал, кнопки нет:
// подставлять выдуманный адрес в бандл нельзя.
export default function AccessDeniedScreen({ text, siteUrl, hint }: AccessDeniedScreenProps) {
  const family = '"Calibri", "Candara", "Segoe UI", system-ui, sans-serif';
  // href из переменной контура, но и её проверяем: `javascript:` в ссылке от оператора
  // так же опасен, как в пользовательском вводе.
  const safeUrl = siteUrl && /^https:\/\//i.test(siteUrl) ? siteUrl : undefined;

  return (
    <div
      className="w-full h-[100dvh] bg-[#F0F3F5] flex justify-center text-text-main"
      style={{ fontFamily: family }}
    >
      <div
        className="w-full max-w-[440px] h-[100dvh] bg-white mx-auto flex flex-col justify-center px-6 sm:border-x sm:border-slate-200/70"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <h1 className="text-[26px] font-bold text-text-dark leading-[1.15] mb-3">
          Доступ не открыт
        </h1>

        <p className="text-[17px] text-text-sec leading-[1.4] mb-7">{text}</p>

        {safeUrl && (
          <a
            href={safeUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full max-w-[340px] h-[58px] rounded-[28px] text-[18px] sm:text-[20px] font-bold text-white volumetric-btn flex items-center justify-center select-none"
          >
            Оформить доступ
          </a>
        )}

        <div className="flex flex-col gap-3 mt-7">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-[16px] text-brand-green-dark underline underline-offset-2 cursor-pointer self-start"
          >
            Повторить
          </button>
          <p className="text-[14px] text-text-muted leading-[1.4]">{hint}</p>
        </div>
      </div>
    </div>
  );
}
