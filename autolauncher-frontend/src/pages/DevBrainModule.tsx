import { useState, useEffect } from 'react';
import { api, DevBrainProfile, DevBrainApp, DevBrainDecision, DevBrainCorrection, DevBrainSessionMeta, DevBrainSession, DevBrainMonitorStatus } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Brain, Loader2, Send, User, AppWindow, GitBranch,
  AlertTriangle, History, Activity, Zap, ChevronRight, Play, Square,
  BookOpen, Code, Lightbulb, Target, MessageSquare
} from 'lucide-react';

interface Props {
  onBack: () => void;
}

// ============ HELPERS ============

function safeParseJson(val: string | unknown): unknown[] | string[] {
  if (!val || val === '[]' || val === '""') return [];
  if (typeof val !== 'string') return [];
  try {
    return JSON.parse(val);
  } catch {
    return [val];
  }
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    'in-progress': 'bg-blue-500/20 text-blue-400',
    'deployed': 'bg-green-500/20 text-green-400',
    'planned': 'bg-yellow-500/20 text-yellow-400',
    'idea': 'bg-slate-500/20 text-slate-400',
    'running': 'bg-blue-500/20 text-blue-400',
    'completed': 'bg-green-500/20 text-green-400',
    'created': 'bg-yellow-500/20 text-yellow-400',
    'failed': 'bg-red-500/20 text-red-400',
  };
  return map[status] || 'bg-slate-500/20 text-slate-400';
}

function outcomeColor(outcome: string): string {
  if (outcome === 'success') return 'bg-green-500/20 text-green-400';
  if (outcome === 'partial') return 'bg-yellow-500/20 text-yellow-400';
  if (outcome === 'failed') return 'bg-red-500/20 text-red-400';
  return 'bg-slate-500/20 text-slate-400';
}

// ============ PROFILE PANEL ============

