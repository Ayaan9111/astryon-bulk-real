import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Upload, FileText, CheckCircle2, AlertCircle, Settings2,
  Download, Sparkles, XCircle, FileDown
} from "lucide-react";
import { useGenerateListings } from "@workspace/api-client-react";
import Papa from "papaparse";
import { useToast } from "@/hooks/use-toast";
import { downloadCSV } from "@/lib/utils";

const REQUIRED_COLUMNS = ["property_title", "location", "price"];
const OPTIONAL_COLUMNS = ["bedrooms", "bathrooms", "area_sqft", "property_type", "amenities", "nearby_landmarks"];
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

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
  const [stats, setStats] = useState<{ succeeded: number; failed: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { mutate: generate, isPending } = useGenerateListings({
    mutation: {
      onSuccess: (data) => {
        setResults(data.listings);
        setStats({ succeeded: data.succeeded, failed: data.failed });
        const desc = data.failed > 0
          ? `${data.succeeded} succeeded, ${data.failed} failed. ${data.creditsUsed} credits used.`
          : `${data.succeeded} listings generated. ${data.creditsUsed} credits used.`;
        toast({ title: "Generation complete", description: desc });
      },
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "Generation failed",
          description: err.response?.data?.error || "Unknown error occurred",
        });
      },
    },
  });

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

  const handleGenerate = () => {
    if (parsedRows.length === 0) return;

    const properties = parsedRows.map((row) => ({
      propertyTitle: row["property_title"] || "Unnamed Property",
      location: row["location"] || "",
      price: row["price"] || "",
      bedrooms: row["bedrooms"] || null,
      bathrooms: row["bathrooms"] || null,
      areaSqft: row["area_sqft"] || null,
      propertyType: row["property_type"] || null,
      amenities: row["amenities"] || null,
      nearbyLandmarks: row["nearby_landmarks"] || null,
    }));

    generate({
      data: {
        properties,
        outputMode,
        includeSocialCaption: includeSocial,
      },
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-10 h-full overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white mb-2">Bulk Generate</h1>
          <p className="text-muted-foreground">Upload your CSV and let AI write every listing description.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Controls */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="glass-panel">
              <CardContent className="p-6 space-y-6">

                {/* Step 1: Upload */}
                <div>
                  <h3 className="text-lg font-bold mb-3 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-primary" /> 1. Upload CSV
                  </h3>

                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />

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
                        className="text-xs text-muted-foreground hover:text-white px-2 shrink-0"
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
                        <button
                          onClick={() => setOutputMode("concise")}
                          className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${outputMode === "concise" ? "bg-primary/20 border-primary text-white" : "bg-transparent border-white/10 text-muted-foreground hover:border-white/30"}`}
                        >
                          Concise
                        </button>
                        <button
                          onClick={() => setOutputMode("detailed")}
                          className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${outputMode === "detailed" ? "bg-primary/20 border-primary text-white" : "bg-transparent border-white/10 text-muted-foreground hover:border-white/30"}`}
                        >
                          Detailed
                        </button>
                      </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={includeSocial}
                          onChange={(e) => setIncludeSocial(e.target.checked)}
                        />
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
                    disabled={!file || parsedRows.length === 0 || isPending}
                    onClick={handleGenerate}
                    isLoading={isPending}
                  >
                    {isPending ? `Generating ${parsedRows.length} listings…` : "Generate Descriptions"}
                  </Button>

                  {parsedRows.length > 0 && !isPending && (
                    <p className="text-xs text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Will use {parsedRows.length} credit{parsedRows.length !== 1 ? "s" : ""}
                    </p>
                  )}

                  {isPending && (
                    <p className="text-xs text-center text-primary mt-3 animate-pulse">
                      Processing row by row — please wait…
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
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                      <span className="flex items-center gap-1 text-green-400">
                        <CheckCircle2 className="w-3 h-3" /> {stats.succeeded} succeeded
                      </span>
                      {stats.failed > 0 && (
                        <span className="flex items-center gap-1 text-red-400">
                          <XCircle className="w-3 h-3" /> {stats.failed} failed
                        </span>
                      )}
                    </p>
                  )}
                </div>
                {results && (
                  <Button size="sm" variant="secondary" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" /> Export CSV
                  </Button>
                )}
              </div>

              <CardContent className="p-0 flex-1 overflow-y-auto">
                {!results && !isPending ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                    <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                    <p className="font-medium text-lg text-white mb-2">Ready to generate</p>
                    <p className="max-w-md text-sm">
                      Upload your CSV file and click Generate. All AI-written descriptions will appear here once complete.
                    </p>
                  </div>
                ) : isPending ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                    <div className="w-12 h-12 mb-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="font-medium text-lg text-white mb-2">Generating…</p>
                    <p className="max-w-md text-sm">
                      Processing {parsedRows.length} propert{parsedRows.length !== 1 ? "ies" : "y"} one by one.
                      This may take a moment.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {results!.map((res, i) => (
                      <div key={i} className={`p-6 hover:bg-white/[0.02] transition-colors ${res.failed ? "opacity-60" : ""}`}>
                        <h4 className="font-bold text-white text-base mb-3 flex items-center gap-2">
                          <span className="text-primary text-xs font-mono bg-primary/10 px-2 py-0.5 rounded">
                            #{i + 1}
                          </span>
                          {res.propertyTitle}
                          {res.failed && (
                            <span className="ml-auto flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded">
                              <XCircle className="w-3 h-3" /> Failed
                            </span>
                          )}
                        </h4>

                        {res.failed ? (
                          <p className="text-sm text-muted-foreground italic">
                            This row could not be processed. It has been skipped.
                          </p>
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                                Short Description
                              </p>
                              <p className="text-sm text-foreground/90">{res.shortDescription}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                                Long Description
                              </p>
                              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {res.longDescription}
                              </p>
                            </div>
                            {res.socialCaption && (
                              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">
                                  Social Caption
                                </p>
                                <p className="text-sm text-foreground/80">{res.socialCaption}</p>
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
        </div>
      </div>
    </AppLayout>
  );
}
