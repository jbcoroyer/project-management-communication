import { describe, expect, it } from "vitest";
import {
  DEFAULT_UI_THEME,
  getUiTheme,
  isUiThemeId,
  tokensToCssVars,
  UI_THEMES,
} from "./uiThemes";

describe("uiThemes", () => {
  it("expose exactement 5 thèmes distincts", () => {
    expect(UI_THEMES).toHaveLength(5);
    const ids = UI_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(5);
    expect(ids).toContain(DEFAULT_UI_THEME);
  });

  it("valide les ids connus", () => {
    expect(isUiThemeId("atelier")).toBe(true);
    expect(isUiThemeId("phare")).toBe(true);
    expect(isUiThemeId("nope")).toBe(false);
  });

  it("génère des variables CSS pour l’aperçu", () => {
    const vars = tokensToCssVars(getUiTheme("rail").tokens);
    expect(vars["--accent"]).toBe("#e05a18");
    expect(vars["--radius-md"]).toBe("3px");
    expect(vars["--shadow-1"]).toBe("none");
  });

  it("différencie rayons et accents entre thèmes", () => {
    const atelier = getUiTheme("atelier").tokens;
    const encre = getUiTheme("encre").tokens;
    const prairie = getUiTheme("prairie").tokens;
    expect(atelier.accent).not.toBe(encre.accent);
    expect(atelier.radiusMd).not.toBe(encre.radiusMd);
    expect(prairie.radiusMd).not.toBe(encre.radiusMd);
    expect(atelier.controlStyle).not.toBe(encre.controlStyle);
  });
});
