export function getApiErrorMessage(error: any, fallback: string): string {
  // Axios-like error shape
  const data = error?.response?.data;
  const messageFromServer =
    (typeof data === "string" ? data : undefined) ||
    data?.message ||
    data?.error ||
    data?.title;

  if (typeof messageFromServer === "string" && messageFromServer.trim().length > 0) {
    return messageFromServer;
  }

  const message = error?.message;
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  return fallback;
}

