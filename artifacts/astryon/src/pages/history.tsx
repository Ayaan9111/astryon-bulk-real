import { AppLayout } from "@/components/layout/AppLayout";
import { useGetGenerationHistory, useGetGenerationJob } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Eye, Download, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useState } from "react";
import { downloadCSV } from "@/lib/utils";

export default function History() {
  const { data: history, isLoading } = useGetGenerationHistory({ limit: 50 });
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  const { data: jobDetails, isFetching } = useGetGenerationJob(selectedJobId!, {
    query: { enabled: !!selectedJobId },
  });

  const handleExportJob = (job: any) => {
    if (!job?.listings?.length) return;
    const exportData = job.listings.map((l: any) => ({
      property_title: l.propertyTitle,
      short_description: l.failed ? "" : l.shortDescription,
      long_description: l.failed ? "" : l.longDescription,
      social_caption: l.failed ? "" : (l.socialCaption || ""),
      status: l.failed ? "failed" : "success",
    }));
    downloadCSV(exportData, `astryon-batch-${job.id}.csv`);
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-10 h-full overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white mb-2">Generation History</h1>
          <p className="text-muted-foreground">One record per CSV upload — view and export your past batches.</p>
        </header>

        {/* ── Detail view ─────────────────────────────────────────────────── */}
        {selectedJobId && jobDetails ? (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <Button variant="ghost" onClick={() => setSelectedJobId(null)} className="mb-4">
              ← Back to history
            </Button>

            <Card className="glass-panel border-primary/20">
              <div className="p-6 border-b border-white/5 bg-black/20 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg">Batch #{jobDetails.id}</h3>
                    <StatusBadge status={jobDetails.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(jobDetails.createdAt), "PPpp")}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="capitalize text-primary">{jobDetails.outputMode}</span>
                    <span className="flex items-center gap-1 text-green-400">
                      <CheckCircle2 className="w-3 h-3" /> {jobDetails.succeededCount} succeeded
                    </span>
                    {jobDetails.failedCount > 0 && (
                      <span className="flex items-center gap-1 text-red-400">
                        <XCircle className="w-3 h-3" /> {jobDetails.failedCount} failed
                      </span>
                    )}
                    <span className="text-primary font-medium">
                      {jobDetails.creditsUsed} credit{jobDetails.creditsUsed !== 1 ? "s" : ""} used
                    </span>
                  </div>
                </div>
                <Button onClick={() => handleExportJob(jobDetails)} variant="secondary" className="shrink-0">
                  <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
              </div>

              <CardContent className="p-0">
                {isFetching ? (
                  <div className="py-16 flex justify-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
                    {jobDetails.listings.map((l: any, i: number) => (
                      <div key={i} className={`p-6 ${l.failed ? "opacity-60" : ""}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-primary text-xs font-mono bg-primary/10 px-2 py-0.5 rounded">
                            #{i + 1}
                          </span>
                          <h4 className="font-bold text-white">{l.propertyTitle}</h4>
                          {l.failed && (
                            <span className="ml-auto flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded">
                              <XCircle className="w-3 h-3" /> Failed
                            </span>
                          )}
                        </div>
                        {!l.failed && (
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Short</p>
                              <p className="text-sm text-foreground/90">{l.shortDescription}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Long</p>
                              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{l.longDescription}</p>
                            </div>
                            {l.socialCaption && (
                              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Social</p>
                                <p className="text-sm text-foreground/80">{l.socialCaption}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (

        /* ── List view ──────────────────────────────────────────────────── */
          <Card className="glass-panel">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-black/40 border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-medium">Batch</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium text-center">Rows</th>
                    <th className="px-6 py-4 font-medium text-center">Mode</th>
                    <th className="px-6 py-4 font-medium text-center">Credits</th>
                    <th className="px-6 py-4 font-medium text-center">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : history?.jobs?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No generation history yet.</p>
                        <p className="text-xs mt-1">Upload a CSV and click Generate to get started.</p>
                      </td>
                    </tr>
                  ) : (
                    history?.jobs?.map((job) => (
                      <tr key={job.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4 font-medium text-white">#{job.id}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {format(new Date(job.createdAt), "MMM d, yyyy HH:mm")}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="bg-white/10 px-2 py-0.5 rounded text-white text-xs font-medium">
                              {job.listingCount} total
                            </span>
                            {(job.succeededCount > 0 || job.failedCount > 0) && (
                              <span className="text-xs text-muted-foreground">
                                <span className="text-green-400">{job.succeededCount}✓</span>
                                {job.failedCount > 0 && <span className="text-red-400 ml-1">{job.failedCount}✗</span>}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center capitalize">
                          <span className={job.outputMode === "detailed" ? "text-primary" : "text-muted-foreground"}>
                            {job.outputMode}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-destructive">
                          -{job.creditsUsed}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <StatusBadge status={job.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedJobId(job.id)}
                            disabled={job.status === "processing"}
                            className="opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
                          >
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

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 font-medium">
        <CheckCircle2 className="w-3 h-3" /> Completed
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 font-medium">
        <Clock className="w-3 h-3" /> Processing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground">
      {status}
    </span>
  );
}
