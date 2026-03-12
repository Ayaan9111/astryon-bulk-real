import { AppLayout } from "@/components/layout/AppLayout";
import { useGetMe, useGetGenerationHistory } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, ArrowRight, Zap, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: user } = useGetMe();
  const { data: history } = useGetGenerationHistory({ limit: 5 });

  return (
    <AppLayout>
      <div className="p-6 md:p-10 h-full overflow-y-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-display font-bold text-white mb-2">Welcome back, {user?.fullName?.split(' ')[0]}</h1>
          <p className="text-muted-foreground">Here's what's happening with your properties today.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-primary mb-1">Credits Remaining</p>
                  <h3 className="text-4xl font-bold text-white">{user?.creditsRemaining}</h3>
                  <p className="text-xs text-muted-foreground mt-2">out of {user?.creditsTotal} total</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Current Plan</p>
                  <h3 className="text-2xl font-bold text-white capitalize">{user?.plan}</h3>
                  <p className="text-xs text-muted-foreground mt-2 capitalize">Status: {user?.subscriptionStatus || 'Active'}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-dashed border-2 flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
            <CardContent className="p-6 text-center z-10 w-full">
              <Link href="/generate">
                <Button className="w-full rounded-xl" size="lg">
                  <Sparkles className="mr-2 w-5 h-5" /> New Generation
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Recent Generations</h2>
            <Link href="/history" className="text-sm text-primary hover:underline flex items-center">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <Card className="glass-panel">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-medium">Job ID</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Properties</th>
                    <th className="px-6 py-4 font-medium">Mode</th>
                    <th className="px-6 py-4 font-medium text-right">Credits Used</th>
                  </tr>
                </thead>
                <tbody>
                  {history?.jobs?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        No generations yet. Start your first one!
                      </td>
                    </tr>
                  ) : (
                    history?.jobs?.map((job) => (
                      <tr key={job.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-medium text-white">#{job.id}</td>
                        <td className="px-6 py-4">{format(new Date(job.createdAt), 'MMM d, yyyy HH:mm')}</td>
                        <td className="px-6 py-4">{job.listingCount}</td>
                        <td className="px-6 py-4 capitalize">{job.outputMode}</td>
                        <td className="px-6 py-4 text-right text-destructive font-medium">-{job.creditsUsed}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
