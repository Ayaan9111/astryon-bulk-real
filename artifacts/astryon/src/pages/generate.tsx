import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, CheckCircle2, AlertCircle, Settings2, Download } from "lucide-react";
import { useGenerateListings, type PropertyRow } from "@workspace/api-client-react";
import Papa from "papaparse";
import { useToast } from "@/hooks/use-toast";
import { downloadCSV } from "@/lib/utils";

export default function Generate() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<PropertyRow[]>([]);
  const [outputMode, setOutputMode] = useState<'concise' | 'detailed'>('detailed');
  const [includeSocial, setIncludeSocial] = useState(true);
  const [results, setResults] = useState<any[] | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { mutate: generate, isPending } = useGenerateListings({
    mutation: {
      onSuccess: (data) => {
        setResults(data.listings);
        toast({ title: "Success!", description: `Generated ${data.listings.length} listings using ${data.creditsUsed} credits.` });
      },
      onError: (err) => {
        // @ts-ignore
        toast({ variant: "destructive", title: "Generation failed", description: err.response?.data?.error || "Unknown error occurred" });
      }
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith('.csv')) {
      toast({ variant: "destructive", title: "Invalid file type", description: "Please upload a CSV file." });
      return;
    }

    setFile(selected);
    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapped = results.data.map((row: any) => ({
          propertyTitle: row.property_title || row.PropertyTitle || row.Title || "Unknown Property",
          propertyType: row.property_type || row.PropertyType || row.Type,
          bedrooms: row.bedrooms || row.Bedrooms || row.Beds,
          bathrooms: row.bathrooms || row.Bathrooms || row.Baths,
          area: row.area || row.Area || row.Sqft,
          location: row.location || row.Location || row.Address,
          price: row.price || row.Price,
          amenities: row.amenities || row.Amenities,
          nearbyLandmarks: row.nearby_landmarks || row.NearbyLandmarks,
          additionalNotes: row.additional_notes || row.Notes
        })) as PropertyRow[];
        setParsedData(mapped);
      }
    });
  };

  const handleGenerate = () => {
    if (parsedData.length === 0) return;
    generate({
      data: {
        properties: parsedData,
        outputMode,
        includeSocialCaption: includeSocial
      }
    });
  };

  const handleDownload = () => {
    if (!results) return;
    const exportData = results.map((r, i) => ({
      ...parsedData[i], // Keep original data
      GeneratedShortDescription: r.shortDescription,
      GeneratedLongDescription: r.longDescription,
      GeneratedSocialCaption: r.socialCaption || ""
    }));
    downloadCSV(exportData, `astryon-results-${Date.now()}.csv`);
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-10 h-full overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white mb-2">Bulk Generate</h1>
          <p className="text-muted-foreground">Upload your CSV and let AI do the heavy lifting.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Controls */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="glass-panel">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center"><FileText className="w-5 h-5 mr-2 text-primary" /> 1. Upload Data</h3>
                  <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                  
                  {!file ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-white/5 transition-all"
                    >
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm font-medium">Click to upload CSV</p>
                      <p className="text-xs text-muted-foreground mt-1">Requires property_title column</p>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-medium text-white truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{parsedData.length} rows found</p>
                        </div>
                      </div>
                      <button onClick={() => {setFile(null); setParsedData([]); setResults(null);}} className="text-xs text-muted-foreground hover:text-white px-2">Clear</button>
                    </div>
                  )}
                </div>

                <div className="h-px bg-white/10 w-full" />

                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center"><Settings2 className="w-5 h-5 mr-2 text-primary" /> 2. Configure</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Output Detail Level</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => setOutputMode('concise')}
                          className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${outputMode === 'concise' ? 'bg-primary/20 border-primary text-white' : 'bg-transparent border-white/10 text-muted-foreground hover:border-white/30'}`}
                        >
                          Concise
                        </button>
                        <button 
                          onClick={() => setOutputMode('detailed')}
                          className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${outputMode === 'detailed' ? 'bg-primary/20 border-primary text-white' : 'bg-transparent border-white/10 text-muted-foreground hover:border-white/30'}`}
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
                        <div className={`w-5 h-5 rounded border ${includeSocial ? 'bg-primary border-primary' : 'border-white/30'} flex items-center justify-center transition-colors`}>
                          {includeSocial && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <span className="text-sm font-medium">Generate Social Captions</span>
                    </label>
                  </div>
                </div>

                <div className="h-px bg-white/10 w-full" />

                <div>
                  <Button 
                    className="w-full h-12 text-lg" 
                    disabled={!file || parsedData.length === 0 || isPending}
                    onClick={handleGenerate}
                    isLoading={isPending}
                  >
                    Generate Descriptions
                  </Button>
                  {parsedData.length > 0 && (
                    <p className="text-xs text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Will consume {parsedData.length} credits
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2">
            <Card className="glass-panel h-[calc(100vh-10rem)] flex flex-col">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
                <h3 className="font-bold text-lg">Results Preview</h3>
                {results && (
                  <Button size="sm" variant="secondary" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" /> Export CSV
                  </Button>
                )}
              </div>
              <CardContent className="p-0 flex-1 overflow-y-auto">
                {!results ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                    <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                    <p className="font-medium text-lg text-white mb-2">Ready to generate</p>
                    <p className="max-w-md">Upload your CSV and click generate. Your AI-written descriptions will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {results.map((res, i) => (
                      <div key={i} className="p-6 hover:bg-white/[0.02] transition-colors">
                        <h4 className="font-bold text-white text-lg mb-3 flex items-center gap-2">
                          <span className="text-primary text-sm font-mono bg-primary/10 px-2 py-0.5 rounded">#{i+1}</span> 
                          {res.propertyTitle}
                        </h4>
                        
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
                              <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-2 flex items-center gap-2">
                                Social Caption
                              </p>
                              <p className="text-sm text-foreground/80">{res.socialCaption}</p>
                            </div>
                          )}
                        </div>
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
