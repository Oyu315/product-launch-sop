"use client";

import { useMemo, useState } from "react";

type Task = {
  id: string;
  title: string;
  detail: string;
  owner: string;
  platform: string;
  phase: "before" | "submission" | "after";
  due: string;
  required?: boolean;
  verified?: boolean;
};

const platforms = ["全部平台", "App Store", "Google Play", "华为 AppGallery", "小米应用商店"];

const phaseMeta = {
  before: { label: "上线前准备", short: "准备", number: "01" },
  submission: { label: "配置与提审", short: "提审", number: "02" },
  after: { label: "上线后验证", short: "验证", number: "03" },
};

const initialTasks: Task[] = [
  {
    id: "brief",
    title: "确认版本上线信息",
    detail: "版本号、目标地区、上线窗口与负责人已同步",
    owner: "林宁",
    platform: "全部平台",
    phase: "before",
    due: "今天 10:30",
    required: true,
    verified: true,
  },
  {
    id: "assets",
    title: "检查商店素材包",
    detail: "图标、截图、描述、关键词与落地页链接完整",
    owner: "林宁",
    platform: "全部平台",
    phase: "before",
    due: "今天 12:00",
    required: true,
  },
  {
    id: "privacy-ios",
    title: "填写隐私与数据收集表单",
    detail: "与当前版本功能及 SDK 清单保持一致",
    owner: "林宁",
    platform: "App Store",
    phase: "before",
    due: "今天 15:00",
    required: true,
  },
  {
    id: "build-gp",
    title: "上传 AAB 并配置测试轨道",
    detail: "确认包名、签名和版本号与发布单一致",
    owner: "林宁",
    platform: "Google Play",
    phase: "submission",
    due: "明天 10:00",
    required: true,
  },
  {
    id: "review-ios",
    title: "提交审核并登记审核单号",
    detail: "提交前复核商店页、审核备注及测试账号",
    owner: "林宁",
    platform: "App Store",
    phase: "submission",
    due: "明天 11:00",
    required: true,
  },
  {
    id: "huawei-config",
    title: "配置地区、语言与定价",
    detail: "与产品发布策略和本地化素材保持一致",
    owner: "林宁",
    platform: "华为 AppGallery",
    phase: "submission",
    due: "明天 14:00",
    required: true,
  },
  {
    id: "store-page",
    title: "核验商店页展示",
    detail: "检查标题、截图、版本号、下载入口与地区可见性",
    owner: "林宁",
    platform: "全部平台",
    phase: "after",
    due: "上线后 1 小时",
    required: true,
  },
  {
    id: "first-open",
    title: "完成下载与首次启动验证",
    detail: "验证安装、登录、核心路径、埋点和崩溃监控",
    owner: "林宁",
    platform: "全部平台",
    phase: "after",
    due: "上线后 2 小时",
    required: true,
  },
];

const platformGuides = {
  "App Store": ["App 信息与本地化", "App 隐私", "版本构建与出口合规", "审核备注与测试账号"],
  "Google Play": ["商店设置与 Data safety", "AAB 与内部测试", "内容分级与目标受众", "生产轨道与发布节奏"],
  "华为 AppGallery": ["应用信息与资质", "AGC 服务配置", "地区与语言", "审核资料与提审"],
  "小米应用商店": ["开发者资质", "应用信息与素材", "测试包与兼容性", "审核备注与发布"],
};

