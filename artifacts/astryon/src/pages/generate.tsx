import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Upload, FileText, CheckCircle2, AlertCircle, Settings2,
  Download, Sparkles, XCircle, FileDown
} from "lucide-react";
import { generateListings, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import Papa from "papaparse";
import { useToast } from "@/hooks/use-toast";
import { downloadCSV } from "@/lib/utils";

const REQUIRED_COLUMNS = ["property_title", "location", "price"];

const SAMPLE_CSV = `property_title,location,price,bedrooms,bathrooms,area_sqft,property_type,amenities,nearby_landmarks
Riverside Apartment,Madrid - Retiro District,€320000,2,1,75,Apartment,Pool; Gym; Parking,Retiro Park; Atocha Station
Villa Sunset,Marbella - Golden Mile,€1200000,4,3,350,Villa,Private Pool; Garden; Security,Puerto Banus; Beach
City Studio,Barcelona - Eixample,€195000,0,1,38,Studio,Elevator; Doorman,Passeig de Gracia; Sagrada Familia`;

function normalizeCols(row: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
  );
}

function downloadSampleCSV() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "astryon-sample.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function Generate() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [outputMode, setOutputMode] = useState<"concise" | "detailed">("detailed");
  const [includeSocial, setIncludeSocial] = useState(true);
  const [results, setResults] = useState<any[] | null>(null);
  const [stats, setStats] = useState<{ succeeded: number; failed: number; creditsUsed: number } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetMe();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith(".csv")) {
      toast({ variant: "destructive", title: "Invalid file type", description: "Please upload a CSV file." });
      return;
    }

    setFile(selected);
    setResults(null);
    setStats(null);

    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rawRows = result.data as Record<string, string>[];
        if (rawRows.length === 0) {
          toast({ variant: "destructive", title: "Empty file", description: "The CSV has no data rows." });
          setFile(null);
          return;
        }
        const normalized = rawRows.map(normalizeCols);
        const headers = Object.keys(normalized[0] || {});
        const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
        if (missing.length > 0) {
          toast({
            variant: "destructive",
            title: "Missing required columns",
            description: `CSV must include required columns: ${REQUIRED_COLUMNS.join(", ")}`,
          });
          setFile(null);
          return;
        }
        setParsedRows(normalized);
        toast({ title: "CSV loaded", description: `${normalized.length} rows ready to generate.` });
      },
      error: () => {
        toast({ variant: "destructive", title: "Parse error", description: "Could not read the CSV file." });
        setFile(null);
      },
    });
  };

  const handleGenerate = async () => {
    if (parsedRows.length === 0) return;

    // ── Client-side credit guard ──────────────────────────────────────────────
    const userCredits = user?.creditsRemaining ?? 0;
    if (parsedRows.length > userCredits) {
      toast({
        variant: "destructive",
        title: "Not enough credits",
        description: `You need ${parsedRows.length} credits but only have ${userCredits} credits`,
      });
      return;
    }

    // ── Start generation loop ─────────────────────────────────────────────────
    setIsGenerating(true);
    setResults(null);
    setStats(null);
    setProgress({ current: 0, total: parsedRows.length });
    abortRef.current = false;

    const allResults: any[] = [];
    let succeeded = 0;
    let failed = 0;
    let creditsUsed = 0;

    for (let i = 0; i < parsedRows.length; i++) {
      if (abortRef.current) break;

      const row = parsedRows[i];
      const property = {
        propertyTitle: row["property_title"] || "Unnamed Property",
        location: row["location"] || "",
        price: row["price"] || "",
        bedrooms: row["bedrooms"] || null,
        bathrooms: row["bathrooms"] || null,
        areaSqft: row["area_sqft"] || null,
        propertyType: row["property_type"] || null,
        amenities: row["amenities"] || null,
        nearbyLandmarks: row["nearby_landmarks"] || null,
      };

      try {
        const res = await generateListings({
          properties: [property],
          outputMode,
          includeSocialCaption: includeSocial,
        });
        const listing = res.listings[0];
        allResults.push(listing);
        if (listing?.failed) {
          failed++;
        } else {
          succeeded++;
          creditsUsed += res.creditsUsed;
        }
      } catch (err: any) {
        const errMsg = err?.data?.error || err?.message || "Generation failed";
        if (errMsg.toLowerCase().includes("not enough credits") || errMsg.toLowerCase().includes("insufficient")) {
          toast({ variant: "destructive", title: "Out of credits", description: errMsg });
          abortRef.current = true;
        }
        allResults.push({
          propertyTitle: property.propertyTitle,
          longDescription: "",
          shortDescription: "Generation failed.",
          socialCaption: null,
          failed: true,
        });
        failed++;
      }

      // Update progress and show live partial results after each row
      setProgress({ current: i + 1, total: parsedRows.length });
      setResults([...allResults]);

      // Small pause between rows so we don't hammer the AI rate limit
      if (i < parsedRows.length - 1) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    setStats({ succeeded, failed, creditsUsed });
    setIsGenerating(false);
    setProgress(null);
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });

    toast({
      title: "Generation complete",
      description: `${succeeded} succeeded, ${failed} failed · ${creditsUsed} credits used`,
    });
  };

  const handleDownload = () => {
    if (!results) return;
    const exportData = results.map((r, i) => ({
      property_title: parsedRows[i]?.["property_title"] || r.propertyTitle,
      long_description: r.failed ? "" : r.longDescription,
      short_description: r.failed ? "" : r.shortDescription,
      social_caption: r.failed ? "" : (r.socialCaption || ""),
    }));
    downloadCSV(exportData, `astryon-results-${Date.now()}.csv`);
  };

  const handleClear = () => {
    setFile(null);
    setParsedRows([]);
    setResults(null);
    setStats(null);
    setProgress(null);
    abortRef.current = true;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const progressPct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <AppLayout>
      <div className="p-6 md:p-10 h-full overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white mb-2">Bulk Generate</h1>
          <p className="text-muted-foreground">Upload your CSV and let AI write every listing description.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="glass-panel">
              <CardContent className="p-6 space-y-6">

                {/* Step 1: Upload */}
                <div>
                  <h3 className="text-lg font-bold mb-3 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-primary" /> 1. Upload CSV
                  </h3>
                  <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />

                  {!file ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-white/10 rounded-xl p-7 text-center cursor-pointer hover:border-primary/50 hover:bg-white/5 transition-all"
                    >
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm font-medium">Click to upload CSV</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Required: <span className="text-primary/80">property_title, location, price</span>
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-medium text-white truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{parsedRows.length} rows loaded</p>
                        </div>
                      </div>
                      <button
                        onClick={handleClear}
                        disabled={isGenerating}
                        className="text-xs text-muted-foreground hover:text-white px-2 shrink-0 disabled:opacity-40"
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  <button
                    onClick={downloadSampleCSV}
                    className="mt-3 w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors py-2 border border-white/10 rounded-lg hover:border-primary/30"
                  >
                    <FileDown className="w-3.5 h-3.5" /> Download sample CSV
                  </button>
                </div>

                <div className="h-px bg-white/10 w-full" />

                {/* Step 2: Configure */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center">
                    <Settings2 className="w-5 h-5 mr-2 text-primary" /> 2. Configure
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Output Detail Level</label>
                      <div className="grid grid-cols-2 gap-3">
                        {(["concise", "detailed"] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setOutputMode(mode)}
                            disabled={isGenerating}
                            className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 ${outputMode === mode ? "bg-primary/20 border-primary text-white" : "bg-transparent border-white/10 text-muted-foreground hover:border-white/30"}`}
                          >
                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
                      <div className="relative flex items-center justify-center">
                        <input type="checkbox" className="sr-only" checked={includeSocial} onChange={(e) => setIncludeSocial(e.target.checked)} disabled={isGenerating} />
                        <div className={`w-5 h-5 rounded border ${includeSocial ? "bg-primary border-primary" : "border-white/30"} flex items-center justify-center transition-colors`}>
                          {includeSocial && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <span className="text-sm font-medium">Generate Social Captions</span>
                    </label>
                  </div>
                </div>

                <div className="h-px bg-white/10 w-full" />

                {/* Step 3: Generate */}
                <div>
                  <Button
                    className="w-full h-12 text-base"
                    disabled={!file || parsedRows.length === 0 || isGenerating}
                    onClick={handleGenerate}
                    isLoading={isGenerating}
                  >
                    {isGenerating
                      ? progress
                        ? `Generating ${progress.current}/${progress.total}…`
                        : "Starting…"
                      : "Generate Descriptions"}
                  </Button>

                  {/* Progress bar */}
                  {isGenerating && progress && (
                    <div className="mt-3 space-y-1.5">
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <p className="text-xs text-center text-primary">
                        {progress.current} of {progress.total} properties done
                      </p>
                    </div>
                  )}

                  {/* Credit cost hint (idle) */}
                  {parsedRows.length > 0 && !isGenerating && (
                    <p className="text-xs text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Will use {parsedRows.length} credit{parsedRows.length !== 1 ? "s" : ""}
                      {user && (
                        <span className={parsedRows.length > (user.creditsRemaining ?? 0) ? "text-red-400" : "text-primary"}>
                          &nbsp;({user.creditsRemaining} available)
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2">
            <Card className="glass-panel h-[calc(100vh-10rem)] flex flex-col">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20 shrink-0">
                <div>
                  <h3 className="font-bold text-lg">Results Preview</h3>
                  {stats && (
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-3">
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle2 className="w-3 h-3" /> {stats.succeeded} succeeded
                        </span>
                        <span className={`flex items-center gap-1 ${stats.failed > 0 ? "text-red-400" : "text-muted-foreground"}`}>
                          <XCircle className="w-3 h-3" /> {stats.failed} failed
                        </span>
                      </p>
                      <p className="text-xs text-primary font-medium">
                        {stats.creditsUsed} credit{stats.creditsUsed !== 1 ? "s" : ""} used
                      </p>
                    </div>
                  )}
                  {isGenerating && progress && (
                    <p className="text-xs text-primary mt-0.5 animate-pulse">
                      Generating {progress.current}/{progress.total}…
                    </p>
                  )}
                </div>
                {results && results.length > 0 && !isGenerating && (
                  <Button size="sm" variant="secondary" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" /> Export CSV
                  </Button>
                )}
              </div>

              <CardContent className="p-0 flex-1 overflow-y-auto">
                {!results || results.length === 0 ? (
                  isGenerating ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                      <div className="w-12 h-12 mb-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <p className="font-medium text-lg text-white mb-2">
                        {progress ? `Generating ${progress.current}/${progress.total}` : "Starting…"}
                      </p>
                      <p className="max-w-md text-sm">Results will appear here as each property is processed.</p>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                      <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                      <p className="font-medium text-lg text-white mb-2">Ready to generate</p>
                      <p className="max-w-md text-sm">
                        Upload your CSV and click Generate. Results appear here as each row is processed.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="divide-y divide-white/5">
                    {results.map((res, i) => (
                      <div
                        key={i}
                        className={`p-6 hover:bg-white/[0.02] transition-colors ${res.failed ? "opacity-60" : ""}`}
                      >
                        <h4 className="font-bold text-white text-base mb-3 flex items-center gap-2">
                          <span className="text-primary text-xs font-mono bg-primary/10 px-2 py-0.5 rounded">
                            #{i + 1}
                          </span>
                          {res.propertyTitle}
                          {isGenerating && i === results.length - 1 && !res.failed && (
                            <span className="ml-1 w-3 h-3 rounded-full border border-primary border-t-transparent animate-spin inline-block" />
                          )}
                          {res.failed && (
                            <span className="ml-auto flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded">
                              <XCircle className="w-3 h-3" /> Failed
                            </span>
                          )}
                        </h4>

                        {res.failed ? (
                          <p className="text-sm text-muted-foreground italic">
                            This row could not be processed and was skipped.
                          </p>
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Short Description</p>
                              <p className="text-sm text-foreground/90">{res.shortDescription}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Long Description</p>
                              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{res.longDescription}</p>
                            </div>
                            {res.socialCaption && (
                              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Social Caption</p>
                                <p className="text-sm text-foreground/80">{res.socialCaption}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Live "next row in progress" placeholder */}
                    {isGenerating && progress && progress.current < progress.total && (
                      <div className="p-6 opacity-40">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-primary text-xs font-mono bg-primary/10 px-2 py-0.5 rounded">
                            #{(progress.current) + 1}
                          </span>
                          <div className="h-4 bg-white/10 rounded w-48 animate-pulse" />
                          <span className="w-3 h-3 rounded-full border border-primary border-t-transparent animate-spin" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 bg-white/10 rounded w-full animate-pulse" />
                          <div className="h-3 bg-white/10 rounded w-3/4 animate-pulse" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
