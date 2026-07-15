"use client";

import { useEffect, useMemo, useState } from "react";

type Phase = "before" | "submission" | "after";

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
};

const STORAGE_KEY = "product-launch-sop-tool-v2";
const ALL_PLATFORMS = "all";

const phaseMeta: Record<Phase, { label: string; number: string }> = {
  before: { label: "上线前准备", number: "01" },
  submission: { label: "配置与提审", number: "02" },
  after: { label: "上线后验证", number: "03" },
};

const defaultModules: PlatformModule[] = [
  {
    id: "app-store",
    name: "App Store",
    shortName: "AS",
    summary: "应用信息、本地化、隐私表单、审核备注与版本构建。",
    checkpoints: ["App 信息与本地化", "App 隐私与数据收集", "版本构建与出口合规", "审核备注与测试账号"],
  },
  {
    id: "google-play",
    name: "Google Play",
    shortName: "GP",
    summary: "商店资料、Data safety、AAB、测试轨道、内容分级与生产发布。",
    checkpoints: ["商店设置与 Data safety", "AAB 与内部测试", "内容分级与目标受众", "生产轨道与发布节奏"],
  },
  {
    id: "huawei",
    name: "华为 AppGallery",
    shortName: "HW",
    summary: "应用资质、AGC 服务、地区语言、定价与审核资料。",
    checkpoints: ["应用信息与资质", "AGC 服务配置", "地区与语言", "审核资料与提审"],
  },
  {
    id: "xiaomi",
    name: "小米应用商店",
    shortName: "MI",
    summary: "开发者资质、应用资料、测试包、兼容性与发布备注。",
    checkpoints: ["开发者资质", "应用信息与素材", "测试包与兼容性", "审核备注与发布"],
  },
];

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

