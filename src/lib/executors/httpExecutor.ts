import type { HttpExecutorInput, HttpExecutorOutput } from "@/types/execution";

/**
 * Execute an HTTP request
 * Makes actual API calls using fetch
 */
export async function executeHttp(
  input: HttpExecutorInput
): Promise<HttpExecutorOutput> {
  const startTime = Date.now();

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...input.headers,
  };

  // Handle authentication
  if (input.auth) {
    if (
      input.auth.type === "basic" &&
      input.auth.username &&
      input.auth.password
    ) {
      const credentials = btoa(`${input.auth.username}:${input.auth.password}`);
      headers["Authorization"] = `Basic ${credentials}`;
    } else if (
      input.auth.type === "api-key" &&
      input.auth.key &&
      input.auth.value
    ) {
      if (input.auth.location === "header") {
        headers[input.auth.key] = input.auth.value;
      }
    }
  }

  // Build URL with query params for API key auth
  let url = input.url;
  if (
    input.auth?.type === "api-key" &&
    input.auth.location === "query" &&
    input.auth.key &&
    input.auth.value
  ) {
    const separator = url.includes("?") ? "&" : "?";
    url = `${url}${separator}${input.auth.key}=${encodeURIComponent(
      input.auth.value
    )}`;
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    (input.timeout || 30) * 1000
  );

  try {
    const response = await fetch(url, {
      method: input.method,
      headers,
      body:
        input.method !== "GET" && input.body
          ? JSON.stringify(input.body)
          : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse response
    let data: unknown;
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Convert headers to object
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const duration = Date.now() - startTime;

    // Throw if not ok
    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${response.statusText}${
          typeof data === "string" ? ` - ${data}` : ""
        }`
      );
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data,
      duration,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      // Handle timeout
      if (error.name === "AbortError") {
        throw new Error(`Request timeout after ${input.timeout || 30}s`);
      }

      // Handle network errors
      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
      ) {
        throw new Error(
          `Network error: Unable to reach ${input.url}. Check if the URL is correct and accessible.`
        );
      }

      // Handle CORS errors
      if (error.message.includes("CORS")) {
        throw new Error(
          `CORS error: The server at ${input.url} does not allow requests from this origin.`
        );
      }

      throw error;
    }
    throw new Error("Unknown error during HTTP request");
  }
}