function ProfilePanel({ profile }: { profile: DevBrainProfile | null }) {
  if (!profile) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-8 text-center">
          <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No profile imported yet.</p>
          <p className="text-xs text-slate-500 mt-1">Import metadata to see your DevBrain profile.</p>
        </CardContent>
      </Card>
    );
  }

  const techStack = safeParseJson(profile.preferred_tech_stack) as string[];
  const conventions = safeParseJson(profile.coding_conventions) as string[];
  const archPrefs = safeParseJson(profile.architectural_preferences) as string[];
  const frustrations = safeParseJson(profile.frustrations) as string[];
  const worksWell = safeParseJson(profile.what_works_well) as string[];
  const patterns = safeParseJson(profile.work_patterns) as string[];
  const principles = safeParseJson(profile.key_principles) as string[];

  return (
    <div className="space-y-4">
      {/* Tech Stack */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-emerald-400 flex items-center gap-2">
            <Code className="w-4 h-4" /> Preferred Tech Stack
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {techStack.map((t, i) => (
              <Badge key={i} className="bg-emerald-500/20 text-emerald-400 text-xs">{String(t)}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Coding Conventions */}
      {conventions.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-400 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Coding Conventions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1">
              {conventions.map((c, i) => (
                <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">-</span> {String(c)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Architectural Preferences */}
      {archPrefs.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-400 flex items-center gap-2">
              <Target className="w-4 h-4" /> Architectural Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1">
              {archPrefs.map((a, i) => (
                <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">-</span> {String(a)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Communication Style */}
      {profile.communication_style && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-indigo-400 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Communication Style
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-slate-300">{profile.communication_style}</p>
          </CardContent>
        </Card>
      )}

      {/* Work Patterns & Principles */}
      <div className="grid md:grid-cols-2 gap-4">
        {patterns.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-cyan-400 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Work Patterns
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1">
                {patterns.map((p, i) => (
                  <li key={i} className="text-xs text-slate-300">- {String(p)}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {principles.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-400 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" /> Key Principles
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1">
                {principles.map((p, i) => (
                  <li key={i} className="text-xs text-slate-300">- {String(p)}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Frustrations & What Works Well */}
      <div className="grid md:grid-cols-2 gap-4">
        {frustrations.length > 0 && (
          <Card className="bg-red-900/20 border-red-800/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Frustrations
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1">
                {frustrations.map((f, i) => (
                  <li key={i} className="text-xs text-red-300">- {String(f)}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {worksWell.length > 0 && (
          <Card className="bg-green-900/20 border-green-800/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-400 flex items-center gap-2">
                <Zap className="w-4 h-4" /> What Works Well
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1">
                {worksWell.map((w, i) => (
                  <li key={i} className="text-xs text-green-300">- {String(w)}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ============ APPS CATALOG ============

function AppsCatalog({ apps, onSelect }: { apps: DevBrainApp[]; onSelect: (app: DevBrainApp) => void }) {
  if (apps.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-8 text-center">
          <AppWindow className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No apps imported yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
      {apps.map(app => {
        const techStack = safeParseJson(app.tech_stack) as string[];
        return (
          <Card
            key={app.id}
            className="bg-slate-800/50 border-slate-700 hover:border-emerald-600/50 cursor-pointer transition-colors"
            onClick={() => onSelect(app)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-white font-medium text-sm truncate flex-1">{app.name}</h4>
                <Badge className={`${statusColor(app.status)} text-xs ml-2`}>{app.status}</Badge>
              </div>
              <p className="text-xs text-slate-400 mb-3 line-clamp-2">{app.description || 'No description'}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {techStack.slice(0, 4).map((t, i) => (
                  <Badge key={i} className="bg-slate-700 text-slate-300 text-xs px-1.5 py-0">{String(t)}</Badge>
                ))}
                {techStack.length > 4 && (
                  <Badge className="bg-slate-700 text-slate-400 text-xs px-1.5 py-0">+{techStack.length - 4}</Badge>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{app.session_count} session{app.session_count !== 1 ? 's' : ''}</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============ APP DETAIL ============

function AppDetail({ app, decisions, corrections, onBack }: {
  app: DevBrainApp;
  decisions: DevBrainDecision[];
  corrections: DevBrainCorrection[];
  onBack: () => void;
}) {
  const techStack = safeParseJson(app.tech_stack) as string[];
  const requirements = safeParseJson(app.requirements) as string[];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h3 className="text-lg font-bold text-white">{app.name}</h3>
          <div className="flex items-center gap-2">
            <Badge className={`${statusColor(app.status)} text-xs`}>{app.status}</Badge>
            <span className="text-xs text-slate-500">{app.session_count} sessions</span>
            {app.priority && <Badge className="bg-slate-700 text-slate-300 text-xs">{app.priority}</Badge>}
          </div>
        </div>
      </div>

      {app.description && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <p className="text-sm text-slate-300">{app.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Tech Stack */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-400">Tech Stack</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-1">
              {techStack.map((t, i) => (
                <Badge key={i} className="bg-emerald-500/20 text-emerald-400 text-xs">{String(t)}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Requirements */}
        {requirements.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-400">Requirements</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1">
                {requirements.map((r, i) => (
                  <li key={i} className="text-xs text-slate-300">- {String(r)}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Decisions for this app */}
      {decisions.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-400 flex items-center gap-2">
              <GitBranch className="w-4 h-4" /> Decisions ({decisions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {decisions.map(d => (
              <div key={d.id} className="p-2 bg-slate-900/50 rounded-lg border border-slate-700/50">
                <p className="text-xs text-white">{d.decision}</p>
                {d.context && <p className="text-xs text-slate-500 mt-1">{d.context}</p>}
                <p className="text-xs text-slate-600 mt-1">{d.date}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Corrections for this app */}
      {corrections.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Corrections ({corrections.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {corrections.map(c => (
              <div key={c.id} className="p-2 bg-red-900/10 rounded-lg border border-red-800/20">
                <p className="text-xs text-slate-300">{c.correction}</p>
                <p className="text-xs text-slate-600 mt-1">{c.date}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============ DECISIONS LOG ============

function DecisionsLog({ decisions }: { decisions: DevBrainDecision[] }) {
  if (decisions.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-8 text-center">
          <GitBranch className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No decisions imported yet.</p>
        </CardContent>
      </Card>
    );
  }

  // Group by project
  const byProject: Record<string, DevBrainDecision[]> = {};
  for (const d of decisions) {
    const project = d.project || 'General';
    if (!byProject[project]) byProject[project] = [];
    byProject[project].push(d);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">{decisions.length} decisions across {Object.keys(byProject).length} projects</p>
      {Object.entries(byProject).map(([project, decs]) => (
        <Card key={project} className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-400">{project} ({decs.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 max-h-64 overflow-y-auto">
            {decs.map(d => (
              <div key={d.id} className="p-2 bg-slate-900/50 rounded border border-slate-700/50">
                <p className="text-xs text-white">{d.decision}</p>
                {d.context && <p className="text-xs text-slate-500 mt-1">{d.context}</p>}
                <p className="text-xs text-slate-600 mt-1">{d.date}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============ CORRECTIONS LOG ============

function CorrectionsLog({ corrections }: { corrections: DevBrainCorrection[] }) {
  if (corrections.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No corrections imported yet.</p>
        </CardContent>
      </Card>
    );
  }

  const byProject: Record<string, DevBrainCorrection[]> = {};
  for (const c of corrections) {
    const project = c.project || 'General';
    if (!byProject[project]) byProject[project] = [];
    byProject[project].push(c);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">{corrections.length} corrections across {Object.keys(byProject).length} projects</p>
      {Object.entries(byProject).map(([project, cors]) => (
        <Card key={project} className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-400">{project} ({cors.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2 max-h-64 overflow-y-auto">
            {cors.map(c => (
              <div key={c.id} className="p-2 bg-red-900/10 rounded border border-red-800/20">
                <p className="text-xs text-slate-300">{c.correction}</p>
                <p className="text-xs text-slate-600 mt-1">{c.date}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============ SESSIONS METADATA ============

function SessionsMetaPanel({ sessions }: { sessions: DevBrainSessionMeta[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (sessions.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-8 text-center">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No session metadata imported yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">{sessions.length} sessions extracted from Devin</p>
      {sessions.map(s => {
        const goals = safeParseJson(s.goals) as string[];
        const techStack = safeParseJson(s.tech_stack) as string[];
        const isExpanded = expanded === s.id;

        return (
          <Card
            key={s.id}
            className={`bg-slate-800/50 border-slate-700 cursor-pointer transition-colors ${isExpanded ? 'border-emerald-600/50' : 'hover:border-slate-600'}`}
            onClick={() => setExpanded(isExpanded ? null : s.id)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-white text-sm font-medium truncate">{s.title || s.project || 'Untitled'}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">{s.date}</span>
                    <Badge className={`${outcomeColor(s.outcome)} text-xs px-1.5 py-0`}>{s.outcome || 'unknown'}</Badge>
                    {s.project && <span className="text-xs text-slate-400">{s.project}</span>}
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                  {goals.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-indigo-400">Goals:</span>
                      <ul className="mt-1">
                        {goals.map((g, i) => (
                          <li key={i} className="text-xs text-slate-300">- {String(g)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {s.outcome_detail && (
                    <div>
                      <span className="text-xs font-semibold text-slate-400">Outcome:</span>
                      <p className="text-xs text-slate-300 mt-1">{s.outcome_detail}</p>
                    </div>
                  )}
                  {techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {techStack.map((t, i) => (
                        <Badge key={i} className="bg-slate-700 text-slate-300 text-xs px-1.5 py-0">{String(t)}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============ MANAGED SESSIONS ============

function ManagedSessionsPanel({ sessions }: { sessions: DevBrainSession[] }) {
  if (sessions.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6 text-center">
          <Activity className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No managed sessions yet.</p>
          <p className="text-xs text-slate-500 mt-1">Create a session below to start.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map(s => (
        <Card key={s.id} className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white text-sm font-medium">{s.app_name || 'General Session'}</h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-1">{s.original_prompt}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${statusColor(s.status)} text-xs`}>{s.status}</Badge>
                {s.auto_monitor ? <Activity className="w-3 h-3 text-green-400" /> : null}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span>{new Date(s.created_at).toLocaleString()}</span>
              {s.devin_session_id && <span className="font-mono">{s.devin_session_id.substring(0, 8)}...</span>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============ SESSION CREATOR ============

function SessionCreator({ apps, onCreated }: { apps: DevBrainApp[]; onCreated: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [appName, setAppName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!prompt.trim()) return;
    setCreating(true);
    setError('');
    try {
      await api.devbrain.createSession({
        app_name: appName || undefined,
        prompt: prompt.trim(),
        auto_monitor: true,
      });
      setPrompt('');
      setAppName('');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="bg-emerald-900/20 border-emerald-800/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-emerald-400 text-sm flex items-center gap-2">
          <Zap className="w-4 h-4" /> Create New Devin Session
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <select
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-white"
        >
          <option value="">Select app (optional)</option>
          {apps.map(a => (
            <option key={a.id} value={a.name}>{a.name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What should Devin build?"
            className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={!prompt.trim() || creating} className="bg-emerald-600 hover:bg-emerald-700" size="sm">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </CardContent>
    </Card>
  );
}

// ============ MONITOR STATUS ============

function MonitorPanel({ status, onStart, onStop }: {
  status: DevBrainMonitorStatus | null;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${status?.is_running ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
            <div>
              <p className="text-sm text-white font-medium">
                Background Monitor {status?.is_running ? 'Running' : 'Stopped'}
              </p>
              <p className="text-xs text-slate-500">
                {status ? `${status.active_sessions} active sessions | ${status.total_actions_taken} actions taken` : 'Loading...'}
                {status?.last_check_at && ` | Last check: ${new Date(status.last_check_at).toLocaleTimeString()}`}
              </p>
            </div>
          </div>
          <Button
            onClick={status?.is_running ? onStop : onStart}
            size="sm"
            className={status?.is_running ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
          >
            {status?.is_running ? <><Square className="w-3 h-3 mr-1" /> Stop</> : <><Play className="w-3 h-3 mr-1" /> Start</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ MAIN MODULE ============

export default function DevBrainModule({ onBack }: Props) {
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<DevBrainProfile | null>(null);
  const [apps, setApps] = useState<DevBrainApp[]>([]);
  const [decisions, setDecisions] = useState<DevBrainDecision[]>([]);
  const [corrections, setCorrections] = useState<DevBrainCorrection[]>([]);
  const [sessionsMeta, setSessionsMeta] = useState<DevBrainSessionMeta[]>([]);
  const [managedSessions, setManagedSessions] = useState<DevBrainSession[]>([]);
  const [monitorStatus, setMonitorStatus] = useState<DevBrainMonitorStatus | null>(null);
  const [selectedApp, setSelectedApp] = useState<DevBrainApp | null>(null);
  const [appDecisions, setAppDecisions] = useState<DevBrainDecision[]>([]);
  const [appCorrections, setAppCorrections] = useState<DevBrainCorrection[]>([]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.devbrain.profile(),
        api.devbrain.apps(),
        api.devbrain.decisions(),
        api.devbrain.corrections(),
        api.devbrain.sessionsMeta(),
        api.devbrain.sessions(),
        api.devbrain.monitorStatus(),
      ]);

      if (results[0].status === 'fulfilled') setProfile(results[0].value);
      if (results[1].status === 'fulfilled') setApps(results[1].value);
      if (results[2].status === 'fulfilled') setDecisions(results[2].value);
      if (results[3].status === 'fulfilled') setCorrections(results[3].value);
      if (results[4].status === 'fulfilled') setSessionsMeta(results[4].value);
      if (results[5].status === 'fulfilled') setManagedSessions(results[5].value);
      if (results[6].status === 'fulfilled') setMonitorStatus(results[6].value);
    } catch (err) {
      console.error('Failed to load DevBrain data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleSelectApp = async (app: DevBrainApp) => {
    setSelectedApp(app);
    setTab('app-detail');
    try {
      const [decs, cors] = await Promise.all([
        api.devbrain.decisions(app.name),
        api.devbrain.corrections(app.name),
      ]);
      setAppDecisions(decs);
      setAppCorrections(cors);
    } catch {
      setAppDecisions([]);
      setAppCorrections([]);
    }
  };

  const handleMonitorStart = async () => {
    try {
      await api.devbrain.monitorStart();
      const s = await api.devbrain.monitorStatus();
      setMonitorStatus(s);
    } catch (err) {
      console.error('Failed to start monitor:', err);
    }
  };

  const handleMonitorStop = async () => {
    try {
      await api.devbrain.monitorStop();
      const s = await api.devbrain.monitorStatus();
      setMonitorStatus(s);
    } catch (err) {
      console.error('Failed to stop monitor:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-slate-400 text-sm">Loading DevBrain...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Brain className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl font-bold text-white">DevBrain</h1>
            <span className="text-xs text-slate-500">AI Agent Memory</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{apps.length} apps</span>
            <span>{decisions.length} decisions</span>
            <span>{corrections.length} corrections</span>
            <span>{sessionsMeta.length} sessions</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Monitor Status Bar */}
        <div className="mb-6">
          <MonitorPanel status={monitorStatus} onStart={handleMonitorStart} onStop={handleMonitorStop} />
        </div>

        {/* Tab Content */}
        {tab === 'app-detail' && selectedApp ? (
          <AppDetail
            app={selectedApp}
            decisions={appDecisions}
            corrections={appCorrections}
            onBack={() => { setSelectedApp(null); setTab('apps'); }}
          />
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-slate-800 border-slate-700 w-full justify-start flex-wrap h-auto gap-1 p-1 mb-6">
              <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600 text-xs">
                <Brain className="w-3 h-3 mr-1" />Overview
              </TabsTrigger>
              <TabsTrigger value="profile" className="data-[state=active]:bg-emerald-600 text-xs">
                <User className="w-3 h-3 mr-1" />Profile
              </TabsTrigger>
              <TabsTrigger value="apps" className="data-[state=active]:bg-emerald-600 text-xs">
                <AppWindow className="w-3 h-3 mr-1" />Apps ({apps.length})
              </TabsTrigger>
              <TabsTrigger value="decisions" className="data-[state=active]:bg-emerald-600 text-xs">
                <GitBranch className="w-3 h-3 mr-1" />Decisions ({decisions.length})
              </TabsTrigger>
              <TabsTrigger value="corrections" className="data-[state=active]:bg-emerald-600 text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />Corrections ({corrections.length})
              </TabsTrigger>
              <TabsTrigger value="sessions" className="data-[state=active]:bg-emerald-600 text-xs">
                <History className="w-3 h-3 mr-1" />Sessions ({sessionsMeta.length})
              </TabsTrigger>
              <TabsTrigger value="managed" className="data-[state=active]:bg-emerald-600 text-xs">
                <Activity className="w-3 h-3 mr-1" />Managed ({managedSessions.length})
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab - Shows key stats and quick access */}
            <TabsContent value="overview" className="mt-0 space-y-6">
              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-400">{apps.length}</p>
                    <p className="text-xs text-slate-400">Apps Tracked</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-amber-400">{decisions.length}</p>
                    <p className="text-xs text-slate-400">Decisions</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-red-400">{corrections.length}</p>
                    <p className="text-xs text-slate-400">Corrections</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-400">{sessionsMeta.length}</p>
                    <p className="text-xs text-slate-400">Sessions Extracted</p>
                  </CardContent>
                </Card>
              </div>

              {/* Create Session */}
              <SessionCreator apps={apps} onCreated={loadAll} />

              {/* Quick Profile Summary */}
              {profile && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-emerald-400 flex items-center gap-2">
                      <User className="w-4 h-4" /> Your Profile Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(safeParseJson(profile.preferred_tech_stack) as string[]).slice(0, 8).map((t, i) => (
                        <Badge key={i} className="bg-emerald-500/20 text-emerald-400 text-xs">{String(t)}</Badge>
                      ))}
                    </div>
                    {profile.communication_style && (
                      <p className="text-xs text-slate-400">{profile.communication_style}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Recent Apps */}
              {apps.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Top Apps by Sessions</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {apps.slice(0, 6).map(app => {
                      const techStack = safeParseJson(app.tech_stack) as string[];
                      return (
                        <Card
                          key={app.id}
                          className="bg-slate-800/50 border-slate-700 hover:border-emerald-600/50 cursor-pointer transition-colors"
                          onClick={() => handleSelectApp(app)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-white text-sm font-medium truncate">{app.name}</h4>
                              <Badge className={`${statusColor(app.status)} text-xs`}>{app.status}</Badge>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {techStack.slice(0, 3).map((t, i) => (
                                <Badge key={i} className="bg-slate-700 text-slate-300 text-xs px-1 py-0">{String(t)}</Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Managed Sessions */}
              {managedSessions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Managed Devin Sessions</h3>
                  <ManagedSessionsPanel sessions={managedSessions} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="profile" className="mt-0">
              <ProfilePanel profile={profile} />
            </TabsContent>

            <TabsContent value="apps" className="mt-0">
              <AppsCatalog apps={apps} onSelect={handleSelectApp} />
            </TabsContent>

            <TabsContent value="decisions" className="mt-0">
              <DecisionsLog decisions={decisions} />
            </TabsContent>

            <TabsContent value="corrections" className="mt-0">
              <CorrectionsLog corrections={corrections} />
            </TabsContent>

            <TabsContent value="sessions" className="mt-0">
              <SessionsMetaPanel sessions={sessionsMeta} />
            </TabsContent>

            <TabsContent value="managed" className="mt-0 space-y-4">
              <SessionCreator apps={apps} onCreated={loadAll} />
              <ManagedSessionsPanel sessions={managedSessions} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
