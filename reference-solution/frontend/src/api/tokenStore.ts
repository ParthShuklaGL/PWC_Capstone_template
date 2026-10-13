/**
 * Where the JWT lives. This is a deliberate trade-off, written up in the project README:
 *
 * - Memory alone is the safest (a script on the page cannot read it) but a page reload signs you out.
 * - localStorage survives everything but any script on the page can read it, and it never expires.
 * - sessionStorage is the middle road used here: it survives a reload in the same tab, is gone when the
 *   tab closes, and is still readable by a script on the page.
 *
 * Cookie and Session sign-in avoid the question: the browser keeps those credentials in HttpOnly
 * cookies that JavaScript cannot read. This store is only used for the JWT mode.
 */
const KEY = 'nimbus.jwt';

let memory: string | null = null;

export function getToken(): string | null {
  if (memory) {
    return memory;
  }
  try {
    memory = sessionStorage.getItem(KEY);
  } catch {
    // storage blocked (private window, strict settings): the app still works until the next reload
  }
  return memory;
}

export function setToken(token: string | null): void {
  memory = token;
  try {
    if (token) {
      sessionStorage.setItem(KEY, token);
    } else {
      sessionStorage.removeItem(KEY);
    }
  } catch {
    // see getToken
  }
}