export default function Home() {
  const [selectedPlatform, setSelectedPlatform] = useState("全部平台");
  const [activeView, setActiveView] = useState<"sop" | "platforms">("sop");
  const [completed, setCompleted] = useState<string[]>(["brief"]);
  const [toast, setToast] = useState("");

  const filteredTasks = useMemo(
    () =>
      initialTasks.filter(
        (task) =>
          selectedPlatform === "全部平台" ||
          task.platform === selectedPlatform ||
          task.platform === "全部平台",
      ),
    [selectedPlatform],
  );

  const done = completed.length;
  const total = initialTasks.length;
  const progress = Math.round((done / total) * 100);
  const pendingRequired = initialTasks.filter(
    (task) => task.required && !completed.includes(task.id),
  );

  function toggleTask(id: string) {
    setCompleted((current) =>
      current.includes(id) ? current.filter((taskId) => taskId !== id) : [...current, id],
    );
  }

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">UP</div>
          <div>
            <strong>上线指挥台</strong>
            <span>Product release OS</span>
          </div>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-dot" />
          <div>
            <small>当前项目</small>
            <strong>Nova Notes 2.8.0</strong>
          </div>
          <span className="chevron">⌄</span>
        </div>

        <nav aria-label="主导航">
          <button className={activeView === "sop" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("sop")}>
            <span className="nav-icon">◎</span> 主 SOP 流程
          </button>
          <button className={activeView === "platforms" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("platforms")}>
            <span className="nav-icon">▦</span> 平台配置模块
          </button>
          <button className="nav-item" onClick={() => notify("复核清单已发送给当前负责人")}> 
            <span className="nav-icon">✓</span> 待复核事项
            <span className="nav-badge">3</span>
          </button>
          <button className="nav-item" onClick={() => notify("已打开本周发布记录")}> 
            <span className="nav-icon">◷</span> 发布记录
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">?</span>
            <strong>遇到审核阻塞？</strong>
            <p>先登记原因，再通知对应负责人。</p>
            <button onClick={() => notify("已创建审核阻塞记录")}>登记阻塞</button>
          </div>
          <div className="member">
            <div className="avatar">LN</div>
            <div><strong>林宁</strong><span>运营新同学</span></div>
            <span className="more">•••</span>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div className="crumb">产品中心 <span>/</span> Nova Notes <span>/</span> 2.8.0 上线任务</div>
          <div className="top-actions">
            <button className="icon-button" title="查看提醒" onClick={() => notify("你有 2 项任务将在今天到期")}>◉<i /></button>
            <button className="text-button" onClick={() => notify("已生成交接链接")}>分享交接</button>
          </div>
        </header>

        <div className="page-intro">
          <div>
            <div className="eyebrow">RELEASE CHECKLIST</div>
            <h1>{activeView === "sop" ? "主 SOP 流程" : "平台配置模块"}</h1>
            <p>{activeView === "sop" ? "按阶段推进，完成一项勾选一项；关键步骤需复核后才能流转。" : "选择一个平台，查看它在上线前、提审和上线后需要完成的配置。"}</p>
          </div>
          <div className="release-date">
            <span>计划上线</span>
            <strong>07.18 <small>周五</small></strong>
          </div>
        </div>

        <section className="progress-panel" aria-label="上线进度">
          <div className="progress-copy">
            <span>总进度</span>
            <strong>{progress}%</strong>
            <small>{done} / {total} 项已完成</small>
          </div>
          <div className="progress-track"><div className="progress-value" style={{ width: `${progress}%` }} /></div>
          <div className="progress-stats">
            <div><span className="stat-dot done" />已完成 <strong>{done}</strong></div>
            <div><span className="stat-dot doing" />待执行 <strong>{total - done}</strong></div>
            <div><span className="stat-dot risk" />待复核 <strong>3</strong></div>
          </div>
        </section>

        <div className="platform-filter" role="tablist" aria-label="筛选平台">
          {platforms.map((platform) => (
            <button
              key={platform}
              role="tab"
              aria-selected={selectedPlatform === platform}
              className={selectedPlatform === platform ? "platform-pill selected" : "platform-pill"}
              onClick={() => setSelectedPlatform(platform)}
            >
              {platform}
            </button>
          ))}
        </div>

        {activeView === "sop" ? (
          <div className="dashboard-grid">
            <section className="flow-panel">
              <div className="section-heading">
                <div><span className="eyebrow">GUIDED FLOW</span><h2>本次发布流程</h2></div>
                <button className="filter-button" onClick={() => notify("当前仅显示未完成和待复核任务")}>筛选 · 未完成⌄</button>
              </div>
              <div className="phase-list">
                {(Object.keys(phaseMeta) as Array<keyof typeof phaseMeta>).map((phase) => {
                  const phaseTasks = filteredTasks.filter((task) => task.phase === phase);
                  const phaseDone = phaseTasks.filter((task) => completed.includes(task.id)).length;
                  return (
                    <section className="phase" key={phase}>
                      <div className="phase-rail"><span>{phaseMeta[phase].number}</span><div /></div>
                      <div className="phase-content">
                        <div className="phase-header">
                          <div><h3>{phaseMeta[phase].label}</h3><p>{phaseDone}/{phaseTasks.length} 项完成</p></div>
                          <span className={phaseDone === phaseTasks.length && phaseTasks.length ? "phase-state complete" : "phase-state"}>{phaseDone === phaseTasks.length && phaseTasks.length ? "已完成" : "进行中"}</span>
                        </div>
                        {phaseTasks.length ? phaseTasks.map((task) => {
                          const isDone = completed.includes(task.id);
                          return (
                            <article className={isDone ? "task-row finished" : "task-row"} key={task.id}>
                              <button className={isDone ? "check checked" : "check"} aria-label={`完成 ${task.title}`} onClick={() => toggleTask(task.id)}>{isDone ? "✓" : ""}</button>
                              <div className="task-main">
                                <div className="task-title-line"><h4>{task.title}</h4>{task.required && <span className="required-tag">必做</span>}</div>
                                <p>{task.detail}</p>
                                <div className="task-meta"><span className="platform-tag">{task.platform}</span><span>{task.owner}</span>{task.verified && <span className="verified">已复核</span>}</div>
                              </div>
                              <time className={task.due.includes("今天") ? "due urgent" : "due"}>{task.due}</time>
                            </article>
                          );
                        }) : <div className="empty-state">该平台在此阶段没有待执行项。</div>}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>

            <aside className="side-column">
              <section className="alert-panel">
                <div className="alert-title"><span>!</span><div><small>需要注意</small><h3>还差 {pendingRequired.length} 个必做项</h3></div></div>
                <p>完成这些项目后，才能进入提审阶段。</p>
                <button onClick={() => notify("已定位到未完成必做项")}>查看必做项 <span>→</span></button>
              </section>
              <section className="quick-panel">
                <div className="section-heading small"><h3>今日优先处理</h3><button onClick={() => notify("今日任务已同步到待办")}>全部查看</button></div>
                {initialTasks.filter((task) => task.due.includes("今天")).map((task) => (
                  <div className="quick-task" key={task.id}><span className={completed.includes(task.id) ? "tiny-check checked" : "tiny-check"}>{completed.includes(task.id) ? "✓" : ""}</span><div><strong>{task.title}</strong><small>{task.due} · {task.platform}</small></div></div>
                ))}
              </section>
              <section className="handoff-panel">
                <span>▣</span><div><strong>发布资料归档</strong><p>包体、素材、审核记录与验证截图</p></div><button title="打开归档">→</button>
              </section>
            </aside>
          </div>
        ) : (
          <section className="modules-view">
            <div className="modules-intro">
              <div><span className="eyebrow">PLATFORM PLAYBOOK</span><h2>{selectedPlatform === "全部平台" ? "按平台完成配置" : `${selectedPlatform} 配置清单`}</h2></div>
              <button className="text-button" onClick={() => notify("已打开平台配置版本记录")}>查看配置版本</button>
            </div>
            <div className="module-grid">
              {(selectedPlatform === "全部平台" ? Object.entries(platformGuides) : Object.entries(platformGuides).filter(([name]) => name === selectedPlatform)).map(([name, items], index) => (
                <article className="module-card" key={name}>
                  <div className={`module-logo logo-${index + 1}`}>{name === "App Store" ? "A" : name === "Google Play" ? "G" : name === "华为 AppGallery" ? "H" : "MI"}</div>
                  <div className="module-card-header"><div><h3>{name}</h3><p>上架配置与核验标准</p></div><span>{name === "App Store" ? "75%" : name === "Google Play" ? "50%" : "0%"}</span></div>
                  <div className="mini-progress"><div style={{ width: name === "App Store" ? "75%" : name === "Google Play" ? "50%" : "0%" }} /></div>
                  <ul>
                    {items.map((item, itemIndex) => <li key={item}><span className={itemIndex === 0 && name !== "华为 AppGallery" && name !== "小米应用商店" ? "list-check complete" : "list-check"}>{itemIndex === 0 && name !== "华为 AppGallery" && name !== "小米应用商店" ? "✓" : ""}</span>{item}</li>)}
                  </ul>
                  <button onClick={() => { setSelectedPlatform(name); setActiveView("sop"); }}>进入配置清单 <span>→</span></button>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}
