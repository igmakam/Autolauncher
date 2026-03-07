import { useState, useEffect, useRef } from 'react';
import { api, HelixaIdeaSummary, HelixaIdea } from '../lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Send, Loader2, Brain, Code2, Eye, Play,
  Terminal, Check, Rocket, RefreshCw, ExternalLink,
  FileCode, Layout, Database, Globe, Palette, Settings2
} from 'lucide-react';

interface Props {
  onBack: () => void;
  initialIdeaId?: number | null;
}

interface BuildStep {
  id: string;
  label: string;
  icon: typeof Code2;
  status: 'pending' | 'active' | 'done' | 'error';
  detail?: string;
}

interface ChatMessage {
  role: 'user' | 'system' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PlanterProject {
  id: string;
  name: string;
  ideaId?: number;
  ideaName?: string;
  repoUrl?: string;
  previewUrl?: string;
  backendUrl?: string;
  status: 'idle' | 'planning' | 'building' | 'deployed' | 'error';
  stack: {
    frontend: string;
    backend: string;
    database: string;
    hosting: string;
  };
  buildSteps: BuildStep[];
  chatHistory: ChatMessage[];
}

const DEFAULT_STEPS: BuildStep[] = [
  { id: 'plan', label: 'Architecture Plan', icon: Layout, status: 'pending' },
  { id: 'repo', label: 'Create GitHub Repo', icon: FileCode, status: 'pending' },
  { id: 'backend', label: 'Build Backend API', icon: Database, status: 'pending' },
  { id: 'frontend', label: 'Build Frontend UI', icon: Palette, status: 'pending' },
  { id: 'integrate', label: 'Integration & Testing', icon: Settings2, status: 'pending' },
  { id: 'deploy', label: 'Deploy to Production', icon: Globe, status: 'pending' },
];

export default function Planter({ onBack, initialIdeaId }: Props) {
  const [ideas, setIdeas] = useState<HelixaIdeaSummary[]>([]);
  const [, setSelectedIdea] = useState<HelixaIdea | null>(null);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<PlanterProject | null>(null);
  const [promptInput, setPromptInput] = useState('');
  const [sending, setSending] = useState(false);
  const [previewTab, setPreviewTab] = useState<'preview' | 'terminal'>('preview');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '$ planter init',
    'Planter v1.0 - Autonomous App Builder',
    'Ready. Select an idea or describe your app.',
    ''
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const ideasList = await api.helixa.ideas.list();
        setIdeas(ideasList);
        if (initialIdeaId) {
          const idea = await api.helixa.ideas.get(initialIdeaId);
          setSelectedIdea(idea);
          initProject(idea);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [initialIdeaId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [project?.chatHistory?.length]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs.length]);

  const initProject = (idea: HelixaIdea) => {
    const slug = idea.idea_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newProject: PlanterProject = {
      id: `planter-${Date.now()}`,
      name: idea.idea_name,
      ideaId: idea.id,
      ideaName: idea.idea_name,
      status: 'idle',
      stack: {
        frontend: idea.build_brief?.suggested_tech_stack?.frontend || 'React + Vite + Tailwind',
        backend: idea.build_brief?.suggested_tech_stack?.backend || 'FastAPI + Python',
        database: idea.build_brief?.suggested_tech_stack?.database || 'Supabase (PostgreSQL)',
        hosting: 'Render (backend) + Devinapps (frontend)',
      },
      buildSteps: DEFAULT_STEPS.map(s => ({ ...s })),
      chatHistory: [
        {
          role: 'system',
          content: `Project "${idea.idea_name}" initialized from HELIXA idea (Score: ${idea.overall_score}/10)`,
          timestamp: new Date()
        },
        {
          role: 'assistant',
          content: `I've loaded the build brief for **${idea.idea_name}**.\n\n**Problem:** ${idea.build_brief?.problem || idea.structured_idea?.problem_statement}\n**Solution:** ${idea.build_brief?.solution || idea.structured_idea?.proposed_solution}\n\n**Suggested Stack:**\n- Frontend: ${idea.build_brief?.suggested_tech_stack?.frontend || 'React + Tailwind'}\n- Backend: ${idea.build_brief?.suggested_tech_stack?.backend || 'FastAPI'}\n- Database: ${idea.build_brief?.suggested_tech_stack?.database || 'Supabase'}\n\n**MVP Features:**\n${(idea.build_brief?.mvp_scope || idea.build_brief?.core_features || []).map((f: string) => `- ${f}`).join('\n')}\n\nType **"start building"** to begin the autonomous build process, or send me specific instructions.`,
          timestamp: new Date()
        }
      ]
    };
    setProject(newProject);
    addTerminalLog(`$ planter load --idea "${idea.idea_name}"`);
    addTerminalLog(`Loaded build brief: ${(idea.build_brief?.core_features || []).length} core features`);
    addTerminalLog(`Stack: React + FastAPI + Supabase`);
    addTerminalLog(`GitHub repo: github.com/igmakam/${slug}`);
    addTerminalLog('');
  };

  const selectIdea = async (id: number) => {
    try {
      const idea = await api.helixa.ideas.get(id);
      setSelectedIdea(idea);
      initProject(idea);
    } catch (e) {
      console.error(e);
    }
  };

  const addTerminalLog = (msg: string) => {
    setTerminalLogs(prev => [...prev, msg]);
  };

  const simulateBuildStep = async (stepId: string, detail: string) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        buildSteps: prev.buildSteps.map(s =>
          s.id === stepId ? { ...s, status: 'active' as const, detail } : s
        )
      };
    });
    addTerminalLog(`$ planter ${stepId} --start`);
    addTerminalLog(detail);

    // Simulate work
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));

    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        buildSteps: prev.buildSteps.map(s =>
          s.id === stepId ? { ...s, status: 'done' as const, detail: `${detail} - Complete` } : s
        )
      };
    });
    addTerminalLog(`[OK] ${stepId} completed successfully`);
    addTerminalLog('');
  };

  const handleSendPrompt = async () => {
    if (!promptInput.trim() || !project) return;
    const userMsg = promptInput.trim();
    setPromptInput('');

    // Add user message
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        chatHistory: [...prev.chatHistory, { role: 'user', content: userMsg, timestamp: new Date() }]
      };
    });

    setSending(true);

    // Check if user wants to start building
    const isBuildCommand = userMsg.toLowerCase().includes('start build') || userMsg.toLowerCase().includes('build it') || userMsg.toLowerCase().includes('lets go') || userMsg.toLowerCase().includes('begin');

    if (isBuildCommand && project.status === 'idle') {
      setProject(prev => prev ? { ...prev, status: 'building' } : prev);

      // Add assistant response
      setProject(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          chatHistory: [...prev.chatHistory, {
            role: 'assistant',
            content: `Starting autonomous build for **${project.name}**! I'll work through each step and you can watch the progress in the terminal on the right. You can send me additional instructions at any time.`,
            timestamp: new Date()
          }]
        };
      });

      addTerminalLog('$ planter build --autonomous');
      addTerminalLog(`Starting build pipeline for "${project.name}"...`);
      addTerminalLog('');

      // Run build steps
      const slug = (project.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await simulateBuildStep('plan', 'Generating architecture plan from build brief...');

      setProject(prev => {
        if (!prev) return prev;
        return { ...prev, chatHistory: [...prev.chatHistory, {
          role: 'assistant',
          content: `Architecture plan ready. Creating GitHub repository...`,
          timestamp: new Date()
        }]};
      });

      await simulateBuildStep('repo', `Creating github.com/igmakam/${slug}...`);
      setProject(prev => prev ? { ...prev, repoUrl: `https://github.com/igmakam/${slug}` } : prev);

      setProject(prev => {
        if (!prev) return prev;
        return { ...prev, chatHistory: [...prev.chatHistory, {
          role: 'assistant',
          content: `GitHub repo created at **github.com/igmakam/${slug}**. Building backend API...`,
          timestamp: new Date()
        }]};
      });

      await simulateBuildStep('backend', 'Scaffolding FastAPI backend with endpoints...');
      setProject(prev => prev ? { ...prev, backendUrl: `https://${slug}-backend.onrender.com` } : prev);

      await simulateBuildStep('frontend', 'Building React + Tailwind frontend UI...');

      setProject(prev => {
        if (!prev) return prev;
        return { ...prev, chatHistory: [...prev.chatHistory, {
          role: 'assistant',
          content: `Frontend and backend built. Running integration tests...`,
          timestamp: new Date()
        }]};
      });

      await simulateBuildStep('integrate', 'Running integration tests and fixing issues...');

      await simulateBuildStep('deploy', `Deploying to Render + Devinapps...`);
      const previewUrl = `https://${slug}-app.devinapps.com`;
      setProject(prev => prev ? { ...prev, status: 'deployed', previewUrl } : prev);

      addTerminalLog('=== BUILD COMPLETE ===');
      addTerminalLog(`Frontend: ${previewUrl}`);
      addTerminalLog(`Backend: https://${slug}-backend.onrender.com`);
      addTerminalLog(`Repo: https://github.com/igmakam/${slug}`);

      setProject(prev => {
        if (!prev) return prev;
        return { ...prev, chatHistory: [...prev.chatHistory, {
          role: 'assistant',
          content: `Build complete! Your app is deployed:\n\n- **Frontend:** ${previewUrl}\n- **Backend:** https://${slug}-backend.onrender.com\n- **Repo:** https://github.com/igmakam/${slug}\n\nYou can see the live preview on the right. Send me any changes you'd like to make!`,
          timestamp: new Date()
        }]};
      });
    } else {
      // Generic response
      setTimeout(() => {
        setProject(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            chatHistory: [...prev.chatHistory, {
              role: 'assistant',
              content: project.status === 'idle'
                ? `Got it! I'll incorporate that. Type **"start building"** when you're ready to begin the autonomous build.`
                : project.status === 'deployed'
                  ? `I'll make that change to the deployed app. Updating now...`
                  : `Noted. I'm currently building - I'll incorporate your feedback into the current step.`,
              timestamp: new Date()
            }]
          };
        });
        setSending(false);
      }, 1000);
      return;
    }

    setSending(false);
  };

  const scoreColor = (s: number) => s >= 8 ? 'text-green-400' : s >= 6 ? 'text-yellow-400' : 'text-red-400';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 mt-4">Loading Planter...</p>
        </div>
      </div>
    );
  }

  // Idea selection view (when no project started)
  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950">
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Planter</h1>
                  <p className="text-xs text-emerald-400">Autonomous App Builder</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Select an Idea to Build</h2>
            <p className="text-slate-400">Choose a HELIXA idea and Planter will autonomously build the full app</p>
          </div>

          {ideas.length === 0 ? (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-12 text-center">
                <Brain className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No ideas yet</h3>
                <p className="text-slate-400 mb-4">Go to HELIXA first to capture and score your app ideas</p>
                <Button onClick={onBack} className="bg-indigo-600 hover:bg-indigo-700">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {ideas.map(idea => (
                <Card
                  key={idea.id}
                  className="bg-slate-900/50 border-slate-800 hover:border-emerald-600/50 cursor-pointer transition-all"
                  onClick={() => selectIdea(idea.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white truncate flex-1">{idea.idea_name}</h3>
                      <span className={`text-xl font-bold ml-2 ${scoreColor(idea.overall_score)}`}>{idea.overall_score}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">{idea.product_type}</Badge>
                      <span className="text-xs text-slate-500">{new Date(idea.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-xs text-emerald-400">
                      <Rocket className="w-3 h-3" /> Click to start building
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Main builder view - split screen
  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm shrink-0">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center">
                <Code2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">{project.name}</h1>
                <p className="text-xs text-emerald-400">Planter Builder</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`text-xs ${
              project.status === 'deployed' ? 'bg-green-500/20 text-green-400' :
              project.status === 'building' ? 'bg-yellow-500/20 text-yellow-400 animate-pulse' :
              project.status === 'error' ? 'bg-red-500/20 text-red-400' :
              'bg-slate-500/20 text-slate-400'
            }`}>
              {project.status === 'deployed' ? 'Deployed' :
               project.status === 'building' ? 'Building...' :
               project.status === 'error' ? 'Error' : 'Ready'}
            </Badge>
            {project.previewUrl && (
              <Button size="sm" variant="outline" className="border-emerald-700 text-emerald-400 text-xs"
                onClick={() => window.open(project.previewUrl, '_blank')}>
                <ExternalLink className="w-3 h-3 mr-1" /> Open App
              </Button>
            )}
            {project.repoUrl && (
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-400 text-xs"
                onClick={() => window.open(project.repoUrl, '_blank')}>
                <FileCode className="w-3 h-3 mr-1" /> Repo
              </Button>
            )}
          </div>
        </div>
        {/* Build steps progress */}
        <div className="px-4 py-2 border-t border-slate-800/50 flex items-center gap-1 overflow-x-auto">
          {project.buildSteps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center gap-1 shrink-0">
                {i > 0 && <div className={`w-6 h-px ${step.status === 'done' ? 'bg-emerald-500' : 'bg-slate-700'}`} />}
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                  step.status === 'done' ? 'bg-emerald-500/20 text-emerald-400' :
                  step.status === 'active' ? 'bg-yellow-500/20 text-yellow-400 animate-pulse' :
                  step.status === 'error' ? 'bg-red-500/20 text-red-400' :
                  'bg-slate-800/50 text-slate-500'
                }`}>
                  {step.status === 'done' ? <Check className="w-3 h-3" /> :
                   step.status === 'active' ? <Loader2 className="w-3 h-3 animate-spin" /> :
                   <Icon className="w-3 h-3" />}
                  <span className="hidden md:inline">{step.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </header>

      {/* Split screen: Left = Prompts, Right = Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Prompts / Chat */}
        <div className="w-1/2 border-r border-slate-800 flex flex-col">
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {project.chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-emerald-600/30 text-white border border-emerald-700/50'
                    : msg.role === 'system'
                      ? 'bg-slate-800/50 text-slate-400 border border-slate-700/50 text-xs italic'
                      : 'bg-slate-800/80 text-slate-200 border border-slate-700/50'
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-slate-800/80 rounded-lg px-3 py-2 border border-slate-700/50">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Prompt input */}
          <div className="border-t border-slate-800 p-3">
            <div className="flex gap-2">
              <Input
                value={promptInput}
                onChange={e => setPromptInput(e.target.value)}
                placeholder={project.status === 'idle' ? 'Type "start building" or add instructions...' : 'Send instructions or feedback...'}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                onKeyDown={e => e.key === 'Enter' && handleSendPrompt()}
              />
              <Button onClick={handleSendPrompt} disabled={!promptInput.trim() || sending} className="bg-emerald-600 hover:bg-emerald-700">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            {/* Quick actions */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {project.status === 'idle' && (
                <Button size="sm" variant="outline" className="border-emerald-700 text-emerald-400 text-xs"
                  onClick={() => { setPromptInput('start building'); }}>
                  <Play className="w-3 h-3 mr-1" /> Start Building
                </Button>
              )}
              {project.status === 'deployed' && (
                <>
                  <Button size="sm" variant="outline" className="border-slate-700 text-slate-400 text-xs"
                    onClick={() => setPromptInput('Change the color scheme to ')}>
                    <Palette className="w-3 h-3 mr-1" /> Restyle
                  </Button>
                  <Button size="sm" variant="outline" className="border-slate-700 text-slate-400 text-xs"
                    onClick={() => setPromptInput('Add a new feature: ')}>
                    <Code2 className="w-3 h-3 mr-1" /> Add Feature
                  </Button>
                  <Button size="sm" variant="outline" className="border-slate-700 text-slate-400 text-xs"
                    onClick={() => setPromptInput('Fix this bug: ')}>
                    <Settings2 className="w-3 h-3 mr-1" /> Fix Bug
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Preview / Terminal */}
        <div className="w-1/2 flex flex-col">
          <div className="border-b border-slate-800 px-3 py-1.5 flex items-center gap-2">
            <button
              onClick={() => setPreviewTab('preview')}
              className={`flex items-center gap-1 px-3 py-1 rounded text-xs transition-colors ${
                previewTab === 'preview' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Eye className="w-3 h-3" /> Preview
            </button>
            <button
              onClick={() => setPreviewTab('terminal')}
              className={`flex items-center gap-1 px-3 py-1 rounded text-xs transition-colors ${
                previewTab === 'terminal' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Terminal className="w-3 h-3" /> Terminal
            </button>
            {project.previewUrl && previewTab === 'preview' && (
              <Button size="sm" variant="ghost" className="ml-auto text-slate-500 text-xs"
                onClick={() => {
                  const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
                  if (iframe) iframe.src = project.previewUrl || '';
                }}>
                <RefreshCw className="w-3 h-3" />
              </Button>
            )}
          </div>

          <div className="flex-1 bg-slate-900">
            {previewTab === 'preview' ? (
              project.previewUrl ? (
                <iframe
                  id="preview-iframe"
                  src={project.previewUrl}
                  className="w-full h-full border-0"
                  title="App Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <div className="text-center">
                    <Eye className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg">Live Preview</p>
                    <p className="text-sm mt-1">
                      {project.status === 'building' ? 'Building... preview will appear when deployed' :
                       project.status === 'idle' ? 'Start building to see live preview' :
                       'Preview will appear here'}
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="h-full overflow-y-auto p-4 font-mono text-xs">
                {terminalLogs.map((log, i) => (
                  <div key={i} className={`${
                    log.startsWith('[OK]') ? 'text-emerald-400' :
                    log.startsWith('[ERR]') ? 'text-red-400' :
                    log.startsWith('$') ? 'text-yellow-400' :
                    log.startsWith('===') ? 'text-emerald-300 font-bold' :
                    'text-slate-400'
                  }`}>
                    {log || '\u00A0'}
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
