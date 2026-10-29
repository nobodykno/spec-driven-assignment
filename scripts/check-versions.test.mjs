import { describe, expect, it } from "vitest";
import { checkDockerfile, checkCompose, checkPackageJson } from "./check-versions.mjs";

describe("check-versions", () => {
  describe("package.json", () => {
    it("NFR-OPS-001: accepts exact versions and workspace protocol", () => {
      const findings = checkPackageJson(
        {
          dependencies: { express: "5.3.0", "@app/shared": "workspace:*" },
          devDependencies: { vitest: "5.0.5" },
        },
        "services/auth/package.json",
      );
      expect(findings).toEqual([]);
    });

    it.each(["^5.3.0", "~5.3.0", "latest", "*", ">=5.0.0", "5.x", "5.3.0 || 6.0.0", "<6"])(
      "NFR-OPS-001: rejects floating range %s",
      (range) => {
        const findings = checkPackageJson(
          { dependencies: { express: range } },
          "services/auth/package.json",
        );
        expect(findings).toHaveLength(1);
        expect(findings[0]).toContain("services/auth/package.json");
        expect(findings[0]).toContain("express");
      },
    );

    it("NFR-OPS-001: checks devDependencies, peerDependencies and optionalDependencies", () => {
      const findings = checkPackageJson(
        {
          devDependencies: { a: "^1.0.0" },
          peerDependencies: { b: "~1.0.0" },
          optionalDependencies: { c: "latest" },
        },
        "package.json",
      );
      expect(findings).toHaveLength(3);
    });

    it("NFR-OPS-001: rejects a floating packageManager", () => {
      expect(checkPackageJson({ packageManager: "pnpm@latest" }, "package.json")).toHaveLength(1);
      expect(checkPackageJson({ packageManager: "pnpm@11.28.9" }, "package.json")).toEqual([]);
    });
  });

  describe("Dockerfile", () => {
    it("NFR-OPS-001: accepts exact image tags and pinned pnpm", () => {
      const text = [
        "FROM node:22.21.1-alpine AS build",
        "RUN corepack enable && corepack prepare pnpm@11.28.9 --activate",
        "FROM nginx:1.29.3-alpine",
        "COPY --from=build /out /app",
      ].join("\n");
      expect(checkDockerfile(text, "apps/web/Dockerfile")).toEqual([]);
    });

    it.each([
      "node:22-slim",
      "node:22",
      "node:latest",
      "node",
      "nginx:alpine",
      "postgres:16-alpine",
    ])("NFR-OPS-001: rejects floating FROM image %s", (image) => {
      const findings = checkDockerfile(`FROM ${image} AS build\n`, "services/auth/Dockerfile");
      expect(findings).toHaveLength(1);
      expect(findings[0]).toContain("services/auth/Dockerfile");
      expect(findings[0]).toContain(image);
    });

    it("NFR-OPS-001: rejects pnpm@latest", () => {
      const findings = checkDockerfile(
        "FROM node:22.21.1-alpine\nRUN corepack prepare pnpm@latest --activate\n",
        "services/auth/Dockerfile",
      );
      expect(findings).toHaveLength(1);
      expect(findings[0]).toContain("pnpm@latest");
    });

    it("NFR-OPS-001: allows FROM a previous build stage", () => {
      const text = "FROM node:22.21.1-alpine AS deps\nFROM deps AS build\n";
      expect(checkDockerfile(text, "Dockerfile")).toEqual([]);
    });
  });

  describe("docker-compose.yml", () => {
    it("NFR-OPS-001: accepts an exact postgres tag", () => {
      const text = "services:\n  postgres:\n    image: postgres:16.10-alpine\n";
      expect(checkCompose(text, "docker-compose.yml")).toEqual([]);
    });

    it.each(["postgres:16", "postgres:latest", "postgres", "postgres:16-alpine"])(
      "NFR-OPS-001: rejects floating compose image %s",
      (image) => {
        const text = `services:\n  postgres:\n    image: ${image}\n`;
        const findings = checkCompose(text, "docker-compose.yml");
        expect(findings).toHaveLength(1);
        expect(findings[0]).toContain(image);
      },
    );
  });
});
