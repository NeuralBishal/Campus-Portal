import { useGetSheetsConfig, useUpdateSheetsConfig, useSyncSheets, getGetSheetsConfigQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

const schema = z.object({
  studentSheetUrl: z.string().url("Must be a valid URL").or(z.literal("")),
  facultySheetUrl: z.string().url("Must be a valid URL").or(z.literal("")),
});

export default function AdminSheets() {
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useGetSheetsConfig();
  const updateMutation = useUpdateSheetsConfig();
  const syncMutation = useSyncSheets();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: {
      studentSheetUrl: config?.studentSheetUrl || "",
      facultySheetUrl: config?.facultySheetUrl || "",
    }
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    updateMutation.mutate({ data }, {
      onSuccess: () => {
        toast.success("Sheets configuration updated");
        queryClient.invalidateQueries({ queryKey: getGetSheetsConfigQueryKey() });
      },
      onError: (err: any) => toast.error(err?.message || "Failed to update config")
    });
  };

  const handleSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: (res) => {
        toast.success(res.message);
        queryClient.invalidateQueries({ queryKey: getGetSheetsConfigQueryKey() });
      },
      onError: (err: any) => toast.error(err?.message || "Sync failed")
    });
  };

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full rounded-xl" />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Google Sheets Sync</h1>
        <p className="text-muted-foreground mt-2">Manage the roster synchronization from Google Sheets.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sheet URLs</CardTitle>
              <CardDescription>
                Publish your Google Sheet to anyone with the link, then paste the URL here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="studentSheetUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student Sheet URL</FormLabel>
                        <FormControl><Input placeholder="https://docs.google.com/spreadsheets/..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="facultySheetUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Faculty Sheet URL</FormLabel>
                        <FormControl><Input placeholder="https://docs.google.com/spreadsheets/..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={updateMutation.isPending}>
                    Save Configuration
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sync Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3">
                {config?.lastSyncStatus === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : config?.lastSyncStatus === "failed" ? (
                  <AlertCircle className="w-5 h-5 text-destructive" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground border-dashed" />
                )}
                <div>
                  <p className="text-sm font-medium">Last Synced</p>
                  <p className="text-xs text-muted-foreground">
                    {config?.lastSyncedAt ? new Date(config.lastSyncedAt).toLocaleString() : "Never"}
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleSync} 
                className="w-full" 
                variant="secondary"
                disabled={syncMutation.isPending || !config?.studentSheetUrl}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                Sync Now
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/50 border-dashed">
            <CardHeader>
              <CardTitle className="text-sm">Required Columns</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-4">
              <div>
                <strong className="text-foreground block mb-1">Students Sheet:</strong>
                rollNumber, name, email, department, initialPassword
              </div>
              <div>
                <strong className="text-foreground block mb-1">Faculties Sheet:</strong>
                facultyId, name, email, department, initialPassword
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
