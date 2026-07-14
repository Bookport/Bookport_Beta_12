import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "../store/useAppStore";
import { Droplet, Moon, Activity, Award, CheckCircle2, Sparkles, X } from "lucide-react";

export default function GlobalNotificationOverlay() {
  const notification = useAppStore((s) => s.activeNotification);
  const setActiveNotification = useAppStore((s) => s.setActiveNotification);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setActiveNotification(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [notification, setActiveNotification]);

  if (!notification) return null;

  const IconMap = {
    water: Droplet,
    sleep: Moon,
    measurements: Activity,
    habits: Award,
    summary: CheckCircle2,
    tip: Sparkles,
  };

  const IconComponent = IconMap[notification.iconType] || Sparkles;

  return (
    <AnimatePresence>
      <div className="fixed top-4 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className={`w-full max-w-sm rounded-[24px] shadow-2xl p-4 pointer-events-auto relative overflow-hidden ${notification.colorClass}`}
        >
          {/* Close button */}
          <button 
            onClick={() => setActiveNotification(null)}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/10 flex items-center justify-center text-white/80 hover:bg-black/20 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2 pr-8">
            <IconComponent className="w-5 h-5 text-white/90" />
            <h4 className="text-[14px] font-black text-white tracking-wide uppercase">{notification.title}</h4>
          </div>
          
          <p className="text-[13px] text-white/90 font-medium leading-snug mb-3">
            {notification.body}
          </p>

          {notification.annaPhrase && (
            <div className="bg-black/15 rounded-xl p-2.5 flex items-start gap-2">
              <span className="text-[16px] leading-none mt-0.5">🌿</span>
              <p className="text-[12px] text-white font-bold leading-tight italic">
                «{notification.annaPhrase}»
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
