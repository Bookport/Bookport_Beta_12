import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ChevronLeft, Users, Link2, CheckCircle, Clock, ExternalLink, Unlink, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { api } from "../utils/api";

interface ClubStatus {
  linked: boolean;
  telegramName: string | null;
  telegramUsername: string | null;
  clubLinkedAt: string | null;
  inviteLink?: string | null;
}

export default function ClubScreen({ onBack }: { onBack?: () => void }) {
  const setScreen = useAppStore((s) => s.setScreen);
  const [status, setStatus] = useState<ClubStatus>({ linked: false, telegramName: null, telegramUsername: null, clubLinkedAt: null });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const fetchStatus = async () => {
    try {
      const data = await api<ClubStatus>("/api/club/status");
      if (!mountedRef.current) return;
      setStatus(data);
      if (data.linked) {
        setShowSuccess(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setPolling(false);
      }
    } catch {
      if (!mountedRef.current) return;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleGenerateLink = async () => {
    setGenerating(true);
    setDeepLink(null);
    try {
      const data = await api<{ deepLink: string | null }>("/api/club/generate-token", { method: "POST" });
      if (!mountedRef.current) return;
      if (data.deepLink) {
        setDeepLink(data.deepLink);
        setPolling(true);
        intervalRef.current = setInterval(fetchStatus, 3000);
      }
    } catch {
      // ignore
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      await api("/api/club/unlink", { method: "POST" });
      if (!mountedRef.current) return;
      setStatus({ linked: false, telegramName: null, telegramUsername: null, clubLinkedAt: null });
      setDeepLink(null);
      setShowSuccess(false);
      setPolling(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch {
      // ignore
    } finally {
      if (mountedRef.current) setUnlinking(false);
    }
  };

  const handleOpenChat = () => {
    if (status.inviteLink) {
      window.open(status.inviteLink, "_blank");
    }
  };

  const defaultBack = () => setScreen("my-day");
  const goBack = onBack || defaultBack;

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-emerald-950 to-gray-900" />

      {/* Ambient glow orbs */}
      <div className="absolute top-20 -left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-20 -right-10 w-72 h-72 bg-emerald-400/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={goBack}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-400/20 backdrop-blur-md flex items-center justify-center">
            <Users className="w-4 h-4 text-emerald-300" />
          </div>
          <span className="text-white/90 font-bold text-[17px]" style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}>
            Клуб
          </span>
        </div>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-4">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-emerald-300 animate-spin" />
            </div>
            <p className="text-white/50 text-sm font-medium">Загрузка...</p>
          </div>
        ) : status.linked && showSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="w-full max-w-sm flex flex-col items-center gap-6"
          >
              {/* Success animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="relative"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 flex items-center justify-center shadow-[0_0_40px_rgba(52,211,153,0.3)]">
                  <motion.div
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    <CheckCircle className="w-12 h-12 text-white" />
                  </motion.div>
                </div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.2, opacity: 1 }}
                  transition={{ duration: 1.5, delay: 0.8, repeat: Infinity, repeatType: "reverse" }}
                  className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl"
                />
              </motion.div>

              {/* Glass card */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="w-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 flex flex-col items-center gap-4"
              >
                <h2 className="text-white font-bold text-xl" style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}>
                  Вы в Клубе!
                </h2>
                <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 w-full">
                  <div className="w-10 h-10 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 font-semibold text-sm truncate">
                      {status.telegramName || status.telegramUsername || "Участник Клуба"}
                    </p>
                    {status.telegramUsername && (
                      <p className="text-white/40 text-xs">@{status.telegramUsername}</p>
                    )}
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                {status.clubLinkedAt && (
                  <div className="flex items-center gap-2 text-white/40 text-xs">
                    <Clock className="w-3 h-3" />
                    <span>Привязан {new Date(status.clubLinkedAt).toLocaleDateString("ru-RU")}</span>
                  </div>
                )}
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="w-full flex flex-col gap-3"
              >
                <button
                  onClick={handleOpenChat}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white font-bold text-sm shadow-[0_4px_20px_rgba(52,211,153,0.3)] hover:shadow-[0_6px_25px_rgba(52,211,153,0.4)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                  style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                >
                  <ArrowRight className="w-4 h-4" />
                  Перейти в чат
                </button>
                <button
                  onClick={handleUnlink}
                  disabled={unlinking}
                  className="w-full py-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-white/60 font-medium text-sm hover:bg-white/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                >
                  {unlinking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Unlink className="w-4 h-4" />
                  )}
                  Отвязать аккаунт
                </button>
              </motion.div>
            </motion.div>
          ) : (
            <div className="w-full max-w-sm flex flex-col items-center gap-6">
              {/* Logo */}
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 backdrop-blur-xl border border-emerald-400/30 flex items-center justify-center shadow-[0_0_60px_rgba(52,211,153,0.1)]"
              >
                <div className="relative">
                  <Users className="w-14 h-14 text-emerald-300" />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-1 -right-1"
                  >
                    <Sparkles className="w-5 h-5 text-emerald-200" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Glass card */}
              <div className="w-full bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 flex flex-col items-center gap-4">
                <h2 className="text-white font-bold text-xl text-center" style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}>
                  Закрытый клуб
                </h2>
                <p className="text-white/50 text-sm text-center leading-relaxed" style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}>
                  Привяжите Telegram, чтобы присоединиться к сообществу единомышленников, получать эксклюзивные рецепты и поддержку куратора Анны.
                </p>

                {deepLink && !status.linked && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="w-full flex flex-col gap-3 pt-2"
                  >
                    <div className="bg-white/5 rounded-xl px-4 py-3 border border-emerald-400/20 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0">
                        <Link2 className="w-4 h-4 text-emerald-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/70 text-xs font-medium">Ссылка для привязки</p>
                        <p className="text-white/40 text-xs truncate mt-0.5">{deepLink}</p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(deepLink).catch(() => {});
                        }}
                        className="text-emerald-300 text-xs font-semibold hover:text-emerald-200 cursor-pointer shrink-0"
                      >
                        Копировать
                      </button>
                    </div>

                    {polling && (
                      <div className="flex items-center justify-center gap-2 py-2">
                        <Loader2 className="w-4 h-4 text-emerald-300 animate-spin" />
                        <span className="text-white/40 text-xs">Ожидание привязки...</span>
                      </div>
                    )}

                    <a
                      href={deepLink.startsWith("https://t.me/") || deepLink.startsWith("tg://") ? deepLink : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white font-bold text-sm shadow-[0_4px_20px_rgba(52,211,153,0.3)] hover:shadow-[0_6px_25px_rgba(52,211,153,0.4)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                      style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                      onClick={(e) => {
                        if (!deepLink.startsWith("http") && !deepLink.startsWith("tg://")) {
                          e.preventDefault();
                          window.open(deepLink, "_blank");
                        }
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Открыть в Telegram
                    </a>
                  </motion.div>
                )}

                {!deepLink && (
                  <button
                    onClick={handleGenerateLink}
                    disabled={generating}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-white font-bold text-sm shadow-[0_4px_20px_rgba(52,211,153,0.3)] hover:shadow-[0_6px_25px_rgba(52,211,153,0.4)] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                  >
                    {generating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                    {generating ? "Генерация..." : "Привязать Telegram"}
                  </button>
                )}
              </div>

              {/* Step guide */}
              <div className="w-full bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4">
                <h3 className="text-white/60 font-semibold text-xs uppercase tracking-wider mb-3">Как это работает</h3>
                <div className="flex flex-col gap-3">
                  {[
                    { num: "1", text: "Нажмите «Привязать Telegram»" },
                    { num: "2", text: "Откройте ссылку в Telegram и нажмите START" },
                    { num: "3", text: "Автоматически попадёте в чат Клуба" },
                  ].map((step) => (
                    <div key={step.num} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0">
                        <span className="text-emerald-300 text-xs font-bold">{step.num}</span>
                      </div>
                      <p className="text-white/50 text-sm">{step.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
