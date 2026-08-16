import { useEffect, useRef } from "react";
import { useAppStore } from "../store/useAppStore";
import { getWaterGoal } from "../utils/waterGoal";
import { UserPreferencesStore, UserPreferences } from "./UserPreferencesStore";
import { api } from "../utils/api";
import { formatTimeHM, todayLocalDate } from "../shared/dates";
import { getUserTimeZone } from "../shared/timeZoneStore";

export function useNotificationEngine() {
  const setActiveNotification = useAppStore((s) => s.setActiveNotification);
  const activeNotification = useAppStore((s) => s.activeNotification);
  const lastCheckTimeRef = useRef<number>(0);
  const isCheckingRef = useRef<boolean>(false);

  useEffect(() => {
    // Run every 60 seconds
    const interval = setInterval(async () => {
      if (isCheckingRef.current || activeNotification) return;

      const nowMs = Date.now();
      // Rate limit checks slightly
      if (nowMs - lastCheckTimeRef.current < 55000) return;
      isCheckingRef.current = true;
      lastCheckTimeRef.current = nowMs;

      try {
        await evaluateNotifications();
      } catch (err) {
        console.error("Notification engine error:", err);
      } finally {
        isCheckingRef.current = false;
      }
    }, 60000);

    // Initial check after 5 seconds
    const timeout = setTimeout(() => {
      if (!isCheckingRef.current && !activeNotification) {
        isCheckingRef.current = true;
        evaluateNotifications().finally(() => {
          isCheckingRef.current = false;
        });
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [activeNotification]);

  const evaluateNotifications = async () => {
    const prefs = UserPreferencesStore.load();
    if (!prefs) return;

    const now = new Date();
    const nowHM = formatTimeHM(now.toISOString(), getUserTimeZone()).split(":");
    const currentHour = Number(nowHM[0]);
    const currentMinute = Number(nowHM[1]);
    const minutesSinceMidnight = currentHour * 60 + currentMinute;
    const currentDayStr = todayLocalDate(getUserTimeZone());

    // Helper: Check if current time falls within a given "HH:MM - HH:MM" window
    const isInWindow = (windowStr: string): boolean => {
      if (!windowStr) return false;
      const parts = windowStr.split("-").map(s => s.trim());
      if (parts.length !== 2) return false;
      const [startH, startM] = parts[0].split(":").map(Number);
      const [endH, endM] = parts[1].split(":").map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;
      return minutesSinceMidnight >= startMin && minutesSinceMidnight <= endMin;
    };

    // Helper to get active window mode for a given preference
    const checkActiveWindow = (pref: any): boolean => {
      if (pref.timeWindows.mode === "single") {
        return isInWindow(pref.timeWindows.single || "");
      } else {
        return isInWindow(pref.timeWindows.morning) || 
               isInWindow(pref.timeWindows.day) || 
               isInWindow(pref.timeWindows.evening);
      }
    };

    // Helper to check if we already showed this module today
    const hasShownToday = (key: string): boolean => {
      const lastShown = localStorage.getItem(`notif_last_shown_${key}`);
      return lastShown === currentDayStr;
    };

    const markAsShown = (key: string) => {
      localStorage.setItem(`notif_last_shown_${key}`, currentDayStr);
    };

    // Check which modules are active and in their window
    const activeCandidates: string[] = [];
    const notifs = prefs.notifications as any;

    for (const key of Object.keys(notifs)) {
      const pref = notifs[key];
      if (pref.enabled && checkActiveWindow(pref) && !hasShownToday(key)) {
        activeCandidates.push(key);
      }
    }

    if (activeCandidates.length === 0) return;

    // Fetch state-now to evaluate rules
    const profile = useAppStore.getState().userProfile;
    const currentDayIndex = profile?.currentDayIndex || 1;
    let stateData: any = null;

    try {
      stateData = await api<any>(`/api/user/state-now?dayIndex=${currentDayIndex}`);
    } catch (e) {
      return; // If API fails, abort evaluating
    }

    const dm = stateData?.dailyMetric;

    for (const candidate of activeCandidates) {
      const pref = notifs[candidate];
      let shouldTrigger = false;

      if (candidate === "water") {
        const targetWater = getWaterGoal(profile?.weight);
        const currentWater = dm?.waterMl || 0;
        // Simple logic: if we are in window and water is < 80% of goal, remind.
        if (currentWater < targetWater * 0.8) shouldTrigger = true;
      } 
      else if (candidate === "sleep") {
        // Trigger if sleep is 0 (not logged today)
        if (!dm?.sleepMinutes || dm.sleepMinutes === 0) shouldTrigger = true;
      }
      else if (candidate === "measurements") {
        // Trigger if no measurements array or it's empty
        let meas = [];
        try { meas = dm?.measurements ? JSON.parse(dm.measurements) : []; } catch {}
        if (meas.length === 0) shouldTrigger = true;
      }
      else if (candidate === "habits") {
        // Trigger if habits done is < 5
        if ((dm?.habitsDone || 0) < 5) shouldTrigger = true;
      }
      else if (candidate === "daySummary") {
        // Always trigger if it hasn't been shown today (window check handled above)
        shouldTrigger = true;
      }
      else if (candidate === "annaTip") {
        // Always trigger once a day in its window
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        // Mapping colors
        const colorMap: Record<string, string> = {
          water: "bg-gradient-to-br from-blue-500 to-blue-700",
          sleep: "bg-gradient-to-br from-indigo-500 to-indigo-800",
          measurements: "bg-gradient-to-br from-slate-600 to-slate-800",
          habits: "bg-gradient-to-br from-amber-500 to-orange-600",
          daySummary: "bg-gradient-to-br from-emerald-500 to-emerald-700",
          annaTip: "bg-gradient-to-br from-pink-500 to-rose-600",
        };

        const iconMap: Record<string, any> = {
          water: "water",
          sleep: "sleep",
          measurements: "measurements",
          habits: "habits",
          daySummary: "summary",
          annaTip: "tip",
        };

        let finalAnnaPhrase = pref.annaPhrase;
        if (candidate === "annaTip") {
          finalAnnaPhrase = UserPreferencesStore.generateAnnaTip(prefs, currentDayIndex);
        }

        setActiveNotification({
          type: candidate,
          title: pref.previewTemplate.title,
          body: pref.previewTemplate.body,
          annaPhrase: finalAnnaPhrase,
          colorClass: colorMap[candidate] || "bg-gradient-to-br from-gray-700 to-gray-900",
          iconType: iconMap[candidate],
        });

        markAsShown(candidate);
        break; // Only show one notification per evaluation cycle to prevent stacking
      }
    }
  };
}
