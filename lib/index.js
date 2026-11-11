/**
 * 复利计算器
 *
 * 算定期投资的复利增长。支持每月追加，可看逐年明细。理财、定投、攒钱时用。纯本地计算，不联网。
 */

export const name = "dsh-calc-compound";

export const inject = ["tools"];

const TEXT_OUTPUT = {
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      text: { type: "string" },
    },
    required: ["text"],
  },
  render: (_args, value) => [
    { type: "text", text: (value && value.text) || "" },
  ],
};

// ══════════════════════════════════════════════════════════
//  通用工具函数
// ══════════════════════════════════════════════════════════

const TITLE = "__CALC_TITLE__";

function fmt(n, digits) {
  if (!Number.isFinite(n)) return String(n);
  const d = digits == null ? 2 : digits;
  if (Math.abs(n) >= 1e12) return n.toExponential(6);
  let s = n.toFixed(d);
  if (d > 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s;
}

function money(n) {
  if (!Number.isFinite(n)) return String(n);
  return n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function num(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : (def == null ? 0 : def);
}

function line(label, value, unit) {
  const pad = "  ";
  return pad + label + "：" + value + (unit ? " " + unit : "");
}

function head(title) {
  return [title, "=".repeat(52)];
}

// ══════════════════════════════════════════════════════════
//  工具
// ══════════════════════════════════════════════════════════

export function apply(ctx, config) {
  void config;

  ctx.tools.register({
    name: "calc_compound",
    description:
      "复利计算。输入初始本金、年化收益、年限、每月追加，返回期末总额和总收益，含逐年明细。",
    parameters: {
      principal: { type: "number", description: "初始本金（元），默认 0" },
      monthly: { type: "number", description: "每月追加（元），默认 0" },
      rate: { type: "number", required: true, description: "年化收益率（%，如 8）" },
      years: { type: "number", description: "年数，默认 10" },
    },
    output: TEXT_OUTPUT,
    async execute(args) {
      try {
        const a = args || {};
        const P0 = num(a.principal), M = num(a.monthly), r = num(a.rate) / 100, y = num(a.years, 10);
        if (r < -1) return { text: "收益率要大于 -100%" };
        const rm = Math.pow(1 + r, 1 / 12) - 1;
        let bal = P0, invested = P0;
        const L = head("复利计算");
        L.push(line("初始本金", money(P0) + " 元"));
        L.push(line("每月追加", money(M) + " 元"));
        L.push(line("年化收益", fmt(num(a.rate)) + "%"));
        L.push(line("年限", fmt(y) + " 年"));
        L.push("");
        L.push("  年份  投入      期末金额");
        const rows = [];
        const totalMonths = Math.round(y * 12);
        for (let m = 1; m <= totalMonths; m++) {
          bal = bal * (1 + rm) + M;
          invested += M;
          if (m % 12 === 0) {
            rows.push("  " + String(m / 12).padStart(4) + "  "
              + money(invested).padStart(12) + "  " + money(bal).padStart(14));
          }
        }
        L.push(...rows.slice(-10));
        if (rows.length > 10) {
          L.splice(L.length - Math.min(10, rows.length), 0, "  （只显示最近 10 年）");
        }
        L.push("");
        L.push(line("总投入", money(invested) + " 元"));
        L.push(line("期末总额", money(bal) + " 元"));
        L.push(line("总收益", money(bal - invested) + " 元"));
        if (invested > 0) {
          L.push(line("收益率", fmt((bal - invested) / invested * 100, 1) + "%"));
        }
        L.push("");
        L.push("  假设收益稳定，实际会有波动。不构成投资建议。");
        return { text: L.join("\n") };
      } catch (e) {
        return { text: "计算失败: " + String((e && e.message) || e) };
      }
    },
  });
}
