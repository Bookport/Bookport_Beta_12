/**
 * Окно модуля «Калькуляторы» в приложениях-хостах.
 *
 * Файл принадлежит модулю и живёт рядом с ним (src/modules/calculators/host/).
 * Он читает профиль из стора и ничего в стор не пишет: правки пользователя
 * уходят в собственный кэш модуля (lib/profileStorage) и не записываются в
 * Настройки. Монтируется на уровне App вне
 * AnimatePresence-цепочки, поэтому `fixed` не попадает под transform-контейнер
 * motion-обёрток и окно остаётся по границам капсулы на широких экранах.
 */

import { useAppStore } from "../../../store/useAppStore";
import CalculatorsScreen from "../screens/CalculatorsScreen";

export default function CalculatorsWindow() {
  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const profile = useAppStore((s) => s.userProfile);

  if (screen !== "calculators") return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-center bg-[#F0F3F5]">
      {/* contain-paint делает бокс контейнерным блоком для `fixed` внутри модуля:
          подложка и диалог (max-w-[620px]) остаются в границах капсулы. */}
      <div className="h-[100dvh] w-full max-w-[440px] overflow-hidden bg-white contain-paint">
        <CalculatorsScreen profile={profile} onClose={() => setScreen("my-day")} />
      </div>
    </div>
  );
}
