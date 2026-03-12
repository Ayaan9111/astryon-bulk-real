import { AppLayout } from "@/components/layout/AppLayout";
import { useGetGenerationHistory, useGetGenerationJob } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Eye, Download, FileText } from "lucide-react";
import { useState } from "react";
import { downloadCSV } from "@/lib/utils";

export default function History() {
  const { data: history, isLoading } = useGetGenerationHistory({ limit: 50 });
  const [selectedJob, setSelectedJob] = useState<number | null>(null);

  const { data: jobDetails, isFetching } = useGetGenerationJob(selectedJob!, {
    query: { enabled: !!selectedJob }
  });

  const handleExportJob = (job: any) => {
    if (!job?.listings) return;
    downloadCSV(job.listings, `astryon-job-${job.id}.csv`);
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-10 h-full overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white mb-2">Generation History</h1>
          <p className="text-muted-foreground">View and download your past property generations.</p>
        </header>

        {selectedJob && jobDetails ? (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4">
            <Button variant="ghost" onClick={() => setSelectedJob(null)} className="mb-4">
              ← Back to list
            </Button>
            <Card className="glass-panel border-primary/20">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                <div>
                  <h3 className="font-bold text-lg">Job #{jobDetails.id} Details</h3>
                  <p className="text-sm text-muted-foreground">{format(new Date(jobDetails.createdAt), 'PPpp')}</p>
                </div>
                <Button onClick={() => handleExportJob(jobDetails)} variant="secondary">
                  <Download className="w-4 h-4 mr-2" /> Export to CSV
                </Button>
              </div>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
                  {jobDetails.listings.map((l: any, i: number) => (
                    <div key={i} className="p-6">
                      <h4 className="font-bold text-white mb-2">{l.propertyTitle}</h4>
                      <p className="text-sm text-muted-foreground mb-4">{l.shortDescription}</p>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{l.longDescription}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="glass-panel">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-black/40 border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-medium">Job ID</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium text-center">Properties</th>
                    <th className="px-6 py-4 font-medium text-center">Mode</th>
                    <th className="px-6 py-4 font-medium text-center">Credits Used</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    <tr><td colSpan={6} className="p-8 text-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"/></td></tr>
                  ) : history?.jobs?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        No generation history found.
                      </td>
                    </tr>
                  ) : (
                    history?.jobs?.map((job) => (
                      <tr key={job.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4 font-medium text-white">#{job.id}</td>
                        <td className="px-6 py-4">{format(new Date(job.createdAt), 'MMM d, yyyy HH:mm')}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-white/10 px-2 py-1 rounded text-white">{job.listingCount}</span>
                        </td>
                        <td className="px-6 py-4 text-center capitalize">
                          <span className={job.outputMode === 'detailed' ? 'text-primary' : 'text-muted-foreground'}>{job.outputMode}</span>
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-destructive">-{job.creditsUsed}</td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedJob(job.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="w-4 h-4 mr-2" /> View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
