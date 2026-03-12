import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetMe, useAdminGetUsers, useAdminGetStats, useAdminGetSettings, useAdminGetFeedback } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ShieldAlert, Users, TrendingUp, Settings, MessageSquare } from "lucide-react";

export default function Admin() {
  const { data: user } = useGetMe();
  const [activeTab, setActiveTab] = useState('users');

  const { data: stats } = useAdminGetStats({ query: { enabled: user?.role === 'admin' } });
  const { data: users } = useAdminGetUsers({}, { query: { enabled: user?.role === 'admin' } });
  const { data: feedback } = useAdminGetFeedback({ query: { enabled: user?.role === 'admin' } });

  if (user?.role !== 'admin') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <ShieldAlert className="w-16 h-16 mx-auto mb-4 opacity-50 text-destructive" />
            <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
            <p>You do not have permission to view the admin panel.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 md:p-10 h-full overflow-y-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
              <ShieldAlert className="text-primary" /> Admin Control Center
            </h1>
            <p className="text-muted-foreground">Platform oversight and configuration.</p>
          </div>
        </header>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-panel bg-primary/10 border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm text-primary mb-1 font-medium">Total Users</p>
              <p className="text-3xl font-bold text-white">{stats?.totalUsers || 0}</p>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1 font-medium">Active Subs</p>
              <p className="text-3xl font-bold text-white">{stats?.activeSubscriptions || 0}</p>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1 font-medium">Generations</p>
              <p className="text-3xl font-bold text-white">{stats?.totalGenerations || 0}</p>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1 font-medium">Credits Used</p>
              <p className="text-3xl font-bold text-white">{stats?.totalCreditsUsed || 0}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex border-b border-border mb-6 space-x-6">
          <button 
            className={`pb-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-white'}`}
            onClick={() => setActiveTab('users')}
          ><Users className="inline w-4 h-4 mr-2"/>Users</button>
          <button 
            className={`pb-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'feedback' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-white'}`}
            onClick={() => setActiveTab('feedback')}
          ><MessageSquare className="inline w-4 h-4 mr-2"/>Feedback</button>
        </div>

        {activeTab === 'users' && (
          <Card className="glass-panel">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-black/40 border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Plan</th>
                    <th className="px-6 py-4">Credits</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users?.users?.map(u => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4">
                        <p className="font-bold text-white">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="px-6 py-4 capitalize">{u.plan}</td>
                      <td className="px-6 py-4 text-primary font-bold">{u.creditsRemaining}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${u.subscriptionStatus === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-muted-foreground'}`}>
                          {u.subscriptionStatus || 'None'}
                        </span>
                      </td>
                      <td className="px-6 py-4">{format(new Date(u.createdAt), 'MMM d, yyyy')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'feedback' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feedback?.feedback?.map(f => (
              <Card key={f.id} className="glass-panel">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-1 rounded text-xs uppercase tracking-wider font-bold ${f.type === 'bug' ? 'bg-destructive/20 text-destructive' : f.type === 'feature' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white'}`}>
                      {f.type}
                    </span>
                    <span className="text-xs text-muted-foreground">{format(new Date(f.createdAt), 'MMM d')}</span>
                  </div>
                  <h4 className="font-bold text-white mb-2">{f.subject}</h4>
                  <p className="text-sm text-muted-foreground mb-4">{f.message}</p>
                  <p className="text-xs text-primary">{f.userEmail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
