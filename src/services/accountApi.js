// Bound account reads and writes even if the host never returns a response.
// Do not retry writes: the server may already have committed the change.
export async function accountFetch(url, options = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 60000);
  try {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options, signal: controller.signal });
    const text = await response.text();
    let payload;
    try { payload = JSON.parse(text); }
    catch { throw new Error("The account service returned an invalid response. Please retry."); }
    return { ok: response.ok, status: response.status, json: async () => payload };
  } catch (error) {
    if (timedOut) throw new Error(options.method === "POST"
      ? "The account change could not be confirmed. Refresh the list before trying again."
      : "The account service took too long to respond. Please retry.");
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  }
}
