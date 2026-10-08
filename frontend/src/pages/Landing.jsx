import { Link } from 'react-router-dom';
import {
  ArrowRight, ShieldCheck, Layers, Share2, Lock, Terminal, Server, Check, BrainCircuit, Bot, Search,
  MessageSquare, Zap, Database, ChevronRight, PlayCircle, BarChart3, Workflow
} from 'lucide-react';

function Landing() {
  return (
    <div className="min-h-[100dvh] bg-[#0A0A0B] text-ink-100 font-sans selection:bg-primary-500/30 overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[40%] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
      </div>

      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-[#0A0A0B]/70 border-b border-white/5">
        <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-500 to-purple-600 grid place-items-center shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-white">
              Teldock AI
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-300">
            <a href="#product" className="hover:text-white transition-colors">Product</a>
            <a href="#integrations" className="hover:text-white transition-colors">Integrations</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#pricing" className="hover:text-white transition-colors">Enterprise</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="hidden sm:block text-sm font-semibold text-ink-300 hover:text-white transition-colors px-2">
              Log in
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold bg-white text-ink-950 px-5 py-2.5 rounded-full hover:bg-ink-100 transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              Start Free Trial
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 pt-32">
        {/* Hero Section */}
        <section className="relative pt-20 pb-24 md:pt-32 md:pb-40 px-6 max-w-7xl mx-auto text-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-sm font-semibold text-primary-300 mb-8 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
              Introducing Teldock AI. Powered by Claude Sonnet 5.5.
            </div>
            
            <h1 className="font-display font-bold text-5xl md:text-7xl lg:text-8xl tracking-tight leading-[1.05] max-w-5xl mx-auto text-white">
              Don't just store files. <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-purple-400 to-pink-400">
                Talk to your data.
              </span>
            </h1>
            
            <p className="mt-8 text-xl text-ink-400 max-w-3xl mx-auto leading-relaxed">
              Teldock AI connects to your entire company's unstructured data. We turn millions of documents, PDFs, and spreadsheets into a single, omniscient AI knowledge base.
            </p>
            
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary-600 text-white font-bold px-8 py-4 rounded-full hover:bg-primary-500 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all hover:-translate-y-1">
                Start building for free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="mailto:contact@teldock.web.id?subject=Demo Request" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-bold text-white px-8 py-4 rounded-full border border-white/20 hover:bg-white/5 transition-all">
                <PlayCircle className="w-5 h-5" />
                Book a Demo
              </a>
            </div>
          </div>
        </section>

        {/* Product Mockup (Hero Image) */}
        <section className="px-6 pb-32 max-w-7xl mx-auto animate-fade-up [animation-delay:200ms]">
          <div className="relative rounded-3xl border border-white/10 bg-[#121214] shadow-2xl overflow-hidden backdrop-blur-sm">
            {/* Window controls */}
            <div className="flex items-center gap-2 px-6 h-14 border-b border-white/5 bg-[#0A0A0B]/50">
              <span className="w-3.5 h-3.5 rounded-full bg-ink-700" />
              <span className="w-3.5 h-3.5 rounded-full bg-ink-700" />
              <span className="w-3.5 h-3.5 rounded-full bg-ink-700" />
              <div className="mx-auto bg-ink-900 rounded-md px-4 py-1 text-xs text-ink-500 font-mono flex items-center gap-2">
                <Lock className="w-3 h-3" /> teldock.web.id/workspace/sales-Q4
              </div>
            </div>
            
            {/* App UI */}
            <div className="grid md:grid-cols-[1fr_400px] h-[600px]">
              {/* Left: Document View */}
              <div className="p-8 border-r border-white/5 overflow-y-auto hidden md:block">
                <h3 className="text-2xl font-bold text-white mb-6">Q4 2026 Enterprise Sales Strategy.pdf</h3>
                <div className="space-y-4">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-4 bg-white/5 rounded w-full" />
                  <div className="h-4 bg-white/5 rounded w-full" />
                  <div className="h-4 bg-white/5 rounded w-5/6" />
                  <br/>
                  <div className="h-32 bg-primary-500/10 border border-primary-500/20 rounded-xl" />
                  <br/>
                  <div className="h-4 bg-white/10 rounded w-1/2" />
                  <div className="h-4 bg-white/5 rounded w-full" />
                  <div className="h-4 bg-white/5 rounded w-4/5" />
                </div>
              </div>
              
              {/* Right: AI Chat Interface */}
              <div className="bg-[#17171A] flex flex-col relative">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary-400 font-medium">
                    <Bot className="w-5 h-5" /> Ask Teldock AI
                  </div>
                </div>
                
                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                  {/* User Message */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="bg-primary-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm">
                      Summarize the key growth metrics from this document and compare them to our Q3 dataset.
                    </div>
                  </div>
                  
                  {/* AI Response */}
                  <div className="flex flex-col items-start gap-2">
                    <div className="bg-white/10 text-white px-4 py-4 rounded-2xl rounded-tl-sm text-sm leading-relaxed border border-white/5">
                      <p className="mb-3">Based on this document and the <span className="text-primary-400 bg-primary-500/10 px-1 rounded cursor-pointer">Q3_Dataset.csv</span> in your workspace:</p>
                      <ul className="space-y-2 mb-3 list-disc list-inside text-ink-300">
                        <li><strong>Enterprise ACV:</strong> Projected to increase by 24% (from $45k to $56k).</li>
                        <li><strong>Sales Cycle:</strong> Reduced from 90 days to 72 days via automated workflows.</li>
                      </ul>
                      <p>The strategy focuses heavily on leveraging AI integration to reduce churn in the mid-market segment.</p>
                    </div>
                  </div>
                </div>
                
                {/* Chat Input */}
                <div className="p-4 bg-[#121214] border-t border-white/5">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Ask anything about your files..." 
                      className="w-full bg-[#17171A] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-ink-500 focus:outline-none focus:border-primary-500 transition-colors"
                    />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary-600 grid place-items-center text-white">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Integration Logos */}
        <section id="integrations" className="py-10 border-y border-white/5 bg-white/5">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-sm font-semibold text-ink-500 uppercase tracking-widest mb-8">
              Powered by Anthropic API. Connects with your data stack.
            </p>
            <div className="flex flex-wrap justify-center items-center gap-12 text-ink-500 font-display font-bold text-xl grayscale opacity-50">
              <span className="text-white opacity-100 flex items-center gap-2">
                <BrainCircuit className="w-6 h-6" /> Anthropic
              </span>
              <span>AWS S3</span>
              <span>Google Drive</span>
              <span>Notion</span>
              <span>Salesforce</span>
              <span>Slack</span>
              <span>Telegram API</span>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="product" className="py-32 max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="font-display font-bold text-4xl md:text-5xl text-white">Enterprise AI capabilities, <br/> out of the box.</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Search, title: 'Generative Search', desc: 'Stop relying on exact keyword matches. Ask natural language questions and get synthesized answers with citations to the exact source files.' },
              { icon: Workflow, title: 'Automated Agent Workflows', desc: 'Set up triggers. When an invoice is uploaded, Teldock AI automatically extracts the total, categorizes it, and sends a summary to Slack.' },
              { icon: ShieldCheck, title: 'Enterprise RBAC', desc: 'Strict role-based access control. The AI only answers questions based on documents the specific user has permission to read.' },
              { icon: Database, title: 'Bring Your Own Storage', desc: 'Zero vendor lock-in. Store data on S3, Azure, or utilize our zero-cost chunked Telegram storage backend for massive files.' },
              { icon: MessageSquare, title: 'Contextual Chat', desc: 'Chat interface built directly into your document viewer. Highlight text and ask Claude to explain, summarize, or rewrite.' },
              { icon: BarChart3, title: 'Knowledge Analytics', desc: 'Discover knowledge gaps. See what your team is searching for and which documents are most frequently cited by the AI.' },
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-3xl bg-[#121214] border border-white/5 hover:border-primary-500/30 hover:bg-[#17171A] transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-white/5 grid place-items-center mb-6 group-hover:scale-110 group-hover:bg-primary-500/20 transition-all text-white group-hover:text-primary-400">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                <p className="text-ink-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-32 bg-[#0A0A0B] border-t border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="font-display font-bold text-4xl md:text-5xl text-white mb-4">Simple, transparent pricing.</h2>
              <p className="text-xl text-ink-400">Scale your AI knowledge base without scaling your costs.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Free */}
              <div className="p-8 rounded-3xl bg-[#121214] border border-white/5 flex flex-col">
                <h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
                <p className="text-ink-400 mb-6">For individuals and side projects.</p>
                <div className="text-5xl font-display font-bold text-white mb-8">$0<span className="text-lg text-ink-500 font-normal">/mo</span></div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-ink-300"><Check className="w-5 h-5 text-primary-500" /> Telegram Storage Backend</li>
                  <li className="flex items-center gap-3 text-ink-300"><Check className="w-5 h-5 text-primary-500" /> 1,000 AI queries/month</li>
                  <li className="flex items-center gap-3 text-ink-300"><Check className="w-5 h-5 text-primary-500" /> Basic Auto-tagging</li>
                </ul>
                <Link to="/login" className="w-full text-center py-4 rounded-xl border border-white/10 font-bold text-white hover:bg-white/5 transition-colors block">Start Free</Link>
              </div>

              {/* Pro */}
              <div className="p-8 rounded-3xl bg-gradient-to-b from-primary-900/40 to-[#121214] border border-primary-500/50 flex flex-col relative transform md:-translate-y-4">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary-500 to-purple-500 rounded-t-3xl" />
                <h3 className="text-2xl font-bold text-white mb-2">Pro Team</h3>
                <p className="text-primary-200 mb-6">For growing startups and teams.</p>
                <div className="text-5xl font-display font-bold text-white mb-8">$9.99<span className="text-lg text-ink-400 font-normal">/mo/seat</span></div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-ink-100"><Check className="w-5 h-5 text-primary-400" /> Unlimited S3/GCP connections</li>
                  <li className="flex items-center gap-3 text-ink-100"><Check className="w-5 h-5 text-primary-400" /> 10,000 AI Claude 5.5 queries</li>
                  <li className="flex items-center gap-3 text-ink-100"><Check className="w-5 h-5 text-primary-400" /> Advanced Semantic Search</li>
                  <li className="flex items-center gap-3 text-ink-100"><Check className="w-5 h-5 text-primary-400" /> Slack & Notion integrations</li>
                </ul>
                <Link to="/login" className="w-full text-center py-4 rounded-xl bg-primary-600 font-bold text-white hover:bg-primary-500 shadow-lg shadow-primary-500/25 transition-all block">Start 14-Day Trial</Link>
              </div>

              {/* Enterprise */}
              <div className="p-8 rounded-3xl bg-[#121214] border border-white/5 flex flex-col">
                <h3 className="text-2xl font-bold text-white mb-2">Enterprise</h3>
                <p className="text-ink-400 mb-6">For large scale organizations.</p>
                <div className="text-5xl font-display font-bold text-white mb-8">Custom</div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-ink-300"><Check className="w-5 h-5 text-primary-500" /> VPC / On-Premise deployment</li>
                  <li className="flex items-center gap-3 text-ink-300"><Check className="w-5 h-5 text-primary-500" /> Bring your own LLM API keys</li>
                  <li className="flex items-center gap-3 text-ink-300"><Check className="w-5 h-5 text-primary-500" /> Single Sign-On (SSO / SAML)</li>
                  <li className="flex items-center gap-3 text-ink-300"><Check className="w-5 h-5 text-primary-500" /> Dedicated success manager</li>
                </ul>
                <a href="mailto:contact@teldock.web.id?subject=Enterprise Sales Inquiry" className="w-full text-center py-4 rounded-xl border border-white/10 font-bold text-white hover:bg-white/5 transition-colors block">Contact Sales</a>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0A0A0B] pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <BrainCircuit className="w-6 h-6 text-primary-500" />
                <span className="font-display font-bold text-xl text-white">Teldock AI</span>
              </div>
              <p className="text-ink-400 max-w-sm">
                The intelligent knowledge layer for your entire company. Stop searching. Start asking.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-3 text-ink-400">
                <li><a href="#product" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#integrations" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link to="/changelog" className="hover:text-white transition-colors">Changelog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-3 text-ink-400">
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/careers" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><a href="mailto:contact@teldock.web.id" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-ink-500">
            <p>© 2026 Teldock AI. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
