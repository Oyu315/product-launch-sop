"use client";

import { type ClipboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

type Phase = "before" | "submission" | "after";
type View = "sop" | "platforms" | "editor" | "document";

type DocumentBlock =
  | { id: string; type: "text"; title: string; body: string }
  | { id: string; type: "image"; title: string; imageUrl: string; caption: string }
  | { id: string; type: "link"; title: string; url: string; body: string };

type SopTask = {
  id: string;
  title: string;
  detail: string;
  platformId: string;
  phase: Phase;
  due: string;
  required?: boolean;
  moduleId?: string;
};

type PlatformModule = {
  id: string;
  name: string;
  shortName: string;
  summary: string;
  checkpoints: string[];
  markdown: string;
};

type SavedModule = Partial<PlatformModule> & { id?: string; docs?: DocumentBlock[] };

const STORAGE_KEY = "product-launch-sop-tool-v2";
const ALL_PLATFORMS = "all";

const phaseMeta: Record<Phase, { label: string; number: string }> = {
  before: { label: "上线前准备", number: "01" },
  submission: { label: "配置与提审", number: "02" },
  after: { label: "上线后验证", number: "03" },
};

const defaultPhaseTitles = Object.fromEntries(
  (Object.keys(phaseMeta) as Phase[]).map((phase) => [phase, phaseMeta[phase].label]),
) as Record<Phase, string>;

const defaultModuleBlocks: Array<Omit<PlatformModule, "markdown"> & { docs: DocumentBlock[] }> = [
  {
    id: "app-store",
    name: "App Store",
    shortName: "AS",
    summary: "应用信息、本地化、隐私表单、审核备注与版本构建。",
    checkpoints: ["App 信息与本地化", "App 隐私与数据收集", "版本构建与出口合规", "审核备注与测试账号"],
    docs: [
      {
        id: "as-doc-1",
        type: "text",
        title: "基础信息配置",
        body: "核对 App 名称、副标题、分类、年龄分级、关键词、本地化语言和商店截图。所有文案需与本次版本功能一致。",
      },
      {
        id: "as-doc-2",
        type: "text",
        title: "审核备注",
        body: "补充测试账号、特殊入口路径、付费说明、隐私权限说明和需要审核员重点关注的功能变化。",
      },
      {
        id: "as-doc-3",
        type: "link",
        title: "后台入口或内部规范",
        url: "",
        body: "粘贴 App Store Connect、发布单或内部审核规范链接。",
      },
    ],
  },
  {
    id: "google-play",
    name: "Google Play",
    shortName: "GP",
    summary: "商店资料、Data safety、AAB、测试轨道、内容分级与生产发布。",
    checkpoints: ["商店设置与 Data safety", "AAB 与内部测试", "内容分级与目标受众", "生产轨道与发布节奏"],
    docs: [
      {
        id: "gp-doc-1",
        type: "text",
        title: "Data safety 核对",
        body: "确认收集数据类型、共享对象、加密传输、删除请求路径和 SDK 数据行为，需与隐私政策保持一致。",
      },
      {
        id: "gp-doc-2",
        type: "text",
        title: "发布轨道",
        body: "先上传 AAB 至内部测试轨道完成安装和冒烟验证，再按发布节奏切换到生产轨道。",
      },
      {
        id: "gp-doc-3",
        type: "link",
        title: "后台入口或内部规范",
        url: "",
        body: "粘贴 Google Play Console、发布单或内部审核规范链接。",
      },
    ],
  },
  {
    id: "huawei",
    name: "华为 AppGallery",
    shortName: "HW",
    summary: "应用资质、AGC 服务、地区语言、定价与审核资料。",
    checkpoints: ["应用信息与资质", "AGC 服务配置", "地区与语言", "审核资料与提审"],
    docs: [
      {
        id: "hw-doc-1",
        type: "text",
        title: "应用资质",
        body: "确认开发者资质、应用分类、权限说明、隐私政策、软件著作权或平台要求的补充材料。",
      },
      {
        id: "hw-doc-2",
        type: "text",
        title: "AGC 与地区语言",
        body: "检查 AGC 服务配置、国家地区、语言素材、定价和可见范围，避免提审后再返工。",
      },
      {
        id: "hw-doc-3",
        type: "link",
        title: "后台入口或内部规范",
        url: "",
        body: "粘贴 AppGallery Connect、发布单或内部审核规范链接。",
      },
    ],
  },
  {
    id: "xiaomi",
    name: "小米应用商店",
    shortName: "MI",
    summary: "开发者资质、应用资料、测试包、兼容性与发布备注。",
    checkpoints: ["开发者资质", "应用信息与素材", "测试包与兼容性", "审核备注与发布"],
    docs: [
      {
        id: "mi-doc-1",
        type: "text",
        title: "应用资料",
        body: "核对应用名称、图标、截图、简介、详细描述、隐私政策、权限说明和适配信息。",
      },
      {
        id: "mi-doc-2",
        type: "text",
        title: "测试包与兼容性",
        body: "上传前完成安装、启动、登录、核心功能、广告展示和异常退出验证，保留必要截图。",
      },
      {
        id: "mi-doc-3",
        type: "link",
        title: "后台入口或内部规范",
        url: "",
        body: "粘贴小米开放平台、发布单或内部审核规范链接。",
      },
    ],
  },
];

const defaultModules: PlatformModule[] = defaultModuleBlocks.map(({ docs, ...module }) => ({
  ...module,
  markdown: documentBlocksToMarkdown(docs),
}));

const defaultTasks: SopTask[] = [
  {
    id: "version-scope",
    title: "确认版本与上线范围",
    detail: "版本号、包体、目标地区、上线窗口和回滚口径一致。",
    platformId: ALL_PLATFORMS,
    phase: "before",
    due: "上线前",
    required: true,
  },
  {
    id: "asset-package",
    title: "检查商店素材包",
    detail: "图标、截图、标题、副标题、描述、关键词和落地页链接完整。",
    platformId: ALL_PLATFORMS,
    phase: "before",
    due: "上线前",
    required: true,
  },
  {
    id: "app-store-privacy",
    title: "配置 App Store 隐私与审核信息",
    detail: "隐私问卷、数据收集、测试账号、审核备注与当前版本功能一致。",
    platformId: "app-store",
    phase: "before",
    due: "提审前",
    required: true,
    moduleId: "app-store",
  },
  {
    id: "google-play-data",
    title: "配置 Google Play Data safety",
    detail: "数据安全表单、内容分级、目标受众和商店资料完成复核。",
    platformId: "google-play",
    phase: "before",
    due: "提审前",
    required: true,
    moduleId: "google-play",
  },
  {
    id: "huawei-region",
    title: "配置华为地区、语言与资质",
    detail: "地区可见性、语言素材、应用资质和 AGC 配置已确认。",
    platformId: "huawei",
    phase: "submission",
    due: "提审当天",
    required: true,
    moduleId: "huawei",
  },
  {
    id: "xiaomi-package",
    title: "配置小米测试包与商店资料",
    detail: "测试包、兼容性说明、图文素材和审核备注完整。",
    platformId: "xiaomi",
    phase: "submission",
    due: "提审当天",
    required: true,
    moduleId: "xiaomi",
  },
  {
    id: "submit-review",
    title: "提交审核并记录单号",
    detail: "提交后记录各平台审核单号、提审时间和预计返回时间。",
    platformId: ALL_PLATFORMS,
    phase: "submission",
    due: "提审当天",
    required: true,
  },
  {
    id: "store-visibility",
    title: "核验商店页展示",
    detail: "检查标题、截图、版本号、下载入口、地区可见性和价格展示。",
    platformId: ALL_PLATFORMS,
    phase: "after",
    due: "上线后 1 小时",
    required: true,
  },
  {
    id: "first-open",
    title: "完成下载安装与首次启动验证",
    detail: "验证安装、登录、核心路径、埋点、广告、支付和崩溃监控。",
    platformId: ALL_PLATFORMS,
    phase: "after",
    due: "上线后 2 小时",
    required: true,
  },
];

const defaultTaskLinks = Object.fromEntries(
  defaultTasks.map((task) => [task.id, task.moduleId ?? ""]),
) as Record<string, string>;

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function documentBlocksToMarkdown(blocks: DocumentBlock[]) {
  return blocks
    .map((block) => {
      if (block.type === "text") return `## ${block.title}\n\n${block.body}`;
      if (block.type === "image") {
        const image = block.imageUrl ? `![${block.caption || block.title}](${block.imageUrl})` : block.caption;
        return `## ${block.title}\n\n${image}`.trim();
      }

      const link = block.url ? `[打开相关页面](${block.url})` : "";
      return `## ${block.title}\n\n${block.body}\n\n${link}`.trim();
    })
    .filter(Boolean)
    .join("\n\n");
}

function getDocumentSectionCount(markdown: string) {
  const headings = markdown.match(/^#{1,2}\s+.+$/gm)?.length ?? 0;
  return Math.max(headings, markdown.trim() ? 1 : 0);
}

function safeLink(url: string) {
  return /^(https?:\/\/|mailto:|\/|#)/i.test(url) ? url : "#";
}

function optimizeImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("图片解析失败"));
      image.onload = () => {
        const maxWidth = 1800;
        const maxHeight = 1400;
        const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("图片处理失败"));
          return;
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);
        let dataUrl = canvas.toDataURL("image/webp", 0.9);
        if (dataUrl.length > 2_400_000) dataUrl = canvas.toDataURL("image/webp", 0.76);
        resolve(dataUrl);
      };
      image.src = String(reader.result ?? "");
    };
    reader.readAsDataURL(file);
  });
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|<span style="color:#[0-9a-fA-F]{6}">[^<]*<\/span>)/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text.slice(cursor, index));
    const token = match[0];

    if (token.startsWith("**")) {
      nodes.push(<strong key={`${keyPrefix}-${index}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const href = safeLink(linkMatch[2]);
        nodes.push(<a key={`${keyPrefix}-${index}`} href={href} target="_blank" rel="noreferrer" onClick={(event) => href === "#" && event.preventDefault()}>{linkMatch[1]}</a>);
      }
    } else {
      const colorMatch = token.match(/^<span style="color:(#[0-9a-fA-F]{6})">([^<]*)<\/span>$/);
      if (colorMatch) nodes.push(<span key={`${keyPrefix}-${index}`} style={{ color: colorMatch[1] }}>{colorMatch[2]}</span>);
    }

    cursor = index + token.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function renderMarkdown(markdown: string) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const nodes: ReactNode[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = paragraph.join(" ");
    nodes.push(<p key={`p-${nodes.length}`}>{renderInline(text, `p-${nodes.length}`)}</p>);
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`}>
        {listItems.map((item, index) => <li key={`${item}-${index}`}>{renderInline(item, `li-${nodes.length}-${index}`)}</li>)}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((line) => {
    const image = line.match(/^!\[([^\]]*)\]\((.+)\)$/);
    if (!line.trim()) {
      flushParagraph();
      flushList();
    } else if (image) {
      flushParagraph();
      flushList();
      nodes.push(
        <figure key={`img-${nodes.length}`}>
          <img src={image[2]} alt={image[1]} />
          {image[1] && <figcaption>{image[1]}</figcaption>}
        </figure>,
      );
    } else if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      nodes.push(<h2 key={`h2-${nodes.length}`}>{renderInline(line.slice(3), `h2-${nodes.length}`)}</h2>);
    } else if (line.startsWith("# ")) {
      flushParagraph();
      flushList();
      nodes.push(<h1 key={`h1-${nodes.length}`}>{renderInline(line.slice(2), `h1-${nodes.length}`)}</h1>);
    } else if (line.startsWith("- ")) {
      flushParagraph();
      listItems.push(line.slice(2));
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  });

  flushParagraph();
  flushList();
  return nodes;
}

