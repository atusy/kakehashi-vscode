export interface StartErrorUi {
  showErrorMessage(
    message: string,
    ...actions: string[]
  ): Thenable<string | undefined>;
  openExternal(url: string): Thenable<boolean>;
}

export function isStartFailureNotification(message: string): boolean {
  return message.endsWith("couldn't create connection to server.");
}

export function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function handleStartError(
  error: unknown,
  ui: StartErrorUi,
): Promise<void> {
  const message = formatError(error);
  if (!message.includes("ENOENT")) {
    await ui.showErrorMessage(`Failed to start kakehashi: ${message}`);
    return;
  }
  const action = await ui.showErrorMessage(
    "kakehashi executable not found. Download it and put it on PATH, or set kakehashi.command to an absolute path.",
    "Visit download page",
  );
  if (action === "Visit download page") {
    await ui.openExternal("https://github.com/atusy/kakehashi/releases");
  }
}
