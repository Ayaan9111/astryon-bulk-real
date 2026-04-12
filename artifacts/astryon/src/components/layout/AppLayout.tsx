import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { 
  LayoutDashboard, 
  Sparkles, 
  History, 
  Settings, 
  ShieldAlert, 
  LogOut,
  CreditCard
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const token = useAuthStore(state => state.token);
  const logoutStore = useAuthStore(state => state.logout);
  
  const { data: user, isLoading } = useGetMe({
    query: { enabled: !!token, retry: false }
  });

  const { mutate: doLogout } = useLogout({
    mutation: {
      onSuccess: () => {
        logoutStore();
        window.location.href = "/login";
      }
    }
  });

  if (!token) {
    window.location.href = "/login";
    return null;
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Generate", href: "/generate", icon: Sparkles },
    { name: "History", href: "/history", icon: History },
    { name: "Account", href: "/account", icon: Settings },
  ];

  if (user?.role === 'admin') {
    navItems.push({ name: "Admin Panel", href: "/admin", icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-card/50 backdrop-blur-xl border-r border-border flex flex-col flex-shrink-0 md:h-screen md:sticky top-0 z-40">
        <div className="h-20 flex items-center px-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">Astryón</span>
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href} className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary/10 text-primary border border-primary/20" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}>
                <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.name}
              </Link>
            )
          })}
        </div>

        <div className="p-6 border-t border-border bg-black/20">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Credits</span>
              <span className="text-sm font-bold text-primary">{user?.creditsRemaining}</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent"
                style={{ width: `${Math.min(100, ((user?.creditsRemaining || 0) / (user?.creditsTotal || 1)) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Resets next month</p>
          </div>

          <button 
            onClick={() => doLogout()}
            className="flex items-center gap-3 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors w-full px-4 py-2"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>

          <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="text-xs text-muted-foreground hover:text-white transition-colors">Terms</Link>
            <Link href="/refund" className="text-xs text-muted-foreground hover:text-white transition-colors">Refund</Link>
            <Link href="/contact" className="text-xs text-muted-foreground hover:text-white transition-colors">Contact</Link>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-2">
            &copy; {new Date().getFullYear()} Astryón. All rights reserved.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