function docsFromLegacyModule(module: SavedModule, index: number): DocumentBlock[] {
  const moduleId = module.id ?? `module-${index}`;
  const checkpointText = Array.isArray(module.checkpoints) ? module.checkpoints.join("\n") : "";

  return [
    {
      id: `${moduleId}-legacy-summary`,
      type: "text",
      title: `${module.name ?? "平台"} 配置说明`,
      body: module.summary || "补充该平台上线前后需要说明的配置规则。",
    },
    {
      id: `${moduleId}-legacy-checkpoints`,
      type: "text",
      title: "核对清单",
      body: checkpointText || "补充需要逐项核对的配置内容。",
    },
  ];
}

function normalizeModules(rawModules: SavedModule[]): PlatformModule[] {
  return rawModules.map((module, index) => {
    const fallback = defaultModules[index] ?? defaultModules[0];
    const docs = Array.isArray(module.docs) && module.docs.length ? module.docs : docsFromLegacyModule(module, index);

    return {
      id: module.id || `module-${index}`,
      name: module.name || fallback.name,
      shortName: module.shortName || fallback.shortName,
      summary: module.summary || fallback.summary,
      checkpoints: Array.isArray(module.checkpoints) ? module.checkpoints : fallback.checkpoints,
      markdown: module.markdown || documentBlocksToMarkdown(docs),
    };
  });
}

