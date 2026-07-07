// 绕过 Next.js 内置 .env 解析(它会把 bcrypt hash 中的 $ 当作变量展开吃掉)。
// 手动用 dotenv + 正则兜底读取,覆盖被 Next.js 损坏的 AUTH_PASSWORD_HASH/JWT_SECRET。

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env"), override: true });

function fixFromFile(key: string) {
  const fs = require("fs");
  try {
    const content = fs.readFileSync(resolve(process.cwd(), ".env"), "utf-8");
    const re = new RegExp(`^${key}=['"]?([^'"\r\n]+)['"]?$`, "m");
    const match = content.match(re);
    if (match) process.env[key] = match[1];
  } catch (_) {
    // ignore
  }
}

for (const key of ["AUTH_PASSWORD_HASH", "JWT_SECRET"]) {
  if (!process.env[key] || process.env[key].length < 10) fixFromFile(key);
}
