export const WORK_CATEGORY_FILTER_COOKIE = "work_category_filter";
export const WORK_CATEGORY_ALL = "__all__";
export const WORK_CATEGORY_NONE = "__none__";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function writeWorkCategoryFilterCookie(value: string) {
  try {
    document.cookie = `${WORK_CATEGORY_FILTER_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function readWorkCategoryFilterCookieClient() {
  try {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${WORK_CATEGORY_FILTER_COOKIE}=`));
    if (!match) return null;
    return decodeURIComponent(match.slice(WORK_CATEGORY_FILTER_COOKIE.length + 1));
  } catch {
    return null;
  }
}
