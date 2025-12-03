"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setError("");

    try {
      // Call backend directly - CORS is enabled
      // Remove /api if present in the base URL since backend doesn't use /api prefix
      let backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
      backendUrl = backendUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
      const url = `${backendUrl}/auth/login`;
      
      console.log("Calling backend at:", url);
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorJson;
        try {
          errorJson = JSON.parse(errorText);
        } catch {
          throw new Error(errorText || `HTTP ${res.status}: ${res.statusText}`);
        }
        throw new Error(errorJson.message ?? "Login failed");
      }

      const json = await res.json();

      // save token
      localStorage.setItem("token", json.access_token);
      localStorage.setItem("tenantCode", json.tenant.code);

      // redirect to payroll dashboard
      router.push("/payroll");
    } catch (err: any) {
      // Better error handling for network issues
      if (err.message === "Failed to fetch" || err.name === "TypeError") {
        setError("Cannot connect to server. Please check if the backend is running on http://localhost:4000");
      } else {
        setError(err.message || "Login failed");
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 p-6" dir="rtl">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            התחברות למערכת
          </CardTitle>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">אימייל</label>
              <Input
                type="email"
                placeholder="example@mail.com"
                {...register("email", { required: true })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">סיסמה</label>
              <Input
                type="password"
                placeholder="********"
                {...register("password", { required: true })}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "מתחבר..." : "התחבר"}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
}
