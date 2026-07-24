const chineseDescription = (parsed) => {
  const subject = parsed.subject ?? "";
  const containsChinese = /[\u3400-\u4dbf\u4e00-\u9fff]/u.test(subject);

  return [
    containsChinese,
    "提交摘要必须包含中文，格式为 <type>(<scope>): <中文摘要> 或 <type>: <中文摘要>",
  ];
};

export default {
  extends: ["@commitlint/config-conventional"],
  plugins: [
    {
      rules: {
        "subject-contains-chinese": chineseDescription,
      },
    },
  ],
  rules: {
    "subject-contains-chinese": [2, "always"],
  },
};
