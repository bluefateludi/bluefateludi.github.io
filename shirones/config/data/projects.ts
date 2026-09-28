/**
 * 项目页数据源（纯内容）。
 * 页面展示与筛选规则由 shirones/config/projectsConfig.ts 控制。
 */
import type { ProjectItem } from "@/types/projectsConfig";

export const projectsData: ProjectItem[] = [
	{
		key: "slideforge",
		title: "SlideForge",
		summary:
			"AI 驱动的 PPT 生成器：主题/长文本/文档 → 可编辑大纲 → 并发生成 16:9 页面 → 原生可编辑 PPTX 导出，内置 20 题基准评测体系。",
		category: "web",
		phase: "building",
		technologies: ["Python", "TypeScript"],
		icon: "material-symbols:slideshow-rounded",
		featured: true,
		repository: "https://github.com/bluefateludi/SlideForge",
		year: "2026",
	},
	{
		key: "toollens",
		title: "ToolLens",
		summary:
			"面向「几十到上百个工具，Agent 怎么快速选对」这一工程难题的实战项目：工具检索、模型选择、执行校验与评测链路，并用工具混淆矩阵分开衡量候选召回与最终选择。",
		category: "agent",
		phase: "shipped",
		technologies: ["Python"],
		icon: "material-symbols:manage-search-rounded",
		repository: "https://github.com/bluefateludi/ToolLens-Agent-",
		year: "2026",
	},
	{
		key: "momo-techscout",
		title: "MOMO TechScout",
		summary: "一个可追溯的论文调研 Agent：检索、筛选到结论，全程保留证据链。",
		category: "agent",
		phase: "building",
		technologies: ["Python", "TypeScript"],
		icon: "material-symbols:travel-explore-rounded",
		repository: "https://github.com/bluefateludi/MOMO-TechScout",
		year: "2026",
	},
];

/** 获取所有项目数据列表 */
export function getProjectsList(): ProjectItem[] {
	return projectsData;
}
