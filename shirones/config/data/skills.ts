import type { SkillItem } from "@/types/skillsConfig";

export const skillsData: SkillItem[] = [
	{
		name: "Python",
		description: "主力语言：Agent 项目、数据处理、后端服务。",
		icon: "simple-icons:python",
		category: "backend",
		level: "advanced",
	},
	{
		name: "TypeScript",
		description: "带类型约束的前端工程，Vite 项目常用。",
		icon: "simple-icons:typescript",
		category: "frontend",
		level: "intermediate",
	},
	{
		name: "FastAPI",
		description: "异步 Web 框架，写过 PPT 生成器的后端。",
		icon: "simple-icons:fastapi",
		category: "backend",
		level: "intermediate",
	},
	{
		name: "Go",
		description: "Gin + GORM 的后端练习项目经验。",
		icon: "simple-icons:go",
		category: "backend",
		level: "intermediate",
	},
	{
		name: "Java",
		description: "课程与项目后端经验。",
		icon: "simple-icons:openjdk",
		category: "backend",
		level: "intermediate",
	},
	{
		name: "Astro",
		description: "本站就是用它搭的：内容驱动的静态站点。",
		icon: "simple-icons:astro",
		category: "frontend",
		level: "intermediate",
	},
	{
		name: "AI Agent / MCP",
		description: "工具检索与评测、MCP 服务接入、Agent 工作流。",
		icon: "material-symbols:psychology-rounded",
		category: "tooling",
		level: "intermediate",
	},
	{
		name: "Git & GitHub Actions",
		description: "版本管理与 CI 自动化部署。",
		icon: "simple-icons:git",
		category: "tooling",
		level: "intermediate",
	},
	{
		name: "Linux",
		description: "日常开发环境与常用服务器操作。",
		icon: "simple-icons:linux",
		category: "tooling",
		level: "intermediate",
	},
	{
		name: "Docker",
		description: "项目容器化打包与部署。",
		icon: "simple-icons:docker",
		category: "tooling",
		level: "intermediate",
	},
];

/** 获取所有技能数据列表 */
export function getSkillsList(): SkillItem[] {
	return skillsData;
}
