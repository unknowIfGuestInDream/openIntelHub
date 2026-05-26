/**
 * 站点目标受众在中国大陆，但静态页面在 GitHub Actions（UTC）运行时构建并渲染，
 * 直接使用 `toLocaleString('zh-CN')` 会按构建机时区（UTC）格式化，导致首页"生成于"
 * 显示比北京时间晚 8 小时，被误认为是上一次的构建时间。
 *
 * 统一通过此工具将时间锁定到 `Asia/Shanghai`，确保构建产物在任意时区机器上输出
 * 一致，且对中文读者直观可读。
 */
const SHANGHAI_DATETIME_FORMAT: Intl.DateTimeFormatOptions = {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
};

/** Format an ISO timestamp as a Beijing-time (`Asia/Shanghai`) string for zh-CN UI. */
export function formatBeijingDateTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', SHANGHAI_DATETIME_FORMAT);
}
