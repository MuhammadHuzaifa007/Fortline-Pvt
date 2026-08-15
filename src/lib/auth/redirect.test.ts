import { describe, expect, it } from "vitest";
import { getSafeRedirect } from "./redirect";

describe("getSafeRedirect", () => {
  it("returns relative paths starting with a single slash", () => {
    expect(getSafeRedirect("/dashboard")).toBe("/dashboard");
    expect(getSafeRedirect("/inbox")).toBe("/inbox");
    expect(getSafeRedirect("/settings?tab=profile")).toBe("/settings?tab=profile");
  });

  it("falls back to default /dashboard when url is empty or null", () => {
    expect(getSafeRedirect(null)).toBe("/dashboard");
    expect(getSafeRedirect(undefined)).toBe("/dashboard");
    expect(getSafeRedirect("")).toBe("/dashboard");
  });

  it("falls back to custom fallback if provided", () => {
    expect(getSafeRedirect(null, "/login")).toBe("/login");
    expect(getSafeRedirect("invalid", "/custom")).toBe("/custom");
  });

  it("rejects protocol-relative open redirect URLs starting with //", () => {
    expect(getSafeRedirect("//evil.com")).toBe("/dashboard");
    expect(getSafeRedirect("//evil.com/path")).toBe("/dashboard");
  });

  it("rejects backslash relative paths", () => {
    expect(getSafeRedirect("\\evil.com")).toBe("/dashboard");
    expect(getSafeRedirect("/\\evil.com")).toBe("/dashboard");
  });

  it("rejects URLs containing scheme specifiers", () => {
    expect(getSafeRedirect("https://evil.com")).toBe("/dashboard");
    expect(getSafeRedirect("http://evil.com/dashboard")).toBe("/dashboard");
  });
});
