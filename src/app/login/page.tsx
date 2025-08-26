import { LoginForm } from "@/components/prefabs/auth/login-form"
import { ThemeToggleButton } from "@/components/elements/theme-toggle-button";

export default function LoginPage() {
  return (
    <div className="bg-background relative flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="absolute right-4 top-4">
        <ThemeToggleButton />
      </div>
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
