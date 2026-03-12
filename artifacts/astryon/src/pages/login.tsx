import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, Sparkles, AlertCircle } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { useAuthStore } from "@/lib/store";
import { motion } from "framer-motion";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const setToken = useAuthStore(state => state.setToken);

  const { mutate: login, isPending, error } = useLogin({
    mutation: {
      onSuccess: (data) => {
        setToken(data.token);
        setLocation("/dashboard");
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ data: { email, password } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background z-0" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <Link href="/" className="flex items-center justify-center gap-2 mb-8 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg group-hover:shadow-primary/40 transition-all">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-white">Astryón</span>
        </Link>

        <Card className="glass-panel">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Enter your credentials to access your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {/* @ts-ignore - Orval generates generic error type, extracting message safely */}
                  {error.response?.data?.error || "Failed to login. Please check credentials."}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">Email</label>
                <Input 
                  type="email" 
                  placeholder="name@company.com" 
                  icon={<Mail className="w-5 h-5" />}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <Link href="/forgot" className="text-xs text-primary hover:underline">Forgot?</Link>
                </div>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  icon={<Lock className="w-5 h-5" />}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full mt-6" isLoading={isPending}>
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">Create one</Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