export default function Home() {
  const [activeView, setActiveView] = useState<"sop" | "platforms">("sop");
  const [selectedPlatform, setSelectedPlatform] = useState(ALL_PLATFORMS);
  const [completed, setCompleted] = useState<string[]>(["version-scope"]);
  const [modules, setModules] = useState<PlatformModule[]>(defaultModules);
  const [editingModuleId, setEditingModuleId] = useState(defaultModules[0].id);
  const [taskLinks, setTaskLinks] = useState<Record<string, string>>(defaultTaskLinks);
  const [toast, setToast] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const data = JSON.parse(saved) as {
          completed?: string[];
          modules?: PlatformModule[];
          taskLinks?: Record<string, string>;
        };
        if (Array.isArray(data.completed)) setCompleted(data.completed);
        if (Array.isArray(data.modules) && data.modules.length) {
          setModules(data.modules);
          setEditingModuleId(data.modules[0].id);
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
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ completed, modules, taskLinks }),
    );
  }, [completed, loaded, modules, taskLinks]);

  const platformOptions = useMemo(
    () => [{ id: ALL_PLATFORMS, name: "全部平台" }, ...modules.map(({ id, name }) => ({ id, name }))],
    [modules],
  );

  const filteredTasks = useMemo(
    () =>
      defaultTasks.filter(
        (task) =>
          selectedPlatform === ALL_PLATFORMS ||
          task.platformId === selectedPlatform ||
          task.platformId === ALL_PLATFORMS,
      ),
    [selectedPlatform],
  );

  const completedCount = defaultTasks.filter((task) => completed.includes(task.id)).length;
  const totalCount = defaultTasks.length;
  const progress = Math.round((completedCount / totalCount) * 100);
  const requiredLeft = defaultTasks.filter((task) => task.required && !completed.includes(task.id)).length;
  const activeModule = modules.find((module) => module.id === editingModuleId) ?? modules[0] ?? defaultModules[0];

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

  function openModule(moduleId: string) {
    setEditingModuleId(moduleId);
    setSelectedPlatform(moduleId);
    setActiveView("platforms");
  }

  function updateActiveModule(patch: Partial<PlatformModule>) {
    setModules((current) =>
      current.map((module) => (module.id === activeModule.id ? { ...module, ...patch } : module)),
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

  function addModule() {
    const id = `custom-${Date.now()}`;
    const newModule: PlatformModule = {
      id,
      name: "新平台模块",
      shortName: "NEW",
      summary: "填写该平台上线前后需要配置和核验的事项。",
      checkpoints: ["配置项一", "配置项二", "上线后核验"],
    };
    setModules((current) => [...current, newModule]);
    setEditingModuleId(id);
    setSelectedPlatform(id);
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
    if (selectedPlatform === id) setSelectedPlatform(ALL_PLATFORMS);
    notify("已删除该平台配置模块");
  }

  function resetTemplate() {
    if (!window.confirm("恢复模板会覆盖当前勾选、模块编辑和步骤关联，确定继续吗？")) return;
    setCompleted(["version-scope"]);
    setModules(defaultModules);
    setTaskLinks(defaultTaskLinks);
    setSelectedPlatform(ALL_PLATFORMS);
    setEditingModuleId(defaultModules[0].id);
    notify("已恢复默认模板");
  }

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
          <button className={activeView === "platforms" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("platforms")}>
            <span className="nav-icon">▦</span> 平台配置模块
          </button>
        </nav>

        <button className="reset-button" onClick={resetTemplate}>恢复模板</button>
      </aside>

      <section className="content">
        <header className="tool-header">
          <div>
            <div className="eyebrow">PRODUCT RELEASE SOP</div>
            <h1>{activeView === "sop" ? "主 SOP 流程" : "平台配置模块"}</h1>
            <p>
              {activeView === "sop"
                ? "按流程勾选，必要步骤可关联到对应平台模块，点击后直接跳转配置。"
                : "维护各平台上线前后配置项，修改后会保存在当前浏览器。"}
            </p>
          </div>
          <div className="header-stat">
            <span>完成进度</span>
            <strong>{progress}%</strong>
          </div>
        </header>

        <section className="progress-panel" aria-label="上线进度">
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
        </section>

        <div className="platform-filter" role="tablist" aria-label="筛选平台">
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
        </div>

        {activeView === "sop" ? (
          <section className="flow-panel">
            <div className="section-heading">
              <div><span className="eyebrow">GUIDED FLOW</span><h2>发布执行清单</h2></div>
              <span className="quiet-count">{filteredTasks.length} 项</span>
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
                        <div><h3>{phaseMeta[phase].label}</h3><p>{phaseDone}/{phaseTasks.length} 项完成</p></div>
                        <span className={phaseDone === phaseTasks.length && phaseTasks.length ? "phase-state complete" : "phase-state"}>
                          {phaseDone === phaseTasks.length && phaseTasks.length ? "已完成" : "进行中"}
                        </span>
                      </div>

                      {phaseTasks.length ? phaseTasks.map((task) => {
                        const isDone = completed.includes(task.id);
                        const linkedModule = getLinkedModule(task.id);

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
                      }) : <div className="empty-state">该平台在此阶段没有待执行项。</div>}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="modules-view">
            <div className="modules-list">
              <div className="section-heading">
                <div><span className="eyebrow">PLATFORM MODULES</span><h2>配置模块</h2></div>
                <button className="text-button" onClick={addModule}>新增模块</button>
              </div>

              <div className="module-grid">
                {(selectedPlatform === ALL_PLATFORMS ? modules : modules.filter((module) => module.id === selectedPlatform)).map((module) => {
                  const linkedTasks = defaultTasks.filter((task) => taskLinks[task.id] === module.id || task.platformId === module.id);
                  const linkedDone = linkedTasks.filter((task) => completed.includes(task.id)).length;
                  const moduleProgress = linkedTasks.length ? Math.round((linkedDone / linkedTasks.length) * 100) : 0;

                  return (
                    <article className={activeModule.id === module.id ? "module-card selected" : "module-card"} key={module.id}>
                      <button className="module-card-main" onClick={() => setEditingModuleId(module.id)}>
                        <span className="module-logo">{module.shortName || module.name.slice(0, 2)}</span>
                        <span className="module-card-copy">
                          <strong>{module.name || "未命名模块"}</strong>
                          <small>{module.summary || "暂无说明"}</small>
                        </span>
                        <span className="module-percent">{moduleProgress}%</span>
                      </button>
                      <div className="mini-progress"><div style={{ width: `${moduleProgress}%` }} /></div>
                      <ul>
                        {module.checkpoints.slice(0, 4).map((item) => <li key={item}><span className="list-check" />{item}</li>)}
                      </ul>
                    </article>
                  );
                })}
              </div>
            </div>

            <aside className="editor-panel">
              <div className="section-heading editor-heading">
                <div><span className="eyebrow">EDITOR</span><h2>模块编辑器</h2></div>
                <button className="danger-button" onClick={() => removeModule(activeModule.id)}>删除</button>
              </div>

              <label className="field">
                <span>模块名称</span>
                <input value={activeModule.name} onChange={(event) => updateActiveModule({ name: event.target.value })} />
              </label>
              <label className="field">
                <span>短标识</span>
                <input value={activeModule.shortName} onChange={(event) => updateActiveModule({ shortName: event.target.value.toUpperCase().slice(0, 4) })} />
              </label>
              <label className="field">
                <span>模块说明</span>
                <textarea rows={3} value={activeModule.summary} onChange={(event) => updateActiveModule({ summary: event.target.value })} />
              </label>
              <label className="field">
                <span>配置项清单</span>
                <textarea rows={8} value={activeModule.checkpoints.join("\n")} onChange={(event) => updateCheckpoints(event.target.value)} />
              </label>

              <div className="editor-note">
                <strong>{defaultTasks.filter((task) => taskLinks[task.id] === activeModule.id || task.platformId === activeModule.id).length}</strong>
                <span>个 SOP 步骤当前关联到此模块</span>
              </div>
            </aside>
          </section>
        )}
      </section>
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}
