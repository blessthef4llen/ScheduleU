"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { getSupabase } from "@/lib/supabaseClient";

export default function RegistrationPage() {
  const [timeLeft, setTimeLeft] = useState("");
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [userId, setUserId] = useState("");
  const [hasNotified, setHasNotified] = useState(false);

  // 🔹 STEP A: Get user
  useEffect(() => {
    async function getUser() {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        console.log("USER ID FROM APP:", data.user.id);
        setUserId(data.user.id);
      }
    }
    getUser();
  }, []);

  // 🔹 STEP B: Fetch registration time (FIXED)
  useEffect(() => {
    if (!userId) return;

    async function fetchTime() {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("registration_windows")
        .select("*")
        .eq("user_id", userId);

      console.log("DATA:", data);
      console.log("ERROR:", error);

      if (data && data.length > 0) {
        setTargetDate(new Date(data[0].registration_time));
      }
    }

    fetchTime();
  }, [userId]);

  // 🔥 STEP C: REAL-TIME UPDATE
  useEffect(() => {
    if (!userId) return;

    const supabase = getSupabase();
    const channel = supabase
      .channel("registration_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "registration_windows",
        },
        (payload: { new: { registration_time: string } }) => {
          const newTime = payload.new.registration_time;
          setTargetDate(new Date(newTime));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ⏱️ STEP D: Countdown Logic
  useEffect(() => {
    if (!targetDate || !userId) return;

    const supabase = getSupabase();
    const interval = setInterval(async () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance <= 0) {
        setTimeLeft("OPEN");

        if (!hasNotified) {
          await supabase.from("notification_center").insert({
            user_id: userId,
            messages: "Your registration is now OPEN!",
            type: "registration_open",
          });

          setHasNotified(true);

          // 🎉 Confetti
          confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 },
          });
        }

        clearInterval(interval);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((distance / (1000 * 60)) % 60);
      const seconds = Math.floor((distance / 1000) % 60);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, userId, hasNotified]);

  return (
    <div style={containerStyle}>
      <h2>Your Registration Opens In</h2>

      {!targetDate ? (
        <div style={{ marginTop: "20px" }}>Loading...</div>
      ) : timeLeft === "OPEN" ? (
        <div style={openStyle}>
          🎉 Registration is OPEN! 🎉
        </div>
      ) : (
        <div style={rowStyle}>
          {timeLeft.split(" ").map((t, i) => (
            <div key={i} style={flipCard}>
              <div style={flipInner}>{t}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 🎨 STYLES

const containerStyle = {
  background: "linear-gradient(135deg, #0f766e, #115e59)",
  padding: "40px",
  borderRadius: "20px",
  textAlign: "center" as const,
  color: "white",
  boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
  marginTop: "40px",
};

const rowStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "15px",
  marginTop: "20px",
};

const flipCard = {
  perspective: "1000px",
};

const flipInner = {
  background: "rgba(255,255,255,0.1)",
  padding: "20px",
  borderRadius: "12px",
  fontSize: "28px",
  fontWeight: "bold",
  minWidth: "80px",
  textAlign: "center" as const,
  animation: "flip 0.6s",
};

const openStyle = {
  marginTop: "20px",
  fontSize: "30px",
  fontWeight: "bold",
  animation: "pop 0.5s ease",
};
