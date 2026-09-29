import backUrl from "../assets/images/teleg/back.webp";
import logoUrl from "../assets/images/teleg/logo.webp";

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
      className="w-full min-h-[100dvh] bg-[#EFF3EC] bg-cover bg-center bg-no-repeat flex justify-center text-text-main"
      style={{ fontFamily: family, backgroundImage: `url(${backUrl})` }}
    >
      <div
        className="w-full max-w-[440px] min-h-[100dvh] flex flex-col justify-center items-center px-7"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 48px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 48px)",
        }}
      >
        <img
          src={logoUrl}
          alt="Всё дело в еде!"
          className="w-[30%] min-w-[116px] max-w-[164px] mb-14 select-none"
          draggable={false}
        />

        <div className="w-full">
          <h1 className="text-[28px] font-bold text-text-dark leading-[1.15] mb-4">
            Доступ не открыт
          </h1>

          <p className="text-[18px] text-text-sec leading-[1.5] mb-10">{text}</p>
        </div>

        <div className="w-[68%] min-w-[224px] max-w-[300px] flex flex-col items-stretch">
          {safeUrl && (
            <a
              href={safeUrl}
              target="_blank"
              rel="noreferrer"
              className="h-[62px] rounded-[31px] text-[19px] sm:text-[20px] font-bold mint-btn flex items-center justify-center select-none"
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
            <p className="text-[14px] text-text-muted leading-[1.45]">{hint}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
