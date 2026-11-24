export function requestFailure(code?: string, offline = false) {
  const isTimeout = code === "ECONNABORTED" || code === "ETIMEDOUT";
  return {
    isTimeout,
    message: isTimeout
      ? "The server took too long to respond. Your request may still be processing. Check its status before trying again."
      : offline
        ? "Your device appears to be offline. Reconnect, then check the result before trying again."
        : "Unable to receive a response from the server. Your request may still have been processed. Check the result before trying again.",
  };
}
