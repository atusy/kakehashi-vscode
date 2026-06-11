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

it("reports other start failures without offering the download page", async () => {
  const { ui, shown } = fakeUi();
  await handleStartError(new Error("Connection to server got closed."), ui);
  expect(shown).toHaveLength(1);
  expect(shown[0].message).toBe(
    "Failed to start kakehashi: Connection to server got closed.",
  );
  expect(shown[0].actions).toHaveLength(0);
});

it("offers the download page when the executable is missing", async () => {
  const { ui, shown } = fakeUi();
  await handleStartError(
    "Launching server using command kakehashi failed. Error: spawn kakehashi ENOENT",
    ui,
  );
  expect(shown).toHaveLength(1);
  expect(shown[0].actions).toContain("Visit download page");
});

it("opens the releases page when the user picks the download action", async () => {
  const { ui, opened } = fakeUi("Visit download page");
  await handleStartError("Error: spawn kakehashi ENOENT", ui);
  expect(opened).toEqual(["https://github.com/atusy/kakehashi/releases"]);
});

it("does not open anything when the user dismisses the dialog", async () => {
  const { ui, opened } = fakeUi(undefined);
  await handleStartError("Error: spawn kakehashi ENOENT", ui);
  expect(opened).toEqual([]);
});
