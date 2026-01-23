import { Options } from "./Options";
import { useEffect, useState } from "react";

export default function App() {
  const [online, setOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    window.addEventListener("online", () => setOnline(true));
    window.addEventListener("offline", () => setOnline(false));
    return () => {
      window.removeEventListener("online", () => setOnline(true));
      window.removeEventListener("offline", () => setOnline(false));
    };
  }, []);

  if (!online) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 ">
        <div className="flex flex-col items-center justify-center gap-3 max-w-md text-center mb-24">
        <img src="/dino.gif" alt="Dino" className="w-full" />
        <h1 className="text-3xl font-semibold">apparently someone forgot to pay the internet bill lol</h1>
        <p className="text-gray-400 text-sm">
          Please check your internet connection and try again.
        </p>
        </div>
      </div>
    );
  }

  return (
      <Options />
  );
}