import { describe, expect, it, vi } from "vitest";

vi.mock("../skillLoaderService.js", () => ({
  loadCustomSkills: () => [],
}));

import { SkillSourceRegistry } from "../registry.js";

function createRegistry() {
  return new SkillSourceRegistry(
    {
      listByDomainPack: () => [],
      getById: () => null,
    } as never,
    {
      getRunDetail: () => null,
    } as never,
    {
      list: () => [
        {
          id: "src-1",
          kind: "local-folder",
          title: "CBO Sources",
          rootPath: "C:/sap/cbo",
          domainPack: "cbo-maintenance",
          classificationDefault: "confidential",
          includeGlobs: ["**/*.txt", "**/*.md"],
          enabled: true,
          syncStatus: "ready",
          lastIndexedAt: null,
          documentCount: 1,
          connectionMeta: null,
          createdAt: "",
          updatedAt: "",
        },
      ],
    } as never,
    {
      search: () => [
        {
          id: "doc-1",
          sourceId: "src-1",
          relativePath: "billing/zsd_billing.txt",
          absolutePath: "C:/sap/cbo/billing/zsd_billing.txt",
          title: "zsd_billing.txt",
          excerpt: "FORM validate_authority ...",
          contentText: "REPORT ZSD_BILLING.\nFORM validate_authority.\nENDFORM.",
          contentHash: "hash-1",
          domainPack: "cbo-maintenance",
          classification: "confidential",
          tags: ["local-folder", "cbo-maintenance"],
          indexedAt: new Date().toISOString(),
        },
      ],
    } as never
  );
}

describe("SkillSourceRegistry", () => {
  it("local-imported-files 선택 시 원문을 promptContext에 포함한다", () => {
    const registry = createRegistry();

    const execution = registry.resolveSkillExecution({
      skillId: "cbo-impact-analysis",
      sourceIds: ["workspace-context", "local-imported-files"],
      context: {
        domainPack: "cbo-maintenance",
        dataType: "chat",
        message: "권한 체크 누락을 설명해줘",
        caseContext: {
          filePath: "zsd_billing.txt",
          sourceContent: "REPORT ZSD_BILLING.\nFORM validate_authority.\nENDFORM.",
        },
      },
    });

    expect(execution.promptContext.join("\n")).toContain("REPORT ZSD_BILLING.");
    expect(execution.meta.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "local-file",
          description: expect.stringContaining("원문 포함"),
        }),
      ])
    );
  });

  it("configured-source 선택 시 excerpt 대신 문서 본문을 promptContext에 포함한다", () => {
    const registry = createRegistry();

    const execution = registry.resolveSkillExecution({
      skillId: "cbo-impact-analysis",
      sourceIds: ["configured-source:src-1"],
      context: {
        domainPack: "cbo-maintenance",
        dataType: "chat",
        message: "validate_authority 관련 로직을 설명해줘",
      },
    });

    const prompt = execution.promptContext.join("\n");
    expect(prompt).toContain("[문서] billing/zsd_billing.txt");
    expect(prompt).toContain("FORM validate_authority.");
    expect(execution.meta.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "configured-source",
          description: expect.stringContaining("원문 포함"),
        }),
      ])
    );
  });
});
