export function getApiErrorMessage(error: any, fallback: string): string {
  const data = error?.response?.data;
  const messageFromServer =
    (typeof data === "string" ? data : undefined) ||
    data?.message ||
    data?.error ||
    data?.title;

  if (typeof messageFromServer === "string" && messageFromServer.trim().length > 0) {
    return messageFromServer;
  }

  // Validation errors (e.g. ASP.NET ProblemDetails or errors object)
  const errors = data?.errors;
  if (errors && typeof errors === "object") {
    const parts = Object.entries(errors).flatMap(([key, val]) =>
      Array.isArray(val) ? val.map((v: string) => `${key}: ${v}`) : [`${key}: ${val}`]
    );
    if (parts.length > 0) return parts.join("; ");
  }

  const msg = error?.message;
  if (typeof msg === "string" && msg.trim().length > 0) return msg;

  return fallback;
}

