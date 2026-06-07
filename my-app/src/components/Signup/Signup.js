"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy route — admin login lives at /login */
export default function Signup() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return null;
}
