# Proposal Request Intake

## Basic Information

| Field | Value |
|-------|-------|
| Proposal ID | `P-20250417-001` |
| Title | 提案包与访问链接管理系统 |
| Requester | boss |
| Coordinator | 小墨 |
| Date | 2026-04-17 |
| Status | `intake` |

## Original Request

> 生成一个提案包或访问链接管理的网站，比如将 android-hello 对应的包上传到、将 todolist 的访问链接。网站展示内容（提案id，提案名称，提案描述，提案访问链接-包下载链接或web网站访问链接）；网站发布到github pages

## Clarification

### Round 1

**Questions:**

1. 数据管理方式：既支持展示也支持上传；数据保存到 GitHub Pages 中（具体如何存储？JSON 文件？上传到 GitHub 仓库？）
2. 摸底现有情况：确认了 `workspace-dev/proposals/` 下有 game-1024、todo-app、calculator-app、todo-ghpages 等项目
3. 网站定位：新建独立仓库 `proposals-manager`，部署到 GitHub Pages
4. 功能需求：搜索、筛选、分类、新增、编辑、上传

**Answers:**

1. 数据存储：通过 GitHub API 操作仓库文件（JSON 配置），实现上传/编辑
2. 现有数据摸底完成
3. 新建独立仓库 `proposals-manager`
4. 完整 CRUD 功能

## Final Assumptions

- 技术方案：单页应用 (React/Vite)，GitHub API 操作 `proposals-manager` 仓库中的 JSON 数据文件
- 数据存储路径：`data/proposals.json`
- 认证方式：GitHub Personal Access Token（用户自行配置）
- 分类字段：type（web/app/package）、status（active/archived）等
- 部署：独立仓库 `proposals-manager`，GitHub Pages

## Confirmation Gates

| Gate | Status | Countdown ID | Timeout Resolution |
|------|--------|--------------|---------------------|
| PRD Confirmation | pending | - | - |
| Technical Expectations | pending | - | - |

## PRD Path
(to be filled by PM)

## Technical Solution
(to be filled)

## Project Path
(to be filled by dev)

## Acceptance
-

## Notes

- 需求明确，clarifying 阶段已完成
