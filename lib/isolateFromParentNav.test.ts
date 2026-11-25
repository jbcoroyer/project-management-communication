import { describe, expect, it, vi } from "vitest";
import { isolateFromParentNav, runContextMenuSelect } from "./isolateFromParentNav";

function makeEvent(button?: number) {
  return {
    button,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
}

describe("isolateFromParentNav", () => {
  it("stoppe toujours la propagation", () => {
    const e = makeEvent(0);
    isolateFromParentNav(e);
    expect(e.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it("preventDefault sur clic primaire (button 0)", () => {
    const e = makeEvent(0);
    isolateFromParentNav(e);
    expect(e.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("preventDefault si button absent (click synthétique)", () => {
    const e = makeEvent(undefined);
    isolateFromParentNav(e);
    expect(e.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("ne pas preventDefault sur bouton droit (contextmenu)", () => {
    const e = makeEvent(2);
    isolateFromParentNav(e);
    expect(e.stopPropagation).toHaveBeenCalledTimes(1);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
});

describe("runContextMenuSelect", () => {
  it("exécute onSelect avant onClose (geste file picker)", () => {
    const order: string[] = [];
    const result = runContextMenuSelect({
      onSelect: () => order.push("select"),
      onClose: () => order.push("close"),
    });
    expect(result).toBe("ran");
    expect(order).toEqual(["select", "close"]);
  });

  it("ignore si disabled", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    expect(
      runContextMenuSelect({ onSelect, onClose, disabled: true }),
    ).toBe("skipped");
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
