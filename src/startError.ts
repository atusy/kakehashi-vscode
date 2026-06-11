export interface StartErrorUi {
  showErrorMessage(
    message: string,
    ...actions: string[]
  ): Thenable<string | undefined>;
  openExternal(url: string): Thenable<boolean>;
}

export async function handleStartError(
  _error: unknown,
  ui: StartErrorUi,
): Promise<void> {
  await ui.showErrorMessage(
    "kakehashi executable not found. Download it and put it on PATH, or set kakehashi.command to an absolute path.",
    "Visit download page",
  );
}
