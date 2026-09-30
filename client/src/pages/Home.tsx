import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Atom,
  Bolt,
  Braces,
  CircleDot,
  Compass,
  ExternalLink,
  Globe2,
  LoaderCircle,
  Orbit,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  type LauncherApp,
  type LauncherConfig,
  loadLauncherConfig,
  defaultWebViewSettings,
  withCacheBuster,
} from "@/lib/launcher-config";
import { isNativeLauncher, LauncherWebView } from "@/lib/native-bridge";

const glyphs = [Orbit, Braces, Atom];
const accents = ["#A7FF83", "#8EB7FF", "#F4B8FF"];

function AppGlyph({ app, index }: { app: LauncherApp; index: number }) {
  const Glyph = glyphs[index % glyphs.length];
  const [imageAvailable, setImageAvailable] = useState(true);

  return (
    <div
      className="grid h-14 w-14 shrink-0 place-items-center rounded-[1.15rem] border border-white/10 shadow-[0_12px_26px_rgba(0,0,0,0.25)]"
      style={{
        background: `radial-gradient(circle at 30% 24%, ${accents[index % accents.length]}45, transparent 42%), #151b26`,
        color: accents[index % accents.length],
      }}
      aria-hidden="true"
    >
      {imageAvailable ? (
        <img
          src={`/${app.icon_asset_path.replace(/^\/+/, "")}`}
          alt=""
          className="h-full w-full rounded-[1.1rem] object-cover"
          onError={() => setImageAvailable(false)}
        />
      ) : (
        <Glyph size={25} strokeWidth={1.7} />
      )}
    </div>
  );
}

function AppCard({
  app,
  index,
  onLaunch,
}: {
  app: LauncherApp;
  index: number;
  onLaunch: (app: LauncherApp) => void;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.055, duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
      whileTap={{ scale: 0.975 }}
      onClick={() => onLaunch(app)}
      className="group relative flex min-h-44 w-full flex-col justify-between overflow-hidden rounded-[1.65rem] border border-white/[0.09] bg-[#151b26]/90 p-5 text-left shadow-[0_18px_50px_rgba(0,0,0,0.15)] transition-all duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-[#1a2230] hover:shadow-[0_22px_60px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a7ff83]"
      aria-label={`Open ${app.display_name}`}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ backgroundColor: accents[index % accents.length] }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <AppGlyph app={app} index={index} />
        <ArrowUpRight
          className="mt-1 text-white/35 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white"
          size={19}
        />
      </div>
      <div className="relative pt-5">
        <h2 className="font-display text-[1.05rem] font-semibold tracking-[-0.02em] text-white">
          {app.display_name}
        </h2>
        <p className="mt-1.5 line-clamp-2 text-[0.78rem] leading-5 text-slate-400">
          {app.description}
        </p>
      </div>
    </motion.button>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0f15] text-slate-300">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
        <LoaderCircle className="animate-spin text-[#a7ff83]" size={19} />
        <span className="text-sm">Loading your private workspace…</span>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0f15] p-6 text-slate-200">
      <div className="max-w-md rounded-[1.75rem] border border-red-300/15 bg-[#161b25] p-7 shadow-2xl">
        <TriangleAlert className="text-red-300" size={28} />
        <h1 className="mt-5 font-display text-xl font-semibold text-white">Launcher configuration unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0b0f15] transition-transform duration-150 active:scale-[0.97]"
        >
          <RefreshCw size={15} /> Try again
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [config, setConfig] = useState<LauncherConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const refreshConfig = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      setConfig(await loadLauncherConfig());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unexpected configuration error.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshConfig();
  }, [refreshConfig]);

  const openApp = useCallback(
    async (app: LauncherApp) => {
      if (!config) return;
      setOpeningId(app.app_id);
      const liveUrl = config.launcher_settings.webview_force_refresh_on_launch
        ? withCacheBuster(app.target_live_url)
        : app.target_live_url;

      try {
        if (isNativeLauncher()) {
          await LauncherWebView.open({
            url: liveUrl,
            title: app.display_name,
            forceRefresh: config.launcher_settings.webview_force_refresh_on_launch,
            capabilities: { ...defaultWebViewSettings, ...app.webview_settings },
          });
          return;
        }

        window.open(liveUrl, "_blank", "noopener,noreferrer");
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "The selected app could not be opened.",
        );
      } finally {
        window.setTimeout(() => setOpeningId(null), 250);
      }
    },
    [config],
  );

  if (error && !config) return <ErrorState message={error} onRetry={() => void refreshConfig()} />;
  if (!config) return <LoadingState />;

  const nativeMode = isNativeLauncher();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0f15] text-white selection:bg-[#a7ff83] selection:text-[#0b0f15]">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="pointer-events-none absolute -left-28 top-16 h-72 w-72 rounded-full bg-[#5c7fa3]/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-1/3 h-80 w-80 rounded-full bg-[#86d668]/10 blur-3xl" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 pb-8 pt-[max(1.75rem,env(safe-area-inset-top))] sm:px-7">
        <header className="flex items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-[#a7ff83]/25 bg-[#a7ff83]/10 text-[#a7ff83] shadow-[0_0_35px_rgba(167,255,131,0.12)]">
              <Compass size={20} strokeWidth={1.7} />
            </div>
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-[#a7ff83]">Private network</p>
              <p className="font-display text-sm font-medium text-slate-300">Launcher Hub</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refreshConfig()}
            disabled={refreshing}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a7ff83]"
            aria-label="Reload launcher configuration"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
        </header>

        <div className="mt-14">
          <div className="flex items-center gap-2 text-[#a7ff83]">
            <Sparkles size={14} />
            <span className="text-[0.67rem] font-bold uppercase tracking-[0.2em]">Connected workspace</span>
          </div>
          <h1 className="mt-4 max-w-[19ch] font-display text-[clamp(2.25rem,9vw,3.65rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-white">
            {config.launcher_settings.hub_title}
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-slate-400">
            Your selected tools, wrapped in one focused space. Every launch opens the current live version.
          </p>
        </div>

        <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-1 text-xs text-slate-400 [scrollbar-width:none]">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5">
            <ShieldCheck size={13} className="text-[#a7ff83]" /> HTTPS only
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5">
            <Bolt size={13} className="text-[#a7ff83]" /> {config.launcher_settings.webview_force_refresh_on_launch ? "Fresh launch" : "Standard cache"}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5">
            <Globe2 size={13} className="text-[#a7ff83]" /> {nativeMode ? "Native shell" : "Browser preview"}
          </span>
        </div>

        <section className="mt-8 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2" aria-label="Portfolio applications">
          {config.my_portfolio_apps.map((app, index) => (
            <AppCard key={app.app_id} app={app} index={index} onLaunch={openApp} />
          ))}
        </section>

        <div className="mt-auto pt-8">
          <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-2">
              <CircleDot size={13} className="text-[#a7ff83]" /> {config.my_portfolio_apps.length} apps configured
            </span>
            <span className="inline-flex items-center gap-1.5">
              {openingId ? "Opening…" : nativeMode ? "Immersive view" : "New-tab preview"}
              {!openingId && <ExternalLink size={12} />}
            </span>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {error && config && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-5 left-5 right-5 z-20 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-red-300/20 bg-[#291b22]/95 p-3 pl-4 text-sm text-red-100 shadow-2xl backdrop-blur"
          >
            <span className="line-clamp-2">{error}</span>
            <button type="button" onClick={() => setError(null)} className="rounded-lg px-2 py-1 text-xs font-semibold hover:bg-white/10">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
