import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegisterAdmin, useGetMe, useGetRegistrationStatus } from "@workspace/api-client-react";
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

const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AdminRegister() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const registerMutation = useRegisterAdmin();

  const { data: user, isLoading: isLoadingUser } = useGetMe();
  const { data: regStatus, isLoading: isLoadingStatus } = useGetRegistrationStatus({
    query: { queryKey: ["registrationStatus"] },
  });

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  if (!isLoadingUser && user?.authenticated) {
    setLocation(`/${user.role}`);
    return null;
  }

  if (!isLoadingStatus && regStatus && !regStatus.allowed) {
    return (
      <AuthLayout>
        <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-border shadow-lg">
            <CardHeader className="space-y-2 text-center pb-6">
              <CardTitle className="text-3xl font-serif">Registration Closed</CardTitle>
              <CardDescription className="text-base">
                An administrator already exists. New admins can only be created by an existing admin from inside the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login/admin">
                <Button className="w-full" size="lg">Go to Admin Login</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </AuthLayout>
    );
  }

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(
      { data },
      {
        onSuccess: (res) => {
          queryClient.invalidateQueries();
          toast.success("Admin account created. Welcome!");
          setLocation(`/${res.role}`);
        },
        onError: (err: any) => {
          toast.error(err?.message || "Registration failed.");
        },
      }
    );
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-2 text-center pb-6">
            <CardTitle className="text-3xl font-serif">Create Admin Account</CardTitle>
            <CardDescription className="text-base">
              Register a new administrator for the Campus Portal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your name" {...field} autoComplete="name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@campus.edu" {...field} autoComplete="email" />
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
                        <Input type="password" placeholder="Choose a password" {...field} autoComplete="new-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" size="lg" disabled={registerMutation.isPending}>
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
                <p className="text-sm text-center text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login/admin" className="text-primary font-medium hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
}
