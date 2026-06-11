import { expect, it } from "vitest";
import { handleStartError, StartErrorUi } from "./startError";

function fakeUi(selectedAction?: string) {
  const shown: { message: string; actions: string[] }[] = [];
  const opened: string[] = [];
  const ui: StartErrorUi = {
    showErrorMessage: async (message, ...actions) => {
      shown.push({ message, actions });
      return selectedAction;
    },
    openExternal: async (url) => {
      opened.push(url);
      return true;
    },
  };
  return { ui, shown, opened };
}

it("offers the download page when the executable is missing", async () => {
  const { ui, shown } = fakeUi();
  await handleStartError(
    "Launching server using command kakehashi failed. Error: spawn kakehashi ENOENT",
    ui,
  );
  expect(shown).toHaveLength(1);
  expect(shown[0].actions).toContain("Visit download page");
});
