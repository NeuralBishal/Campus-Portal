import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin, useGetMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";

const loginSchema = z.object({
  identifier: z.string().min(1, "Identifier is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login({ role }: { role: "student" | "faculty" | "admin" }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const loginMutation = useLogin();
  
  const { data: user, isLoading: isLoadingUser } = useGetMe();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  // If already logged in, redirect
  if (!isLoadingUser && user?.authenticated) {
    if (user.mustChangePassword) {
      setLocation("/change-password");
    } else {
      setLocation(`/${user.role}`);
    }
    return null;
  }

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({
      data: {
        role,
        identifier: data.identifier,
        password: data.password,
      }
    }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries();
        if (res.mustChangePassword) {
          setLocation("/change-password");
        } else {
          setLocation(`/${res.role}`);
        }
      },
      onError: (err: any) => {
        toast.error(err?.message || "Login failed. Please check your credentials.");
      }
    });
  };

  const roleLabels = {
    student: { title: "Student Login", idLabel: "Roll Number", help: "Use your roll number to sign in." },
    faculty: { title: "Faculty Login", idLabel: "Faculty ID", help: "Use your faculty ID to sign in." },
    admin: { title: "Admin Login", idLabel: "Email Address", help: "Use your admin email to sign in." },
  };

  const labels = roleLabels[role];

  return (
    <AuthLayout>
      <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-2 text-center pb-6">
            <CardTitle className="text-3xl font-serif">{labels.title}</CardTitle>
            <CardDescription className="text-base">
              {labels.help}<br/>
              <span className="text-xs text-muted-foreground mt-1 inline-block">First-time users: use the password provided by your admin.</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="identifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{labels.idLabel}</FormLabel>
                      <FormControl>
                        <Input placeholder={`Enter your ${labels.idLabel.toLowerCase()}`} {...field} autoComplete="username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} autoComplete="current-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
}
