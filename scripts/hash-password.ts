import bcrypt from "bcryptjs";

async function main() {
  const plain = process.argv[2];
  if (!plain) {
    console.error("用法:npm run hash -- 你的明文密码");
    process.exit(1);
  }
  const hash = await bcrypt.hash(plain, 10);
  console.log("\nAUTH_PASSWORD_HASH 值(复制到 .env):\n");
  console.log(hash);
  console.log("");
}

main();
