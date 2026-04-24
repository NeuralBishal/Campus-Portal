import { useGetMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { data: user, isLoading, isError } = useGetMe();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (isError || !user?.authenticated) {
        setLocation("/");
        return;
      }

      if (user.mustChangePassword && location !== "/change-password") {
        setLocation("/change-password");
        return;
      }

      if (!user.mustChangePassword && location === "/change-password") {
        setLocation(`/${user.role}`);
        return;
      }

      if (allowedRoles && user.role && !allowedRoles.includes(user.role)) {
        setLocation(`/${user.role}`);
      }
    }
  }, [isLoading, isError, user, location, setLocation, allowedRoles]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !user?.authenticated) {
    return null;
  }

  if (user.mustChangePassword && location !== "/change-password") {
    return null;
  }

  if (allowedRoles && user.role && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