export default function Home() {
  const [activeView, setActiveView] = useState<View>("sop");
  const [selectedPlatform, setSelectedPlatform] = useState(ALL_PLATFORMS);
  const [completed, setCompleted] = useState<string[]>(["version-scope"]);
  const [tasks, setTasks] = useState<SopTask[]>(defaultTasks);
  const [phaseTitles, setPhaseTitles] = useState<Record<Phase, string>>(defaultPhaseTitles);
  const [isFlowEditing, setIsFlowEditing] = useState(false);
  const [modules, setModules] = useState<PlatformModule[]>(defaultModules);
  const [editingModuleId, setEditingModuleId] = useState(defaultModules[0].id);
  const [readingModuleId, setReadingModuleId] = useState(defaultModules[0].id);
  const [taskLinks, setTaskLinks] = useState<Record<string, string>>(defaultTaskLinks);
  const [toast, setToast] = useState("");
  const [loaded, setLoaded] = useState(false);
  const markdownTextareaRef = useRef<HTMLTextAreaElement>(null);
  const markdownImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const data = JSON.parse(saved) as {
          completed?: string[];
          tasks?: SopTask[];
          phaseTitles?: Partial<Record<Phase, string>>;
          modules?: SavedModule[];
          taskLinks?: Record<string, string>;
        };
        if (Array.isArray(data.completed)) setCompleted(data.completed);
        if (Array.isArray(data.tasks) && data.tasks.length) setTasks(data.tasks);
        if (data.phaseTitles) setPhaseTitles({ ...defaultPhaseTitles, ...data.phaseTitles });
        if (Array.isArray(data.modules) && data.modules.length) {
          const normalizedModules = normalizeModules(data.modules);
          setModules(normalizedModules);
          setEditingModuleId(normalizedModules[0].id);
        }
        if (data.taskLinks) setTaskLinks({ ...defaultTaskLinks, ...data.taskLinks });
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ completed, tasks, phaseTitles, modules, taskLinks }),
      );
    } catch {
      setToast("浏览器存储空间不足，请删除部分较大的图片");
    }
  }, [completed, loaded, modules, phaseTitles, taskLinks, tasks]);

  const platformOptions = useMemo(
    () => [{ id: ALL_PLATFORMS, name: "全部平台" }, ...modules.map(({ id, name }) => ({ id, name }))],
    [modules],
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          selectedPlatform === ALL_PLATFORMS ||
          task.platformId === selectedPlatform ||
          task.platformId === ALL_PLATFORMS,
      ),
    [selectedPlatform, tasks],
  );

  const completedCount = tasks.filter((task) => completed.includes(task.id)).length;
  const totalCount = tasks.length;
  const progress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const requiredLeft = tasks.filter((task) => task.required && !completed.includes(task.id)).length;
  const activeModule = modules.find((module) => module.id === editingModuleId) ?? modules[0] ?? defaultModules[0];
  const readingModule = modules.find((module) => module.id === readingModuleId) ?? modules[0] ?? defaultModules[0];

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function getPlatformName(id: string) {
    if (id === ALL_PLATFORMS) return "全部平台";
    return modules.find((module) => module.id === id)?.name ?? "未命名模块";
  }

  function getLinkedModule(taskId: string) {
    const moduleId = taskLinks[taskId];
    return modules.find((module) => module.id === moduleId);
  }

  function toggleTask(id: string) {
    setCompleted((current) =>
      current.includes(id) ? current.filter((taskId) => taskId !== id) : [...current, id],
    );
  }

  function updateTask(taskId: string, patch: Partial<SopTask>) {
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
  }

  function addTaskNear(referenceId: string | null, phase: Phase, position: "before" | "after") {
    const id = createId("task");
    const newTask: SopTask = {
      id,
      title: "新流程步骤",
      detail: "补充需要执行和核对的具体内容。",
      platformId: selectedPlatform === ALL_PLATFORMS ? ALL_PLATFORMS : selectedPlatform,
      phase,
      due: "待设置",
      required: false,
    };

    setTasks((current) => {
      if (!referenceId) {
        const next = [...current];
        const lastPhaseIndex = next.reduce((last, task, index) => (task.phase === phase ? index : last), -1);
        next.splice(lastPhaseIndex + 1, 0, newTask);
        return next;
      }

      const referenceIndex = current.findIndex((task) => task.id === referenceId);
      if (referenceIndex < 0) return [...current, newTask];
      const next = [...current];
      next.splice(referenceIndex + (position === "after" ? 1 : 0), 0, newTask);
      return next;
    });
    setTaskLinks((current) => ({ ...current, [id]: "" }));
    notify("已添加流程步骤");
  }

  function removeTask(taskId: string) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
    setCompleted((current) => current.filter((id) => id !== taskId));
    setTaskLinks((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== taskId)));
    notify("已删除流程步骤");
  }

  function openModule(moduleId: string) {
    setReadingModuleId(moduleId);
    setActiveView("document");
  }

  function editModule(moduleId: string) {
    setEditingModuleId(moduleId);
    setActiveView("editor");
  }

  function updateActiveModule(patch: Partial<PlatformModule>) {
    setModules((current) =>
      current.map((module) => (module.id === editingModuleId ? { ...module, ...patch } : module)),
    );
  }

  function updateCheckpoints(rawValue: string) {
    updateActiveModule({
      checkpoints: rawValue
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    });
  }

  function replaceMarkdownSelection(before: string, after: string, placeholder: string) {
    const textarea = markdownTextareaRef.current;
    const start = textarea?.selectionStart ?? activeModule.markdown.length;
    const end = textarea?.selectionEnd ?? start;
    const selected = activeModule.markdown.slice(start, end) || placeholder;
    const nextMarkdown = `${activeModule.markdown.slice(0, start)}${before}${selected}${after}${activeModule.markdown.slice(end)}`;
    updateActiveModule({ markdown: nextMarkdown });

    window.requestAnimationFrame(() => {
      const nextStart = start + before.length;
      markdownTextareaRef.current?.focus();
      markdownTextareaRef.current?.setSelectionRange(nextStart, nextStart + selected.length);
    });
  }

  function insertMarkdownBlock(marker: string, placeholder: string) {
    const textarea = markdownTextareaRef.current;
    const start = textarea?.selectionStart ?? activeModule.markdown.length;
    const end = textarea?.selectionEnd ?? start;
    const selected = activeModule.markdown.slice(start, end) || placeholder;
    const leading = start > 0 && !activeModule.markdown.slice(0, start).endsWith("\n\n") ? "\n\n" : "";
    const trailing = end < activeModule.markdown.length && !activeModule.markdown.slice(end).startsWith("\n\n") ? "\n\n" : "";
    const insertion = `${leading}${marker}${selected}${trailing}`;
    updateActiveModule({ markdown: `${activeModule.markdown.slice(0, start)}${insertion}${activeModule.markdown.slice(end)}` });

    window.requestAnimationFrame(() => {
      const nextStart = start + leading.length + marker.length;
      markdownTextareaRef.current?.focus();
      markdownTextareaRef.current?.setSelectionRange(nextStart, nextStart + selected.length);
    });
  }

  async function insertMarkdownImage(file?: File) {
    if (!file) return;
    if (file.size > 10_000_000) {
      notify("图片超过 10MB，请先压缩后再添加");
      return;
    }

    const textarea = markdownTextareaRef.current;
    const start = textarea?.selectionStart ?? activeModule.markdown.length;
    const end = textarea?.selectionEnd ?? start;
    const moduleId = activeModule.id;

    try {
      const dataUrl = await optimizeImage(file);
      const label = file.name.replace(/\.[^.]+$/, "") || "截图";
      const insertion = `\n\n![${label}](${dataUrl})\n\n`;
      setModules((current) => current.map((module) => {
        if (module.id !== moduleId) return module;
        const safeStart = Math.min(start, module.markdown.length);
        const safeEnd = Math.min(Math.max(end, safeStart), module.markdown.length);
        return { ...module, markdown: `${module.markdown.slice(0, safeStart)}${insertion}${module.markdown.slice(safeEnd)}` };
      }));
      notify("图片已插入文档");
    } catch {
      notify("图片处理失败，请换一张图片重试");
    }
  }

  function handleMarkdownPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"));
    const imageFile = imageItem?.getAsFile();
    if (!imageFile) return;
    event.preventDefault();
    void insertMarkdownImage(imageFile);
  }

  function addModule() {
    const id = `custom-${Date.now()}`;
    const newModule: PlatformModule = {
      id,
      name: "新平台模块",
      shortName: "NEW",
      summary: "填写该平台上线前后需要配置和核验的事项。",
      checkpoints: ["配置项一", "配置项二", "上线后核验"],
      markdown: "# 配置说明\n\n补充该平台的配置步骤、注意事项和核验标准。\n\n## 后台入口或内部规范\n\n[打开相关页面](https://)",
    };
    setModules((current) => [...current, newModule]);
    setEditingModuleId(id);
    setActiveView("editor");
    notify("已新增平台配置模块");
  }

  function removeModule(id: string) {
    if (modules.length <= 1) {
      notify("至少保留一个平台配置模块");
      return;
    }

    const nextModules = modules.filter((module) => module.id !== id);
    const fallbackId = nextModules[0].id;

    setModules(nextModules);
    setTaskLinks((current) =>
      Object.fromEntries(Object.entries(current).map(([taskId, moduleId]) => [taskId, moduleId === id ? "" : moduleId])),
    );
    setEditingModuleId(fallbackId);
    if (readingModuleId === id) setReadingModuleId(fallbackId);
    if (selectedPlatform === id) setSelectedPlatform(ALL_PLATFORMS);
    notify("已删除该平台配置模块");
  }

  function resetTemplate() {
    if (!window.confirm("恢复模板会覆盖当前勾选、模块编辑和步骤关联，确定继续吗？")) return;
    setCompleted(["version-scope"]);
    setTasks(defaultTasks);
    setPhaseTitles(defaultPhaseTitles);
    setIsFlowEditing(false);
    setModules(defaultModules);
    setTaskLinks(defaultTaskLinks);
    setSelectedPlatform(ALL_PLATFORMS);
    setEditingModuleId(defaultModules[0].id);
    setReadingModuleId(defaultModules[0].id);
    notify("已恢复默认模板");
  }

  const viewHeading = {
    sop: {
      title: "主 SOP 流程",
      description: "按流程勾选，必要步骤可关联到对应平台模块，点击后直接跳转配置。",
    },
    platforms: {
      title: "平台配置模块",
      description: "集中查看各平台的上线配置说明与核对进度。",
    },
    editor: {
      title: "模块编辑",
      description: "选择平台模块，维护名称、核对项以及由文字、图片和链接组成的文档内容。",
    },
    document: {
      title: readingModule.name,
      description: readingModule.summary,
    },
  }[activeView];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">UP</div>
          <div>
            <strong>上架 SOP 工具</strong>
            <span>Release checklist</span>
          </div>
        </div>

        <nav aria-label="主导航">
          <button className={activeView === "sop" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("sop")}>
            <span className="nav-icon">◎</span> 主 SOP 流程
          </button>
          <button className={activeView === "platforms" || activeView === "document" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("platforms")}>
            <span className="nav-icon">▦</span> 平台配置模块
          </button>
          <button className={activeView === "editor" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("editor")}>
            <span className="nav-icon">✎</span> 模块编辑
          </button>
        </nav>

        <button className="reset-button" onClick={resetTemplate}>恢复模板</button>
      </aside>

      <section className={activeView === "document" ? "content document-mode" : "content"}>
        {activeView !== "document" && <header className="tool-header">
          <div>
            <div className="eyebrow">PRODUCT RELEASE SOP</div>
            <h1>{viewHeading.title}</h1>
            <p>{viewHeading.description}</p>
          </div>
          {activeView !== "editor" && <div className="header-stat">
            <span>完成进度</span>
            <strong>{progress}%</strong>
          </div>}
        </header>}

        {(activeView === "sop" || activeView === "platforms") && <section className="progress-panel" aria-label="上线进度">
          <div className="progress-copy">
            <span>总进度</span>
            <strong>{completedCount}</strong>
            <small>/ {totalCount} 项已完成</small>
          </div>
          <div className="progress-track"><div className="progress-value" style={{ width: `${progress}%` }} /></div>
          <div className="progress-stats">
            <div><span className="stat-dot done" />已完成 <strong>{completedCount}</strong></div>
            <div><span className="stat-dot doing" />待执行 <strong>{totalCount - completedCount}</strong></div>
            <div><span className="stat-dot risk" />必做剩余 <strong>{requiredLeft}</strong></div>
          </div>
        </section>}

        {(activeView === "sop" || activeView === "platforms") && <div className="platform-filter" role="tablist" aria-label="筛选平台">
          {platformOptions.map((platform) => (
            <button
              key={platform.id}
              role="tab"
              aria-selected={selectedPlatform === platform.id}
              className={selectedPlatform === platform.id ? "platform-pill selected" : "platform-pill"}
              onClick={() => setSelectedPlatform(platform.id)}
            >
              {platform.name}
            </button>
          ))}
        </div>}

        {activeView === "sop" ? (
          <section className="flow-panel">
            <div className="section-heading">
              <div><span className="eyebrow">GUIDED FLOW</span><h2>发布执行清单</h2></div>
              <div className="flow-heading-actions">
                <span className="quiet-count">{filteredTasks.length} 项</span>
                <button className={isFlowEditing ? "flow-edit-toggle active" : "flow-edit-toggle"} onClick={() => setIsFlowEditing((current) => !current)}>
                  {isFlowEditing ? "完成编辑" : "编辑流程"}
                </button>
              </div>
            </div>

            <div className="phase-list">
              {(Object.keys(phaseMeta) as Phase[]).map((phase) => {
                const phaseTasks = filteredTasks.filter((task) => task.phase === phase);
                const phaseDone = phaseTasks.filter((task) => completed.includes(task.id)).length;

                return (
                  <section className="phase" key={phase}>
                    <div className="phase-rail"><span>{phaseMeta[phase].number}</span><div /></div>
                    <div className="phase-content">
                      <div className="phase-header">
                        <div className="phase-title-wrap">
                          {isFlowEditing ? (
                            <input className="phase-title-input" value={phaseTitles[phase]} aria-label={`${phaseMeta[phase].number} 阶段名称`} onChange={(event) => setPhaseTitles((current) => ({ ...current, [phase]: event.target.value }))} />
                          ) : <h3>{phaseTitles[phase]}</h3>}
                          <p>{phaseDone}/{phaseTasks.length} 项完成</p>
                        </div>
                        <span className={phaseDone === phaseTasks.length && phaseTasks.length ? "phase-state complete" : "phase-state"}>
                          {phaseDone === phaseTasks.length && phaseTasks.length ? "已完成" : "进行中"}
                        </span>
                      </div>

                      {phaseTasks.length ? phaseTasks.map((task) => {
                        const isDone = completed.includes(task.id);
                        const linkedModule = getLinkedModule(task.id);

                        if (isFlowEditing) {
                          return (
                            <article className="task-row task-row-editing" key={task.id}>
                              <div className="task-edit-topbar">
                                <span>流程步骤</span>
                                <div>
                                  <button onClick={() => addTaskNear(task.id, phase, "before")}>↑ 上方添加</button>
                                  <button onClick={() => addTaskNear(task.id, phase, "after")}>↓ 下方添加</button>
                                  <button className="task-delete" onClick={() => removeTask(task.id)}>删除</button>
                                </div>
                              </div>
                              <div className="task-edit-grid">
                                <label className="field task-title-field">
                                  <span>步骤名称</span>
                                  <input value={task.title} onChange={(event) => updateTask(task.id, { title: event.target.value })} />
                                </label>
                                <label className="field task-due-field">
                                  <span>时间节点</span>
                                  <input value={task.due} onChange={(event) => updateTask(task.id, { due: event.target.value })} />
                                </label>
                              </div>
                              <label className="field">
                                <span>执行说明</span>
                                <textarea rows={2} value={task.detail} onChange={(event) => updateTask(task.id, { detail: event.target.value })} />
                              </label>
                              <div className="task-edit-grid settings">
                                <label className="field">
                                  <span>适用平台</span>
                                  <select value={task.platformId} onChange={(event) => updateTask(task.id, { platformId: event.target.value })}>
                                    {platformOptions.map((platform) => <option value={platform.id} key={platform.id}>{platform.name}</option>)}
                                  </select>
                                </label>
                                <label className="field">
                                  <span>关联文档</span>
                                  <select value={taskLinks[task.id] ?? ""} onChange={(event) => setTaskLinks((current) => ({ ...current, [task.id]: event.target.value }))}>
                                    <option value="">不关联模块</option>
                                    {modules.map((module) => <option value={module.id} key={module.id}>{module.name}</option>)}
                                  </select>
                                </label>
                                <label className="required-control">
                                  <input type="checkbox" checked={Boolean(task.required)} onChange={(event) => updateTask(task.id, { required: event.target.checked })} />
                                  <span>设为必做步骤</span>
                                </label>
                              </div>
                            </article>
                          );
                        }

                        return (
                          <article className={isDone ? "task-row finished" : "task-row"} key={task.id}>
                            <button className={isDone ? "check checked" : "check"} aria-label={`完成 ${task.title}`} onClick={() => toggleTask(task.id)}>
                              {isDone ? "✓" : ""}
                            </button>
                            <div className="task-main">
                              <div className="task-title-line">
                                <h4>{task.title}</h4>
                                {task.required && <span className="required-tag">必做</span>}
                              </div>
                              <p>{task.detail}</p>
                              <div className="task-meta">
                                <span className="platform-tag">{getPlatformName(task.platformId)}</span>
                                <span>{task.due}</span>
                              </div>
                              <div className="task-link-row">
                                <select
                                  aria-label={`为 ${task.title} 关联平台配置模块`}
                                  value={taskLinks[task.id] ?? ""}
                                  onChange={(event) => setTaskLinks((current) => ({ ...current, [task.id]: event.target.value }))}
                                >
                                  <option value="">不关联模块</option>
                                  {modules.map((module) => (
                                    <option value={module.id} key={module.id}>{module.name}</option>
                                  ))}
                                </select>
                                {linkedModule && (
                                  <button className="module-jump" onClick={() => openModule(linkedModule.id)}>
                                    打开 {linkedModule.name} <span>→</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      }) : isFlowEditing ? (
                        <button className="empty-add-task" onClick={() => addTaskNear(null, phase, "after")}>＋ 添加第一个流程步骤</button>
                      ) : <div className="empty-state">该平台在此阶段没有待执行项。</div>}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        ) : activeView === "platforms" ? (
          <section className="modules-catalog">
            <div className="section-heading">
              <div><span className="eyebrow">PLATFORM DOCUMENTS</span><h2>配置文档</h2></div>
              <span className="quiet-count">{selectedPlatform === ALL_PLATFORMS ? modules.length : 1} 个模块</span>
            </div>

            <div className="module-grid catalog-grid">
              {(selectedPlatform === ALL_PLATFORMS ? modules : modules.filter((module) => module.id === selectedPlatform)).map((module) => {
                const linkedTasks = tasks.filter((task) => taskLinks[task.id] === module.id || task.platformId === module.id);
                const linkedDone = linkedTasks.filter((task) => completed.includes(task.id)).length;
                const moduleProgress = linkedTasks.length ? Math.round((linkedDone / linkedTasks.length) * 100) : 0;

                return (
                  <article
                    className="module-card document-card"
                    key={module.id}
                    role="button"
                    tabIndex={0}
                    title="双击打开完整文档"
                    aria-label={`打开 ${module.name} 完整文档`}
                    onDoubleClick={() => openModule(module.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openModule(module.id);
                      }
                    }}
                  >
                    <div className="module-card-main">
                      <span className="module-logo">{module.shortName || module.name.slice(0, 2)}</span>
                      <span className="module-card-copy">
                        <strong>{module.name || "未命名模块"}</strong>
                        <small>{module.summary || "暂无说明"}</small>
                      </span>
                      <span className="module-percent">{moduleProgress}%</span>
                    </div>
                    <div className="mini-progress"><div style={{ width: `${moduleProgress}%` }} /></div>
                    <ul>
                      {module.checkpoints.slice(0, 4).map((checkpoint) => (
                        <li key={checkpoint}><span className="list-check" />{checkpoint}</li>
                      ))}
                    </ul>
                    <div className="module-card-footer">
                      <span>{getDocumentSectionCount(module.markdown)} 个章节</span>
                      <span>{module.checkpoints.length} 个检查项</span>
                      <span className="document-cue" aria-hidden="true">↗</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : activeView === "editor" ? (
          <section className="modules-view">
            <div className="modules-list">
              <div className="section-heading">
                <div><span className="eyebrow">MODULE DIRECTORY</span><h2>选择模块</h2></div>
                <button className="text-button" onClick={addModule}>新增模块</button>
              </div>

              <div className="module-grid">
                {modules.map((module) => {
                  const linkedTasks = tasks.filter((task) => taskLinks[task.id] === module.id || task.platformId === module.id);
                  const linkedDone = linkedTasks.filter((task) => completed.includes(task.id)).length;
                  const moduleProgress = linkedTasks.length ? Math.round((linkedDone / linkedTasks.length) * 100) : 0;

                  return (
                    <article className={activeModule.id === module.id ? "module-card selected" : "module-card"} key={module.id}>
                      <button className="module-card-main" onClick={() => editModule(module.id)}>
                        <span className="module-logo">{module.shortName || module.name.slice(0, 2)}</span>
                        <span className="module-card-copy">
                          <strong>{module.name || "未命名模块"}</strong>
                          <small>{module.summary || "暂无说明"}</small>
                        </span>
                        <span className="module-percent">{moduleProgress}%</span>
                      </button>
                      <div className="mini-progress"><div style={{ width: `${moduleProgress}%` }} /></div>
                      <div className="module-card-footer">
                        <span>{getDocumentSectionCount(module.markdown)} 个章节</span>
                        <span>{module.checkpoints.length} 个检查项</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <section className="editor-panel">
              <div className="section-heading editor-heading">
                <div><span className="eyebrow">DOCUMENT EDITOR</span><h2>{activeModule.name} 文档</h2></div>
                <div className="editor-heading-actions">
                  <button className="text-button" onClick={() => openModule(activeModule.id)}>预览文档</button>
                  <button className="danger-button" onClick={() => removeModule(activeModule.id)}>删除模块</button>
                </div>
              </div>

              <section className="editor-card">
                <div className="field-grid">
                  <label className="field">
                    <span>模块名称</span>
                    <input value={activeModule.name} onChange={(event) => updateActiveModule({ name: event.target.value })} />
                  </label>
                  <label className="field">
                    <span>短标识</span>
                    <input value={activeModule.shortName} onChange={(event) => updateActiveModule({ shortName: event.target.value.toUpperCase().slice(0, 4) })} />
                  </label>
                </div>
                <label className="field">
                  <span>模块摘要</span>
                  <textarea rows={2} value={activeModule.summary} onChange={(event) => updateActiveModule({ summary: event.target.value })} />
                </label>
                <label className="field">
                  <span>检查项</span>
                  <textarea rows={4} value={activeModule.checkpoints.join("\n")} onChange={(event) => updateCheckpoints(event.target.value)} />
                </label>
              </section>

              <section className="markdown-editor">
                <div className="markdown-toolbar">
                  <div>
                    <span className="eyebrow">MARKDOWN EDITOR</span>
                    <h3>文档内容</h3>
                  </div>
                  <div className="markdown-tools" role="toolbar" aria-label="Markdown 格式工具">
                    <button title="一级标题" onClick={() => insertMarkdownBlock("# ", "一级标题")}>H1</button>
                    <button title="二级标题" onClick={() => insertMarkdownBlock("## ", "二级标题")}>H2</button>
                    <button className="bold-tool" title="加粗" onClick={() => replaceMarkdownSelection("**", "**", "加粗文字")}>B</button>
                    <button title="添加链接" onClick={() => replaceMarkdownSelection("[", "](https://)", "链接名称")}>↗</button>
                    <span className="toolbar-separator" />
                    {["#ce5e55", "#416fae", "#7967a6", "#a87618"].map((color) => (
                      <button
                        className="color-tool"
                        style={{ backgroundColor: color }}
                        title={`字体颜色 ${color}`}
                        aria-label={`字体颜色 ${color}`}
                        key={color}
                        onClick={() => replaceMarkdownSelection(`<span style="color:${color}">`, "</span>", "彩色文字")}
                      />
                    ))}
                    <span className="toolbar-separator" />
                    <button title="添加图片" onClick={() => markdownImageInputRef.current?.click()}>▧</button>
                    <input
                      ref={markdownImageInputRef}
                      className="visually-hidden"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        insertMarkdownImage(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </div>
                </div>

                <div className="markdown-workspace">
                  <label className="markdown-pane source-pane">
                    <span className="pane-label">Markdown</span>
                    <textarea
                      ref={markdownTextareaRef}
                      value={activeModule.markdown}
                      spellCheck={false}
                      onPaste={handleMarkdownPaste}
                      onChange={(event) => updateActiveModule({ markdown: event.target.value })}
                    />
                  </label>
                  <section className="markdown-pane preview-pane" aria-label="文档实时预览">
                    <span className="pane-label">实时预览</span>
                    <div className="markdown-rendered editor-preview">
                      {activeModule.markdown.trim() ? renderMarkdown(activeModule.markdown) : <p className="markdown-empty">文档内容为空</p>}
                    </div>
                  </section>
                </div>
              </section>

              <div className="editor-note">
                <strong>{tasks.filter((task) => taskLinks[task.id] === activeModule.id || task.platformId === activeModule.id).length}</strong>
                <span>个 SOP 步骤当前关联到此模块</span>
              </div>
            </section>
          </section>
        ) : (
          <section className="document-page">
            <div className="document-topbar">
              <button className="document-back" onClick={() => setActiveView("platforms")}><span aria-hidden="true">←</span> 返回平台模块</button>
              <button className="text-button" onClick={() => editModule(readingModule.id)}>编辑文档</button>
            </div>

            <article className="document-sheet">
              <header className="document-header">
                <div className="document-identity">
                  <span className="document-logo">{readingModule.shortName || readingModule.name.slice(0, 2)}</span>
                  <div>
                    <span className="eyebrow">PLATFORM CONFIGURATION</span>
                    <h1>{readingModule.name}</h1>
                  </div>
                </div>
                <p>{readingModule.summary}</p>
                <div className="document-meta">
                  <span>{getDocumentSectionCount(readingModule.markdown)} 个内容章节</span>
                  <span>{readingModule.checkpoints.length} 个核对项</span>
                </div>
              </header>

              {readingModule.checkpoints.length > 0 && (
                <section className="document-checklist">
                  <span className="eyebrow">CHECKLIST</span>
                  <h2>上线核对要点</h2>
                  <ol>
                    {readingModule.checkpoints.map((checkpoint, index) => (
                      <li key={`${checkpoint}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span>{checkpoint}</li>
                    ))}
                  </ol>
                </section>
              )}

              <div className="document-body markdown-rendered">
                {readingModule.markdown.trim() ? renderMarkdown(readingModule.markdown) : <p className="markdown-empty">文档内容为空</p>}
              </div>
            </article>
          </section>
        )}
      </section>
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}
