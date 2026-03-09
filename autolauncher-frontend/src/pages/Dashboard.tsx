import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { api, DashboardData, Project, CredentialStatus } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Rocket, Settings, Plus, LogOut, BarChart3, Zap, Globe, Shield, Brain, Code2, Trash2, X, Loader2 } from 'lucide-react';
import SetupWizard from './SetupWizard';
import ProjectFlow from './ProjectFlow';
import HelixaModule from './HelixaModule';
import Planter from './Planter';

type View = 'dashboard' | 'setup' | 'project' | 'helixa' | 'planter';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [credStatus, setCredStatus] = useState<CredentialStatus[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [planterIdeaId, setPlanterIdeaId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    try {
      const [d, p, c] = await Promise.all([
        api.dashboard.get(),
        api.projects.list(),
        api.credentials.status(),
      ]);
      setDashboard(d);
      setProjects(p);
      setCredStatus(c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const configuredCreds = credStatus.filter(c => c.is_configured).length;
  const validCreds = credStatus.filter(c => c.is_valid).length;

  const openProject = (id: number) => {
    setSelectedProjectId(id);
    setView('project');
  };

  const handleDeleteProject = async () => {
    if (!deleteProjectId || !deletePassword) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.projects.delete(deleteProjectId, deletePassword);
      setDeleteProjectId(null);
      setDeletePassword('');
      await loadData();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      setup: 'bg-slate-500', questionnaire_done: 'bg-yellow-500', listing_generated: 'bg-blue-500',
      pipeline_running: 'bg-blue-500', submitted: 'bg-green-500', pipeline_failed: 'bg-blue-500', live: 'bg-green-500',
    };
    return map[status] || 'bg-slate-500';
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      setup: 'Setup', questionnaire_done: 'Questionnaire Done', listing_generated: 'Listing Ready',
      pipeline_running: 'Pipeline Executing...', submitted: 'Pipeline Complete', pipeline_failed: 'System Handling...', live: 'Live',
    };
    return map[status] || status;
  };

  if (view === 'setup') {
    return <SetupWizard onBack={() => { setView('dashboard'); loadData(); }} />;
  }

  if (view === 'project') {
    return <ProjectFlow projectId={selectedProjectId} onBack={() => { setView('dashboard'); loadData(); }} />;
  }

  if (view === 'helixa') {
    return <HelixaModule onBack={() => { setView('dashboard'); loadData(); }} onBuildApp={(ideaId) => { setPlanterIdeaId(ideaId); setView('planter'); }} />;
  }

  if (view === 'planter') {
    return <Planter onBack={() => { setPlanterIdeaId(null); setView('dashboard'); loadData(); }} initialIdeaId={planterIdeaId} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Auto Launch" className="h-8 w-8" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <h1 className="text-xl font-bold text-white">Auto Launch</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 hidden sm:inline truncate max-w-48">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={logout} className="text-slate-400 hover:text-white">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg"><Rocket className="w-5 h-5 text-blue-400" /></div>
                <div>
                  <p className="text-2xl font-bold text-white">{dashboard?.total_projects || 0}</p>
                  <p className="text-xs text-slate-400">Total Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg"><Globe className="w-5 h-5 text-green-400" /></div>
                <div>
                  <p className="text-2xl font-bold text-white">{dashboard?.projects_live || 0}</p>
                  <p className="text-xs text-slate-400">Apps Live</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg"><Zap className="w-5 h-5 text-purple-400" /></div>
                <div>
                  <p className="text-2xl font-bold text-white">{dashboard?.total_generations || 0}</p>
                  <p className="text-xs text-slate-400">AI Generations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg"><BarChart3 className="w-5 h-5 text-orange-400" /></div>
                <div>
                  <p className="text-2xl font-bold text-white">{dashboard?.total_tokens_used?.toLocaleString() || 0}</p>
                  <p className="text-xs text-slate-400">AI Tokens Used</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* HELIXA + Planter Modules */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card className="bg-indigo-900/20 border-indigo-800/30 cursor-pointer hover:border-indigo-600 transition-colors" onClick={() => setView('helixa')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <Brain className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">HELIXA</h3>
                    <p className="text-xs text-indigo-400">Idea Capture & Scoring</p>
                  </div>
                </div>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  <Brain className="w-4 h-4 mr-1" /> Open
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-900/20 border-emerald-800/30 cursor-pointer hover:border-emerald-600 transition-colors" onClick={() => setView('planter')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Code2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Planter</h3>
                    <p className="text-xs text-emerald-400">Autonomous App Builder</p>
                  </div>
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  <Code2 className="w-4 h-4 mr-1" /> Open
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Setup Status */}
        <Card className="bg-slate-900/50 border-slate-800 mb-8">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5" /> Setup Status
              </CardTitle>
              <Button size="sm" onClick={() => setView('setup')} className="bg-blue-600 hover:bg-blue-700">
                <Settings className="w-4 h-4 mr-1" /> Configure
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {['apple', 'google', 'github', 'ios_signing', 'android_signing'].map(type => {
                const cred = credStatus.find(c => c.credential_type === type);
                const labels: Record<string, string> = {
                  apple: 'Apple Developer', google: 'Google Play', github: 'GitHub',
                  ios_signing: 'iOS Signing', android_signing: 'Android Signing'
                };
                return (
                  <div key={type} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50">
                    <div className={`w-2 h-2 rounded-full ${cred?.is_valid ? 'bg-green-400' : cred?.is_configured ? 'bg-yellow-400' : 'bg-slate-600'}`} />
                    <span className="text-xs text-slate-300">{labels[type]}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-2">{configuredCreds}/5 configured, {validCreds}/5 validated</p>
          </CardContent>
        </Card>

        {/* Projects */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Your Projects</h2>
          <Button onClick={() => { setSelectedProjectId(null); setView('project'); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" /> New App Launch
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-12 text-center">
              <Rocket className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
              <p className="text-slate-400 mb-6">Start by configuring your credentials, then launch your first app!</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setView('setup')} variant="outline" className="border-slate-700 text-slate-300">
                  <Settings className="w-4 h-4 mr-1" /> Setup Credentials
                </Button>
                <Button onClick={() => { setSelectedProjectId(null); setView('project'); }} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-1" /> Launch First App
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <Card key={p.id} className="bg-slate-900/50 border-slate-800 hover:border-slate-700 cursor-pointer transition-colors" onClick={() => openProject(p.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-2">
                      <h3 className="font-semibold text-white truncate">{p.name}</h3>
                      <p className="text-xs text-slate-400">{p.bundle_id || 'No bundle ID'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`${statusColor(p.status)} text-white text-xs`}>
                        {statusLabel(p.status)}
                      </Badge>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteProjectId(p.id); setDeletePassword(''); setDeleteError(''); }}
                        className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>Platform: {p.platform}</span>
                    <span>{p.questionnaire_complete ? 'Questionnaire done' : 'Questionnaire pending'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    {p.questionnaire_complete && <div className="w-2 h-2 rounded-full bg-green-400" />}
                    {p.listing_generated && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                    {p.status === 'live' && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Delete confirmation dialog */}
      {deleteProjectId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Delete Project</h3>
              <button onClick={() => { setDeleteProjectId(null); setDeletePassword(''); setDeleteError(''); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">Enter your password to confirm deletion. This action cannot be undone.</p>
            <Input
              type="password"
              placeholder="Your password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDeleteProject()}
              className="bg-slate-800 border-slate-700 text-white mb-3"
              autoFocus
            />
            {deleteError && <p className="text-red-400 text-sm mb-3">{deleteError}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-slate-700 text-slate-300" onClick={() => { setDeleteProjectId(null); setDeletePassword(''); setDeleteError(''); }}>
                Cancel
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteProject} disabled={!deletePassword || deleting}>
                {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
