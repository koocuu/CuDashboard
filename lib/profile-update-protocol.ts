export const PROFILE_UPDATE_TEMPLATE = `<<<PROFILE_UPDATE
layer: status
summary: 用一句话概括本次更新
---
在这里填写该 layer 的完整新版 Markdown 正文
PROFILE_UPDATE>>>`;

export const PROFILE_UPDATE_PROTOCOL = `## 画像更新协议

如果你在对话中判断需要更新我的画像,请只输出下面这个更新块,供我复制回 dashboard 导入。

必须严格按此模板输出,包裹符与字段名一字不差,不要改用其他格式、不要加粗字段名、不要自拟标题。

layer 合法取值: core/investing/creative/status/private

可整体复制的字面模板:

\`\`\`text
${PROFILE_UPDATE_TEMPLATE}
\`\`\``;
