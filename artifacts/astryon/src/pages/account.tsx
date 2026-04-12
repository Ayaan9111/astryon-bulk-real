import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetMe, useUpdateProfile, useChangePassword, useSubmitFeedback } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Lock, MessageSquare } from "lucide-react";
import { openPaddleCheckout } from "@/hooks/use-paddle";

const PLAN_PRICE_IDS: Record<string, string> = {
  starter: "pri_01knrwepzjjaqzr9v8wvtf4azp",
  pro: "pri_01knrwq2v3vg7vb2gtmebfbb3s",
  agency: "pri_01knrx4545jmdw257v1jjf1k4v",
};

const UPGRADE_PLANS = [
  { id: "starter", name: "Starter", price: "€49" },
  { id: "pro", name: "Pro", price: "€129", popular: true },
  { id: "agency", name: "Agency", price: "€299" },
];

export default function Account() {
  const { data: user } = useGetMe();
  const { toast } = useToast();
  
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackType, setFeedbackType] = useState<"bug"|"feature"|"general">("general");

  const { mutate: updateProfile, isPending: updatingProfile } = useUpdateProfile({
    mutation: {
      onSuccess: () => toast({ title: "Profile updated" })
    }
  });

  const { mutate: changePass, isPending: changingPass } = useChangePassword({
    mutation: {
      onSuccess: () => {
        toast({ title: "Password changed successfully" });
        setCurrentPassword("");
        setNewPassword("");
      },
      onError: () => toast({ variant: "destructive", title: "Failed to change password" })
    }
  });

  const { mutate: sendFeedback, isPending: sendingFeedback } = useSubmitFeedback({
    mutation: {
      onSuccess: () => {
        toast({ title: "Feedback sent. Thank you!" });
        setFeedbackSubject("");
        setFeedbackMsg("");
      }
    }
  });

  return (
    <AppLayout>
      <div className="p-6 md:p-10 h-full overflow-y-auto max-w-5xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-display font-bold text-white mb-2">Account Settings</h1>
          <p className="text-muted-foreground">Manage your profile, subscription, and security.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            {/* Profile */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block text-muted-foreground">Full Name</label>
                  <Input 
                    value={fullName} onChange={e => setFullName(e.target.value)}
                    icon={<User className="w-4 h-4" />}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block text-muted-foreground">Email</label>
                  <Input 
                    value={email} onChange={e => setEmail(e.target.value)}
                    icon={<Mail className="w-4 h-4" />}
                  />
                </div>
                <Button 
                  onClick={() => updateProfile({ data: { fullName, email } })}
                  isLoading={updatingProfile}
                  variant="secondary"
                >
                  Save Profile
                </Button>
              </CardContent>
            </Card>

            {/* Password */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block text-muted-foreground">Current Password</label>
                  <Input 
                    type="password"
                    value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                    icon={<Lock className="w-4 h-4" />}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block text-muted-foreground">New Password</label>
                  <Input 
                    type="password"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    icon={<Lock className="w-4 h-4" />}
                  />
                </div>
                <Button 
                  onClick={() => changePass({ data: { currentPassword, newPassword } })}
                  isLoading={changingPass}
                  disabled={!currentPassword || !newPassword}
                  variant="secondary"
                >
                  Update Password
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            {/* Subscription Info */}
            <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
              <CardHeader>
                <CardTitle>Subscription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-black/30 p-4 rounded-xl border border-white/5">
                  <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                  <p className="text-2xl font-bold text-white capitalize">{user?.plan}</p>
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Credits</span>
                    <span className="font-bold text-primary">{user?.creditsRemaining} / {user?.creditsTotal}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider pt-1">Upgrade your plan</p>
                <div className="space-y-2">
                  {UPGRADE_PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => openPaddleCheckout({
                        priceId: PLAN_PRICE_IDS[plan.id],
                        email: user?.email,
                      })}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all hover:scale-[1.01] active:scale-100 ${
                        plan.popular
                          ? "border-primary bg-primary/10 text-white hover:bg-primary/20"
                          : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {plan.name}
                        {plan.popular && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-primary/30 text-primary rounded-full font-semibold">
                            Popular
                          </span>
                        )}
                      </span>
                      <span className="font-bold">{plan.price}<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Feedback */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Send Feedback</CardTitle>
                <CardDescription>Help us improve Astryón</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <select 
                  value={feedbackType} 
                  onChange={e => setFeedbackType(e.target.value as any)}
                  className="w-full h-10 rounded-lg border border-border bg-black/20 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-white"
                >
                  <option value="general">General Suggestion</option>
                  <option value="feature">Feature Request</option>
                  <option value="bug">Bug Report</option>
                </select>
                <Input 
                  placeholder="Subject" 
                  value={feedbackSubject} 
                  onChange={e => setFeedbackSubject(e.target.value)}
                />
                <textarea 
                  className="w-full rounded-xl border border-border bg-black/20 p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                  placeholder="Your message..."
                  value={feedbackMsg}
                  onChange={e => setFeedbackMsg(e.target.value)}
                />
                <Button 
                  className="w-full" 
                  onClick={() => sendFeedback({ data: { subject: feedbackSubject, message: feedbackMsg, type: feedbackType } })}
                  isLoading={sendingFeedback}
                  disabled={!feedbackSubject || !feedbackMsg}
                >
                  Submit Feedback
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
