import React, { useState } from 'react';
import {
  X,
  Cloud,
  CloudOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Laptop,
  Globe,
  Database,
  Radio,
  Zap,
} from 'lucide-react';
import { testFirestoreConnection, getDatabaseInfo } from '../lib/firebase';

interface SyncDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCloudConnected: boolean;
  ordersCount: number;
  lastSyncTime: Date | null;
}

export const SyncDiagnosticsModal: React.FC<SyncDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  isCloudConnected,
  ordersCount,
  lastSyncTime,
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedDev, setCopiedDev] = useState(false);

  if (!isOpen) return null;

  const dbInfo = getDatabaseInfo();
  const publicShareUrl = 'https://ais-pre-ffivzjdgtr5v6r4mzk3uje-88044131770.us-west2.run.app';
  const devUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testFirestoreConnection();
      setTestResult({
        tested: true,
        success: res.success,
        latencyMs: res.latencyMs,
        error: res.error,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setTestResult({
        tested: true,
        success: false,
        error: errorMsg,
      });
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'public' | 'dev') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'public') {
        setCopiedPublic(true);
        setTimeout(() => setCopiedPublic(false), 2500);
      } else {
        setCopiedDev(true);
        setTimeout(() => setCopiedDev(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isCloudConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Central de Sincronização em Nuvem</span>
                <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${
                  isCloudConnected
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                    : 'bg-amber-950/60 text-amber-300 border-amber-800/80'
                }`}>
                  {isCloudConnected ? 'Conectado em Tempo Real' : 'Reconectando'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Status da conexão Firestore e links para acesso em múltiplos dispositivos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-200">
          {/* Status Indicators Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                Status da Conexão
              </div>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                Ativo & Sincronizando
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-1 truncate">
                BD: {dbInfo.databaseId}
              </div>
            </div>

            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                Ordens na Nuvem
              </div>
              <div className="text-sm font-bold text-white">
                {ordersCount} OPs Registradas
              </div>
              <div className="text-[10px] text-cyan-400/80 font-mono mt-1">
                Todas salvas no Firebase
              </div>
            </div>

            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Última Sincronização
              </div>
              <div className="text-sm font-bold text-white">
                {lastSyncTime ? lastSyncTime.toLocaleTimeString('pt-BR') : 'Instantânea'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-1">
                Via WebSocket onSnapshot
              </div>
            </div>
          </div>

          {/* Test Connection Button & Result */}
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Teste de Latência e Gravação na Nuvem
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verifica se este computador consegue enviar e ler dados em tempo real no banco compartilhado.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-md shadow-cyan-900/30"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Testando...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Testar Conexão Agora</span>
                  </>
                )}
              </button>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg border text-xs ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}>
                {testResult.success ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong>Conexão bem-sucedida!</strong> Escrita e leitura confirmadas no Firestore em{' '}
                      <strong>{testResult.latencyMs}ms</strong>. Qualquer alteração feita aqui reflete imediatamente para todos.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      <strong>Falha de conexão:</strong> {testResult.error || 'Não foi possível alcançar a nuvem.'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Links para Compartilhamento e Acesso */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              Links de Acesso para Outros Computadores
            </h3>

            {/* Link 1: Link Público (Shared App) */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  Link Público Compartilhado (Para Equipe e Outros Computadores)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-mono">
                  Recomendado
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Este é o link oficial para colegas abrirem em qualquer navegador ou computador sem precisar de permissões de desenvolvedor.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicShareUrl}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-cyan-300 font-mono focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(publicShareUrl, 'public')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1.5 cursor-pointer border ${
                    copiedPublic
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  }`}
                >
                  {copiedPublic ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPublic ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
              <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/50 text-[11px] text-cyan-200/90 flex items-start gap-2">
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Importante para ativar este link público:</strong> Na barra superior direita do <strong>Google AI Studio</strong>, clique no botão <strong>"Share" (Compartilhar)</strong> para publicar a versão para acesso externo.
                </span>
              </div>
            </div>

            {/* Link 2: Link de Desenvolvimento */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-slate-400" />
                  Link Atual Deste Navegador (Desenvolvimento)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Funciona em qualquer outra aba ou janela onde você já estiver conectado com sua conta Google.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={devUrl}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(devUrl, 'dev')}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1.5 cursor-pointer border ${
                    copiedDev
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  }`}
                >
                  {copiedDev ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDev ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Dica Prática de Teste Rápido */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Como testar a sincronização em tempo real agora mesmo:
            </h4>
            <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Abra uma nova aba no seu navegador e cole o link do sistema.</li>
              <li>Coloque as duas abas abertas lado a lado na tela.</li>
              <li>Na primeira aba, clique em <strong>"Nova Ordem (OP)"</strong> e salve uma OP de teste (ex: <code>OP-TESTE-LIVE</code>).</li>
              <li>Veja a segunda aba atualizar <strong>instantaneamente</strong>, exibindo a nova OP sem que você precise apertar F5 ou atualizar a página!</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
