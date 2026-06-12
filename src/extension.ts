import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  DocumentFilter,
  Trace,
} from "vscode-languageclient/node";
import {
  handleStartError,
  isStartFailureNotification,
  StartErrorUi,
} from "./startError";

const FIRST_RUN_KEY = "kakehashi.firstRunNoticeShown";

type DocumentSelectorPattern = {
  language?: string;
  scheme?: string;
  pattern?: string;
};

type DocumentSelectorEntry = string | DocumentSelectorPattern;

type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

type JsonObject = { [key: string]: Json };
type TraceServerValue = "off" | "messages" | "verbose";

interface KakehashiConfig {
  command: string[];
  documentSelector: DocumentSelectorEntry[];
  env: Record<string, string> | null;
  initializationOptions: JsonObject | null;
  traceServer: TraceServerValue;
}

class KakehashiLanguageClient extends LanguageClient {
  override error(
    message: string,
    data?: unknown,
    showNotification?: boolean | "force",
  ): void {
    // The library force-notifies on start failure before rejecting start(),
    // and offers no option to opt out. handleStartError already covers every
    // start failure, so keep this one log-only to avoid a duplicate dialog.
    if (isStartFailureNotification(message)) {
      super.error(message, data, false);
      return;
    }
    super.error(message, data, showNotification);
  }
}

let client: LanguageClient | undefined;

const startErrorUi: StartErrorUi = {
  showErrorMessage: (message, ...actions) =>
    vscode.window.showErrorMessage(message, ...actions),
  openExternal: (url) => vscode.env.openExternal(vscode.Uri.parse(url)),
};

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "kakehashi.configureDocumentSelector",
      () =>
        vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "kakehashi.documentSelector",
        ),
    ),
    vscode.commands.registerCommand("kakehashi.restartServer", () =>
      restartClient(context),
    ),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration("kakehashi.command") ||
        e.affectsConfiguration("kakehashi.documentSelector") ||
        e.affectsConfiguration("kakehashi.env") ||
        e.affectsConfiguration("kakehashi.initializationOptions") ||
        e.affectsConfiguration("kakehashi.trace.server")
      ) {
        void restartClient(context);
      }
    }),
  );

  await startClientSafely(context);
}

export async function deactivate(): Promise<void> {
  await stopClient();
}

async function startClient(context: vscode.ExtensionContext): Promise<void> {
  const config = getConfiguration();

  if (config.documentSelector.length === 0) {
    await maybeShowFirstRunNotice(context);
    return;
  }
  if (config.command.length === 0) {
    void vscode.window.showErrorMessage(
      "kakehashi.command is empty. Please configure an executable.",
    );
    return;
  }

  const selector = normalizeDocumentSelector(config.documentSelector);

  const [exe, ...args] = config.command;
  const serverOptions: ServerOptions = {
    command: exe,
    args,
    options: config.env ? { env: { ...process.env, ...config.env } } : undefined,
  };
  const clientOptions: LanguageClientOptions = {
    documentSelector: selector,
    initializationOptions: config.initializationOptions,
  };

  const nextClient = new KakehashiLanguageClient(
    "kakehashi",
    "kakehashi",
    serverOptions,
    clientOptions,
  );
  await nextClient.start();
  await nextClient.setTrace(getTrace(config.traceServer));
  client = nextClient;
}

async function stopClient(): Promise<void> {
  if (!client) return;
  const c = client;
  client = undefined;
  await c.stop();
}

async function restartClient(
  context: vscode.ExtensionContext,
): Promise<void> {
  await stopClient();
  await startClientSafely(context);
}

async function startClientSafely(
  context: vscode.ExtensionContext,
): Promise<void> {
  try {
    await startClient(context);
  } catch (error) {
    await handleStartError(error, startErrorUi);
  }
}

function getConfiguration(): KakehashiConfig {
  const cfg = vscode.workspace.getConfiguration("kakehashi");
  const rawSelector = cfg.get<unknown[]>("documentSelector") ?? [];
  const rawEnv = cfg.get<unknown>("env");
  const rawInitializationOptions = cfg.get<unknown>("initializationOptions");
  const rawTraceServer = cfg.get<unknown>("trace.server");
  const documentSelector: DocumentSelectorEntry[] = [];
  for (const item of rawSelector) {
    if (isDocumentSelectorEntry(item)) {
      documentSelector.push(item);
    } else {
      warnInvalidSelectorEntry(item);
    }
  }
  return {
    command: cfg.get<string[]>("command") ?? ["kakehashi"],
    documentSelector,
    env: isStringRecord(rawEnv) ? rawEnv : null,
    initializationOptions: isJsonObject(rawInitializationOptions)
      ? rawInitializationOptions
      : null,
    traceServer: isTraceServerValue(rawTraceServer) ? rawTraceServer : "off",
  };
}

function isTraceServerValue(v: unknown): v is TraceServerValue {
  return v === "off" || v === "messages" || v === "verbose";
}

function getTrace(value: TraceServerValue): Trace {
  switch (value) {
    case "messages":
      return Trace.Messages;
    case "verbose":
      return Trace.Verbose;
    case "off":
    default:
      return Trace.Off;
  }
}

function isStringRecord(v: unknown): v is Record<string, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  return Object.values(v).every((value) => typeof value === "string");
}

function isJson(v: unknown): v is Json {
  if (
    v === null ||
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean"
  ) {
    return true;
  }
  if (Array.isArray(v)) {
    return v.every(isJson);
  }
  return isJsonObject(v);
}

function isJsonObject(v: unknown): v is JsonObject {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  return Object.values(v).every(isJson);
}

function isDocumentSelectorEntry(v: unknown): v is DocumentSelectorEntry {
  if (typeof v === "string") return true;
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const obj = v as Record<string, unknown>;
  let anyPresent = false;
  for (const key of ["language", "scheme", "pattern"] as const) {
    const val = obj[key];
    if (val === undefined) continue;
    if (typeof val !== "string") return false;
    anyPresent = true;
  }
  return anyPresent;
}

function warnInvalidSelectorEntry(item: unknown): void {
  console.warn("kakehashi: ignoring invalid documentSelector entry:", item);
  void vscode.window.showWarningMessage(
    `kakehashi: ignoring invalid documentSelector entry: ${JSON.stringify(item)}`,
  );
}

function normalizeDocumentSelector(
  entries: DocumentSelectorEntry[],
): DocumentFilter[] {
  return entries.map((entry) =>
    typeof entry === "string"
      ? ({ language: entry } as DocumentFilter)
      : (entry as DocumentFilter),
  );
}

async function maybeShowFirstRunNotice(
  context: vscode.ExtensionContext,
): Promise<void> {
  if (context.globalState.get<boolean>(FIRST_RUN_KEY)) return;
  await context.globalState.update(FIRST_RUN_KEY, true);
  const action = await vscode.window.showInformationMessage(
    "kakehashi is installed but no documentSelector is configured.",
    "Open Settings",
  );
  if (action === "Open Settings") {
    await vscode.commands.executeCommand(
      "kakehashi.configureDocumentSelector",
    );
  }
}
