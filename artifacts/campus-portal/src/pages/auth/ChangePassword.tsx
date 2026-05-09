import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useChangePassword } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

const schema = z.object({
  currentPassword: z.string().min(1, "Required"),
  newPassword: z.string().min(6, "Minimum 6 characters"),
});

export default function ChangePassword() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const mutation = useChangePassword();
  const { data: user } = useGetMe();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    mutation.mutate({ data }, {
      onSuccess: () => {
        toast.success("Password changed successfully");
        if (user) {
          queryClient.setQueryData(getGetMeQueryKey(), { ...user, mustChangePassword: false });
        }
        queryClient.invalidateQueries();
        setLocation(user?.role ? `/${user.role}` : "/");
      },
      onError: (err: any) => toast.error(err?.message || "Failed to change password")
    });
  };

  return (
    <AuthLayout>
      <div className="max-w-md mx-auto w-full">
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Please update your password to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl><Input type="password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl><Input type="password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Change Password
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  );
}
